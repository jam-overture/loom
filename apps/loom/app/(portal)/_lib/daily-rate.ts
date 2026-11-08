import {
  actedCountOf,
  type ArrivalRange,
  type StoredActed,
  type StoredArrivals,
} from "@jam-overture/loom/signals"

import type { GoalKind } from "./goals/goal"
import { per100Of, readingSentence } from "./goals/goal-view"
import type { Mark } from "./page-history"
import { plainDay } from "./when"

/**
 * The chart at the top of a page's history (8c of `docs/portal.md`;
 * `docs/portal-wireframes.md`, *5 · Pages · History*): the goal's daily rate
 * over the last 8 weeks, each day's bar coloured by where the version it was
 * on came from, with the version named at each boundary. Pure: the screen
 * reads the page's hourly counters and this says what they come to.
 *
 * **A day is a UTC day**, as every date the portal prints is (`when.ts`), and
 * its rate is the goal's count over the page views that began on the page that
 * day, both counted by the hour at the door (0356, and `acted.ts` in the
 * intake): the same figure each side of a verdict rests on, a day at a time.
 *
 * A day takes the colour of the version the page was on when the day ended (or
 * now, for today): a change that went live part way through a day is marked on
 * that day, and the day is counted whole. The chart is for seeing a trend; the
 * verdicts on the cards below it are the measurement.
 */

export const CHART_DAYS = 56

export const DAY_MS = 24 * 60 * 60 * 1000

/** Where the version a day was on came from: a Loom change, the site's own edit, or the page as Loom first saw it. */
export type DayOrigin = Mark["origin"] | "first"

export type DayBar = {
  /** The instant the day began (UTC). */
  readonly day: number
  readonly views: number
  readonly count: number
  /** Between 0 and 1, the highest rate on the chart being 1; 0 for a day with no page views. */
  readonly height: number
  readonly origin: DayOrigin
  /** False for today, drawn lighter so a day still being counted does not read as a fall. */
  readonly whole: boolean
  readonly title: string
}

/** A version starting on the chart: the bar it starts on, and its name. */
export type Boundary = {
  readonly index: number
  readonly origin: Mark["origin"]
  readonly label: string
}

export type DailyChart = {
  readonly bars: readonly DayBar[]
  readonly boundaries: readonly Boundary[]
  readonly starts: string | undefined
  readonly ends: string | undefined
  /** Why the chart is shorter than 8 weeks, or empty. */
  readonly note: string | undefined
  /** The whole chart in one sentence, for anybody who cannot see the bars. */
  readonly summary: string
}

const floorDay = (at: number): number => Math.floor(at / DAY_MS) * DAY_MS

const day = (at: number): string => plainDay(new Date(at).toISOString())

/** The 8 weeks the chart covers, whole UTC days, today last. */
export const chartRangeOf = (now: number): ArrivalRange => {
  const to = floorDay(now) + DAY_MS

  return { from: to - CHART_DAYS * DAY_MS, to }
}

/** The version the page was on at `at`: the last mark at or before it. */
const originAt = (marks: readonly Mark[], at: number): DayOrigin =>
  marks.filter((mark) => mark.at <= at).at(-1)?.origin ?? "first"

const ORIGIN_WORDS: Readonly<Record<DayOrigin, string>> = {
  loom: "after a Loom change",
  site: "after your site's own edit",
  first: "on the page as Loom first saw it",
}

const sumIn = <Row extends { readonly hour: number }>(
  rows: readonly Row[],
  from: number,
  to: number,
  value: (row: Row) => number
): number =>
  rows.filter((row) => row.hour >= from && row.hour < to).reduce((sum, row) => sum + value(row), 0)

/**
 * When counting began for the chart: the later of the page's page views and
 * the project's first count of anything readers did, as a verdict takes it
 * (`measurementOf`), so no day before the presses were counted reads as none.
 */
const countingSince = (arrivals: StoredArrivals, actedBegins: number | undefined) => {
  const begins = [arrivals.begins, actedBegins].flatMap((at) => (at === undefined ? [] : [at]))

  return begins.length === 0 ? undefined : Math.max(...begins)
}

const noteOf = (since: number | undefined, range: ArrivalRange): string | undefined => {
  if (since === undefined) return "Nothing has been counted by the hour on this page yet."
  if (since > range.from)
    return `Counting by the hour began on ${day(since)}, so the chart starts there.`

  return undefined
}

/**
 * The chart over `range` from one read of each counter covering it. `marks`
 * are every change to the page, oldest first, including any before the range,
 * so the first day is coloured by the version it was already on.
 */
export const dailyChartOf = (input: {
  readonly now: number
  readonly range: ArrivalRange
  readonly kind: GoalKind
  readonly goal: string
  readonly marks: readonly Mark[]
  readonly arrivals: StoredArrivals
  readonly acted: StoredActed
  readonly actedBegins: number | undefined
}): DailyChart => {
  const { now, range, kind, goal, marks, arrivals, acted } = input
  const since = countingSince(arrivals, input.actedBegins)
  const first = since === undefined ? range.to : Math.max(range.from, floorDay(since))
  const days = Array.from(
    { length: Math.max(0, Math.round((range.to - first) / DAY_MS)) },
    (_, index) => first + index * DAY_MS
  )
  const counted = days.map((start) => {
    const end = start + DAY_MS
    const reading = {
      count: sumIn(acted.hours, start, end, (row) => actedCountOf(row, kind)),
      pageViews: sumIn(arrivals.hours, start, end, (row) => row.views),
    }

    return {
      start,
      end,
      reading,
      rate: reading.pageViews === 0 ? 0 : reading.count / reading.pageViews,
    }
  })
  const peak = counted.reduce<(typeof counted)[number] | undefined>(
    (most, entry) => (most === undefined || entry.rate > most.rate ? entry : most),
    undefined
  )
  const highest = peak?.rate ?? 0
  const bars = counted.map(({ start, end, reading, rate }): DayBar => {
    const whole = end <= now
    const origin = originAt(marks, Math.min(end, now))
    const figures =
      reading.pageViews === 0 ? "no page views" : readingSentence(kind, reading).replace(/\.$/u, "")

    return {
      day: start,
      views: reading.pageViews,
      count: reading.count,
      height: highest === 0 ? 0 : rate / highest,
      origin,
      whole,
      title: `${day(start)}: ${figures}${whole ? "" : ", so far"}, ${ORIGIN_WORDS[origin]}`,
    }
  })
  const boundaries = marks.flatMap((mark): readonly Boundary[] => {
    const index = bars.findIndex((bar) => mark.at >= bar.day && mark.at < bar.day + DAY_MS)

    return index === -1 ? [] : [{ index, origin: mark.origin, label: mark.label }]
  })
  const total = counted.reduce(
    (sum, entry) => ({
      count: sum.count + entry.reading.count,
      pageViews: sum.pageViews + entry.reading.pageViews,
    }),
    { count: 0, pageViews: 0 }
  )
  const highestWords =
    peak === undefined || highest === 0
      ? ""
      : `, at most ${per100Of(peak.reading)} per 100 in one day`
  const firstBar = bars[0]
  const lastBar = bars.at(-1)

  return {
    bars,
    boundaries,
    starts: firstBar === undefined ? undefined : day(firstBar.day),
    ends: lastBar === undefined ? undefined : day(lastBar.day),
    note: noteOf(since, range),
    summary:
      bars.length === 0
        ? `${goal} by day: nothing counted yet.`
        : `${goal} by day over ${bars.length} ${bars.length === 1 ? "day" : "days"}: ${
            total.pageViews === 0
              ? "no page views"
              : readingSentence(kind, total).replace(/\.$/u, "")
          }${highestWords}; ${boundaries.length} ${
            boundaries.length === 1 ? "version starts" : "versions start"
          } on it.`,
  }
}
