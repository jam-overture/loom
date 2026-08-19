import type { NodeId, TreeId } from "../ids.js"
import { ok, type Result } from "../result.js"
import type { DiscardedWork } from "../runtime/proposal.js"
import { applyDelta } from "../tree/apply.js"
import type { TreeOperation } from "../tree/delta.js"
import type { TreeError } from "../tree/errors.js"
import { invertOperations } from "../tree/inverse.js"
import { namedNodeIds } from "../tree/naming.js"
import type { LoomTree } from "../tree/tree.js"

import type { StoreError } from "./errors.js"
import type { ReplayMismatch } from "./replay.js"
import type { StoredRevision, TreeReader } from "./store.js"

/**
 * Planning a revert: reading the log to work out what undoing one of its
 * entries would mean, without deciding anything.
 *
 * The plan is computed rather than stored. The inverse of every applied delta
 * already exists at assessment time and is thrown away, and the alternative —
 * writing it onto the revision — would put a derived value in the log beside
 * the value it derives from, where the two can disagree and nothing is checking
 * (0016's argument for the snapshot, applied to a place it does not earn its
 * keep: an inverse is needed rarely, a snapshot on every render).
 *
 * So a revert reads the log forward from a seed, exactly as `auditSnapshot`
 * does, and for exactly the same reason 0028 gives: the tree a delta observed
 * is only recoverable by replaying the entries before it.
 *
 * This module decides nothing about whether the revert *should* happen. It
 * produces the operations, the obstacles, and what the undo would write over;
 * the Gate judges, as it does for any other change.
 */

export type RevertPlan =
  | {
      readonly outcome: "revertable"
      readonly target: StoredRevision
      /**
       * The undo, as operations. They become a delta when something applies
       * them; the id and base revision belong to that delta, not to this plan.
       */
      readonly operations: readonly TreeOperation[]
      /** The head these operations were planned against. */
      readonly headRevision: number
      /**
       * Revisions after the target that named a node this undo touches, so
       * applying it writes over what they did. Empty for a clean undo.
       *
       * A property of the plan rather than a verdict about it (0035): the Gate
       * decides what a contested undo is worth, and it decides it from this,
       * carried on the proposal. It travels with the plan because the delta
       * cannot show it — undoing revision 1 looks identical whether or not
       * anyone built on it.
       */
      readonly discards: readonly DiscardedWork[]
    }
  /** The revision is outside the span this reader and this seed can reach. */
  | {
      readonly outcome: "out-of-range"
      readonly revision: number
      /** One past the seed: the oldest revision this seed can replay up to. */
      readonly earliest: number
      readonly headRevision: number
    }
  | { readonly outcome: "unreplayable"; readonly mismatch: ReplayMismatch }
  /**
   * The target's delta cannot be inverted against the tree the replay produced.
   * In practice this means the seed is not this tree's history: inversion walks
   * the delta forward as it inverts, so a delta that applied when it was written
   * inverts against the state it was written for.
   */
  | { readonly outcome: "uninvertible"; readonly revision: number; readonly error: TreeError }

export type UnrevertablePlan = Exclude<RevertPlan, { readonly outcome: "revertable" }>

export const describeRevertPlan = (plan: RevertPlan): string => {
  switch (plan.outcome) {
    case "revertable":
      return plan.discards.length === 0
        ? `revision ${plan.target.revision} can be undone at head ${plan.headRevision}`
        : `revision ${plan.target.revision} can be undone at head ${
            plan.headRevision
          }, discarding what revision${plan.discards.length === 1 ? "" : "s"} ${plan.discards
            .map((discarded) => discarded.revision)
            .join(", ")} did to the nodes it touches`
    case "out-of-range":
      return `revision ${plan.revision} is outside ${plan.earliest}–${plan.headRevision}`
    case "unreplayable":
      return plan.mismatch.code === "revision-gap"
        ? `the log jumps from ${plan.mismatch.expected - 1} to ${plan.mismatch.found}`
        : `revision ${plan.mismatch.revision} no longer applies: ${plan.mismatch.detail}`
    case "uninvertible":
      return `revision ${plan.revision} cannot be inverted: ${plan.error.code}`
  }
}

export type RevertTarget = {
  readonly treeId: TreeId
  /** The revision to undo. Its delta is the one that gets inverted. */
  readonly revision: number
  /**
   * A tree whose revision precedes the target's, to replay from. Usually
   * revision 0; a host that checkpoints may supply a later one (0028).
   */
  readonly seed: LoomTree
}

/** The same question asked about several revisions of one tree, in one read. */
export type RevertTargets = {
  readonly treeId: TreeId
  readonly revisions: readonly number[]
  readonly seed: LoomTree
}

/** A target that has been reached and inverted, collecting what an undo of it would discard. */
type Trail = {
  readonly target: StoredRevision
  readonly operations: readonly TreeOperation[]
  readonly named: ReadonlySet<NodeId>
  readonly discards: readonly DiscardedWork[]
}

/**
 * The replayed tree, and the targets still waiting for it.
 *
 * It exists only while something still seeks: once every named revision has
 * been reached, no later entry needs to be applied, and the walk stops paying
 * for a replay nobody reads. That is not an optimisation — it is what keeps a
 * batch honest. A delta that no longer applies is only an obstacle for a target
 * *after* it, and continuing to apply would let a late failure contradict a
 * plan that was already complete.
 */
type Replay = { readonly tree: LoomTree; readonly seeking: ReadonlySet<number> }

/** Everything the walk must find, track, and remember about why it stopped. */
type Scan = {
  readonly nextRevision: number
  readonly replay: Replay | null
  readonly trails: ReadonlyMap<number, Trail>
  readonly uninvertible: ReadonlyMap<number, TreeError>
  /** Why the replay stopped short, for the targets it never reached. */
  readonly stopped: ReplayMismatch | null
  /** A break in the log's own numbering: nothing after it can be read at all. */
  readonly halted: ReplayMismatch | null
}

type ScanContext = {
  readonly scan: Scan
  readonly earliest: number
  readonly headRevision: number
}

/**
 * The undo's own reach, plus the target delta's.
 *
 * Both halves are needed. The undo of a removal is an insert carrying the whole
 * subtree, so only the inverse names what the removal destroyed; the undo of an
 * insert is a bare remove, so only the original names what was inserted.
 */
const reachOf = (
  target: StoredRevision,
  operations: readonly TreeOperation[]
): ReadonlySet<NodeId> =>
  new Set([...namedNodeIds(target.delta.operations), ...namedNodeIds(operations)])

const withoutRevision = (
  seeking: ReadonlySet<number>,
  revision: number
): ReadonlySet<number> => new Set([...seeking].filter((wanted) => wanted !== revision))

const trailed = (
  trails: ReadonlyMap<number, Trail>,
  entry: StoredRevision
): ReadonlyMap<number, Trail> => {
  if (trails.size === 0) return trails

  const named = namedNodeIds(entry.delta.operations)

  return new Map(
    [...trails].map(([revision, trail]) => {
      const overlap = named.filter((nodeId) => trail.named.has(nodeId))

      return [
        revision,
        overlap.length === 0
          ? trail
          : {
              ...trail,
              discards: [...trail.discards, { revision: entry.revision, nodeIds: overlap }],
            },
      ]
    })
  )
}

const withTrail = (scan: Scan, replay: Replay, entry: StoredRevision): Scan => {
  const inverted = invertOperations(replay.tree, entry.delta)

  return inverted.ok
    ? {
        ...scan,
        trails: new Map([
          ...scan.trails,
          [
            entry.revision,
            {
              target: entry,
              operations: inverted.value,
              named: reachOf(entry, inverted.value),
              discards: [],
            },
          ],
        ]),
      }
    : {
        ...scan,
        uninvertible: new Map([...scan.uninvertible, [entry.revision, inverted.error]]),
      }
}

/** Advances the replay past an entry, or records why it cannot go further. */
const advanced = (scan: Scan, replay: Replay, entry: StoredRevision): Scan => {
  const seeking = withoutRevision(replay.seeking, entry.revision)
  if (seeking.size === 0) return { ...scan, replay: null }

  const applied = applyDelta(replay.tree, entry.delta)

  return applied.ok
    ? { ...scan, replay: { tree: applied.value, seeking } }
    : {
        ...scan,
        replay: null,
        stopped: {
          code: "delta-rejected",
          revision: entry.revision,
          detail: applied.error.code,
        },
      }
}

const stepScan = (scan: Scan, entry: StoredRevision): Scan => {
  if (entry.revision !== scan.nextRevision) {
    return {
      ...scan,
      halted: { code: "revision-gap", expected: scan.nextRevision, found: entry.revision },
    }
  }

  const trailing: Scan = {
    ...scan,
    nextRevision: entry.revision + 1,
    trails: trailed(scan.trails, entry),
  }

  if (trailing.replay === null) return trailing

  const reached = trailing.replay.seeking.has(entry.revision)
    ? withTrail(trailing, trailing.replay, entry)
    : trailing

  return advanced(reached, trailing.replay, entry)
}

/** Nothing left to reach and nothing left to trail: further pages cannot change an answer. */
const settled = (scan: Scan): boolean =>
  scan.halted !== null || (scan.replay === null && scan.trails.size === 0)

/**
 * Walks the log forward one page at a time, in one pass: replaying up to each
 * named revision, inverting it, then checking everything after it for overlap.
 *
 * One pass rather than three because the three questions are answered at
 * different points of the same sequence, and reading it three times would give
 * three answers about three moments of a log that is still being appended to.
 * One pass for *every* named revision rather than one pass each, because the
 * forward replay a second target needs is the one the first already walked —
 * the reason a page of history costs one read here and `rows × head` when the
 * question is asked a row at a time.
 *
 * Entries at or before the seed are skipped rather than folded — a checkpoint
 * seed already contains them, and a walk that refused them would make the seed
 * parameter useless for anything but revision 0.
 */
const scanLog = async (
  reader: TreeReader,
  treeId: TreeId,
  seedRevision: number,
  scan: Scan,
  cursor?: string
): Promise<Result<Scan, StoreError>> => {
  const page = await reader.revisions(treeId, cursor === undefined ? {} : { cursor })
  if (!page.ok) return page

  const walked = page.value.revisions
    .filter((entry) => entry.revision > seedRevision)
    .reduce((current, entry) => (settled(current) ? current : stepScan(current, entry)), scan)

  return page.value.newer === null || settled(walked)
    ? ok(walked)
    : await scanLog(reader, treeId, seedRevision, walked, page.value.newer)
}

/**
 * Reads head, then walks the log once for every revision worth walking for.
 *
 * A revision outside the span needs no read at all, so a survey asked only
 * about those never opens the log — which is what makes planning one
 * out-of-range revision as cheap in a batch as it is alone.
 */
const surveyLog = async (
  reader: TreeReader,
  targets: RevertTargets
): Promise<Result<ScanContext, StoreError>> => {
  const head = await reader.head(targets.treeId)
  if (!head.ok) return head

  const earliest = targets.seed.revision + 1
  const headRevision = head.value.revision
  const seeking = new Set(
    targets.revisions.filter((revision) => revision >= earliest && revision <= headRevision)
  )

  const scan: Scan = {
    nextRevision: earliest,
    replay: seeking.size === 0 ? null : { tree: targets.seed, seeking },
    trails: new Map(),
    uninvertible: new Map(),
    stopped: null,
    halted: null,
  }

  if (seeking.size === 0) return ok({ scan, earliest, headRevision })

  const walked = await scanLog(reader, targets.treeId, targets.seed.revision, scan)

  return walked.ok ? ok({ scan: walked.value, earliest, headRevision }) : walked
}

/**
 * What one revision's plan is, given a walk that was told to look for it.
 *
 * The order the cases are read in is the order the walk would have met them
 * planning that revision alone, which is what makes a batched plan the same
 * answer as a solitary one: a target that could not be inverted was decided
 * before any later break in the log, a target that was reached is only undone
 * by a break *after* it, and a target that was never reached takes whichever
 * obstacle came first.
 */
const planFrom = (context: ScanContext, revision: number): RevertPlan => {
  const { scan, earliest, headRevision } = context

  if (revision < earliest || revision > headRevision) {
    return { outcome: "out-of-range", revision, earliest, headRevision }
  }

  const error = scan.uninvertible.get(revision)
  if (error !== undefined) return { outcome: "uninvertible", revision, error }

  const trail = scan.trails.get(revision)
  if (trail !== undefined) {
    return scan.halted === null
      ? {
          outcome: "revertable",
          target: trail.target,
          operations: trail.operations,
          headRevision,
          discards: trail.discards,
        }
      : { outcome: "unreplayable", mismatch: scan.halted }
  }

  return {
    outcome: "unreplayable",
    mismatch: scan.stopped ??
      scan.halted ?? {
        code: "revision-gap",
        expected: scan.nextRevision,
        found: headRevision,
      },
  }
}

/**
 * What undoing a revision would take, or what stands in the way.
 *
 * A `StoreError` means the log could not be read. Everything else is a verdict
 * about the revert itself, which is why the obstacles are values in the plan
 * rather than errors: "this revision was built on since" is an answer, not a
 * failure.
 */
export const planRevert = async (
  reader: TreeReader,
  target: RevertTarget
): Promise<Result<RevertPlan, StoreError>> => {
  const surveyed = await surveyLog(reader, {
    treeId: target.treeId,
    revisions: [target.revision],
    seed: target.seed,
  })

  return surveyed.ok ? ok(planFrom(surveyed.value, target.revision)) : surveyed
}

/**
 * The same plans for several revisions, from one read of the log.
 *
 * Each plan is exactly what `planRevert` would have produced for that revision
 * on its own — the batch changes what it costs to ask, never what the answer
 * is. A page of history is the case it exists for: the forward replay is walked
 * once for all of them, and only the head-ward trail, which genuinely differs
 * per target, is tracked per target.
 *
 * Revisions are keyed rather than positional so a caller can ask about the rows
 * it is showing and read the answers back by revision; asking twice about one
 * revision costs nothing and answers once.
 */
export const planReverts = async (
  reader: TreeReader,
  targets: RevertTargets
): Promise<Result<ReadonlyMap<number, RevertPlan>, StoreError>> => {
  const surveyed = await surveyLog(reader, targets)
  if (!surveyed.ok) return surveyed

  return ok(
    new Map(
      [...new Set(targets.revisions)].map((revision) => [
        revision,
        planFrom(surveyed.value, revision),
      ])
    )
  )
}
