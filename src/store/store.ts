import type { ProposalId, TreeId } from "../ids.js"
import { clampLimit, type PageDirection, type PageEnds } from "../paging.js"
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
  /**
   * Who allowed it, when a human had to (0029).
   *
   * Distinct from `provenance.actor`, which is who *asked*. A hold exists to put
   * a second person in the way of a change, so recording only the asker would
   * make every confirmed change look like somebody waving through their own
   * request.
   *
   * Absent on a change nobody had to allow — one the Gate accepted outright —
   * and absent on everything written before the column existed (0029), which nobody can prove the
   * approver of. It is never back-filled: the log is append-only (0016), and a
   * fact nobody observed does not belong in it.
   */
  readonly answeredBy?: string
}

export type AppendRequest = {
  readonly proposalId: ProposalId
  readonly delta: TreeDelta
  readonly provenance: Provenance
  readonly appliedAt: string
  /** Set only by the confirmation path; see `StoredRevision.answeredBy`. */
  readonly answeredBy?: string
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

/**
 * How a log is read: a page taken from one end of it, never the whole thing.
 *
 * A revision log grows once per accepted delta and is never compacted, so a read
 * that returns all of it costs more the longer a tree has been edited — fastest
 * exactly when the log is most worth reading. 0025 settled this shape for the
 * telemetry journal; a revision log is the same kind of sequence and reads the
 * same way, so the vocabulary is shared rather than reinvented.
 */
/**
 * Where a read begins. Two kinds of position, and they are not interchangeable.
 *
 * A `cursor` is the store's word: opaque, exclusive, and only meaningful because
 * a page handed it back. An `at` is the caller's word: a revision number, which
 * is public, stable, and already the entry's identity — so a caller holding one
 * can name it without having read the page it falls on.
 *
 * They are mutually exclusive in the type rather than by convention, because the
 * only alternative is a precedence rule, and a request that quietly ignores half
 * of what it was asked is the failure mode this contract avoids everywhere else.
 */
export type RevisionStart =
  | {
      /** A cursor from a previous page's `older`/`newer`, passed back unread. */
      readonly cursor?: string
      readonly at?: never
    }
  | {
      /**
       * A revision to open at. **Inclusive** — the page contains it — which is
       * the difference that matters: a caller naming this has been sent to a
       * change and wants to see it, not to resume beside it.
       *
       * `direction` still says which way the rest of the page runs: `older`
       * puts the named revision at the newest end of the page, `newer` at the
       * oldest. A revision no entry holds is not an error; the page is whatever
       * falls on the named side of it, which may be empty.
       */
      readonly at?: number
      readonly cursor?: never
    }

export type RevisionReadRequest = RevisionStart & {
  /**
   * Default `newer`, which with no cursor is the oldest page — the read a fold
   * wants, and the one `auditSnapshot` takes. `older` with no cursor is the
   * newest page, which is what a reader looking at a tree asks for.
   */
  readonly direction?: PageDirection
  readonly limit?: number
}

export type RevisionPage = PageEnds & {
  /**
   * Always ascending by `revision`, whichever end the page was taken from.
   *
   * A log is folded by `replayTree` in the order the entries were applied, and a
   * page that sometimes came back reversed would make every consumer responsible
   * for knowing which — and silently wrong when it guessed.
   */
  readonly revisions: readonly StoredRevision[]
}

export const DEFAULT_LISTING_LIMIT = 50
export const MAX_LISTING_LIMIT = 200

/**
 * Larger than a tree listing's page and smaller than the journal's. A revision
 * carries a whole delta and its provenance, so a page of these is heavier than a
 * page of listings; but unlike telemetry records, one entry is one complete
 * thing to read, so a page never splits something that has to be folded back
 * together.
 */
export const DEFAULT_REVISION_LIMIT = 100
export const MAX_REVISION_LIMIT = 500

export const clampRevisionLimit = (limit: number | undefined): number =>
  clampLimit(limit, { fallback: DEFAULT_REVISION_LIMIT, max: MAX_REVISION_LIMIT })

/**
 * The revision the first log entry produces. A tree is created at revision 0 and
 * nothing in the log corresponds to that, so 1 is the oldest position a read can
 * reach — and revisions are dense from there, one per accepted delta (0026).
 */
export const FIRST_REVISION = 1

/**
 * An inclusive revision anchor, as the exclusive bound both implementations
 * already page from.
 *
 * Density is what makes this exact rather than approximate: revisions are
 * consecutive integers, so the position just outside `at` is `at ± 1` and no
 * entry can hide between them. Shared rather than written twice, for the reason
 * `pageEnds` is — it is the part most likely to drift between two backends and
 * least likely to be noticed when it does.
 */
export const anchorBound = (at: number, direction: PageDirection): number =>
  direction === "older" ? Math.floor(at) + 1 : Math.ceil(at) - 1

/**
 * Whether an anchored page leaves entries on the side it pages away from — the
 * `resumed` a cursor gets for free and an anchor does not.
 *
 * A cursor came from a page, so entries exist at the position it names and the
 * far side is bounded by definition. An anchor is *inside* the page it produces,
 * so the far side has to be established rather than assumed: paging `older` from
 * revision 5 leaves entries newer than 5 only if the log has gone past it, and
 * paging `newer` leaves entries older only if 5 is not the first.
 *
 * Both answers come from what the store already knows — the head revision it
 * looked up to answer `not-found`, and the density that makes `FIRST_REVISION`
 * the floor — so neither costs a read.
 */
export const anchorResumes = (
  at: number,
  direction: PageDirection,
  headRevision: number
): boolean => (direction === "older" ? at < headRevision : at > FIRST_REVISION)

/**
 * Every implementation clamps the same way, so a caller cannot ask a store for
 * everything it holds by omitting a limit or naming a large one. The rule is
 * shared with every other listing in Loom; only the bounds are this one's.
 */
export const clampListingLimit = (limit: number | undefined): number =>
  clampLimit(limit, { fallback: DEFAULT_LISTING_LIMIT, max: MAX_LISTING_LIMIT })

/**
 * Three reads and two writes. `head` is the O(1) read §3 needs; `revisions` is
 * the one §6 and the portal's provenance view need; `list` is how a consumer
 * finds a tree it did not create; `append` is the only way a tree ever changes,
 * so nothing can advance a revision without leaving a record of why.
 *
 * Every read is bounded. `head` is one tree, and the other two are pages with a
 * clamped limit — so no caller can ask a store for everything it holds, whether
 * by naming a large limit or by naming none.
 *
 * `list` takes no scope argument because `head` and `revisions` take none
 * either: a store handle *is* the scope it can see. A tenant gets a handle
 * narrowed to its own trees, which is a decision the host makes once when it
 * builds the store rather than one every caller has to remember to pass — and it
 * means listing cannot reach further than reading already could.
 *
 * **Pages are ordered by `treeId`, ascending.** Not by recency, however much a
 * portal would prefer it: ordering has to be total and stable for a cursor to
 * mean anything, and `treeId` is the only key every implementation is guaranteed
 * to have. Recency is a view over data the store does not hold.
 */
export interface TreeStore {
  readonly create: (tree: LoomTree) => Promise<Result<LoomTree, StoreError>>
  readonly head: (treeId: TreeId) => Promise<Result<LoomTree, StoreError>>
  readonly revisions: (
    treeId: TreeId,
    request?: RevisionReadRequest
  ) => Promise<Result<RevisionPage, StoreError>>
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
export type TreeReader = Pick<TreeStore, "head" | "revisions">
