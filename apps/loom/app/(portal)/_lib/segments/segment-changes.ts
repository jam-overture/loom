import type { ProposalId, Result, TreeId, TreeOperation } from "@jam-overture/loom"
import type { AudienceId } from "@jam-overture/loom/store"

/**
 * A change accepted for one segment only (0386 clause 5): the record a
 * segment's form is built from.
 *
 * A change for everyone becomes a revision of the page's copy, and the copy's
 * log is its record. A change for one segment never touches the copy, so its
 * operations, the segment and who accepted it are kept here, and the segment's
 * form in 0376's store is rebuilt from them, oldest first, whenever the page
 * it stands on moves (clause 6). What it was made from (its intent and stake)
 * is kept by its proposal id beside every other made change.
 */
export type SegmentChange = {
  readonly proposalId: ProposalId
  /** The page as the site names it, which is what its rules and forms are kept by. */
  readonly pageId: TreeId
  readonly audienceId: AudienceId
  /** Exactly the operations the Gate judged; only the page they apply to is ever re-read. */
  readonly operations: readonly TreeOperation[]
  readonly acceptedBy: string
  /** Epoch milliseconds. */
  readonly acceptedAt: number
  /**
   * When a move of the page left it no room, in epoch milliseconds; absent
   * while it is on the segment's form. A dropped change stays on the record so
   * it can be listed as *no longer fits* (clause 6).
   */
  readonly droppedAt?: number
}

/**
 * How many changes for segments one page keeps, which is what one read of a
 * page answers (0025's rule: no read without a bound). Ten segments (0371's
 * cap) with fifty changes each; accepting past it is refused rather than
 * leaving a change off a form without saying so.
 */
export const SEGMENT_CHANGES_PER_PAGE = 500

export type SegmentChangeStoreError = { readonly code: "unavailable"; readonly detail: string }

/** One application's changes for segments, scoped at construction like every store a proposal writes to. */
export interface SegmentChangeStore {
  /** Recording the same proposal twice keeps the first: a change is accepted once. */
  readonly record: (change: SegmentChange) => Promise<Result<void, SegmentChangeStoreError>>
  /**
   * A page's changes, dropped ones included, **oldest accepted first**, at
   * most {@link SEGMENT_CHANGES_PER_PAGE}.
   */
  readonly forPage: (
    pageId: TreeId
  ) => Promise<Result<readonly SegmentChange[], SegmentChangeStoreError>>
  /** Marks these changes of the page as dropped; one dropped already keeps when it was. */
  readonly drop: (
    pageId: TreeId,
    proposalIds: readonly ProposalId[],
    at: number
  ) => Promise<Result<void, SegmentChangeStoreError>>
}

/** The order `forPage` promises, for every implementation to share. Pure. */
export const acceptedOldestFirst = (changes: readonly SegmentChange[]): readonly SegmentChange[] =>
  [...changes].sort(
    (left, right) =>
      left.acceptedAt - right.acceptedAt || left.proposalId.localeCompare(right.proposalId)
  )

/** The changes still on their segment's form. Pure. */
export const standingChanges = (changes: readonly SegmentChange[]): readonly SegmentChange[] =>
  changes.filter((change) => change.droppedAt === undefined)
