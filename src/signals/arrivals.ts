import type { AudienceId } from "../audience/audience.js"
import type { TreeId } from "../ids.js"
import { err, ok, type Result } from "../result.js"

import type { ReaderSignalStoreError } from "./journal.js"
import type { RevisionViews } from "./page-views.js"
import { ratioOf, type Ratio } from "./ratios.js"

/**
 * **When** readers arrived, which is the one thing every counter in this
 * subsystem had thrown away.
 *
 * `page-views.ts` counts the page views that *began* on a revision — exact,
 * counted once, at the door, from the marker a delivery carries
 * ([0214](../../decisions/0214-where-readers-are-is-a-floored-bucket-counted-at-the-door-and-a-page-view-says-when-it-began.md)).
 * It is one number per revision for all time, so it can answer *how many
 * readers* and can never answer *how many yesterday*. Nothing else could
 * either: a tally keeps no time (rule 5 of `docs/signals.md`), and the only
 * rows with an instant on them are the kept deliveries, which are paged by
 * delivery and bounded by the window a deployment keeps them for (0351). A
 * thirty-day chart read from those is thirty days of rows on every render, and
 * a bar drawn from a capped scan is a **wrong number** rather than a shorter
 * list — which is why `Loom portal` filed for this rather than drawing one.
 *
 * So this is the third thing derived from the same marker, after the opening
 * count and the region bucket: **the same arrivals, filed under the hour they
 * arrived in.** Nothing is sent for it, nothing is stored about anybody, and
 * the browser is not involved — the hour is the instant the door was already
 * stamping every counter this delivery moves.
 *
 * ## Why it is a counter and not a read of the kept deliveries
 *
 * The deliveries could answer it, twice over, and both routes are worse.
 *
 * - **Grouping the kept rows by `view` key** and taking each key's earliest
 *   receipt is a scan of the whole kept window, and it is a query *about view
 *   keys* — the one value in this seam that exists so a funnel can be
 *   correlated inside one page view and for nothing else (0146). A counter that
 *   needs no key at all is strictly the safer of the two.
 * - **Counting deliveries per hour** needs neither, and counts a reader who
 *   stayed ten minutes as a hundred readers. 0214 refused that shape for the
 *   region map and it is refused here for the same reason.
 *
 * And a counter answers for as long as the counters live, where either read
 * answers only for the kept window. **The hour outlives the row it could have
 * been derived from**, which is the one consequence of this worth saying out
 * loud rather than leaving to be noticed: a deployment that keeps deliveries
 * for thirty days can still say how many readers arrived in an hour last year.
 * It names no reader, no place and no page view — it is a count of page views
 * of one revision, which is the figure `page-views.ts` already calls *nowhere
 * and nobody* — but it is a count against a clock, and that is new.
 *
 * ## The hour is the unit
 *
 * Finer is not available and coarser would not serve the screen that asked.
 * A *last 24 hours* chart needs twenty-four bars, so a day bucket cannot draw
 * it; a minute bucket is sixty times the rows for a resolution no reading has
 * ever asked for. A surface wanting days sums hours, which is addition over
 * counts that were each counted once.
 *
 * **The hour is UTC and the bucket is its start instant.** A deployment that
 * draws local time shifts the labels, which is a decision about a reader's
 * screen rather than about a counter; storing an offset would make the same row
 * mean two things in two places.
 *
 * Pure: no store, no clock, no DOM, and no import that reaches a package.
 */

/** One hour, in milliseconds, which is the bucket every row here is filed in. */
export const ARRIVAL_HOUR_MS = 3_600_000

/**
 * The hour an instant falls in, as the instant that hour began.
 *
 * `undefined` where the argument is not an instant. It is the caller's clock
 * and so should never be, but the alternative to saying so is a bucket of
 * `NaN` in a counter — and a counter row nothing can read is worse than a
 * write that refused.
 */
export const arrivalHourOf = (instant: string): number | undefined => {
  const at = Date.parse(instant)

  return Number.isFinite(at) ? Math.floor(at / ARRIVAL_HOUR_MS) * ARRIVAL_HOUR_MS : undefined
}

/** Page views that began in one hour, of one revision of one tree. */
export type ArrivalHourCount = {
  readonly treeId: TreeId
  readonly revision: number
  /** The hour they arrived in, as the instant it began (UTC). */
  readonly hour: number
  /** Page views that *began* in this hour, so a longer visit is not a bigger number. */
  readonly views: number
}

/**
 * An hour's count as the store keeps it. See `StoredTally.audienceId` (0284).
 */
export type StoredArrivalHour = ArrivalHourCount & {
  readonly audienceId: AudienceId
  readonly updatedAt: string
}

/**
 * What one delivery adds, which is its openings filed under the hour the door
 * read them in.
 *
 * **It is handed the openings rather than the delivery**, exactly as
 * `regionCountsOf` is and for the same reason: the walk that finds them, and
 * the deduplication that makes a retried opening inside one delivery a single
 * arrival, is `openingsOf` in `page-views.ts`. Three counters derived from one
 * walk cannot disagree about how many readers arrived; three walks would, and
 * the disagreement would surface as an hourly chart whose bars do not sum to
 * the number of page views there were.
 *
 * **The instant is the one every other counter on this delivery is stamped
 * with**, so an hour is never a second opinion about when the delivery was
 * received. A failure rather than an empty list where that instant will not
 * parse: openings written to one counter and not the other would make the two
 * numbers differ for a reason no reading could name.
 */
export const arrivalHoursOf = (
  openings: readonly RevisionViews[],
  at: string
): Result<readonly ArrivalHourCount[], ReaderSignalStoreError> => {
  if (openings.length === 0) return ok([])

  const hour = arrivalHourOf(at)

  if (hour === undefined) {
    return err({
      code: "unavailable",
      detail: `could not place ${openings.length} page views in an hour: ${at} is not an instant`,
    })
  }

  return ok(openings.map(({ treeId, revision, views }) => ({ treeId, revision, hour, views })))
}

/**
 * What a ranged read of the counter hands back.
 *
 * The rows in the range **and** the first hour the scope has any row for, which
 * is two statements and one call. A caller needs both to draw anything honest —
 * a range of thirty days on a deployment that began counting a week ago is
 * seven bars and a sentence, not seven bars and twenty-three empty ones — and a
 * caller that had to ask twice would be the caller that asks once.
 */
export type StoredArrivals = {
  /** Every hour in the range that has a row, in no particular order. */
  readonly hours: readonly StoredArrivalHour[]
  /**
   * The first hour this scope has ever counted an arrival in, whatever range
   * was asked for.
   *
   * Absent means *nothing has ever been counted here*, which is a different
   * sentence from *nobody arrived in the range you asked about* — the
   * distinction this subsystem keeps everywhere a reading can be empty for two
   * reasons (0309, 0347).
   *
   * It narrows with the request's tree, revision and audience, so *By page* can
   * say when counting began for that page rather than for the deployment.
   */
  readonly begins?: number
}

/**
 * A stretch of time, in milliseconds, closed at the start and open at the end.
 *
 * **An hour belongs to the range that its own start falls in**, which is the
 * one rule here a caller has to hold: a range is a set of buckets rather than a
 * set of instants, so a range running from half past ten holds the eleven
 * o'clock bucket and not the ten o'clock one. {@link arrivalRangeOf} builds
 * ranges that are whole hours, which is what makes the rule invisible — and
 * what makes {@link arrivalRangeBefore} give a period with exactly as many buckets in
 * it.
 */
export type ArrivalRange = {
  readonly from: number
  readonly to: number
}

/** One hour of a range, which is one bar. */
export type ArrivalHour = {
  /** The instant the hour began (UTC). */
  readonly hour: number
  readonly views: number
  /**
   * Whether this hour is over and inside the range.
   *
   * The last bar is the one this is for: *the last 24 hours* ends in an hour
   * nobody has finished arriving in, and a screen that drew it like the other
   * twenty-three would show every reader a dip at the right-hand edge that is
   * the clock rather than the traffic. False also where the range itself cuts
   * the hour short, which is what an unaligned range does to its last bucket.
   */
  readonly whole: boolean
}

/**
 * The whole hours ending with the hour an instant falls in.
 *
 * `arrivalRangeOf(now, 24)` is *the last 24 hours*: twenty-three hours that are
 * over and the one in progress. Hour-aligned on both ends, which is what the
 * comparison needs — {@link arrivalRangeBefore} of an aligned range is aligned, so the
 * two periods a change is taken over hold the same number of buckets, and a
 * percentage of two honest counts stays honest.
 */
export const arrivalRangeOf = (now: number, hours: number): ArrivalRange => {
  const current = Math.floor(now / ARRIVAL_HOUR_MS) * ARRIVAL_HOUR_MS

  return {
    from: current - (Math.max(1, Math.trunc(hours)) - 1) * ARRIVAL_HOUR_MS,
    to: current + ARRIVAL_HOUR_MS,
  }
}

/**
 * Page views by hour over a range, dense, with the hours this deployment
 * cannot speak for left out rather than drawn as nought.
 */
export type ArrivalSeries = {
  /** The range this is a series over, as asked for. */
  readonly range: ArrivalRange
  /**
   * One entry per hour, ascending, from the later of the range's first hour and
   * the hour counting began.
   *
   * Dense: an hour nobody arrived in is `views: 0` and is present, because a
   * chart that omits a quiet hour draws a narrower week. Empty where counting
   * began after the range ended, or where nothing has ever been counted.
   */
  readonly hours: readonly ArrivalHour[]
  /** Page views that began inside the range, which is the sum of the hours above. */
  readonly views: number
  /**
   * The first hour the scope has ever counted, carried through from the store.
   *
   * A surface says *counting began on the 23rd* with it. Absent means nothing
   * has ever been counted, and the series is then empty for a reason that is
   * not *nobody came*.
   */
  readonly begins?: number
  /**
   * Whether the range starts before counting did.
   *
   * The reason the series can be shorter than the range asked for, published
   * rather than left to a caller comparing two instants — because the
   * comparison has an edge (counting may have begun inside the range's first
   * hour) and a surface getting it wrong would claim a quiet week.
   */
  readonly clipped: boolean
}

const hourAt = (instant: number): number =>
  Math.floor(instant / ARRIVAL_HOUR_MS) * ARRIVAL_HOUR_MS

/** The first bucket of a range, which is the first hour that begins inside it. */
const firstHourOf = (from: number): number =>
  Math.ceil(from / ARRIVAL_HOUR_MS) * ARRIVAL_HOUR_MS

/** What a series may be told besides the rows, which is the one thing a clock knows. */
export type ArrivalSeriesOptions = {
  /**
   * Now, where a caller has it, so the hour in progress is marked as one.
   *
   * Omitted is a series about a stretch that is over, where every bucket the
   * range covers whole is whole. Handed in rather than read from a clock here
   * for the reason every other instant in this subsystem is: a reading is a
   * pure function of what it was given, so two figures on one screen cannot
   * disagree about when it was taken.
   */
  readonly now?: number
}

/**
 * The hours of a range, as the counter answers for them.
 *
 * Rows are summed into their hour, which is what makes this readable over a
 * scope holding several trees, revisions or audiences: **arrivals add**, because
 * a reader who arrived arrived once whichever form of whichever page they were
 * served (0297, 0299). A caller wanting them apart asks for one tree.
 *
 * Rows outside the range are ignored rather than refused. A store answers the
 * range it was asked for, and a reading that threw on a row it did not expect
 * would be a reading that cannot be given a wider read to narrow — which is
 * exactly what {@link arrivalChangeOf} does with it.
 */
export const arrivalSeriesOf = (
  stored: StoredArrivals,
  range: ArrivalRange,
  options: ArrivalSeriesOptions = {}
): ArrivalSeries => {
  const begins = stored.begins
  const clipped = begins !== undefined && begins > range.from
  const first = Math.max(firstHourOf(range.from), begins ?? 0)
  const last = hourAt(range.to - 1)

  const counted = new Map<number, number>()

  for (const row of stored.hours) {
    if (row.hour < range.from || row.hour >= range.to) continue

    counted.set(row.hour, (counted.get(row.hour) ?? 0) + row.views)
  }

  const hours: ArrivalHour[] = []

  if (begins !== undefined) {
    for (let hour = first; hour <= last; hour += ARRIVAL_HOUR_MS) {
      const ends = hour + ARRIVAL_HOUR_MS

      hours.push({
        hour,
        views: counted.get(hour) ?? 0,
        whole: ends <= range.to && (options.now === undefined || options.now >= ends),
      })
    }
  }

  return {
    range,
    hours,
    views: hours.reduce((total, hour) => total + hour.views, 0),
    ...(begins === undefined ? {} : { begins }),
    clipped,
  }
}

/**
 * The stretch of the same length immediately before a range.
 *
 * The period a *page views in the range* figure is compared against, computed
 * here rather than at a call site so that the two ranges a comparison is taken
 * over cannot be of different lengths — which is the one way to make a
 * percentage of two honest counts dishonest.
 */
export const arrivalRangeBefore = (range: ArrivalRange): ArrivalRange => ({
  from: range.from - (range.to - range.from),
  to: range.from,
})

/**
 * Page views in a range against page views in the period before it.
 *
 * The figure the wireframe puts over the whole screen, and the one that is a
 * lie if the earlier period is one the deployment was not counting through.
 */
export type ArrivalChange = {
  readonly range: ArrivalRange
  /** The equal-length period the comparison is against, which is {@link arrivalRangeBefore}. */
  readonly before: ArrivalRange
  readonly views: number
  /**
   * Page views in the earlier period, or `null` where counting had not begun
   * when it started.
   *
   * `null` is not nought and the difference is the whole of this field: a
   * deployment that upgraded on Tuesday has no arrivals before Tuesday and
   * never had any readers missing either. Reporting nought there would publish
   * *every reader you have is new this week* on every deployment's first month.
   */
  readonly was: number | null
  /**
   * The quotient, or why there is none (`ratios.ts`).
   *
   * `unmeasured` where the earlier period predates counting, `from-nothing`
   * where it was counted and held no arrivals — which is the rise a surface
   * most wants to draw and could least afford to read as *nothing to compare*.
   */
  readonly ratio: Ratio
}

/**
 * Both figures and the quotient, from one read.
 *
 * The read has to span both periods, which is what `arrivalRangeBefore` is for: a
 * caller asks the store for `{ from: arrivalRangeBefore(range).from, to: range.to }`
 * and hands the result here. Taking two reads would be two scans and a seam
 * where the clock moved between them.
 */
export const arrivalChangeOf = (
  stored: StoredArrivals,
  range: ArrivalRange,
  options: ArrivalSeriesOptions = {}
): ArrivalChange => {
  const before = arrivalRangeBefore(range)
  const now = arrivalSeriesOf(stored, range, options)
  const earlier = arrivalSeriesOf(stored, before, options)
  const was = stored.begins === undefined || stored.begins > before.from ? null : earlier.views

  return {
    range,
    before,
    views: now.views,
    was,
    ratio: ratioOf(was, now.views),
  }
}

/**
 * What a surface asks for: a range, the narrowing, and the clock.
 *
 * The three narrowings are the counter read's own, so a chart of one page is
 * this with a `treeId` on it.
 */
export type ArrivalReadingRequest = {
  readonly range: ArrivalRange
  /** Absent reads every tree the handle can see, which is the scope rule (0020). */
  readonly treeId?: TreeId
  /** Absent reads every audience (0284), whose arrivals then add. */
  readonly audience?: AudienceId
  /** Absent reads every revision, whose arrivals then add. */
  readonly revision?: number
  /** Now, where the caller has it, so the hour in progress is marked as one. */
  readonly now?: number
}

/** The chart and the two figures above it, from one read. */
export type ArrivalReading = {
  readonly series: ArrivalSeries
  readonly change: ArrivalChange
}

/**
 * The chart, the range's figure and the change on the period before it, in one
 * call against a counter handle.
 *
 * **It exists because the composition has a wrong version that type-checks.**
 * The change is over two periods, so the read has to span both — and a caller
 * who read `{ from: range.from }`, which is the obvious line, would get a
 * comparison whose earlier period is empty **because it was not read** rather
 * than because nobody arrived in it. That reads as *every reader you have is
 * new*, on a screen, from a store that holds the right answer. This takes the
 * range a surface is drawing and derives the read from it, so there is nothing
 * to get wrong.
 *
 * The store handle is narrowed to the one method, so a reading cannot reach a
 * counter it was not asked about.
 */
export const readReaderArrivals = async (
  store: {
    readonly arrivals: (request?: {
      readonly treeId?: TreeId
      readonly audience?: AudienceId
      readonly revision?: number
      readonly from?: number
      readonly to?: number
    }) => Promise<Result<StoredArrivals, ReaderSignalStoreError>>
  },
  request: ArrivalReadingRequest
): Promise<Result<ArrivalReading, ReaderSignalStoreError>> => {
  const { range, now, ...narrowing } = request
  const read = await store.arrivals({
    ...narrowing,
    from: arrivalRangeBefore(range).from,
    to: range.to,
  })

  if (!read.ok) return read

  const options: ArrivalSeriesOptions = now === undefined ? {} : { now }

  return ok({
    series: arrivalSeriesOf(read.value, range, options),
    change: arrivalChangeOf(read.value, range, options),
  })
}
