import type { TreeId } from "../ids.js"
import { err, ok, reduceResult, type Result } from "../result.js"
import { applyDelta } from "../tree/apply.js"
import type { LoomTree } from "../tree/tree.js"

import type { StoredRevision, StoreError, TreeReader } from "./store.js"

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

export const replayTree = (
  seed: LoomTree,
  entries: readonly StoredRevision[]
): Result<LoomTree, ReplayMismatch> =>
  reduceResult<StoredRevision, LoomTree, ReplayMismatch>(entries, seed, (tree, entry) => {
    if (entry.revision !== tree.revision + 1) {
      return err({ code: "revision-gap", expected: tree.revision + 1, found: entry.revision })
    }

    const applied = applyDelta(tree, entry.delta)

    return applied.ok
      ? ok(applied.value)
      : err({ code: "delta-rejected", revision: entry.revision, detail: applied.error.code })
  })

export type SnapshotAudit =
  | { readonly outcome: "agrees"; readonly revision: number }
  /** The fold produced a different tree — the drift this whole module exists for. */
  | { readonly outcome: "diverged"; readonly revision: number; readonly replayed: LoomTree }
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

  const history = await store.history(treeId)
  if (!history.ok) return history

  const replayed = replayTree(seed, history.value)
  if (!replayed.ok) return ok({ outcome: "unreplayable", mismatch: replayed.error })

  const agrees = JSON.stringify(replayed.value) === JSON.stringify(head.value)

  return ok(
    agrees
      ? { outcome: "agrees", revision: head.value.revision }
      : { outcome: "diverged", revision: head.value.revision, replayed: replayed.value }
  )
}
