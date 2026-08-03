import type { TreeId } from "../ids.js"
import { err, ok, reduceResult, type Result } from "../result.js"
import { applyDelta } from "../tree/apply.js"
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
  tree: LoomTree,
  cursor?: string
): Promise<Result<Result<LoomTree, ReplayMismatch>, StoreError>> => {
  const page = await store.revisions(treeId, cursor === undefined ? {} : { cursor })
  if (!page.ok) return page

  const folded = replayTree(tree, page.value.revisions)
  if (!folded.ok) return ok(folded)

  return page.value.newer === null
    ? ok(folded)
    : await foldLog(store, treeId, folded.value, page.value.newer)
}

/** A point in the log: the entry, and the tree it was applied to. */
export type ReplayedPoint = {
  readonly tree: LoomTree
  readonly entry: StoredRevision
}

export type MissingRevision = { readonly code: "no-such-revision"; readonly revision: number }

/**
 * Walks the log to just before `revision` and stops there, returning the tree
 * that entry saw and the entry itself.
 *
 * This is what inverting a committed change needs, and it needs it because an
 * inverse is a function of the state its delta observed: the inverse of
 * "remove this card" has to carry the card, and the card only exists on the
 * near side of the removal. The stored snapshot is the far side.
 *
 * Same seed argument, and the same limitation, as `auditSnapshot` — a host that
 * cannot reproduce revision 0 cannot replay, so it cannot undo either. Better a
 * refusal that says so than an inverse assembled from the tree it is meant to
 * be undoing.
 */
export const replayBefore = async (
  store: TreeReader,
  treeId: TreeId,
  seed: LoomTree,
  revision: number
): Promise<Result<Result<ReplayedPoint, ReplayMismatch>, StoreError | MissingRevision>> => {
  if (revision <= seed.revision) return err({ code: "no-such-revision", revision })

  let tree = seed
  let cursor: string | undefined

  for (;;) {
    const page = await store.revisions(treeId, cursor === undefined ? {} : { cursor })
    if (!page.ok) return page

    const before = page.value.revisions.filter((entry) => entry.revision < revision)
    const folded = replayTree(tree, before)
    if (!folded.ok) return ok(folded)
    tree = folded.value

    const entry = page.value.revisions.find((candidate) => candidate.revision === revision)
    if (entry) {
      return tree.revision === revision - 1
        ? ok(ok({ tree, entry }))
        : ok(err({ code: "revision-gap", expected: revision - 1, found: tree.revision }))
    }

    if (page.value.newer === null) return err({ code: "no-such-revision", revision })
    cursor = page.value.newer
  }
}

export type SnapshotAudit =
  | { readonly outcome: "agrees"; readonly revision: number }
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

  const folded = await foldLog(store, treeId, seed)
  if (!folded.ok) return folded

  const replayed = folded.value
  if (!replayed.ok) return ok({ outcome: "unreplayable", mismatch: replayed.error })

  const agrees = JSON.stringify(replayed.value) === JSON.stringify(head.value)

  return ok(
    agrees
      ? { outcome: "agrees", revision: head.value.revision }
      : {
          outcome: "diverged",
          revision: head.value.revision,
          stored: head.value,
          replayed: replayed.value,
        }
  )
}
