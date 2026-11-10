import type { IntentId, ProposalId, Result, TreeId } from "@jam-overture/loom"

/**
 * The changes a person turned down on a page, kept so the next proposal for it
 * is weighed against them (0341).
 *
 * Kept per page rather than per copy: a change turned down on one version of a
 * page is still a change somebody did not want on that page.
 */
export type TurnedDown = {
  readonly proposalId: ProposalId
  readonly pageId: TreeId
  /** What was proposed, as it was asked: the change and the figure argued for it. */
  readonly request: string
  /** Why, in the words of whoever turned it down, when they gave one. */
  readonly reason: string | null
  readonly by: string | null
  readonly at: number
}

/**
 * A change as it is turned down, with the intent it was made from: what the
 * goal it served is kept by (0352), so *Turned down* can lead with that goal as
 * every other list of changes does.
 */
export type TurnedDownChange = TurnedDown & { readonly intentId: IntentId }

/** Room for a sentence or two, which is what a reason is. */
export const MAX_REASON_LENGTH = 300

/** How many of a page's turned-down changes the AI is shown: the newest, which say most about now. */
export const REMEMBERED_PER_PAGE = 10

export type TurnedDownStoreError = { readonly code: "unavailable"; readonly detail: string }

/** One application's turned-down changes, scoped at construction. */
export interface TurnedDownStore {
  /** Recording the same proposal twice keeps the first: a change is turned down once. */
  readonly record: (entry: TurnedDownChange) => Promise<Result<void, TurnedDownStoreError>>
  /** Newest first, at most `limit`. */
  readonly forPage: (
    pageId: TreeId,
    limit: number
  ) => Promise<Result<readonly TurnedDown[], TurnedDownStoreError>>
  /** Every page's turned down at or after `at`, newest first, at most `limit`. */
  readonly since: (
    at: number,
    limit: number
  ) => Promise<Result<readonly TurnedDown[], TurnedDownStoreError>>
  /**
   * The intent each of these was made from, where it was kept: a change turned
   * down before intents were kept has none, and is left out of the map.
   */
  readonly intentsOf: (
    proposalIds: readonly ProposalId[]
  ) => Promise<Result<ReadonlyMap<ProposalId, IntentId>, TurnedDownStoreError>>
}

/** The order `forPage` promises, for every implementation to share. */
export const newestFirst = (entries: readonly TurnedDown[]): readonly TurnedDown[] =>
  [...entries].sort(
    (left, right) => right.at - left.at || left.proposalId.localeCompare(right.proposalId)
  )

/** A reason as typed, trimmed and cut to length; nothing typed is no reason. Pure. */
export const reasonFrom = (typed: unknown): string | null => {
  if (typeof typed !== "string") return null

  const trimmed = typed.trim()

  return trimmed === "" ? null : trimmed.slice(0, MAX_REASON_LENGTH)
}
