import {
  ARRIVAL_HOUR_MS,
  arrivalRangeOf,
  type ArrivalChange,
  type ArrivalRange,
  type ArrivalReading,
  type ArrivalSeries,
} from "@jam-overture/loom/signals"

import { plainDay, plainMoment, plainTickDay, plainTime } from "./when"

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

/** The period of the same length before a range, as a sentence names it. */
export const periodBefore = (range: SignalsRange): string => SPANS[range]

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
export const movementOf = (was: number, now: number): string => {
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

/** One bar: where it sits in the range, its height on the scale, and what it says when pointed at. */
export type RangeBar = {
  readonly hour: number
  /** Its place across the range, in hours from the range's first. */
  readonly slot: number
  readonly views: number
  /** Between 0 and 1, the top of the scale being 1. */
  readonly height: number
  /** False for the hour still in progress, drawn lighter so it does not read as a dip. */
  readonly whole: boolean
  readonly title: string
}

/** A mark under the chart where a time worth naming begins: an hour of the day, or a day. */
export type RangeTick = {
  readonly slot: number
  readonly label: string
}

export type RangeChart = {
  /**
   * Hours in the whole range, which is how many places the chart has.
   *
   * The chart is always as wide as the range, whatever was counted in it, so a
   * bar sits where its hour is: two hours of counting on a week's chart are two
   * thin bars at the right-hand end, not two bars stretched across the week.
   */
  readonly slots: number
  readonly bars: readonly RangeBar[]
  /**
   * The hours at the start of the range before counting by hour began.
   *
   * Drawn as a shaded band rather than as noughts, because nobody was counting
   * then (0356): a chart that drew them flat would claim a quiet day.
   */
  readonly uncounted: number
  /** The page views the top of the chart stands for, said at the top of its scale. */
  readonly scale: number
  readonly ticks: readonly RangeTick[]
  /** The most page views in one hour. */
  readonly tallest: number
  /** Where the range starts and ends, said beneath the bars. */
  readonly starts: string | undefined
  readonly ends: string | undefined
  /**
   * Why part of the chart is shaded, or why it is empty: counting by hour began
   * inside the range, or has never counted anything.
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
    return `Page views are counted by hour from ${plainMoment(isoOf(series.begins))}. The shaded hours before that were not counted.`
  }

  return undefined
}

/**
 * The fewest page views the top of the chart stands for.
 *
 * Without a floor, one page view in an hour fills the chart to the top and a
 * quiet hour reads as a busy one.
 */
export const LEAST_SCALE = 5

/** The steps a scale rounds up to, within each power of ten. */
const SCALE_STEPS: readonly number[] = [1, 2, 5, 10]

/**
 * The top of the chart: the tallest hour rounded up to 1, 2 or 5 times a power
 * of ten, and never under {@link LEAST_SCALE}, so the number at the top of the
 * scale is one a person reads at a glance and every bar is measured against it.
 */
export const scaleOf = (tallest: number): number => {
  const wanted = Math.max(tallest, LEAST_SCALE)
  const power = 10 ** Math.floor(Math.log10(wanted))

  return (SCALE_STEPS.find((step) => step * power >= wanted) ?? 10) * power
}

/**
 * Which hours get a mark under the chart, and what the mark says.
 *
 * A day is marked every six hours by the time, with the date at midnight; a
 * week, at each midnight by the date; thirty days, at each Monday's midnight.
 * Each is four to seven marks, which fits across a phone. All UTC, as every
 * time the portal prints is (`when.ts`).
 */
const TICKS: Readonly<Record<SignalsRange, (hour: Date) => string | undefined>> = {
  "24h": (hour) =>
    hour.getUTCHours() === 0
      ? plainTickDay(hour.toISOString())
      : hour.getUTCHours() % 6 === 0
        ? plainTime(hour.toISOString())
        : undefined,
  "7d": (hour) => (hour.getUTCHours() === 0 ? plainTickDay(hour.toISOString()) : undefined),
  "30d": (hour) =>
    hour.getUTCHours() === 0 && hour.getUTCDay() === 1
      ? plainTickDay(hour.toISOString())
      : undefined,
}

/**
 * How far across the chart a mark may sit. A label starts at its mark and runs
 * right, so one in the last tenth would run past the chart's edge.
 */
const TICK_ROOM = 0.9

const ticksOf = (range: ArrivalRange, slots: number, picked: SignalsRange): readonly RangeTick[] =>
  Array.from({ length: slots }, (_, slot) => slot)
    .filter((slot) => slot / slots <= TICK_ROOM)
    .flatMap((slot) => {
      const label = TICKS[picked](new Date(range.from + slot * ARRIVAL_HOUR_MS))

      return label === undefined ? [] : [{ slot, label }]
    })

const slotOf = (range: ArrivalRange, instant: number): number =>
  Math.round((instant - range.from) / ARRIVAL_HOUR_MS)

/**
 * The bar chart of page views by hour across the whole range, from the same
 * reading as the figure.
 *
 * Every hour of the range has its place whether or not it was counted, the
 * hours before counting began are shaded rather than drawn, and bars are
 * measured on a rounded scale with a floor, so a project with a handful of
 * page views reads as a handful and not as a wall of full-height bars.
 */
export const rangeChartOf = (series: ArrivalSeries, range: SignalsRange): RangeChart => {
  const tallest = series.hours.reduce((most, hour) => Math.max(most, hour.views), 0)
  const scale = scaleOf(tallest)
  const slots = slotOf(series.range, series.range.to)
  const first = series.hours[0]
  const counted = first !== undefined

  return {
    slots,
    bars: series.hours.map((hour) => ({
      hour: hour.hour,
      slot: slotOf(series.range, hour.hour),
      views: hour.views,
      height: hour.views / scale,
      whole: hour.whole,
      title: `${plainMoment(isoOf(hour.hour))}: ${count(hour.views)} ${hourWord(hour.views)}${
        hour.whole ? "" : ", so far"
      }`,
    })),
    uncounted: first === undefined ? 0 : slotOf(series.range, first.hour),
    scale,
    ticks: counted ? ticksOf(series.range, slots, range) : [],
    tallest,
    starts: counted ? endLabel(series.range.from, range) : undefined,
    ends: counted ? endLabel(series.range.to - ARRIVAL_HOUR_MS, range) : undefined,
    note: noteOf(series),
    summary: `Page views by hour, ${LABELS[range].toLocaleLowerCase("en-GB")}: ${count(series.views)} in all, at most ${count(tallest)} in one hour.`,
  }
}
