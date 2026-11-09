import type { IntentId, ProposalId, TreeId } from "@jam-overture/loom"

import { DAY_MS } from "./daily-rate"
import type { ProposalGoal } from "./goals/serving"
import { requestPartsOf } from "./proposing/brief"
import type { TurnedDown } from "./proposing/turned-down"

/**
 * *Turned down*: what a person said no to on the project's pages, recently
 * (`docs/portal-wireframes.md`, *2 · For review*, *Turned down recently: N ·
 * see them*). Pure.
 *
 * "Recently" is the last thirty days, the stretch the portal keeps a reader's
 * events for (0349), so the list and the signals it was weighed on cover the
 * same time.
 */
export const RECENT_DAYS = 30

/** The most changes read at once: far more than a month of daily proposals, and a bound on the read. */
export const RECENT_LIMIT = 500

/** Where *recently* starts, for a moment. */
export const recentSince = (now: number): number => now - RECENT_DAYS * DAY_MS

/** How many were turned down recently, and whether there may be more than were read. */
export type RecentCount = { readonly count: number; readonly more: boolean }

/** The count of what was read, which may have stopped at the limit. */
export const recentCountOf = (entries: readonly TurnedDown[]): RecentCount => ({
  count: entries.length,
  more: entries.length >= RECENT_LIMIT,
})

/** The count in words: a read that stopped at the limit says so rather than claim an exact figure. */
export const countWords = ({ count, more }: RecentCount): string =>
  more ? `${count} or more` : String(count)

/**
 * The goal a change turned down had served (0352), where it is known: its name,
 * or `null` for a change raised before proposals named their goal. A change
 * turned down before its intent was kept with it, or whose goal could not be
 * read, is *not recorded*, and the list names no goal for it rather than guess.
 */
export type TurnedDownGoal =
  | { readonly kind: "recorded"; readonly goal: string | null }
  | { readonly kind: "not-recorded" }

export const NOT_RECORDED: TurnedDownGoal = { kind: "not-recorded" }

/** The goal each change turned down served, from the intent it was made from and the goal kept by that intent. Pure. */
export const turnedDownGoalsOf =
  (intents: ReadonlyMap<ProposalId, IntentId>, served: ReadonlyMap<IntentId, ProposalGoal>) =>
  (proposalId: ProposalId): TurnedDownGoal => {
    const intentId = intents.get(proposalId)

    return intentId === undefined
      ? NOT_RECORDED
      : { kind: "recorded", goal: served.get(intentId)?.name ?? null }
  }

/** One change turned down, as the list says it. */
export type TurnedDownRow = {
  readonly proposalId: ProposalId
  readonly pageId: TreeId
  /** The page by its name, or `null` where the site gave none or it could not be read. */
  readonly pageName: string | null
  /** The change as proposed, without the figure argued for it. */
  readonly change: string
  /** The figure Loom gave for it, where the request carries one. */
  readonly why: string | null
  /** Why it was turned down, in the words of whoever did, when they gave one. */
  readonly reason: string | null
  readonly by: string | null
  readonly at: number
  readonly goal: TurnedDownGoal
}

export const turnedDownRowOf = (
  entry: TurnedDown,
  names: ReadonlyMap<string, string>,
  goal: TurnedDownGoal
): TurnedDownRow => {
  const parts = requestPartsOf(entry.request)

  return {
    proposalId: entry.proposalId,
    pageId: entry.pageId,
    pageName: names.get(entry.pageId) ?? null,
    change: parts.change,
    why: parts.why,
    reason: entry.reason,
    by: entry.by,
    at: entry.at,
    goal,
  }
}
