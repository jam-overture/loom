import type { TreeId } from "../ids.js"
import { err, ok, reduceResult, type Result } from "../result.js"
import { applyDelta } from "../tree/apply.js"
import { idReturnsIn, seedIdHistory, trackIds, type IdHistory, type IdReturn } from "../tree/identity.js"
import type { LoomTree } from "../tree/tree.js"

import type { StoreError } from "./errors.js"
import type { StoredRevision, TreeReader } from "./store.js"

/**
 * Replay: folding the log, and the two questions a fold answers.
 *
 * The snapshot is what gets read; the log is what gets trusted. Those two only
 * stay the same thing if folding the log still produces the snapshot — and that
 * is not free, because a stored delta encodes assumptions about how `applyDelta`
 * behaves. §1 chose `move` semantics where `index` counts the post-detach child
 * list; every delta ever stored is written in that dialect. Change the dialect
 * and the log stops meaning what it meant.
 *
 * A pure event-sourced design cannot detect that: the fold is the read, so a
 * drifted fold is simply the new truth. With a snapshot, replay becomes a check
 * rather than a dependency — which is the argument for keeping both.
 *
 * The second question is what the tree *was*. A store answers for one revision,
 * the head, because that is the one it materialises; every earlier revision is
 * in the log and reachable only by folding to it. `auditSnapshot` folds to the
 * end to compare; `treeAt` folds to a revision a caller names and stops. One
 * walk, bounded at both ends: it opens at the seed's own position and closes at
 * the last revision anybody asked for.
 */

export type ReplayMismatch =
  | { readonly code: "delta-rejected"; readonly revision: number; readonly detail: string }
  /** A gap or a repeat in the log: revisions must be consecutive from the seed. */
  | { readonly code: "revision-gap"; readonly expected: number; readonly found: number }

/**
 * A fold, and what the fold saw on the way past.
 *
 * The id history rides along rather than being computed by a second pass. It is
 * derived from consecutive states (0038) and this is the only place that
 * produces them all, so folding twice would mean reading a whole log twice to
 * learn something the first read already went past.
 */
export type ReplayedTree = {
  readonly tree: LoomTree
  readonly idHistory: IdHistory
}

const replayFrom = (
  from: ReplayedTree,
  entries: readonly StoredRevision[]
): Result<ReplayedTree, ReplayMismatch> =>
  reduceResult<StoredRevision, ReplayedTree, ReplayMismatch>(entries, from, (replayed, entry) => {
    if (entry.revision !== replayed.tree.revision + 1) {
      return err({
        code: "revision-gap",
        expected: replayed.tree.revision + 1,
        found: entry.revision,
      })
    }

    const applied = applyDelta(replayed.tree, entry.delta)

    return applied.ok
      ? ok({
          tree: applied.value,
          idHistory: trackIds(replayed.idHistory, replayed.tree, applied.value),
        })
      : err({ code: "delta-rejected", revision: entry.revision, detail: applied.error.code })
  })

/** A whole log, from a seed the caller can prove is revision 0 (0028). */
export const replayTree = (
  seed: LoomTree,
  entries: readonly StoredRevision[]
): Result<ReplayedTree, ReplayMismatch> =>
  replayFrom(seedReplay(seed), entries)

const seedReplay = (seed: LoomTree): ReplayedTree => ({
  tree: seed,
  idHistory: seedIdHistory(seed),
})

/**
 * The walk, the revisions it was told to stop at, and the ones it has reached.
 *
 * `seeking` is `null` for a fold that wants the whole log, which is not the same
 * as an empty set: empty means every named revision has been reached and no
 * later entry can change an answer, so the walk is finished. A fold to the end
 * is never finished until the log is.
 */
type Fold = {
  readonly replayed: ReplayedTree
  readonly seeking: ReadonlySet<number> | null
  readonly reached: ReadonlyMap<number, ReplayedTree>
  readonly mismatch: ReplayMismatch | null
}

/** Nothing a later page holds can change an answer. */
const settled = (fold: Fold): boolean =>
  fold.mismatch !== null || (fold.seeking !== null && fold.seeking.size === 0)

/**
 * Keeps the walk's current state if it is one a caller named.
 *
 * `ReplayedTree` is immutable and `IdHistory` is rebuilt rather than mutated
 * (0038), so remembering a position costs a reference — which is what makes
 * several stops in one walk as cheap as one.
 */
const stopped = (fold: Fold, revision: number): Fold =>
  fold.seeking === null || !fold.seeking.has(revision)
    ? fold
    : {
        ...fold,
        seeking: new Set([...fold.seeking].filter((wanted) => wanted !== revision)),
        reached: new Map([...fold.reached, [revision, fold.replayed]]),
      }

const stepFold = (fold: Fold, entry: StoredRevision): Fold => {
  if (entry.revision !== fold.replayed.tree.revision + 1) {
    return {
      ...fold,
      mismatch: {
        code: "revision-gap",
        expected: fold.replayed.tree.revision + 1,
        found: entry.revision,
      },
    }
  }

  const applied = applyDelta(fold.replayed.tree, entry.delta)
  if (!applied.ok) {
    return {
      ...fold,
      mismatch: { code: "delta-rejected", revision: entry.revision, detail: applied.error.code },
    }
  }

  return stopped(
    {
      ...fold,
      replayed: {
        tree: applied.value,
        idHistory: trackIds(fold.replayed.idHistory, fold.replayed.tree, applied.value),
      },
    },
    entry.revision
  )
}

/**
 * A fold about to begin, with the seed's own revision already counted as a stop.
 *
 * A caller may legitimately ask for the revision the seed is at — the tree as it
 * was is the seed itself — and that answer costs no read at all, because
 * `settled` is already true when it is the only one wanted.
 */
const startFold = (seed: LoomTree, seeking: ReadonlySet<number> | null): Fold =>
  stopped({ replayed: seedReplay(seed), seeking, reached: new Map(), mismatch: null }, seed.revision)

/**
 * Walks the log forward one page at a time, from the seed and no further than it
 * has to go.
 *
 * The log is read in pages (0026), so the only callers that legitimately need a
 * span of it walk it here rather than every caller being handed an unbounded
 * read. Each page is folded into the tree the previous one produced, which is
 * the same fold `replayTree` performs — a page boundary is not a semantic
 * boundary, it is just where the read stopped.
 *
 * **It opens at the seed rather than at the oldest entry.** A seed is usually
 * revision 0 and then the two are the same page; a host that checkpoints may
 * supply a later one (0028), and a walk that started at the beginning would meet
 * an entry the seed already contains and call it a gap. `at` is inclusive, so
 * `seedRevision + 1` is the first entry the seed has not applied — and because
 * revisions are dense (0026), nothing can hide between the two.
 *
 * `newer` is the contract's "there is more forward of here", so following it
 * until it is `null` visits every entry after the seed exactly once.
 */
const foldPages = async (
  reader: TreeReader,
  treeId: TreeId,
  seedRevision: number,
  fold: Fold,
  cursor?: string
): Promise<Result<Fold, StoreError>> => {
  const page = await reader.revisions(
    treeId,
    cursor === undefined
      ? { at: seedRevision + 1, direction: "newer" }
      : { cursor, direction: "newer" }
  )
  if (!page.ok) return page

  const walked = page.value.revisions.reduce(
    (current, entry) => (settled(current) ? current : stepFold(current, entry)),
    fold
  )

  return page.value.newer === null || settled(walked) ? ok(walked) : await foldPages(reader, treeId, seedRevision, walked, page.value.newer)
}

/**
 * What the fold noticed about ids on the way, whatever the verdict turned out
 * to be.
 *
 * Carried on both replayable outcomes rather than folded into the verdict,
 * because it answers a different question. "Agrees" is about whether the
 * snapshot still matches the log; a recycled id is about whether the log can be
 * read by id at all (0038). A tree can pass the first and fail the second, and
 * an audit that collapsed them would have to call one of those two things by the
 * other's name.
 */
export type SnapshotAudit =
  | { readonly outcome: "agrees"; readonly revision: number; readonly idReturns: readonly IdReturn[] }
  /**
   * The fold produced a different tree — the drift this whole module exists for.
   *
   * Both sides are reported, not only the replayed one. The audit read the
   * snapshot to reach this verdict, and a caller that had to read it again to
   * find out *how* they differ would be comparing against a head that may have
   * moved since — so it could describe a divergence that was never the one
   * observed. `compareTrees(stored, replayed)` turns these two into something an
   * operator can act on.
   */
  | {
      readonly outcome: "diverged"
      readonly revision: number
      readonly stored: LoomTree
      readonly replayed: LoomTree
      readonly idReturns: readonly IdReturn[]
    }
  | { readonly outcome: "unreplayable"; readonly mismatch: ReplayMismatch }

/**
 * Folds a tree's log from a known seed and compares the result to the stored
 * snapshot. A host runs this in a test or a scheduled job; nothing on a request
 * path needs it, which is the point.
 *
 * The seed is a parameter rather than something the store keeps, because the
 * honest seed is revision 0 and a store that has been compacted may no longer
 * have it. A caller that cannot supply one cannot audit — which is a real
 * limitation, and a better one than an audit that quietly starts from the answer
 * it is trying to check.
 */
export const auditSnapshot = async (
  store: TreeReader,
  treeId: TreeId,
  seed: LoomTree
): Promise<Result<SnapshotAudit, StoreError>> => {
  const head = await store.head(treeId)
  if (!head.ok) return head

  const folded = await foldPages(store, treeId, seed.revision, startFold(seed, null))
  if (!folded.ok) return folded

  const fold = folded.value
  if (fold.mismatch !== null) return ok({ outcome: "unreplayable", mismatch: fold.mismatch })

  const idReturns = idReturnsIn(fold.replayed.idHistory)
  const agrees = JSON.stringify(fold.replayed.tree) === JSON.stringify(head.value)

  return ok(
    agrees
      ? { outcome: "agrees", revision: head.value.revision, idReturns }
      : {
          outcome: "diverged",
          revision: head.value.revision,
          stored: head.value,
          replayed: fold.replayed.tree,
          idReturns,
        }
  )
}

/**
 * One revision of one tree, and the seed to reach it from.
 *
 * The seed is the same parameter `auditSnapshot` and `planRevert` take, for the
 * same reason and with the same consequence: a caller that cannot supply one
 * cannot read a past revision at all. Usually revision 0; a host that
 * checkpoints may supply a later one (0028), and then everything before the
 * checkpoint is out of range rather than silently wrong.
 */
export type TreeAtTarget = {
  readonly treeId: TreeId
  readonly revision: number
  readonly seed: LoomTree
}

/** The same question asked about several revisions of one tree, in one read. */
export type TreeAtTargets = {
  readonly treeId: TreeId
  readonly revisions: readonly number[]
  readonly seed: LoomTree
}

/**
 * The tree as it was, or why the log cannot say.
 *
 * A `StoreError` means the log could not be read. Everything else is an answer
 * about the revision, which is why the obstacles are values rather than errors:
 * "that revision is before the checkpoint you handed me" is a fact about the
 * span, not a failure.
 */
export type TreeAtRevision =
  /**
   * The fold reached the named revision. `replayed.tree.revision` equals the
   * revision asked for, and `replayed.idHistory` is the tenancy of every id from
   * the seed up to it — which is the half a caller reading counters by node id
   * needs, because an id that returned in between names two different nodes
   * either side of the comparison (0038).
   */
  | { readonly outcome: "replayed"; readonly revision: number; readonly replayed: ReplayedTree }
  /**
   * Not a revision this seed and this log can reach: before the seed, after the
   * head, or not an integer — revisions are dense integers (0026) and nothing
   * lies between two of them, so a fractional one is not a position the log has.
   *
   * `earliest` is the seed's own revision rather than one past it, which is the
   * one place this differs from a revert's span: the tree at the seed is the
   * seed, and a revision cannot be undone by inverting a delta the seed already
   * contains.
   */
  | {
      readonly outcome: "out-of-range"
      readonly revision: number
      readonly earliest: number
      readonly headRevision: number
    }
  | {
      readonly outcome: "unreplayable"
      readonly revision: number
      readonly mismatch: ReplayMismatch
    }

export const describeTreeAt = (answer: TreeAtRevision): string => {
  switch (answer.outcome) {
    case "replayed":
      return `revision ${answer.revision} replayed from the log`
    case "out-of-range":
      return `revision ${answer.revision} is outside ${answer.earliest}–${answer.headRevision}`
    case "unreplayable":
      return answer.mismatch.code === "revision-gap"
        ? `revision ${answer.revision} is unreachable: the log jumps from ${
            answer.mismatch.expected - 1
          } to ${answer.mismatch.found}`
        : `revision ${answer.revision} is unreachable: revision ${answer.mismatch.revision} no longer applies (${answer.mismatch.detail})`
  }
}

type Survey = {
  readonly fold: Fold
  readonly earliest: number
  readonly headRevision: number
}

/**
 * Reads head to establish the span, then folds once for every revision worth
 * folding for.
 *
 * The head read is what makes `out-of-range` an answer instead of a guess: a
 * revision past the head is not a gap in the log, it is a revision that has not
 * happened, and a fold alone cannot tell those apart — it would simply run out
 * of entries and report the shape of corruption.
 */
const survey = async (
  reader: TreeReader,
  targets: TreeAtTargets
): Promise<Result<Survey, StoreError>> => {
  const head = await reader.head(targets.treeId)
  if (!head.ok) return head

  const earliest = targets.seed.revision
  const headRevision = head.value.revision
  const seeking = new Set(
    targets.revisions.filter(
      (revision) =>
        Number.isInteger(revision) && revision >= earliest && revision <= headRevision
    )
  )

  const fold = startFold(targets.seed, seeking)
  if (settled(fold)) return ok({ fold, earliest, headRevision })

  const walked = await foldPages(reader, targets.treeId, targets.seed.revision, fold)

  return walked.ok ? ok({ fold: walked.value, earliest, headRevision }) : walked
}

/**
 * What one revision's answer is, given a walk that was told to look for it.
 *
 * The order the cases are read in is the order the walk would have met them
 * folding to that revision alone, which is what makes a batched read the same
 * answer as a solitary one: a revision outside the span was decided before the
 * log was opened, and a revision inside it is either reached or stopped short of
 * by the first obstacle the fold met.
 */
const answerFrom = ({ fold, earliest, headRevision }: Survey, revision: number): TreeAtRevision => {
  if (!Number.isInteger(revision) || revision < earliest || revision > headRevision) {
    return { outcome: "out-of-range", revision, earliest, headRevision }
  }

  const replayed = fold.reached.get(revision)
  if (replayed !== undefined) return { outcome: "replayed", revision, replayed }

  /**
   * In the span, not reached, and the fold met nothing it could name: the log
   * holds fewer entries than the snapshot's revision claims, so it ends before
   * the revision asked for. The gap is between the last entry and the head, and
   * saying so is the only honest thing left — this is the corruption
   * `auditSnapshot` exists to find, met by a caller who was only asking for a
   * tree.
   */
  return {
    outcome: "unreplayable",
    revision,
    mismatch: fold.mismatch ?? {
      code: "revision-gap",
      expected: fold.replayed.tree.revision + 1,
      found: headRevision,
    },
  }
}

/**
 * The tree as it was at a chosen revision.
 *
 * A store materialises one revision — the head — because §3 renders per request
 * and a fold per render is not affordable. Every earlier revision is in the log
 * and nowhere else, so this is the fold, stopped where the caller said rather
 * than at the end.
 *
 * It exists because a reading keyed to a revision needs the tree *of* that
 * revision: reader counters are keyed by tree and revision deliberately (0147),
 * and laying one revision's counters over another revision's tree makes most
 * parts read "nobody got there" while every number stays plausible. The
 * workaround — page `revisions()` and fold from the seed in the consumer — is
 * the same walk with the stopping condition moved somewhere nothing tests it,
 * and a consumer that gets it slightly wrong produces the one failure this
 * reading can have that looks exactly like success.
 */
export const treeAt = async (
  reader: TreeReader,
  target: TreeAtTarget
): Promise<Result<TreeAtRevision, StoreError>> => {
  const surveyed = await survey(reader, {
    treeId: target.treeId,
    revisions: [target.revision],
    seed: target.seed,
  })

  return surveyed.ok ? ok(answerFrom(surveyed.value, target.revision)) : surveyed
}

/**
 * The same answers for several revisions, from one read of the log.
 *
 * Each answer is exactly what `treeAt` would have produced for that revision on
 * its own — the batch changes what it costs to ask, never what the answer is.
 * Two revisions is the case it exists for: a before-and-after reading is one
 * revision against another, and asking twice would fold the shared prefix twice
 * and read the head twice, against a log that is still being appended to.
 *
 * Revisions are keyed rather than positional so a caller can ask about the ones
 * it is comparing and read the answers back by revision; asking twice about one
 * revision costs nothing and answers once.
 */
export const treesAt = async (
  reader: TreeReader,
  targets: TreeAtTargets
): Promise<Result<ReadonlyMap<number, TreeAtRevision>, StoreError>> => {
  const surveyed = await survey(reader, targets)
  if (!surveyed.ok) return surveyed

  return ok(
    new Map(
      [...new Set(targets.revisions)].map((revision) => [
        revision,
        answerFrom(surveyed.value, revision),
      ])
    )
  )
}
