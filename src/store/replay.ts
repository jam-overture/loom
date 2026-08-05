import type { TreeId } from "../ids.js"
import { err, ok, reduceResult, type Result } from "../result.js"
import { applyDelta } from "../tree/apply.js"
import { idReturnsIn, seedIdHistory, trackIds, type IdHistory, type IdReturn } from "../tree/identity.js"
import type { LoomTree } from "../tree/tree.js"

import type { StoreError } from "./errors.js"
import type { StoredRevision, TreeReader } from "./store.js"

/**
 * Replay, and the audit it exists for.
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
 * Folds a whole log by walking it forward one page at a time.
 *
 * The log is read in pages (0026), so the only caller that legitimately needs
 * all of it walks it here rather than every caller being handed an unbounded
 * read. Each page is folded into the tree the previous one produced, which is
 * the same fold `replayTree` performs — a page boundary is not a semantic
 * boundary, it is just where the read stopped.
 *
 * `newer` is the contract's "there is more forward of here", so following it
 * until it is `null` visits every entry exactly once.
 */
const foldLog = async (
  store: TreeReader,
  treeId: TreeId,
  from: ReplayedTree,
  cursor?: string
): Promise<Result<Result<ReplayedTree, ReplayMismatch>, StoreError>> => {
  const page = await store.revisions(treeId, cursor === undefined ? {} : { cursor })
  if (!page.ok) return page

  const folded = replayFrom(from, page.value.revisions)
  if (!folded.ok) return ok(folded)

  return page.value.newer === null
    ? ok(folded)
    : await foldLog(store, treeId, folded.value, page.value.newer)
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

  const folded = await foldLog(store, treeId, seedReplay(seed))
  if (!folded.ok) return folded

  const replayed = folded.value
  if (!replayed.ok) return ok({ outcome: "unreplayable", mismatch: replayed.error })

  const idReturns = idReturnsIn(replayed.value.idHistory)
  const agrees = JSON.stringify(replayed.value.tree) === JSON.stringify(head.value)

  return ok(
    agrees
      ? { outcome: "agrees", revision: head.value.revision, idReturns }
      : {
          outcome: "diverged",
          revision: head.value.revision,
          stored: head.value,
          replayed: replayed.value.tree,
          idReturns,
        }
  )
}
