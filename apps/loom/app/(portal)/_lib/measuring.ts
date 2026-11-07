import {
  actedCountOf,
  ARRIVAL_HOUR_MS,
  type ArrivalRange,
  type StoredActed,
  type StoredArrivals,
} from "@jam-overture/loom/signals"

import type { GoalKind } from "./goals/goal"
import { readingSentence } from "./goals/goal-view"
import { plainDay } from "./when"

/**
 * Whether an accepted change helped its goal (8c of `docs/portal.md`;
 * `docs/portal-wireframes.md`, *5 · Pages · History*, and the *Result* step of
 * section 4). Pure: the screen reads the hourly counters and this says what
 * they come to.
 *
 * The rules are the maintainer's, settled on 5 November and recorded in the
 * wireframes' *Settled by the maintainer on 5 November*:
 *
 * - **14 days each side**: the last 14 days on the old version against the
 *   first 14 on the new one, from when the change went live (0358 clause 7).
 *   When the old version was live for less than that, the before side is
 *   however long it was, and the result says so.
 * - **At least 1,000 page views a side** before any verdict but *Too early*.
 * - ***Helped* or *Hurt* only where a two-proportion test holds at 95%**,
 *   otherwise *No clear change*. The test stays behind a disclosure.
 *
 * The figure on each side is the goal's own (0350 clause 4): what readers did
 * to the goal's part on the page, over the page views that began on it, both
 * counted by the hour at the door (0356, and `acted.ts` in the intake).
 */

export const MEASURING_DAYS = 14

const DAY_MS = 24 * 60 * 60 * 1000

export const MEASURING_MS = MEASURING_DAYS * DAY_MS

/** Page views each side needs before Loom says anything but *Too early*. */
export const MIN_VIEWS_A_SIDE = 1_000

/** The two-sided 95% point of the standard normal distribution. */
const Z_95 = 1.959963984540054

const floorHour = (at: number): number => Math.floor(at / ARRIVAL_HOUR_MS) * ARRIVAL_HOUR_MS

const ceilHour = (at: number): number => Math.ceil(at / ARRIVAL_HOUR_MS) * ARRIVAL_HOUR_MS

/**
 * When the page changed around the change being measured: the last time before
 * it went live, and the first time after. A change is measured against its own
 * version only, so another change going live, or the site publishing a newer
 * version, ends a side early.
 */
export type Bounds = {
  readonly previous?: number
  readonly next?: number
}

/** The two stretches compared, each whole hours, closed at the start and open at the end. */
export type Windows = {
  readonly before: ArrivalRange
  readonly after: ArrivalRange
}

/**
 * The two sides of a change that went live at `liveAt`.
 *
 * The hour it went live in is on neither side: its page views are partly of the
 * old version and partly of the new, and an hourly counter cannot tell them
 * apart. Every other hour is wholly on one side or the other.
 *
 * The before side starts no earlier than the page's previous change and no
 * earlier than counting began (`countingSince`), so a side is never padded with
 * hours nothing was counted in. The after side ends no later than the page's
 * next change.
 */
export const windowsOf = (liveAt: number, bounds: Bounds, countingSince?: number): Windows => {
  const beforeTo = floorHour(liveAt)
  const afterFrom = ceilHour(liveAt)
  const beforeFrom = Math.max(
    beforeTo - MEASURING_MS,
    ...[bounds.previous, countingSince].flatMap((at) => (at === undefined ? [] : [ceilHour(at)]))
  )
  const afterTo =
    bounds.next === undefined
      ? afterFrom + MEASURING_MS
      : Math.min(afterFrom + MEASURING_MS, floorHour(bounds.next))

  return {
    before: { from: Math.min(beforeFrom, beforeTo), to: beforeTo },
    after: { from: afterFrom, to: Math.max(afterFrom, afterTo) },
  }
}

/** The widest stretch either side could take, which is what one read of each counter covers. */
export const spanOf = (windows: Windows): ArrivalRange => ({
  from: windows.before.from,
  to: windows.after.to,
})

/** Whether a side is shorter than the agreed 14 days. */
export const isShort = (range: ArrivalRange): boolean => range.to - range.from < MEASURING_MS

/** One side: the goal's count and the page views it happened in. */
export type Side = {
  readonly range: ArrivalRange
  readonly views: number
  readonly count: number
}

const within = (range: ArrivalRange, hour: number): boolean => hour >= range.from && hour < range.to

/** A side's figures from reads of the page's counters that cover it. */
export const sideOf = (
  range: ArrivalRange,
  arrivals: StoredArrivals,
  acted: StoredActed,
  kind: GoalKind
): Side => ({
  range,
  views: arrivals.hours
    .filter((row) => within(range, row.hour))
    .reduce((sum, row) => sum + row.views, 0),
  count: acted.hours
    .filter((row) => within(range, row.hour))
    .reduce((sum, row) => sum + actedCountOf(row, kind), 0),
})

/** A two-proportion test, or why there could be none. */
export type Test =
  | { readonly kind: "tested"; readonly z: number; readonly p: number }
  /**
   * Readers did it more times than there were page views on a side, so the
   * figure is not a share of page views and a two-proportion test does not
   * apply to it.
   */
  | { readonly kind: "not-a-share" }
  /** Nobody did it on either side, or every page view did: there is nothing to compare. */
  | { readonly kind: "no-variation" }

export type Verdict =
  | { readonly kind: "too-early"; readonly needs: number }
  | { readonly kind: "helped" | "hurt" | "no-clear-change"; readonly test: Test }

/**
 * The complementary error function, by Abramowitz and Stegun 7.1.26 (absolute
 * error under 1.5e-7). It only prints the p-value behind the disclosure: the
 * verdict is decided on the z-score itself.
 */
const erfc = (x: number): number => {
  const t = 1 / (1 + 0.3275911 * x)
  const poly =
    t *
    (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))))

  return poly * Math.exp(-x * x)
}

/** The pooled two-proportion z-test of the after side against the before side. */
export const testOf = (before: Side, after: Side): Test => {
  if (before.count > before.views || after.count > after.views) return { kind: "not-a-share" }

  const pooled = (before.count + after.count) / (before.views + after.views)
  const spread = Math.sqrt(pooled * (1 - pooled) * (1 / before.views + 1 / after.views))

  if (spread === 0) return { kind: "no-variation" }

  const z = (after.count / after.views - before.count / before.views) / spread

  return { kind: "tested", z, p: erfc(Math.abs(z) / Math.SQRT2) }
}

/**
 * The verdict on a change whose sides are read. Every goal is something more
 * of is better (0350: presses, sends and opens of a part), so a rise that
 * holds up helped and a fall that holds up hurt.
 */
export const verdictOf = (before: Side, after: Side): Verdict => {
  const needs = Math.max(0, MIN_VIEWS_A_SIDE - Math.min(before.views, after.views))

  if (needs > 0) return { kind: "too-early", needs }

  const test = testOf(before, after)

  if (test.kind !== "tested" || Math.abs(test.z) < Z_95) return { kind: "no-clear-change", test }

  return { kind: test.z > 0 ? "helped" : "hurt", test }
}

/**
 * What the screen knows of a change's measurement.
 *
 * `not-live` is a change no reader has been given yet; `no-goal` one with no
 * goal recorded to measure it on (made before goals were kept, or from a
 * proposal that named none); `unreadable` one whose counters did not answer.
 */
export type Measurement =
  | { readonly kind: "not-live" }
  | { readonly kind: "no-goal"; readonly liveAt: number }
  | { readonly kind: "unreadable"; readonly windows: Windows }
  | {
      readonly kind: "read"
      readonly goal: GoalKind
      readonly windows: Windows
      readonly before: Side
      readonly after: Side
    }

/**
 * The measurement from one read of each counter over the widest span, and the
 * hour counting began. Counting begins with the later of the two counters: a
 * deployment that counted page views before it counted what readers did must
 * not report a before side with no presses in it.
 */
export const measurementOf = (
  liveAt: number,
  bounds: Bounds,
  goal: GoalKind,
  read: {
    readonly arrivals: StoredArrivals
    readonly acted: StoredActed
    /** When the project first counted anything readers did, on any part. */
    readonly actedBegins: number | undefined
  }
): Measurement => {
  const begins = [read.arrivals.begins, read.actedBegins].flatMap((at) =>
    at === undefined ? [] : [at]
  )
  const windows = windowsOf(liveAt, bounds, begins.length === 0 ? undefined : Math.max(...begins))

  return {
    kind: "read",
    goal,
    windows,
    before: sideOf(windows.before, read.arrivals, read.acted, goal),
    after: sideOf(windows.after, read.arrivals, read.acted, goal),
  }
}

const number = (value: number): string => value.toLocaleString("en-GB")

const day = (at: number): string => plainDay(new Date(at).toISOString())

const daysOf = (range: ArrivalRange): string => {
  const days = Math.round(((range.to - range.from) / DAY_MS) * 10) / 10

  return `${number(days)} ${days === 1 ? "day" : "days"}`
}

const figuresOf = (side: Side, goal: GoalKind): string =>
  side.views === 0
    ? "no page views."
    : readingSentence(goal, { count: side.count, pageViews: side.views })

/** *Before (2 November 2026 to 16 November 2026, 14 days): 12 presses in 480 page views, 2.5 per 100.* */
export const sideSentence = (label: "Before" | "After", side: Side, goal: GoalKind): string =>
  side.range.to <= side.range.from
    ? `${label}: nothing was counted.`
    : `${label} (${day(side.range.from)} to ${day(side.range.to)}, ${daysOf(side.range)}): ${figuresOf(side, goal)}`

/** The after side while it is still being counted, which has no end to name yet. */
export const soFarSentence = (side: Side, goal: GoalKind): string =>
  `So far: ${figuresOf(side, goal)}`

/** The verdict as the wireframe names it. */
export const VERDICT_LABELS: Readonly<Record<Verdict["kind"], string>> = {
  helped: "Helped",
  hurt: "Hurt",
  "no-clear-change": "No clear change",
  "too-early": "Too early",
}

/** What the verdict means, in a sentence a person reads under it. */
export const verdictSentence = (verdict: Verdict): string => {
  switch (verdict.kind) {
    case "helped":
      return "Readers did it more often after the change, by more than chance would explain."
    case "hurt":
      return "Readers did it less often after the change, by more than chance would explain."
    case "too-early":
      return `Each side needs ${number(MIN_VIEWS_A_SIDE)} page views before Loom can say; the thinner side was ${number(verdict.needs)} short.`
    case "no-clear-change":
      switch (verdict.test.kind) {
        case "tested":
          return "Any difference between the two sides is small enough to be chance."
        case "not-a-share":
          return "Readers did it more times than there were page views, so the figure is not a share of page views and the agreed test cannot weigh it."
        case "no-variation":
          return "Nothing moved: the figure was the same on both sides."
      }
  }
}

/** The test as it was taken, for the disclosure under the verdict. */
export const testLines = (verdict: Verdict): readonly string[] => {
  if (verdict.kind === "too-early") {
    return [`No test is taken below ${number(MIN_VIEWS_A_SIDE)} page views a side.`]
  }

  const test = verdict.test

  if (test.kind !== "tested") {
    return ["No two-proportion test could be taken; the verdict is No clear change."]
  }

  return [
    "A pooled two-proportion test of the after side against the before side, two-sided, at 95%.",
    `z = ${test.z.toFixed(2)}, p ${test.p < 0.001 ? "< 0.001" : `= ${test.p.toFixed(3)}`}; Helped or Hurt needs |z| of at least ${Z_95.toFixed(2)}.`,
  ]
}
