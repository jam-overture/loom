import type { ProposalId, TreeId } from "../ids.js"
import type { TreeDelta } from "../tree/delta.js"
import type { LoomTree } from "../tree/tree.js"
import type { Provenance } from "../runtime/proposal.js"
import type { Result } from "../result.js"

import type { StoreError } from "./errors.js"

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

/**
 * What a listing says about a tree without loading it.
 *
 * `revision` is the whole summary, and it is enough: it starts at 0 and
 * increments once per accepted delta, so it is also the number of entries in the
 * log. There is no timestamp because a `LoomTree` carries none — §1 kept time out
 * of the document deliberately, and a listing that invented one would be a field
 * only some implementations could fill honestly.
 */
export type TreeListing = {
  readonly treeId: TreeId
  readonly revision: number
}

export type ListRequest = {
  /**
   * Opaque to the caller: the previous page's `cursor`, passed back unread.
   * Absent starts at the beginning. A cursor naming a tree that has since been
   * removed is not an error — listing resumes from the next key after it.
   */
  readonly cursor?: string
  /** Clamped by the implementation — see `clampListingLimit`. */
  readonly limit?: number
}

export type TreeListPage = {
  readonly trees: readonly TreeListing[]
  /** `null` when this was the last page. */
  readonly cursor: string | null
}

export const DEFAULT_LISTING_LIMIT = 50
export const MAX_LISTING_LIMIT = 200

/**
 * Every implementation clamps the same way, so a caller cannot ask a store for
 * everything it holds by omitting a limit or naming a large one.
 */
export const clampListingLimit = (limit: number | undefined): number => {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_LISTING_LIMIT

  return Math.min(MAX_LISTING_LIMIT, Math.max(1, Math.floor(limit)))
}

/**
 * Three reads and two writes. `head` is the O(1) read §3 needs; `history` is the
 * one §6 and the portal's provenance view need; `list` is how a consumer finds a
 * tree it did not create; `append` is the only way a tree ever changes, so
 * nothing can advance a revision without leaving a record of why.
 *
 * `list` takes no scope argument because `head` and `history` take none either: a
 * store handle *is* the scope it can see. A tenant gets a handle narrowed to its
 * own trees, which is a decision the host makes once when it builds the store
 * rather than one every caller has to remember to pass — and it means listing
 * cannot reach further than reading already could.
 *
 * **Pages are ordered by `treeId`, ascending.** Not by recency, however much a
 * portal would prefer it: ordering has to be total and stable for a cursor to
 * mean anything, and `treeId` is the only key every implementation is guaranteed
 * to have. Recency is a view over data the store does not hold.
 */
export interface TreeStore {
  readonly create: (tree: LoomTree) => Promise<Result<LoomTree, StoreError>>
  readonly head: (treeId: TreeId) => Promise<Result<LoomTree, StoreError>>
  readonly history: (treeId: TreeId) => Promise<Result<readonly StoredRevision[], StoreError>>
  readonly list: (request?: ListRequest) => Promise<Result<TreeListPage, StoreError>>
  readonly append: (
    treeId: TreeId,
    request: AppendRequest
  ) => Promise<Result<LoomTree, StoreError>>
}

/**
 * The read half, for consumers that never write.
 *
 * Depending on the whole store to read from it is what forces a renderer's tree
 * source, or a snapshot audit, to be handed something that can also append. It
 * also makes every stub grow a method the code under test never calls, which is
 * how a test starts describing the interface instead of the behaviour.
 */
export type TreeReader = Pick<TreeStore, "head" | "history">
