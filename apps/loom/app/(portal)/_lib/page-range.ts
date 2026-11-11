import type { ArrivalRange, StoredActed, StoredArrivals } from "@jam-overture/loom/signals"

import { countingBeginsOf, type GoalCounters } from "./goal-range"

/**
 * What readers did on one page over the range *Signals* is read over: the
 * drawer on *By page* (`docs/portal-wireframes.md`, *1 · Signals*, *By page*:
 * *a bar per signal kind for the range*). Pure: the screen reads the page's
 * hourly counters and this says what they come to.
 *
 * Four of the five kinds are counted by the hour: page views at the door
 * (0356) and the three a reader aims at something to cause by the fold (0362).
 * Time on a part is not, so it has no figure for a range and the drawer says
 * it since counting began.
 *
 * **Counting begins with the later of the two counters**, the rule the goal
 * figure and a verdict follow (`goal-range.ts`, `measuring.ts`): a range that
 * starts before Loom counted what readers did would draw page views beside
 * presses nobody could have been counted making. Where counting began inside
 * the range the bars start there, and the drawer says so.
 */

/** One page's hourly counters over a range and the period before it. */
export type PageCounters = Omit<GoalCounters, "parts">

/** What the drawer could read of one page by the hour. */
export type PageHourly =
  /** The counters did not answer, or the page's id is not one they could be asked about. */
  | { readonly kind: "unreadable" }
  | { readonly kind: "read"; readonly range: ArrivalRange; readonly counters: PageCounters }

/** The four kinds counted by the hour, each in its own unit. */
export type KindCounts = {
  readonly viewed: number
  readonly activated: number
  readonly disclosed: number
  readonly completed: number
}

export type PageRange =
  | { readonly kind: "unreadable" }
  /** Nothing was counted by the hour before the range ended. */
  | { readonly kind: "uncounted" }
  | {
      readonly kind: "read"
      readonly counts: KindCounts
      /** Where the bars start: the range's start, or where counting began inside it. */
      readonly from: number
      readonly clipped: boolean
    }

const within =
  (range: ArrivalRange) =>
  ({ hour }: { readonly hour: number }): boolean =>
    hour >= range.from && hour < range.to

const countsOf = (
  range: ArrivalRange,
  arrivals: StoredArrivals,
  acted: StoredActed
): KindCounts => {
  const rows = acted.hours.filter(within(range))
  const sum = (count: (row: (typeof rows)[number]) => number) =>
    rows.reduce((total, row) => total + count(row), 0)

  return {
    viewed: arrivals.hours.filter(within(range)).reduce((total, row) => total + row.views, 0),
    activated: sum((row) => row.activations),
    disclosed: sum((row) => row.opens + row.closes),
    completed: sum((row) => row.completions),
  }
}

/** What readers did on the page over the range, from the hour both counters were counting. */
export const pageRangeOf = (hourly: PageHourly): PageRange => {
  if (hourly.kind === "unreadable") return hourly

  const { range, counters } = hourly
  const begins = countingBeginsOf(counters)

  if (begins === undefined || begins >= range.to) return { kind: "uncounted" }

  const from = Math.max(range.from, begins)

  return {
    kind: "read",
    counts: countsOf({ from, to: range.to }, counters.arrivals, counters.acted),
    from,
    clipped: begins > range.from,
  }
}
