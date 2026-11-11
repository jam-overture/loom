import type { NodeId, TreeId } from "../ids.js"
import type { PrimitiveType } from "../primitive-type.js"
import type { AudienceId } from "../audience/audience.js"

import {
  arrivalRangeBefore,
  hourlySeriesOf,
  readReaderArrivals,
  type ArrivalCounterHandle,
  type ArrivalRange,
  type ArrivalReading,
  type ArrivalSeriesOptions,
} from "./arrivals.js"
import type { ReaderSignalStoreError } from "./journal.js"
import { ratioOf, type Ratio } from "./ratios.js"
import type { Result } from "../result.js"
import { ok } from "../result.js"
import { DELEGATED_READER_SIGNAL_KINDS } from "./kinds.js"

/**
 * **What readers did, by the hour they did it in.**
 *
 * [`arrivals.ts`](arrivals.ts) put a clock on one counter: page views, by the
 * hour they began in (0356). It let the portal draw a range picker, a figure
 * for the range and a chart of twenty-four bars — and it left every other
 * question on that screen unanswerable over a range, because a tally keeps no
 * time (rule 5 of `docs/signals.md`) and the hourly counter counted arrivals
 * only. `Loom portal` filed for the rest of it the same morning: *a goal's
 * figure for a range, and `By page`'s bars for one, need what readers did on a
 * part counted by hour, and only page views are.*
 *
 * A goal is one kind of thing a reader does to one part
 * ([0350](../../decisions/0350-a-project-sets-goals-from-signals-already-collected-and-one-of-them-is-primary.md)):
 * *presses* of a button, *sends* of a form, *opens* of a disclosure. Those are
 * three of the five kinds and they are exactly
 * `DELEGATED_READER_SIGNAL_KINDS` — the kinds a reader *aimed at something* to
 * cause (0167). So this is the seventh counter, filed per part per hour, and it
 * holds those three kinds and nothing else.
 *
 * ## Why not every counter a tally has
 *
 * The obvious table is *the tallies, with an hour in the key*, and it is the
 * wrong one twice over.
 *
 * - **`views`, `reached` and `engaged` are distinct counts of page views, and
 *   distinctness does not add.** A reader whose page view crosses midnight is
 *   one view in each hour and two in their sum, so an hourly table of them
 *   would publish a denominator that grows with how finely it is sliced — and
 *   the straddle a rollup window already causes (0147) at least has a
 *   measurement bounding it. **The denominator an hourly rate needs is already
 *   exact and already hourly**: page views that began in an hour, counted once,
 *   at the door (0214, 0356). Dividing this counter by that one is the rate
 *   0350 clause 4 defines, taken over a range.
 * - **`dwellMs` is a byproduct of a page being on screen rather than a thing a
 *   reader did**, and it is the one counter whose rows are as numerous as the
 *   page is large: a `dwelled` signal is observed for every addressed node that
 *   comes into view, so an hourly dwell row per part on a 6,000-node page is
 *   6,000 rows an hour — 144,000 a day, for ever, per revision — against a
 *   durable table that is never swept. The three kinds here are **bounded by
 *   what readers did**: a reader who presses one button on that same page
 *   writes one row.
 *
 * That boundary is the whole design, and it is a sentence a deployment can
 * read: **this counter grows with what readers do, not with how big a page
 * is.**
 *
 * ## Written by the fold, from the same pass
 *
 * The door writes the arrivals, because nothing but the door knows which page
 * views were already underway (0214). These are written by the fold, in the
 * same `applyWindow` transaction as the tallies they slice, from **the same
 * pass of `rollUp`** — not a second walk over the window.
 *
 * That is not a tidiness: `rollUp` refuses a batch it has already folded in
 * this window (0314), and the refusal is a judgement made once per batch. A
 * second pass would make it twice, against a different grouping, and a repeat
 * that fell in two different hours would be refused by one pass and counted by
 * the other — so the hours would stop summing to the tally they are a slice
 * of, permanently and invisibly (0158). One pass makes the sum an invariant
 * instead, and `rollup.test.ts` asserts it.
 *
 * **The hour is the door's instant, never the sender's.** `receivedAt` is a
 * server clock; `sentAt` is a number a page said, and a chart drawn from it
 * would be a chart a page could move bars on (0355).
 *
 * ## What an hour's count settles
 *
 * An hour's rows stop moving once every delivery received in that hour has been
 * folded — which is the first fold whose horizon is past the end of the hour,
 * so one collection window after it. A reading of the hour before that is
 * reading an hour still being filled, exactly as the last bar of *the last 24
 * hours* is, and {@link ActedHour.whole} is how a surface says so.
 *
 * Pure: no store, no clock, no DOM, and no import that reaches a package.
 */

/**
 * The three kinds this counter holds, which are the kinds a reader aimed at
 * something to cause (0167) and the kinds a goal may be made of (0350).
 *
 * Not a new vocabulary — a narrowing of the closed five (rule 6), spelled as
 * the list `kinds.ts` already publishes, so a sixth delegated kind would land
 * here by being added there.
 */
export type ActedKind = (typeof DELEGATED_READER_SIGNAL_KINDS)[number]

export const ACTED_KINDS: readonly ActedKind[] = DELEGATED_READER_SIGNAL_KINDS

/** Whether a signal kind is one this counter holds. */
export const isActedKind = (kind: string): kind is ActedKind =>
  (ACTED_KINDS as readonly string[]).includes(kind)

/**
 * What readers did, as four numbers, with nothing saying what they did it to.
 *
 * The four counters are the tally's four occurrence counters that come from the
 * three delegated kinds. `opens` and `closes` are both `disclosed` and are kept
 * apart for the reason the tally keeps them apart: a goal counts openings
 * (0350), and a surface drawing *what readers did* may want to say that a
 * disclosure was opened nine times and shut eight.
 *
 * **All four are occurrences, which is the property every sum over them
 * rests on.** A reader who presses twice is two; two readers who press once
 * each are two; and neither figure is a count of readers, so rows may be added
 * across hours, parts, revisions and audiences without the distinctness trap
 * the tally's `views`, `reached` and `engaged` carry (0147, 0284). Separated
 * from the key for exactly that reason: a subtree's total
 * ([`inside.ts`](inside.ts)) is these four numbers and no key at all.
 */
export type ActedCounts = {
  readonly activations: number
  readonly opens: number
  readonly closes: number
  readonly completions: number
}

/** What readers did to one part of one revision, in one hour. */
export type ActedHourCount = ActedCounts & {
  readonly treeId: TreeId
  readonly revision: number
  readonly nodeId: NodeId
  readonly type: PrimitiveType
  /** The hour it happened in, as the instant that hour began (UTC). */
  readonly hour: number
}

/** An hour's row as the store keeps it. See `StoredTally.audienceId` (0284). */
export type StoredActedHour = ActedHourCount & {
  readonly audienceId: AudienceId
  readonly updatedAt: string
}

/**
 * The counter a kind is counted in.
 *
 * `disclosed` is openings, which is the same choice the portal's goal figure
 * makes (0350 clause 4) — published here so the rule is spelled once, in the
 * lane that owns the counters, rather than in each surface that reads them.
 *
 * It takes the counters rather than a row, so the one spelling serves a stored
 * hour and a sum of them alike.
 */
export const actedCountOf = (counts: ActedCounts, kind: ActedKind): number => {
  switch (kind) {
    case "activated":
      return counts.activations
    case "disclosed":
      return counts.opens
    case "completed":
      return counts.completions
  }
}

/**
 * What a ranged read of the counter hands back, which is the shape
 * {@link StoredArrivals} has and for the same two reasons.
 */
export type StoredActed = {
  /** Every row in the range, in no particular order. */
  readonly hours: readonly StoredActedHour[]
  /**
   * The first hour this scope has ever counted an action in, whatever range was
   * asked for.
   *
   * Absent means *nothing has ever been counted here*, which is a different
   * sentence from *nobody did anything in the range you asked about* (0309,
   * 0347). It narrows with the request, so a goal's figure says when counting
   * began for that part rather than for the deployment.
   */
  readonly begins?: number
}

/** One hour of a range, which is one bar. See {@link ArrivalHour}. */
export type ActedHour = {
  /** The instant the hour began (UTC). */
  readonly hour: number
  /** What readers did in it, in the kind this series is of. */
  readonly count: number
  /**
   * Whether this hour is over and inside the range.
   *
   * False on the hour in progress, and false where the range cuts the hour
   * short — so a surface does not draw the clock as a fall.
   */
  readonly whole: boolean
}

/**
 * What readers did over a range, by hour, in one kind.
 *
 * One kind per series because that is what a goal is, and because a chart with
 * presses and sends added together is a chart of two different things.
 */
export type ActedSeries = {
  readonly range: ArrivalRange
  readonly kind: ActedKind
  /**
   * One entry per hour, ascending, from the later of the range's first hour and
   * the hour counting began. Dense: an hour nobody acted in is `count: 0` and
   * is present.
   */
  readonly hours: readonly ActedHour[]
  /** What readers did inside the range, which is the sum of the hours above. */
  readonly count: number
  /** The first hour this scope ever counted, carried through from the store. */
  readonly begins?: number
  /** Whether the range starts before counting did, so the series is shorter than asked for. */
  readonly clipped: boolean
}

/** What a series may be told besides the rows: the kind, and the clock. */
export type ActedSeriesOptions = ArrivalSeriesOptions & {
  /** Absent reads presses, which is the commonest goal there is (0350). */
  readonly kind?: ActedKind
}

/**
 * The hours of a range, as the counter answers for them.
 *
 * Rows are summed into their hour, so a scope holding several revisions or
 * parts adds — **occurrences add** (unlike the distinct counts this table
 * deliberately does not hold). A caller wanting one part asks the store for
 * one.
 *
 * Rows outside the range are ignored rather than refused, for the reason
 * `arrivalSeriesOf` ignores them: a wider read is what {@link actedChangeOf}
 * narrows twice.
 */
export const actedSeriesOf = (
  stored: StoredActed,
  range: ArrivalRange,
  options: ActedSeriesOptions = {}
): ActedSeries => {
  const kind = options.kind ?? "activated"
  const filled = hourlySeriesOf(
    stored.hours,
    stored.begins,
    range,
    (row) => actedCountOf(row, kind),
    options
  )

  return {
    range,
    kind,
    hours: filled.hours,
    count: filled.total,
    ...(stored.begins === undefined ? {} : { begins: stored.begins }),
    clipped: filled.clipped,
  }
}

/**
 * What readers did in a range against what they did in the period before it.
 *
 * The trend the wireframe puts beside a goal, and the figure that is a lie if
 * the earlier period is one the deployment was not counting through.
 */
export type ActedChange = {
  readonly range: ArrivalRange
  /** The equal-length period before, which is `arrivalRangeBefore` (0356). */
  readonly before: ArrivalRange
  readonly kind: ActedKind
  readonly count: number
  /**
   * What readers did in the earlier period, or `null` where counting had not
   * begun when it started.
   *
   * `null` is not nought, and the difference is the whole of this field: a
   * deployment that upgraded on Tuesday had no counter before Tuesday and no
   * missing presses either.
   */
  readonly was: number | null
  /** The quotient, or why there is none (`ratios.ts`). */
  readonly ratio: Ratio
}

/**
 * Both figures and the quotient, from one read spanning both periods.
 *
 * The read has to span both, which is what {@link readReaderActed} is for: the
 * obvious caller reads the range on the screen and reports an earlier period
 * that is empty **because it was not read** (0356).
 */
export const actedChangeOf = (
  stored: StoredActed,
  range: ArrivalRange,
  options: ActedSeriesOptions = {}
): ActedChange => {
  const before = arrivalRangeBefore(range)
  const now = actedSeriesOf(stored, range, options)
  const earlier = actedSeriesOf(stored, before, options)
  const was = stored.begins === undefined || stored.begins > before.from ? null : earlier.count

  return {
    range,
    before,
    kind: now.kind,
    count: now.count,
    was,
    ratio: ratioOf(was, now.count),
  }
}

/** What a surface asks for: a range, the narrowing, the kind and the clock. */
export type ActedReadingRequest = {
  readonly range: ArrivalRange
  /** The kind the series is of. Absent reads presses. */
  readonly kind?: ActedKind
  /** Absent reads every tree the handle can see, which is the scope rule (0020). */
  readonly treeId?: TreeId
  /**
   * The one part this is about, where it is about one.
   *
   * A goal is a kind on a part, so a goal's series passes this and the store
   * answers it from an index rather than by reading the page's other parts.
   * Absent sums every part the narrowing holds, which is *what readers did on
   * this page* rather than *on this part*.
   */
  readonly nodeId?: NodeId
  /** Absent reads every audience (0284), whose counts then add. */
  readonly audience?: AudienceId
  /** Absent reads every revision, whose counts then add — which is what a goal wants (0350). */
  readonly revision?: number
  /** Now, where the caller has it, so the hour in progress is marked as one. */
  readonly now?: number
}

/** The chart and the figure beside it, from one read. */
export type ActedReading = {
  readonly series: ActedSeries
  readonly change: ActedChange
}

/** The one method of the counter handle a reading of this needs. */
export type ActedCounterHandle = {
  readonly acted: (request?: {
    readonly treeId?: TreeId
    readonly nodeId?: NodeId
    readonly audience?: AudienceId
    readonly revision?: number
    readonly from?: number
    readonly to?: number
  }) => Promise<Result<StoredActed, ReaderSignalStoreError>>
}

/**
 * The chart, the range's figure and the change on the period before it, in one
 * call against a counter handle.
 *
 * It exists for the reason `readReaderArrivals` does: the composition has a
 * wrong version that type-checks, and it reads as *every press you have is new*
 * on a screen, from a store that holds the right answer. The store handle is
 * narrowed to the one method, so a reading cannot reach a counter it was not
 * asked about.
 */
export const readReaderActed = async (
  store: ActedCounterHandle,
  request: ActedReadingRequest
): Promise<Result<ActedReading, ReaderSignalStoreError>> => {
  const { range, now, kind, ...narrowing } = request
  const read = await store.acted({
    ...narrowing,
    from: arrivalRangeBefore(range).from,
    to: range.to,
  })

  if (!read.ok) return read

  const options: ActedSeriesOptions = {
    ...(now === undefined ? {} : { now }),
    ...(kind === undefined ? {} : { kind }),
  }

  return ok({
    series: actedSeriesOf(read.value, range, options),
    change: actedChangeOf(read.value, range, options),
  })
}

/**
 * What readers did in a range, over the page views they did it in.
 *
 * The figure 0350 clause 4 defines — *7 presses in 200 page views, 3.5 per
 * 100* — taken over a range rather than since counting began, which is the
 * figure `docs/portal-wireframes.md` *1 · Signals* puts beside page views in
 * the range.
 *
 * ## The two numbers are counted at different moments, and that is stated
 * rather than hidden
 *
 * The denominator is page views that **began** in the range (0214, 0356). The
 * numerator is what readers **did** in it. So a reader who arrived at 10:59 and
 * pressed at 11:01 is in the eleven o'clock numerator and the ten o'clock
 * denominator, and the two edges of any range are therefore inexact in opposite
 * directions.
 *
 * It is bounded by the edges rather than by the range: over thirty days it is
 * two page views' worth of a month, and over one hour it is the whole of what a
 * figure is about. **So there is no per-hour rate**, only a rate over the
 * range: a series of hourly quotients would publish that boundary error once
 * per bucket, in a shape where *a press with no arrival* reads as an infinite
 * rate rather than as a reader who came in before the hour. The hours are
 * published as counts, which add honestly, and the quotient is taken once.
 */
export type ActedRate = {
  /**
   * What readers did per hundred page views in the range, or `null` where there
   * is no quotient to take.
   *
   * `null` where the range held no page views at all — including the case worth
   * naming, which is a range holding actions and no arrivals: every reader in
   * it arrived before it began. A nought there would read as *nobody acts*, and
   * the counts beside it say what actually happened.
   */
  readonly per100: number | null
  /** The same figure for the period before, or `null` on the same terms. */
  readonly was: number | null
  /** The quotient of the two rates, or why there is none (`ratios.ts`). */
  readonly ratio: Ratio
}

/** What readers did over a range, the page views it happened in, and the rate. */
export type ActedRateReading = {
  readonly acted: ActedReading
  readonly arrivals: ArrivalReading
  readonly rate: ActedRate
}

/** Both figures' handles, which one counter store satisfies. */
export type ActedRateHandle = ActedCounterHandle & ArrivalCounterHandle

/**
 * Per hundred, with the multiplication first: `(count / views) * 100` of seven
 * in two hundred is 3.5000000000000004, and a figure a surface rounds is still
 * a figure a test has to spell that way.
 */
const per100 = (count: number, views: number | null): number | null =>
  views === null || views === 0 ? null : (count * 100) / views

/**
 * The figure, the chart, the denominator and the trend, from two reads of one
 * store over one range.
 *
 * **One range, taken once, passed to both halves.** A caller composing this
 * itself has to get the same range into two reads and the same period before it
 * into two comparisons; the failure is a rate whose numerator and denominator
 * describe different stretches of time, which is a number nobody can tell is
 * wrong by looking at it.
 */
export const readReaderActedRate = async (
  store: ActedRateHandle,
  request: ActedReadingRequest
): Promise<Result<ActedRateReading, ReaderSignalStoreError>> => {
  const acted = await readReaderActed(store, request)
  if (!acted.ok) return acted

  const { kind: _kind, nodeId: _nodeId, ...arrivalRequest } = request
  const arrivals = await readReaderArrivals(store, arrivalRequest)
  if (!arrivals.ok) return arrivals

  const now = per100(acted.value.change.count, arrivals.value.change.views)
  const was =
    acted.value.change.was === null
      ? null
      : per100(acted.value.change.was, arrivals.value.change.was)

  return ok({
    acted: acted.value,
    arrivals: arrivals.value,
    rate: { per100: now, was, ratio: ratioOf(was, now) },
  })
}
