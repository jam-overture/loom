import {
  arrivalRangeOf,
  type ArrivalChange,
  type ArrivalRange,
  type ArrivalReading,
  type ArrivalSeries,
} from "@jam-overture/loom/signals"

import { plainDay, plainMoment } from "./when"

/**
 * The stretch of time *Signals* is read over, and what the screen says about
 * the page views counted in it (`docs/portal-wireframes.md`, *1 · Signals*:
 * a range picker, page views in the range with the change on the period
 * before, and a bar chart of page views by hour).
 *
 * The figures come from the intake's hourly counter (0356) through
 * `readReaderArrivals`, which reads the range and the period before it in one
 * call. Everything here is a pure function of that reading, so the chart, the
 * figure and the sentence under it cannot disagree about what was counted.
 */

export const SIGNALS_RANGES = ["24h", "7d", "30d"] as const

export type SignalsRange = (typeof SIGNALS_RANGES)[number]

/**
 * The last 24 hours, the first of the wireframe's three: the screen is where a
 * person looks to see whether anything is arriving, and a day answers that.
 */
export const DEFAULT_RANGE: SignalsRange = "24h"

const HOURS: Readonly<Record<SignalsRange, number>> = { "24h": 24, "7d": 168, "30d": 720 }

const LABELS: Readonly<Record<SignalsRange, string>> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
}

/** How the period before is named in a sentence: *on the 7 days before*. */
const SPANS: Readonly<Record<SignalsRange, string>> = {
  "24h": "the 24 hours before",
  "7d": "the 7 days before",
  "30d": "the 30 days before",
}

export const rangeLabel = (range: SignalsRange): string => LABELS[range]

/** The range an address names, and the default for none or for anything else. */
export const rangeOf = (asked: string | undefined): SignalsRange =>
  SIGNALS_RANGES.find((range) => range === asked) ?? DEFAULT_RANGE

/**
 * The value an address carries for a range, or none for the default, so the
 * address of a screen nobody has narrowed stays as short as it was.
 */
export const rangeParam = (range: SignalsRange): string | undefined =>
  range === DEFAULT_RANGE ? undefined : range

/** Whole hours ending with the one in progress, as the counter reads them. */
export const arrivalRangeFor = (range: SignalsRange, now: number): ArrivalRange =>
  arrivalRangeOf(now, HOURS[range])

const count = (value: number): string => value.toLocaleString("en-GB")

const isoOf = (instant: number): string => new Date(instant).toISOString()

/** *Up 12%*, *Down 40%*, *No change*: the movement, rounded to a whole percent. */
const movementOf = (was: number, now: number): string => {
  const percent = Math.round(((now - was) / was) * 100)

  return percent === 0 ? "No change" : percent > 0 ? `Up ${percent}%` : `Down ${-percent}%`
}

/**
 * The sentence under the figure, comparing the range with the period of the
 * same length before it.
 *
 * Three answers, kept apart because each means something different (0356): a
 * period before counting began has no figure at all, a counted period with
 * nobody in it is a rise from none, and anything else is a percentage.
 */
export const changeSentence = (change: ArrivalChange, range: SignalsRange): string => {
  const span = SPANS[range]

  if (change.was === null) return `Nothing to compare with: ${span} were not counted.`
  if (change.was === 0) return `None in ${span}.`

  return `${movementOf(change.was, change.views)} on ${span} (${count(change.was)}).`
}

export type RangeFigure = {
  readonly label: string
  readonly value: string
  readonly note: string
}

/**
 * The first figure on *Signals*: page views in the range, or, where the hourly
 * counts could not be read, the total since counting began with that said.
 *
 * The total is never dropped. Read, it is the second line of the note; unread,
 * it is the figure, so a deployment that has not brought its database up to
 * date shows what it showed before rather than an error.
 */
export const rangeFigureOf = (
  reading: ArrivalReading | undefined,
  range: SignalsRange,
  total: number
): RangeFigure =>
  reading === undefined
    ? {
        label: "Page views counted",
        value: count(total),
        note: "Every time a reader opened one of this project's pages. Page views by hour could not be read, so this is every one since counting began.",
      }
    : {
        label: `Page views, ${LABELS[range].toLocaleLowerCase("en-GB")}`,
        value: count(reading.series.views),
        note: `${changeSentence(reading.change, range)} ${count(total)} since counting began.`,
      }

/** One bar: its share of the tallest, and what it says when pointed at. */
export type RangeBar = {
  readonly hour: number
  readonly views: number
  /** Between 0 and 1, the tallest bar being 1. */
  readonly height: number
  /** False for the hour still in progress, drawn lighter so it does not read as a dip. */
  readonly whole: boolean
  readonly title: string
}

export type RangeChart = {
  readonly bars: readonly RangeBar[]
  /** The most page views in one hour, which is what a full-height bar stands for. */
  readonly tallest: number
  /** Where the bars start and end, said beneath them. */
  readonly starts: string | undefined
  readonly ends: string | undefined
  /**
   * Why the chart is shorter than the range, or empty: counting by hour began
   * inside it, or has never counted anything.
   */
  readonly note: string | undefined
  /** The whole chart in one sentence, for anybody who cannot see the bars. */
  readonly summary: string
}

const hourWord = (views: number): string => (views === 1 ? "page view" : "page views")

/** Days for a range of days, the minute for a day, so the two ends read alike. */
const endLabel = (instant: number, range: SignalsRange): string =>
  range === "24h" ? plainMoment(isoOf(instant)) : plainDay(isoOf(instant))

const noteOf = (series: ArrivalSeries): string | undefined => {
  if (series.begins === undefined) return "No page view has been counted by hour yet."
  if (series.hours.length === 0) return "Counting by hour began after this range ended."
  if (series.clipped) {
    return `Page views are counted by hour from ${plainMoment(isoOf(series.begins))}, so the chart starts there.`
  }

  return undefined
}

/** The bar chart of page views by hour across the range, from the same reading as the figure. */
export const rangeChartOf = (series: ArrivalSeries, range: SignalsRange): RangeChart => {
  const tallest = series.hours.reduce((most, hour) => Math.max(most, hour.views), 0)
  const first = series.hours[0]
  const last = series.hours.at(-1)

  return {
    bars: series.hours.map((hour) => ({
      hour: hour.hour,
      views: hour.views,
      height: tallest === 0 ? 0 : hour.views / tallest,
      whole: hour.whole,
      title: `${plainMoment(isoOf(hour.hour))}: ${count(hour.views)} ${hourWord(hour.views)}${
        hour.whole ? "" : ", so far"
      }`,
    })),
    tallest,
    starts: first === undefined ? undefined : endLabel(first.hour, range),
    ends: last === undefined ? undefined : endLabel(last.hour, range),
    note: noteOf(series),
    summary: `Page views by hour, ${LABELS[range].toLocaleLowerCase("en-GB")}: ${count(series.views)} in all, at most ${count(tallest)} in one hour.`,
  }
}
