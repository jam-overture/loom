import type { ProposalId, TreeId } from "../ids.js"
import type { TreeDelta } from "../tree/delta.js"
import type { TreeError } from "../tree/errors.js"
import type { LoomTree } from "../tree/tree.js"
import type { Provenance } from "../runtime/proposal.js"
import type { Result } from "../result.js"

/**
 * Persistence: an append-only log of accepted deltas, and the current tree as a
 * materialised view of it.
 *
 * The log is the truth. Every entry is a delta with the provenance that produced
 * it, which is what makes 0001's claim real rather than aspirational — a stored
 * tree can say what it is, but only a log can say who changed it, when, and why.
 * §6 reads the same entries.
 *
 * The snapshot exists because §3 renders per request on an edge runtime. A pure
 * log would make every render a fold over the whole history, and no cache
 * invalidation fixes that, because the fold *is* the read. It also insures
 * against a subtler problem: a log is a recipe, and replaying it correctly
 * forever requires `applyDelta` to stay bit-stable forever. §1's `move`
 * convention is baked into every stored delta. With a snapshot, replay is only
 * ever needed for audit — see `auditSnapshot`, which is what turns drift from a
 * silent rewrite of history into a test failure.
 */

export type StoredRevision = {
  readonly treeId: TreeId
  /** The revision this entry produced, so `revision - 1` is what it applied to. */
  readonly revision: number
  readonly proposalId: ProposalId
  readonly delta: TreeDelta
  readonly provenance: Provenance
  /** When the runtime applied it, which is not when the model produced it. */
  readonly appliedAt: string
}

export type AppendRequest = {
  readonly proposalId: ProposalId
  readonly delta: TreeDelta
  readonly provenance: Provenance
  readonly appliedAt: string
}

export type StoreError =
  /** No tree under this id — distinct from a tree with an empty history. */
  | { readonly code: "not-found"; readonly treeId: TreeId }
  | { readonly code: "already-exists"; readonly treeId: TreeId }
  /**
   * The delta names a base revision that is not the current head. This is the
   * whole of concurrency control: two writers racing at the same base means the
   * second one is refused rather than silently applied to a tree it never saw.
   */
  | {
      readonly code: "revision-conflict"
      readonly treeId: TreeId
      readonly expected: number
      readonly found: number
    }
  | { readonly code: "delta-rejected"; readonly treeId: TreeId; readonly error: TreeError }
  | { readonly code: "unavailable"; readonly detail: string }

/**
 * Two reads and two writes. `head` is the O(1) read §3 needs; `history` is the
 * one §6 and the portal's provenance view need; `append` is the only way a tree
 * ever changes, so nothing can advance a revision without leaving a record of
 * why.
 */
export interface TreeStore {
  readonly create: (tree: LoomTree) => Promise<Result<LoomTree, StoreError>>
  readonly head: (treeId: TreeId) => Promise<Result<LoomTree, StoreError>>
  readonly history: (treeId: TreeId) => Promise<Result<readonly StoredRevision[], StoreError>>
  readonly append: (
    treeId: TreeId,
    request: AppendRequest
  ) => Promise<Result<LoomTree, StoreError>>
}

export const describeStoreError = (error: StoreError): string => {
  switch (error.code) {
    case "not-found":
      return `no tree stored under ${error.treeId}`
    case "already-exists":
      return `${error.treeId} already exists; a tree is created once`
    case "revision-conflict":
      return `${error.treeId} moved on: the delta applies to revision ${error.expected}, but head is ${error.found}`
    case "delta-rejected":
      return `the delta did not apply to ${error.treeId}: ${error.error.code}`
    case "unavailable":
      return `storage is unavailable: ${error.detail}`
  }
}
