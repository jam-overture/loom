import { describe, expect, it } from "vitest"

import { nodeId, primitiveType, SKIERS, TREE } from "../testing/reader-signal-contract.js"

import {
  actedDayShapeOf,
  actedDaysOf,
  actedSeriesOf,
  ARRIVAL_DAY_MS,
  ARRIVAL_HOUR_MS,
  arrivalDayShapeOf,
  arrivalDaysOf,
  arrivalSeriesOf,
  busiestHoursIn,
  daySeriesOf,
  dayShapeOf,
  HOURS_IN_DAY,
  quietestHoursIn,
  type ArrivalRange,
  type StoredActedHour,
  type StoredArrivalHour,
  type StoredArrivals,
  type StoredActed,
} from "./index.js"

/**
 * Both folds are pure functions of a series, so every fixture here goes through
 * the reading that produces one — `arrivalSeriesOf` or `actedSeriesOf` — rather
 * than being written as a series by hand. A fold asserted against a series
 * nothing produces is a fold asserted against nothing.
 *
 * The one exception is the hour handed over twice, which no reading produces and
 * which is the whole point of that case: it is written out, and it goes through
 * the generic fold rather than through either wrapper.
 */

const HOUR = ARRIVAL_HOUR_MS
const DAY = ARRIVAL_DAY_MS

/** Midnight UTC on a Friday, so a day boundary is readable in a failure. */
const MIDNIGHT = Date.parse("2026-11-06T00:00:00.000Z")

const hoursFrom = (from: number, hours: number): ArrivalRange => ({
  from,
  to: from + hours * HOUR,
})

const arrivals = (
  views: readonly (readonly [hour: number, views: number])[],
  begins = MIDNIGHT
): StoredArrivals => ({
  hours: views.map(
    ([hour, count]): StoredArrivalHour => ({
      audienceId: SKIERS,
      treeId: TREE,
      revision: 1,
      hour: MIDNIGHT + hour * HOUR,
      views: count,
      updatedAt: new Date(MIDNIGHT + hour * HOUR).toISOString(),
    })
  ),
  begins,
})

const acted = (
  counts: readonly (readonly [hour: number, activated: number])[],
  begins = MIDNIGHT
): StoredActed => ({
  hours: counts.map(
    ([hour, activated]): StoredActedHour => ({
      audienceId: SKIERS,
      treeId: TREE,
      revision: 1,
      nodeId: nodeId("band"),
      type: primitiveType("loom.button"),
      hour: MIDNIGHT + hour * HOUR,
      activations: activated,
      opens: 0,
      closes: 0,
      completions: 0,
      updatedAt: new Date(MIDNIGHT + hour * HOUR).toISOString(),
    })
  ),
  begins,
})

/** A dense week of arrivals: one view in every hour of seven whole days. */
const everyHourOf = (days: number): readonly (readonly [number, number])[] =>
  Array.from({ length: days * HOURS_IN_DAY }, (_, hour) => [hour, 1] as const)

describe("a day series", () => {
  it("folds a week of hours into seven bars whose counts sum to the series'", () => {
    const range = hoursFrom(MIDNIGHT, 7 * HOURS_IN_DAY)
    const series = arrivalSeriesOf(arrivals(everyHourOf(7)), range)
    const days = arrivalDaysOf(series)

    expect(series.hours).toHaveLength(168)
    expect(days.days).toHaveLength(7)
    expect(days.count).toBe(series.views)
    expect(days.days.map((day) => day.count)).toEqual([24, 24, 24, 24, 24, 24, 24])
  })

  it("draws the thirty bars a thirty-day range would otherwise draw seven hundred and twenty of", () => {
    const range = hoursFrom(MIDNIGHT, 30 * HOURS_IN_DAY)
    const series = arrivalSeriesOf(arrivals(everyHourOf(30)), range)

    expect(series.hours).toHaveLength(720)
    expect(arrivalDaysOf(series).days).toHaveLength(30)
  })

  it("keeps a quiet day as a nought rather than leaving it out", () => {
    const range = hoursFrom(MIDNIGHT, 3 * HOURS_IN_DAY)
    const series = arrivalSeriesOf(arrivals([[2, 5], [50, 7]]), range)
    const days = arrivalDaysOf(series)

    expect(days.days.map((day) => day.count)).toEqual([5, 0, 7])
    expect(days.days.every((day) => day.hours === HOURS_IN_DAY)).toBe(true)
  })

  it("marks the day the clock has not finished and keeps what it holds", () => {
    const range = hoursFrom(MIDNIGHT, 2 * HOURS_IN_DAY)
    const now = MIDNIGHT + DAY + 10 * HOUR + 30 * 60_000
    const series = arrivalSeriesOf(arrivals([[3, 4], [34, 6]]), range, { now })
    const days = arrivalDaysOf(series)

    expect(days.days[0]).toEqual({ day: MIDNIGHT, count: 4, hours: 24, whole: true })
    expect(days.days[1]).toEqual({ day: MIDNIGHT + DAY, count: 6, hours: 24, whole: false })
    expect(days.partial).toBe(1)
    expect(days.count).toBe(series.views)
  })

  it("says how many hours a day the range cut short could speak for", () => {
    const range = hoursFrom(MIDNIGHT + 20 * HOUR, 8)
    const series = arrivalSeriesOf(arrivals([[21, 3], [26, 9]]), range)
    const days = arrivalDaysOf(series)

    expect(days.days).toEqual([
      { day: MIDNIGHT, count: 3, hours: 4, whole: false },
      { day: MIDNIGHT + DAY, count: 9, hours: 4, whole: false },
    ])
    expect(days.partial).toBe(2)
  })

  it("carries the range and the clipping through from the series it folded", () => {
    const range = hoursFrom(MIDNIGHT - DAY, 3 * HOURS_IN_DAY)
    const series = arrivalSeriesOf(arrivals([[5, 2]]), range)
    const days = arrivalDaysOf(series)

    expect(series.clipped).toBe(true)
    expect(days.clipped).toBe(true)
    expect(days.range).toEqual(range)
    expect(days.days.map((day) => day.day)).toEqual([MIDNIGHT, MIDNIGHT + DAY])
  })

  it("is empty where nothing has ever been counted, rather than a day of noughts", () => {
    const range = hoursFrom(MIDNIGHT, HOURS_IN_DAY)
    const series = arrivalSeriesOf({ hours: [] }, range)
    const days = arrivalDaysOf(series)

    expect(series.hours).toEqual([])
    expect(days.days).toEqual([])
    expect(days.count).toBe(0)
    expect(days.partial).toBe(0)
  })

  it("folds what readers did by the same rule, in the kind the series is of", () => {
    const range = hoursFrom(MIDNIGHT, 2 * HOURS_IN_DAY)
    const series = actedSeriesOf(acted([[1, 3], [25, 4]]), range)
    const days = actedDaysOf(series)

    expect(series.kind).toBe("activated")
    expect(days.days.map((day) => day.count)).toEqual([3, 4])
    expect(days.count).toBe(series.count)
  })
})

describe("a day series' offset", () => {
  it("cuts the day where the reader's midnight is", () => {
    const range = hoursFrom(MIDNIGHT, 2 * HOURS_IN_DAY)
    const series = arrivalSeriesOf(arrivals([[2, 5], [20, 7]]), range)

    expect(arrivalDaysOf(series).days.map((day) => day.count)).toEqual([12, 0])
    expect(arrivalDaysOf(series, { offsetHours: -8 }).days.map((day) => day.count)).toEqual([
      5, 7, 0,
    ])
  })

  it("names the offset it was taken at, truncated to whole hours and to one day", () => {
    const range = hoursFrom(MIDNIGHT, HOURS_IN_DAY)
    const series = arrivalSeriesOf(arrivals([[2, 1]]), range)

    expect(arrivalDaysOf(series).offsetHours).toBe(0)
    expect(arrivalDaysOf(series, { offsetHours: 5.75 }).offsetHours).toBe(5)
    expect(arrivalDaysOf(series, { offsetHours: 25 }).offsetHours).toBe(1)
  })
})

describe("the shape of a day", () => {
  it("is twenty-four bars whatever the range, with the mean over the days behind each", () => {
    const range = hoursFrom(MIDNIGHT, 4 * HOURS_IN_DAY)
    const views = [0, 1, 2, 3].map((day) => [day * HOURS_IN_DAY + 9, 10] as const)
    const shape = arrivalDayShapeOf(arrivalSeriesOf(arrivals(views), range))

    expect(shape.hours).toHaveLength(HOURS_IN_DAY)
    expect(shape.hours[9]).toEqual({ hour: 9, days: 4, count: 40, perDay: 10 })
    expect(shape.hours[3]).toEqual({ hour: 3, days: 4, count: 0, perDay: 0 })
    expect(shape.days).toBe(4)
    expect(shape.even).toBe(true)
    expect(shape.silence).toBeUndefined()
  })

  it("withholds an hour of the day no day could speak for, and never zeroes it", () => {
    const range = hoursFrom(MIDNIGHT, 5)
    const shape = arrivalDayShapeOf(arrivalSeriesOf(arrivals([[1, 4]]), range))

    expect(shape.hours.slice(0, 5).map((hour) => hour.perDay)).toEqual([0, 4, 0, 0, 0])
    expect(shape.hours.slice(5).every((hour) => hour.perDay === undefined)).toBe(true)
    expect(shape.hours[13]).toEqual({ hour: 13, days: 0, count: 0 })
    expect(shape.even).toBe(false)
  })

  it("rests the hours of an unaligned range on different numbers of days, and says so", () => {
    const range = hoursFrom(MIDNIGHT, 7 * HOURS_IN_DAY + 10)
    const shape = arrivalDayShapeOf(arrivalSeriesOf(arrivals(everyHourOf(8)), range))

    expect(shape.hours[10]!.days).toBe(7)
    expect(shape.hours[9]!.days).toBe(8)
    expect(shape.even).toBe(false)
    expect(shape.days).toBe(8)
  })

  it("leaves the hour nobody has finished arriving in out of the mean, and publishes what it held", () => {
    const range = hoursFrom(MIDNIGHT, HOURS_IN_DAY)
    const now = MIDNIGHT + 9 * HOUR + 15 * 60_000
    const series = arrivalSeriesOf(arrivals([[8, 6], [9, 2]]), range, { now })
    const shape = arrivalDayShapeOf(series)

    expect(shape.hours[8]).toEqual({ hour: 8, days: 1, count: 6, perDay: 6 })
    expect(shape.hours[9]).toEqual({ hour: 9, days: 0, count: 0 })
    expect(shape.count).toBe(6)
    expect(shape.incomplete).toBe(2)
    expect(shape.count + shape.incomplete).toBe(series.views)
  })

  it("says nothing was ever counted and nothing is finished apart", () => {
    const day = hoursFrom(MIDNIGHT, HOURS_IN_DAY)
    const unmeasured = arrivalDayShapeOf(arrivalSeriesOf({ hours: [] }, day))
    const unsettled = arrivalDayShapeOf(
      arrivalSeriesOf(arrivals([[0, 3]]), hoursFrom(MIDNIGHT, 1), { now: MIDNIGHT + 60_000 })
    )

    expect(unmeasured.silence).toBe("unmeasured")
    expect(unmeasured.days).toBe(0)
    expect(unsettled.silence).toBe("unsettled")
    expect(unsettled.incomplete).toBe(3)
    expect(unsettled.hours.every((hour) => hour.perDay === undefined)).toBe(true)
  })

  it("names the hours of the day at the offset it was given", () => {
    const range = hoursFrom(MIDNIGHT, HOURS_IN_DAY)
    const series = arrivalSeriesOf(arrivals([[17, 9]]), range)

    expect(arrivalDayShapeOf(series).hours[17]!.perDay).toBe(9)
    expect(arrivalDayShapeOf(series, { offsetHours: -8 }).hours[9]!.perDay).toBe(9)
    expect(arrivalDayShapeOf(series, { offsetHours: -8 }).offsetHours).toBe(-8)
    expect(arrivalDayShapeOf(series, { offsetHours: 7 }).hours[0]!.perDay).toBe(9)
  })

  it("shapes what readers did by the same rule", () => {
    const range = hoursFrom(MIDNIGHT, 2 * HOURS_IN_DAY)
    const shape = actedDayShapeOf(actedSeriesOf(acted([[14, 2], [38, 4]]), range))

    expect(shape.hours[14]).toEqual({ hour: 14, days: 2, count: 6, perDay: 3 })
    expect(shape.days).toBe(2)
  })
})

describe("counting the same hour twice", () => {
  /**
   * A series has one entry per hour, which is what the fold is for. The guard is
   * on the denominator rather than on the arithmetic: occurrences add and
   * distinctness does not (0362), so an hour handed over twice is twice the
   * count and one hour of one day — because a denominator that counts the same
   * day twice is a mean that is permanently half what it should be (0158).
   */
  const twice = {
    range: hoursFrom(MIDNIGHT, HOURS_IN_DAY),
    clipped: false,
    hours: [
      { hour: MIDNIGHT + 9 * HOUR, count: 4, whole: true },
      { hour: MIDNIGHT + 9 * HOUR, count: 6, whole: true },
    ],
  }

  it("counts one day and one hour of it in a day series", () => {
    const days = daySeriesOf(twice, (hour) => hour.count)

    expect(days.days).toEqual([{ day: MIDNIGHT, count: 10, hours: 1, whole: false }])
  })

  it("counts one day behind the mean in a shape", () => {
    const shape = dayShapeOf(twice, (hour) => hour.count)

    expect(shape.hours[9]).toEqual({ hour: 9, days: 1, count: 10, perDay: 10 })
    expect(shape.days).toBe(1)
  })
})

describe("the hours worth naming", () => {
  const range = hoursFrom(MIDNIGHT, 2 * HOURS_IN_DAY)
  const shape = arrivalDayShapeOf(
    arrivalSeriesOf(
      arrivals([
        [9, 10],
        [33, 20],
        [14, 4],
        [38, 4],
        [20, 1],
        [44, 1],
      ]),
      range
    )
  )

  it("ranks the busiest by the mean per day, ties by the earlier hour", () => {
    expect(busiestHoursIn(shape).map((hour) => hour.hour)).toEqual([9, 14, 20])
    expect(busiestHoursIn(shape, 1)).toEqual([{ hour: 9, days: 2, count: 30, perDay: 15 }])
  })

  it("ranks the quietest by the same figure, and an observed nought is a real answer", () => {
    const quietest = quietestHoursIn(shape, 2)

    expect(quietest.map((hour) => hour.hour)).toEqual([0, 1])
    expect(quietest.every((hour) => hour.perDay === 0 && hour.days === 2)).toBe(true)
  })

  it("will not name an hour of the day nothing was observed in as quiet", () => {
    const short = arrivalDayShapeOf(
      arrivalSeriesOf(arrivals([[7, 5], [8, 0]]), hoursFrom(MIDNIGHT + 7 * HOUR, 2))
    )

    expect(short.hours.filter((hour) => hour.perDay !== undefined)).toHaveLength(2)
    expect(quietestHoursIn(short, 5).map((hour) => hour.hour)).toEqual([8, 7])
    expect(busiestHoursIn(short, 5).map((hour) => hour.hour)).toEqual([7, 8])
  })

  /**
   * The whole reason the mean is the key: on a range that is not a whole number
   * of days, the hours of the day do not rest on the same number of days, so the
   * totals rank them by where the range happened to end.
   */
  it("ranks an hour of the day with one busy day above one with two quieter ones", () => {
    const uneven = arrivalDayShapeOf(
      arrivalSeriesOf(
        arrivals([
          [9, 10],
          [33, 10],
          [10, 15],
        ]),
        hoursFrom(MIDNIGHT, HOURS_IN_DAY + 10)
      )
    )

    expect(uneven.even).toBe(false)
    expect(uneven.hours[9]).toEqual({ hour: 9, days: 2, count: 20, perDay: 10 })
    expect(uneven.hours[10]).toEqual({ hour: 10, days: 1, count: 15, perDay: 15 })
    expect(busiestHoursIn(uneven, 2).map((hour) => hour.hour)).toEqual([10, 9])
  })

  it("names nothing at all from a shape that has nothing to say", () => {
    const silent = arrivalDayShapeOf(arrivalSeriesOf({ hours: [] }, range))

    expect(silent.silence).toBe("unmeasured")
    expect(busiestHoursIn(silent)).toEqual([])
    expect(quietestHoursIn(silent)).toEqual([])
  })

  it("asks for fewer hours than it has, and for none", () => {
    expect(busiestHoursIn(shape, 0)).toEqual([])
    expect(quietestHoursIn(shape, -3)).toEqual([])
    expect(busiestHoursIn(shape, 2.9).map((hour) => hour.hour)).toEqual([9, 14])
  })
})
