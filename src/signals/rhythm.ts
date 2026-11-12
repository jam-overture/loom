import type { ActedSeries } from "./acted.js"
import { ARRIVAL_HOUR_MS, type ArrivalRange, type ArrivalSeries } from "./arrivals.js"

/**
 * **The two ways a month of hours can be drawn, and the one of them that is a
 * question nothing else here asks.**
 *
 * Page views are counted under the hour they began in
 * ([0356](../../decisions/0356-page-views-are-counted-under-the-hour-they-began-in-as-a-sixth-counter-written-at-the-door.md))
 * and what readers did under the hour they did it in
 * ([0362](../../decisions/0362-what-readers-did-is-counted-under-the-hour-they-did-it-in-as-a-seventh-counter-the-fold-writes-for-the-three-delegated-kinds.md)).
 * Both are read over a range as a dense hourly series, and
 * [`arrivals.ts`](arrivals.ts)' `hourlySeriesOf` spells the honesty rule those
 * two share: an hour with no row is a nought that is drawn, an hour before
 * counting began is not drawn at all, and the hour in progress is marked rather
 * than drawn as a fall.
 *
 * ## An hour is the unit the counter holds and not the unit a screen can draw
 *
 * `portal-wireframes.md` *1 · Signals* offers a range picker of **last 24
 * hours, 7 days, 30 days** over a bar chart of page views. The first is 24
 * bars. The third is **720**, and a screen handed 720 bars either draws them a
 * third of a pixel wide or buckets them itself — and a surface bucketing them
 * itself is the rule above spelled a third time, in a route group, by whoever
 * is drawing the chart that week.
 *
 * So the fold belongs here, where the counters are read: {@link daySeriesOf}
 * gives the same range as **30 bars**, and a day that the range or the clock
 * cut short is marked rather than drawn as a quiet Sunday.
 *
 * ## The other fold answers a question no counter here has been asked
 *
 * A run of hours answers *how many readers arrived, and when* once. Folded the
 * other way — every 09:00 of a range summed together — it answers **what a
 * reader's day looks like on this deployment**: when they come, and when nobody
 * does. {@link dayShapeOf} is 24 bars whatever the range, and it is the figure
 * behind two questions an operator actually has: *when are my readers here*,
 * and *when can I publish a change without anybody reading the page as it
 * moves*.
 *
 * Nothing new is collected, stored or sent for either of them. Both are pure
 * functions of a series a caller already holds, and the browser is not involved
 * at any payload: the hour was derived at the door from the instant the request
 * arrived, which is the one clock in this subsystem a page cannot move
 * ([0355](../../decisions/0355-the-events-a-screen-lists-are-one-row-per-signal-and-one-page-view-is-read-on-a-key-the-caller-already-holds.md)).
 *
 * ## Why the shape cannot be drawn from the counts
 *
 * A range is hour-aligned and almost never a whole number of days, so **the
 * hours of the day do not rest on the same number of days**. *Last 7 days* read
 * at 09:30 holds eight 09:00s and seven 03:00s, so a shape drawn from the sums
 * says readers come at 09:00 — one eighth of which is that there is one more
 * 09:00 in the range. It is the plausible-false figure again: right shape,
 * moves with the traffic, and wrong by a day's worth of one bar.
 *
 * So {@link DayHour} publishes `days` beside `count`, and the comparable figure
 * is {@link DayHour.perDay} — the mean over the days that could speak for that
 * hour. {@link DayShape.even} says whether the raw counts may be compared
 * directly, which they may only when the range is a whole number of days.
 *
 * ## An hour no day could speak for is withheld and never nought
 *
 * *Nobody reads this page at 03:00* and *this range holds no finished 03:00* are
 * one bar apart on a chart and opposite answers. The first is a measurement; the
 * second is a range too short, or a deployment that began counting this morning.
 * `perDay` is **absent** for the second, where every other reading in this
 * subsystem withholds rather than zeroes (0301, 0326), and
 * {@link quietestHoursIn} will not name an hour nothing was observed in — which
 * is the one way this reading could recommend a deploy window off no evidence.
 *
 * ## Only whole hours reach the shape, and the arithmetic says so
 *
 * The hour in progress holds part of an hour's traffic, so averaging it into its
 * hour of the day understates that hour by however much of it is left. It is
 * left out of both the numerator and the day count, and what it held is
 * published as {@link DayShape.incomplete} rather than dropped — so
 * `count + incomplete` is the figure the range's own series publishes, and a
 * screen that wants to say so can.
 *
 * The day series does the opposite with the same honesty: a partial day **keeps
 * its count**, because what happened in it happened, and carries
 * {@link DayBucket.hours} and {@link DayBucket.whole} so a bar nobody has
 * finished arriving in is not drawn like the twenty-nine before it. The sum over
 * the days is the sum over the hours, always, which is asserted rather than
 * argued.
 *
 * ## Counts add and days do not
 *
 * Both folds take occurrences by addition and denominators by distinctness,
 * which is the rule the hourly counters were built under: *occurrences add,
 * distinctness does not* (0362). An hour handed over twice adds its count twice
 * and is one hour of one day either way — the fault worth guarding, because
 * counting the same thing twice in a denominator is permanent
 * ([0158](../../decisions/0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)).
 *
 * The input is a **series** and not a store's rows, and the type is what says
 * so: a row of either hourly table names a tree, a revision and an audience, so
 * three of them can name one hour, and only a series has been through the fold
 * that makes an hour unique. `whole` is the field no row carries and every
 * series does, so the mistake does not typecheck.
 *
 * ## The offset is a fixed number of hours and is not a time zone
 *
 * Both counters bucket by UTC hour, so a deployment whose readers are all in one
 * country has its whole day shifted — a nine-o'clock peak in California arrives
 * here as a 17:00 bar. {@link RhythmOptions.offsetHours} shifts where the day is
 * cut and what each hour of the day is called, and it is **whole hours, applied
 * flatly**: an hour bucket cannot be divided, so a zone at a half-hour offset is
 * not nameable from these counters at all, and a zone that observes summer time
 * is named by one offset or the other and is an hour out for the rest of the
 * range. A screen drawing a local day says which offset it drew, which is why
 * both readings publish it back.
 */

/** A day, in the unit the counters are kept in. The prefix is `ARRIVAL_HOUR_MS`'. */
export const ARRIVAL_DAY_MS = 86_400_000

/** How many hours a day of these counters has, which is what a shape has bars. */
export const HOURS_IN_DAY = 24

/** What either fold may be told, which is where the reader's midnight is. */
export type RhythmOptions = {
  /**
   * Whole hours to add to UTC before the day is cut and its hours are named.
   *
   * Absent is UTC, which is what the counters hold. A fraction is truncated and
   * an offset beyond a day is taken modulo one, because neither names a zone and
   * both would otherwise move a bar's label by a whole day.
   */
  readonly offsetHours?: number
}

/**
 * One day of a range, which is one bar.
 *
 * Partial days are kept and marked rather than dropped: the range's first and
 * last day are usually partial, a caller who handed in a clock has every day
 * after it partial too, and a deployment that began counting mid-day has one
 * more. A screen draws the whole ones solid and says *so far* about the rest.
 */
export type DayBucket = {
  /** The instant the day began, at this series' offset. */
  readonly day: number
  /** What was counted in it, partial hours included. */
  readonly count: number
  /** How many of its twenty-four hours the series could speak for. */
  readonly hours: number
  /** Whether all twenty-four are present and every one of them over. */
  readonly whole: boolean
}

/** An hourly series folded into its days. */
export type DaySeries = {
  /** The range the series was taken over, carried through unchanged. */
  readonly range: ArrivalRange
  /**
   * One entry per day, ascending, dense.
   *
   * Dense because the series it is folded from is: a day nobody arrived in is
   * present with `count: 0`, and a day before counting began is not present at
   * all. Empty where the series is.
   */
  readonly days: readonly DayBucket[]
  /** The sum over the days, which is the sum over the hours they were folded from. */
  readonly count: number
  /** The offset the days were cut at, in whole hours from UTC. */
  readonly offsetHours: number
  /** Whether the range begins before counting did, carried through from the series. */
  readonly clipped: boolean
  /** How many of the days above are not whole, which is the two edges and whatever a clock cut. */
  readonly partial: number
}

/** One hour of the day, over every day of a range. */
export type DayHour = {
  /** The hour of the day, 0 to 23, at this shape's offset. */
  readonly hour: number
  /** How many days contributed a whole hour here. */
  readonly days: number
  /** What was counted in those hours, which is nought where no day could speak. */
  readonly count: number
  /**
   * The mean over the days that could speak for this hour.
   *
   * **Withheld rather than nought where none could**, which is the distinction
   * the whole reading turns on: an hour this range holds no finished instance of
   * is not an hour nobody reads in.
   */
  readonly perDay?: number
}

/** Why a shape has nothing to say about any hour of the day. */
export type DayShapeSilence =
  /** Nothing has ever been counted in this scope, so the series it folds is empty. */
  | "unmeasured"
  /**
   * The range holds hours and not one of them is over.
   *
   * A range shorter than an hour, or one read with a clock inside its own first
   * hour. Counting is working and the shape is one hour away from existing.
   */
  | "unsettled"

/**
 * The hours of a reader's day on this deployment, over whatever range was read.
 *
 * Twenty-four entries always, so a chart has a bar per hour whether or not the
 * range reached it. Which of them mean anything is {@link DayHour.perDay}'s
 * presence, and {@link silence} is there where none of them do.
 */
export type DayShape = {
  /** Twenty-four entries, ascending from hour 0. */
  readonly hours: readonly DayHour[]
  /** What was counted into the shape: the range's whole hours, summed. */
  readonly count: number
  /**
   * What the range counted and the shape left out, because the hour was not over.
   *
   * `count + incomplete` is the figure the series publishes for the range, so a
   * screen can say *and 41 more in the hour you are in*.
   */
  readonly incomplete: number
  /** How many days contributed any whole hour at all. */
  readonly days: number
  /**
   * Whether every hour of the day rests on the same number of days.
   *
   * True only where the range is a whole number of days. False is the ordinary
   * case and the reason {@link DayHour.perDay} exists.
   */
  readonly even: boolean
  /** The offset the hours were named at, in whole hours from UTC. */
  readonly offsetHours: number
  /** Why there is nothing to read, where there is nothing. */
  readonly silence?: DayShapeSilence
}

/** The two fields a fold needs of a series, whichever counter it is of. */
type HourlyReading<Hour> = {
  readonly range: ArrivalRange
  readonly hours: readonly Hour[]
  readonly clipped: boolean
}

/** The shape of an hour of any series this folds: the instant, and whether it is over. */
type SeriesHour = {
  readonly hour: number
  readonly whole: boolean
}

const shiftOf = (options: RhythmOptions): number =>
  (Math.trunc(options.offsetHours ?? 0) % HOURS_IN_DAY) * ARRIVAL_HOUR_MS

const dayAt = (hour: number, shift: number): number =>
  Math.floor((hour + shift) / ARRIVAL_DAY_MS) * ARRIVAL_DAY_MS - shift

const hourOfDayAt = (hour: number, shift: number): number =>
  Math.floor(((((hour + shift) / ARRIVAL_HOUR_MS) % HOURS_IN_DAY) + HOURS_IN_DAY) % HOURS_IN_DAY)

/**
 * An hourly series folded into its days.
 *
 * Generic over the hour because the two hourly readings spell their number
 * differently — `views` on an arrival hour, `count` on an acted one — and
 * {@link arrivalDaysOf} and {@link actedDaysOf} are the two callers that
 * exist, so no surface writes the accessor.
 */
export const daySeriesOf = <Hour extends SeriesHour>(
  series: HourlyReading<Hour>,
  count: (hour: Hour) => number,
  options: RhythmOptions = {}
): DaySeries => {
  const shift = shiftOf(options)
  const counted = new Map<number, number>()
  const hours = new Map<number, Set<number>>()
  const unfinished = new Set<number>()

  for (const hour of series.hours) {
    const day = dayAt(hour.hour, shift)

    counted.set(day, (counted.get(day) ?? 0) + count(hour))
    ;(hours.get(day) ?? hours.set(day, new Set()).get(day)!).add(hour.hour)

    if (!hour.whole) unfinished.add(day)
  }

  const days: DayBucket[] = [...counted.keys()]
    .sort((one, other) => one - other)
    .map((day) => {
      const present = hours.get(day)?.size ?? 0

      return {
        day,
        count: counted.get(day) ?? 0,
        hours: present,
        whole: present === HOURS_IN_DAY && !unfinished.has(day),
      }
    })

  return {
    range: series.range,
    days,
    count: days.reduce((sum, day) => sum + day.count, 0),
    offsetHours: shift / ARRIVAL_HOUR_MS,
    clipped: series.clipped,
    partial: days.filter((day) => !day.whole).length,
  }
}

/**
 * The hours of the day a series' whole hours fell in.
 *
 * Generic for {@link daySeriesOf}'s reason, with {@link arrivalDayShapeOf} and
 * {@link actedDayShapeOf} as the two callers that exist.
 */
export const dayShapeOf = <Hour extends SeriesHour>(
  series: HourlyReading<Hour>,
  count: (hour: Hour) => number,
  options: RhythmOptions = {}
): DayShape => {
  const shift = shiftOf(options)
  const counted = new Map<number, number>()
  const days = new Map<number, Set<number>>()
  const observed = new Set<number>()

  let incomplete = 0

  for (const hour of series.hours) {
    if (!hour.whole) {
      incomplete += count(hour)
      continue
    }

    const of = hourOfDayAt(hour.hour, shift)
    const day = dayAt(hour.hour, shift)

    counted.set(of, (counted.get(of) ?? 0) + count(hour))
    ;(days.get(of) ?? days.set(of, new Set()).get(of)!).add(day)
    observed.add(day)
  }

  const hours: DayHour[] = Array.from({ length: HOURS_IN_DAY }, (_, of) => {
    const over = days.get(of)?.size ?? 0
    const total = counted.get(of) ?? 0

    return {
      hour: of,
      days: over,
      count: total,
      ...(over === 0 ? {} : { perDay: total / over }),
    }
  })

  const silence: DayShapeSilence | undefined =
    observed.size > 0 ? undefined : series.hours.length === 0 ? "unmeasured" : "unsettled"

  return {
    hours,
    count: hours.reduce((sum, hour) => sum + hour.count, 0),
    incomplete,
    days: observed.size,
    even: hours.every((hour) => hour.days === hours[0]!.days),
    offsetHours: shift / ARRIVAL_HOUR_MS,
    ...(silence === undefined ? {} : { silence }),
  }
}

/** Page views by day, from the series a surface already drew by hour. */
export const arrivalDaysOf = (series: ArrivalSeries, options: RhythmOptions = {}): DaySeries =>
  daySeriesOf(series, (hour) => hour.views, options)

/** What readers did, by day, in the kind the series is of. */
export const actedDaysOf = (series: ActedSeries, options: RhythmOptions = {}): DaySeries =>
  daySeriesOf(series, (hour) => hour.count, options)

/** When readers arrive, over every day the range could speak for. */
export const arrivalDayShapeOf = (series: ArrivalSeries, options: RhythmOptions = {}): DayShape =>
  dayShapeOf(series, (hour) => hour.views, options)

/** When readers do a thing, over every day the range could speak for. */
export const actedDayShapeOf = (series: ActedSeries, options: RhythmOptions = {}): DayShape =>
  dayShapeOf(series, (hour) => hour.count, options)

const ranked = (shape: DayShape, by: (one: DayHour, other: DayHour) => number): readonly DayHour[] =>
  shape.hours.filter((hour) => hour.perDay !== undefined).sort(by)

const take = (hours: readonly DayHour[], many: number): readonly DayHour[] =>
  hours.slice(0, Math.max(0, Math.trunc(many)))

/**
 * The hours of the day with the most, busiest first.
 *
 * Only hours a day could speak for are eligible, so a list of three from a
 * range holding two finished hours is two long rather than three with a
 * fabricated one.
 */
export const busiestHoursIn = (shape: DayShape, most = 3): readonly DayHour[] =>
  take(
    ranked(shape, (one, other) => other.perDay! - one.perDay! || one.hour - other.hour),
    most
  )

/**
 * The hours of the day with the least, quietest first.
 *
 * *When can a change go out without anybody reading the page as it moves* — so
 * the eligibility rule is the one that matters here rather than a detail:
 * **an hour nothing was ever observed in is not quiet**, and naming one would
 * recommend a deploy window off the absence of evidence rather than off
 * evidence of absence. An observed nought is a real answer and is named.
 */
export const quietestHoursIn = (shape: DayShape, fewest = 3): readonly DayHour[] =>
  take(
    ranked(shape, (one, other) => one.perDay! - other.perDay! || one.hour - other.hour),
    fewest
  )
