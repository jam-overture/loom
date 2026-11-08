import {
  arrivalRangeBefore,
  type ArrivalRange,
  type StoredActed,
  type StoredArrivals,
} from "@jam-overture/loom/signals"

import type { Goal, PartsByPage } from "./goals/goal"
import { pagesCoveredBy, per100Of, readingSentence } from "./goals/goal-view"
import { sideOf, type Side } from "./measuring"
import {
  movementOf,
  periodBefore,
  rangeLabel,
  type RangeFigure,
  type SignalsRange,
} from "./signals-range"
import { plainMoment } from "./when"

/**
 * The primary goal's figure for the range *Signals* is read over
 * (`docs/portal-wireframes.md`, *1 · Signals*, the second of its four figures;
 * the last of 8a in `docs/portal.md`). Pure: the screen reads the project's
 * hourly counters and this says what they come to.
 *
 * **The figure is the goal's rate per 100 page views**, as *Goals* and
 * *By page* measure it (0350): its kind on its part, over the page views that
 * began on the pages it covers, each counted by the hour at the door (0356,
 * and what readers did by hour, 0362). The wireframe says *the share of readers
 * who reached it*; Loom keeps no reader to count a share of (0262), so it is
 * page views, as everywhere else the portal measures a goal.
 *
 * **Counting begins with the later of the two counters**, the rule a verdict
 * follows (`measuring.ts`): a range that starts before Loom counted what
 * readers did would read as page views nobody acted in. Where counting began
 * inside the range the figure starts there and says so, and the period before
 * is compared with only where it was counted from its first hour.
 */

/** The project's hourly counters over a range and the period before it, and the parts each page has. */
export type GoalCounters = {
  /** Page views by page and hour, project-wide, so `begins` is the project's. */
  readonly arrivals: StoredArrivals
  /** What readers did to the goal's part, on every page. */
  readonly acted: StoredActed
  /** When the project first counted anything readers did, on any part. */
  readonly actedBegins: number | undefined
  /** The parts each published page has, for a goal on every page that has its part. */
  readonly parts: PartsByPage
}

export type GoalRange =
  /** Nothing was counted by the hour before the range ended. */
  | { readonly kind: "uncounted" }
  | {
      readonly kind: "read"
      /** The range, from where counting began when that is inside it. */
      readonly current: Side
      /** The period of the same length before, `undefined` where it was not counted throughout. */
      readonly before: Side | undefined
      /** Whether counting began inside the range. */
      readonly clipped: boolean
    }

/** What the screen reads the counters over: the period before the range, and the range. */
export const goalSpanOf = (range: ArrivalRange): ArrivalRange => ({
  from: arrivalRangeBefore(range).from,
  to: range.to,
})

const latestOf = (instants: readonly (number | undefined)[]): number | undefined => {
  const known = instants.flatMap((at) => (at === undefined ? [] : [at]))

  return known.length === 0 ? undefined : Math.max(...known)
}

/**
 * The goal over a range and the period before it, on the pages it covers and
 * no other: page views of a page without its part would be readers who could
 * never have done it (`goal-view.ts`).
 */
export const goalRangeOf = (goal: Goal, range: ArrivalRange, read: GoalCounters): GoalRange => {
  const begins = latestOf([read.arrivals.begins, read.actedBegins])

  if (begins === undefined || begins >= range.to) return { kind: "uncounted" }

  const covered = pagesCoveredBy(goal, read.parts, read.acted.hours)
  const arrivals = { hours: read.arrivals.hours.filter((row) => covered.has(row.treeId)) }
  const acted = {
    hours: read.acted.hours.filter((row) => row.nodeId === goal.nodeId && covered.has(row.treeId)),
  }
  const before = arrivalRangeBefore(range)

  return {
    kind: "read",
    current: sideOf(
      { from: Math.max(range.from, begins), to: range.to },
      arrivals,
      acted,
      goal.kind
    ),
    before: begins <= before.from ? sideOf(before, arrivals, acted, goal.kind) : undefined,
    clipped: begins > range.from,
  }
}

/** What *Signals* knows of the primary goal. */
export type PrimaryGoalReading =
  /** The project has no goal yet, so the figure is not drawn (the wireframe's *shown only once one exists*). */
  | { readonly kind: "none" }
  /** The goals or the counters did not answer. */
  | { readonly kind: "unreadable" }
  | { readonly kind: "read"; readonly goal: Goal; readonly range: GoalRange }

const rateOf = (side: Side): string | undefined =>
  per100Of({ count: side.count, pageViews: side.views })

const number = (value: number): string => value.toLocaleString("en-GB")

/** The rate in the range against the period before it, in the words `changeSentence` uses for page views. */
const comparisonOf = (current: Side, before: Side | undefined, range: SignalsRange): string => {
  const period = periodBefore(range)

  if (before === undefined) return `Nothing to compare with: ${period} were not counted.`
  if (before.views === 0) return `No page views on its pages in ${period}.`
  if (before.count === 0) {
    return current.count === 0
      ? `None in ${period} either.`
      : `None in ${period}, in ${number(before.views)} page views.`
  }

  return `${movementOf(before.count / before.views, current.count / current.views)} on ${period} (${rateOf(before)} per 100).`
}

const sentencesOf = (
  goal: Goal,
  reading: Extract<GoalRange, { kind: "read" }>,
  range: SignalsRange
) => {
  const { current } = reading
  const counted =
    current.views === 0
      ? `${goal.name}: no page views on the pages it covers.`
      : `${goal.name}: ${readingSentence(goal.kind, { count: current.count, pageViews: current.views })}`
  const compared = current.views === 0 ? [] : [comparisonOf(current, reading.before, range)]
  const clipped = reading.clipped
    ? [`Counted by the hour from ${plainMoment(new Date(current.range.from).toISOString())}.`]
    : []

  return [counted, ...compared, ...clipped].join(" ")
}

/**
 * The figure beside page views in the range, or none for a project without a
 * goal. A goal or a counter that did not answer is said, never drawn as a
 * nought.
 */
export const goalFigureOf = (
  reading: PrimaryGoalReading,
  range: SignalsRange
): RangeFigure | undefined => {
  const label = `Primary goal, ${rangeLabel(range).toLocaleLowerCase("en-GB")}`

  switch (reading.kind) {
    case "none":
      return undefined
    case "unreadable":
      return {
        label: "Primary goal",
        value: "Not available",
        note: "The primary goal's figures could not be read. Try again in a moment.",
      }
    case "read": {
      const { goal, range: counted } = reading

      if (counted.kind === "uncounted") {
        return {
          label,
          value: "Not counted yet",
          note: `${goal.name}: nothing has been counted by the hour yet.`,
        }
      }

      const rate = rateOf(counted.current)

      return {
        label,
        value: rate === undefined ? "No page views" : `${rate} per 100`,
        note: sentencesOf(goal, counted, range),
      }
    }
  }
}
