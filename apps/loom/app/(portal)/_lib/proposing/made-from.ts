import type { IntentId, ProposalId, Result, StakeLevel } from "@jam-overture/loom"
import type { WriteOutcome } from "@jam-overture/loom/write"

/**
 * What a change made on a page's copy was made from, which the copy's record
 * does not keep (unit 8, `docs/portal-wireframes.md` section 4).
 *
 * A change on the record carries its proposal id and nothing of the hold it
 * came out of: the intent it was made from, which is what the goal it serves
 * is kept by (0352), and the stake the Gate put on it. Both are gone once the
 * hold is answered. So when a change is made, by *Accept* or by the Gate
 * outright, the two are kept here by its proposal id, and the timeline from
 * *Accept* to live leads with the goal and says the stake.
 *
 * Keeping it never decides whether the change is made: it is written after the
 * change, and a change it could not be kept for says on its timeline that its
 * goal was not recorded.
 */
export type MadeFrom = {
  readonly proposalId: ProposalId
  readonly intentId: IntentId
  readonly stakes: StakeLevel
  /** When the change was made, in epoch milliseconds. */
  readonly at: number
}

/** What a write that made a change was made from; `undefined` for one that made nothing. Pure. */
export const madeFromOf = (outcome: WriteOutcome, at: number): MadeFrom | undefined =>
  outcome.kind === "committed"
    ? {
        proposalId: outcome.proposal.proposalId,
        intentId: outcome.proposal.intentId,
        stakes: outcome.disposition.stakes,
        at,
      }
    : undefined

export type MadeFromStoreError = {
  readonly code: "unavailable"
  readonly detail: string
}

/** One application's record of what each made change was made from, scoped at construction. */
export interface MadeFromStore {
  /** Recording the same proposal twice keeps the first: a replay re-makes a change, it does not remake its origin. */
  readonly record: (made: MadeFrom) => Promise<Result<void, MadeFromStoreError>>
  /** What these proposals were made from; one nothing was recorded for is absent from the map. */
  readonly forProposals: (
    proposalIds: readonly ProposalId[]
  ) => Promise<Result<ReadonlyMap<ProposalId, MadeFrom>, MadeFromStoreError>>
}
