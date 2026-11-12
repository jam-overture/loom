import { ARRIVAL_HOUR_MS, type ArrivalRange } from "@jam-overture/loom/signals"

import type { Goal } from "./goals/goal"
import { readingSentence } from "./goals/goal-view"
import { countingBeginsOf, type GoalCounters } from "./goal-range"
import {
  MEASURING_DAYS,
  MEASURING_MS,
  MIN_VIEWS_A_SIDE,
  sideOf,
  verdictOf,
  type Side,
  type Verdict,
} from "./measuring"
import { plainMoment } from "./when"

/**
 * What a change waiting for review can expect on its goal (*What it expects*
 * in *For review*'s drawer, `docs/portal-wireframes.md` *2 · For review*).
 * Pure: the screen reads the page's hourly counters and this says what they
 * come to.
 *
 * **It is not a prediction of the change's effect.** How to predict one is a
 * choice the maintainer has not made, and the portal renders no invented
 * figure. What the counters do say is where the goal stands on the page now,
 * and, since the verdict's rules are fixed (`measuring.ts`), the band a result
 * has to leave before it reads *Helped* or *Hurt*: at the page's current
 * traffic, the rate after the change goes live that the agreed test would
 * call a rise, and the one it would call a fall. Between them it reads
 * *No clear change*. Both edges come from `verdictOf` itself, so the band
 * cannot disagree with the result the change is later given.
 *
 * The before side the change is later measured against is the last 14 days on
 * the page when it goes live; this reads the last 14 days now, which is the
 * nearest thing the counters hold, and assumes the after side has as many page
 * views. Where counting began inside the 14 days, the page views counted are
 * scaled to 14 days and the words say so.
 */

/** The band a result has to leave, in counts on a side of `views` page views. */
export type Band =
  /** At this traffic a side falls short of the page views a verdict needs. */
  | { readonly kind: "too-few" }
  /** Readers did it more times than there were page views, so the test cannot weigh it. */
  | { readonly kind: "not-a-share" }
  | {
      readonly kind: "edges"
      /** The fewest the goal's kind on a side that reads *Helped*, `undefined` where none would. */
      readonly helpedFrom: number | undefined
      /** The most that reads *Hurt*, `undefined` where none would. */
      readonly hurtTo: number | undefined
    }

export type Expectation =
  /** Nothing was counted by the hour before now. */
  | { readonly kind: "uncounted" }
  /** Counted, and no page views of the page in the stretch read. */
  | { readonly kind: "no-views"; readonly range: ArrivalRange; readonly clipped: boolean }
  | {
      readonly kind: "read"
      /** The goal on the page over the stretch read. */
      readonly now: Side
      /** Whether counting began inside the last 14 days. */
      readonly clipped: boolean
      /** The page views a side would have at the current traffic. */
      readonly views: number
      readonly band: Band
    }

const floorHour = (at: number): number => Math.floor(at / ARRIVAL_HOUR_MS) * ARRIVAL_HOUR_MS

/** The last 14 whole days of hours before `now`: what *What it expects* reads the counters over. */
export const expectationRangeOf = (now: number): ArrivalRange => {
  const to = floorHour(now)

  return { from: to - MEASURING_MS, to }
}

/**
 * The smallest whole number in `[low, high]` for which `holds` is true, where
 * `holds` is false up to some point and true from it; `undefined` where it is
 * never true.
 */
const firstHolding = (
  low: number,
  high: number,
  holds: (count: number) => boolean
): number | undefined => {
  const search = (from: number, to: number): number =>
    from >= to
      ? from
      : holds(Math.floor((from + to) / 2))
        ? search(from, Math.floor((from + to) / 2))
        : search(Math.floor((from + to) / 2) + 1, to)
  const found = search(low, high)

  return holds(found) ? found : undefined
}

/**
 * The edges of *No clear change* for a before side, on an after side with as
 * many page views. A two-proportion test's statistic only grows with the after
 * side's count, so each edge is found by halving rather than by trying every
 * count.
 */
export const edgesOf = (before: Side): Extract<Band, { readonly kind: "edges" }> => {
  const verdictAt = (count: number): Verdict["kind"] =>
    verdictOf(before, { range: before.range, views: before.views, count }).kind
  const firstNotHurt = firstHolding(0, before.views, (count) => verdictAt(count) !== "hurt")

  return {
    kind: "edges",
    helpedFrom: firstHolding(0, before.views, (count) => verdictAt(count) === "helped"),
    hurtTo:
      firstNotHurt === undefined ? before.views : firstNotHurt === 0 ? undefined : firstNotHurt - 1,
  }
}

/** The band at the current traffic: a side of `views` page views at the rate read. */
const bandOf = (now: Side, views: number): Band => {
  if (views < MIN_VIEWS_A_SIDE) return { kind: "too-few" }
  if (now.count > now.views) return { kind: "not-a-share" }

  return edgesOf({
    range: now.range,
    views,
    count: Math.round((now.count / now.views) * views),
  })
}

/**
 * What a change waiting on a page can expect on its goal, from the page's
 * counters over the last 14 days (`expectationRangeOf`): page views of the
 * page, what readers did to the goal's part on it, and when the project first
 * counted anything readers did.
 */
export const expectationOf = (
  kind: Goal["kind"],
  range: ArrivalRange,
  read: Omit<GoalCounters, "parts">
): Expectation => {
  const begins = countingBeginsOf(read)

  if (begins === undefined || begins >= range.to) return { kind: "uncounted" }

  const counted = { from: Math.max(range.from, begins), to: range.to }
  const clipped = counted.from > range.from
  const now = sideOf(counted, read.arrivals, read.acted, kind)

  if (now.views === 0) return { kind: "no-views", range: counted, clipped }

  const views = Math.round((now.views * (range.to - range.from)) / (counted.to - counted.from))

  return { kind: "read", now, clipped, views, band: bandOf(now, views) }
}

const number = (value: number): string => value.toLocaleString("en-GB")

/** The most decimals a rate is printed with, to tell an edge apart from the rate now. */
const MOST_DECIMALS = 3

/** A share as a figure per hundred, to so many decimals. */
const fixed = (share: number, decimals: number): string =>
  (share * 100).toLocaleString("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

/**
 * A count over page views per hundred, with one decimal, or more where one
 * would print it the same as the rate it is set beside, so an edge is never
 * written as the figure it has to leave.
 */
const per100Beside = (count: number, views: number, beside: number): string => {
  const share = count / views
  const decimals =
    [1, 2].find((places) => fixed(share, places) !== fixed(beside, places)) ?? MOST_DECIMALS

  return fixed(share, decimals)
}

/** *If the page keeps about 2,000 page views every 14 days, …*, or why there is no band. */
const bandWords = (band: Band, now: Side, views: number): string => {
  const traffic = `about ${number(views)} page views every ${MEASURING_DAYS} days`

  switch (band.kind) {
    case "too-few":
      return `At ${traffic}, a side would fall short of the ${number(MIN_VIEWS_A_SIDE)} page views a result needs, so it would read Too early unless the page gets busier.`
    case "not-a-share":
      return "Readers did it more times than there were page views, so the agreed test cannot weigh it and a result could only read No clear change."
    case "edges": {
      const rate = now.count / now.views
      const helped =
        band.helpedFrom === undefined
          ? undefined
          : `Helped at ${per100Beside(band.helpedFrom, views, rate)} per 100 or more`
      const hurt =
        band.hurtTo === undefined
          ? undefined
          : `Hurt at ${per100Beside(band.hurtTo, views, rate)} per 100 or less`
      const edges = [helped, hurt].filter((words) => words !== undefined)
      const missing = [
        ...(helped === undefined ? ["No rise could read Helped at that traffic."] : []),
        ...(hurt === undefined ? ["No fall could read Hurt at that traffic."] : []),
      ]
      const reads =
        edges.length === 0
          ? []
          : [
              `If the page keeps ${traffic}, the change reads ${edges.join(" and ")} over the ${MEASURING_DAYS} days after it goes live, and No clear change in between.`,
            ]

      return [...reads, ...missing, "Loom does not predict where in that band it will land."].join(
        " "
      )
    }
  }
}

/** How a change is measured on its goal once it is live, whatever else can be said. */
export const measuredSentence = (goal: string): string =>
  `Once it is live it is measured on “${goal}” for the ${MEASURING_DAYS} days after against the ${MEASURING_DAYS} days before.`

/**
 * What *What it expects* says for a change on a page whose goal is read: where
 * the goal stands on the page, the band a result has to leave, and how it is
 * measured: one paragraph each, plain words first.
 */
export const expectationWords = (
  goal: Pick<Goal, "name" | "kind">,
  expectation: Expectation
): readonly string[] => {
  const measured = measuredSentence(goal.name)
  const since = (range: ArrivalRange, clipped: boolean): string =>
    clipped
      ? `since counting began on ${plainMoment(new Date(range.from).toISOString())}`
      : `over the last ${MEASURING_DAYS} days`

  switch (expectation.kind) {
    case "uncounted":
      return [
        `Nothing has been counted on this page by the hour yet, so where “${goal.name}” stands before the change cannot be said.`,
        measured,
      ]
    case "no-views":
      return [
        `This page had no page views ${since(expectation.range, expectation.clipped)}, so there is nothing yet to measure “${goal.name}” against.`,
        measured,
      ]
    case "read": {
      const { now, clipped, views, band } = expectation
      const stands = `On this page ${since(now.range, clipped)}, “${goal.name}” counted ${readingSentence(goal.kind, { count: now.count, pageViews: now.views })}`

      return [stands, bandWords(band, now, views), measured]
    }
  }
}
