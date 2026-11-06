import { describe, expect, it } from "vitest"

import { err, ok } from "../result.js"
import { OTHER_TREE, RIDERS, SKIERS, TREE } from "../testing/reader-signal-contract.js"

import {
  ARRIVAL_HOUR_MS,
  arrivalChangeOf,
  arrivalHourOf,
  arrivalHoursOf,
  arrivalRangeOf,
  arrivalSeriesOf,
  arrivalRangeBefore,
  readReaderArrivals,
  type StoredArrivalHour,
  type StoredArrivals,
} from "./arrivals.js"
import type { ReaderSignalStoreError } from "./journal.js"
import type { RevisionViews } from "./page-views.js"

const HOUR = ARRIVAL_HOUR_MS

/** Midnight on a day with nothing else in it, so an hour is readable in a failure. */
const MIDNIGHT = Date.parse("2026-11-06T00:00:00.000Z")

const at = (hour: number, minutes = 0): string =>
  new Date(MIDNIGHT + hour * HOUR + minutes * 60_000).toISOString()

const opening = (views: number, overrides: Partial<RevisionViews> = {}): RevisionViews => ({
  treeId: TREE,
  revision: 1,
  views,
  ...overrides,
})

const row = (hour: number, views: number, overrides: Partial<StoredArrivalHour> = {}): StoredArrivalHour => ({
  audienceId: SKIERS,
  treeId: TREE,
  revision: 1,
  hour: MIDNIGHT + hour * HOUR,
  views,
  updatedAt: at(hour),
  ...overrides,
})

const stored = (hours: readonly StoredArrivalHour[], begins?: number): StoredArrivals => ({
  hours,
  ...(begins === undefined ? {} : { begins }),
})

/** The whole day, which is the range most of these are read over. */
const DAY = { from: MIDNIGHT, to: MIDNIGHT + 24 * HOUR }

describe("the hour an instant falls in", () => {
  it("is the instant that hour began", () => {
    expect(arrivalHourOf("2026-11-06T14:37:11.904Z")).toBe(Date.parse("2026-11-06T14:00:00.000Z"))
  })

  it("is the hour itself for an instant exactly on one", () => {
    expect(arrivalHourOf("2026-11-06T14:00:00.000Z")).toBe(Date.parse("2026-11-06T14:00:00.000Z"))
  })

  it("is in UTC, whatever offset the instant was written with", () => {
    expect(arrivalHourOf("2026-11-06T15:30:00.000+01:00")).toBe(
      Date.parse("2026-11-06T14:00:00.000Z")
    )
  })

  /** Before the common era, where flooring a negative number is the easy thing to get wrong. */
  it("floors rather than truncates, so an instant before 1970 lands in the hour it is in", () => {
    const hour = arrivalHourOf("1969-12-31T22:30:00.000Z")

    expect(hour).toBe(Date.parse("1969-12-31T22:00:00.000Z"))
  })

  it("is nothing for something that is not an instant", () => {
    expect(arrivalHourOf("whenever")).toBeUndefined()
  })
})

describe("what one delivery adds", () => {
  it("files every opening under the hour the door read it in", () => {
    const hours = arrivalHoursOf([opening(2), opening(1, { treeId: OTHER_TREE })], at(14, 37))

    expect(hours.ok && hours.value).toEqual([
      { treeId: TREE, revision: 1, hour: MIDNIGHT + 14 * HOUR, views: 2 },
      { treeId: OTHER_TREE, revision: 1, hour: MIDNIGHT + 14 * HOUR, views: 1 },
    ])
  })

  it("adds nothing for a delivery that opened nothing", () => {
    const hours = arrivalHoursOf([], at(14))

    expect(hours.ok && hours.value).toEqual([])
  })

  /**
   * The one failure, and it is a failure rather than an empty list on purpose:
   * openings written to the total and not to the hour would make the two
   * numbers differ for a reason no reading could name.
   */
  it("refuses openings it cannot place in an hour, and says how many", () => {
    const hours = arrivalHoursOf([opening(2)], "whenever")

    expect(hours.ok).toBe(false)
    expect(!hours.ok && hours.error).toEqual({
      code: "unavailable",
      detail: "could not place 1 page views in an hour: whenever is not an instant",
    })
  })
})

describe("a range of whole hours", () => {
  it("is the hour an instant is in and the hours before it", () => {
    expect(arrivalRangeOf(MIDNIGHT + 23 * HOUR + 1_000, 24)).toEqual(DAY)
  })

  it("is one hour for one, which is the hour in progress", () => {
    expect(arrivalRangeOf(MIDNIGHT + 30_000, 1)).toEqual({ from: MIDNIGHT, to: MIDNIGHT + HOUR })
  })

  it("is one hour for nought or fewer rather than an empty range", () => {
    expect(arrivalRangeOf(MIDNIGHT, 0)).toEqual({ from: MIDNIGHT, to: MIDNIGHT + HOUR })
  })

  it("is preceded by a period of the same length, immediately before", () => {
    expect(arrivalRangeBefore(DAY)).toEqual({ from: MIDNIGHT - 24 * HOUR, to: MIDNIGHT })
  })

  /** The property the comparison rests on: two periods, the same number of buckets. */
  it("holds as many buckets as the period before it", () => {
    const now = stored([], MIDNIGHT - 48 * HOUR)
    const series = arrivalSeriesOf(now, DAY)
    const before = arrivalSeriesOf(now, arrivalRangeBefore(DAY))

    expect(series.hours).toHaveLength(24)
    expect(before.hours).toHaveLength(24)
  })
})

describe("page views by hour", () => {
  it("is one entry per hour of the range, ascending", () => {
    const series = arrivalSeriesOf(stored([row(2, 5)], MIDNIGHT), DAY)

    expect(series.hours).toHaveLength(24)
    expect(series.hours[0]?.hour).toBe(MIDNIGHT)
    expect(series.hours[23]?.hour).toBe(MIDNIGHT + 23 * HOUR)
    expect(series.hours[2]).toEqual({ hour: MIDNIGHT + 2 * HOUR, views: 5, whole: true })
  })

  /** A chart that omitted a quiet hour would draw a narrower day. */
  it("says nought for an hour nobody arrived in rather than leaving it out", () => {
    const series = arrivalSeriesOf(stored([row(2, 5)], MIDNIGHT), DAY)

    expect(series.hours[1]).toEqual({ hour: MIDNIGHT + HOUR, views: 0, whole: true })
    expect(series.views).toBe(5)
  })

  /**
   * Arrivals add: a reader who arrived arrived once whichever form of
   * whichever page they were served (0297, 0299).
   */
  it("sums every tree, revision and audience of the hour into one bar", () => {
    const series = arrivalSeriesOf(
      stored(
        [
          row(2, 5),
          row(2, 3, { treeId: OTHER_TREE }),
          row(2, 1, { revision: 2 }),
          row(2, 4, { audienceId: RIDERS }),
        ],
        MIDNIGHT
      ),
      DAY
    )

    expect(series.hours[2]?.views).toBe(13)
    expect(series.views).toBe(13)
  })

  it("ignores a row outside the range rather than refusing it", () => {
    const series = arrivalSeriesOf(
      stored([row(-1, 9), row(2, 5), row(24, 7)], MIDNIGHT - HOUR),
      DAY
    )

    expect(series.views).toBe(5)
  })

  it("counts an arrival in exactly one hour, whichever side of a boundary it is on", () => {
    const counted = (instant: string): StoredArrivalHour[] => {
      const hours = arrivalHoursOf([opening(1)], instant)

      if (!hours.ok) throw new Error(hours.error.detail)

      return hours.value.map((count) => ({ ...count, audienceId: SKIERS, updatedAt: instant }))
    }

    const series = arrivalSeriesOf(
      stored([...counted(at(2, 59)), ...counted(at(3, 0))], MIDNIGHT),
      DAY
    )

    expect(series.hours[2]?.views).toBe(1)
    expect(series.hours[3]?.views).toBe(1)
    expect(series.views).toBe(2)
  })

  /**
   * The read is a read: it adds nothing and it changes nothing, so the figure
   * is the same however many times a screen asks for it.
   */
  it("does not grow when the same rows are read twice", () => {
    const rows = stored([row(2, 5)], MIDNIGHT)

    expect(arrivalSeriesOf(rows, DAY).views).toBe(5)
    expect(arrivalSeriesOf(rows, DAY).views).toBe(5)
  })

  describe("the hour in progress", () => {
    it("is not whole where now is inside it", () => {
      const series = arrivalSeriesOf(stored([row(23, 2)], MIDNIGHT), DAY, {
        now: MIDNIGHT + 23 * HOUR + 30 * 60_000,
      })

      expect(series.hours[23]).toEqual({ hour: MIDNIGHT + 23 * HOUR, views: 2, whole: false })
      expect(series.hours[22]?.whole).toBe(true)
    })

    it("is whole once it is over", () => {
      const series = arrivalSeriesOf(stored([row(23, 2)], MIDNIGHT), DAY, {
        now: MIDNIGHT + 24 * HOUR,
      })

      expect(series.hours[23]?.whole).toBe(true)
    })

    it("is whole where no clock was handed in, because the range is then a stretch that is over", () => {
      const series = arrivalSeriesOf(stored([row(23, 2)], MIDNIGHT), DAY)

      expect(series.hours.every((hour) => hour.whole)).toBe(true)
    })
  })

  describe("an unaligned range", () => {
    /** A bucket belongs to the range its own start falls in. */
    it("holds the buckets that begin inside it and not the one it starts in the middle of", () => {
      const series = arrivalSeriesOf(stored([row(0, 4), row(1, 6)], MIDNIGHT), {
        from: MIDNIGHT + 30 * 60_000,
        to: MIDNIGHT + 2 * HOUR,
      })

      expect(series.hours.map((hour) => hour.hour)).toEqual([MIDNIGHT + HOUR])
      expect(series.views).toBe(6)
    })

    it("does not call a bucket whole where the range cuts it short", () => {
      const series = arrivalSeriesOf(stored([row(1, 6)], MIDNIGHT), {
        from: MIDNIGHT + HOUR,
        to: MIDNIGHT + HOUR + 30 * 60_000,
      })

      expect(series.hours[0]?.whole).toBe(false)
    })
  })

  describe("where the data starts", () => {
    it("begins at the hour counting began rather than drawing empty hours before it", () => {
      const series = arrivalSeriesOf(stored([row(20, 3)], MIDNIGHT + 20 * HOUR), DAY)

      expect(series.hours).toHaveLength(4)
      expect(series.hours[0]?.hour).toBe(MIDNIGHT + 20 * HOUR)
      expect(series.begins).toBe(MIDNIGHT + 20 * HOUR)
      expect(series.clipped).toBe(true)
    })

    it("draws the whole range where counting began before it", () => {
      const series = arrivalSeriesOf(stored([row(2, 5)], MIDNIGHT - 100 * HOUR), DAY)

      expect(series.hours).toHaveLength(24)
      expect(series.clipped).toBe(false)
    })

    it("is not clipped where counting began in the range's own first hour", () => {
      const series = arrivalSeriesOf(stored([row(0, 1)], MIDNIGHT), DAY)

      expect(series.clipped).toBe(false)
      expect(series.hours).toHaveLength(24)
    })

    /**
     * Two empties that are not the same sentence: *nobody arrived* and *nothing
     * here has ever been counted* (0309, 0347).
     */
    it("is empty with no beginning where nothing has ever been counted", () => {
      const series = arrivalSeriesOf(stored([]), DAY)

      expect(series.hours).toEqual([])
      expect(series.begins).toBeUndefined()
      expect(series.clipped).toBe(false)
      expect(series.views).toBe(0)
    })

    it("is empty where counting began after the range ended", () => {
      const series = arrivalSeriesOf(stored([], MIDNIGHT + 48 * HOUR), DAY)

      expect(series.hours).toEqual([])
      expect(series.begins).toBe(MIDNIGHT + 48 * HOUR)
      expect(series.clipped).toBe(true)
    })
  })
})

describe("the range against the period before it", () => {
  const twoDays = stored(
    [row(-20, 4), row(-2, 6), row(2, 5), row(20, 10)],
    MIDNIGHT - 100 * HOUR
  )

  it("counts each period from the one read", () => {
    const change = arrivalChangeOf(twoDays, DAY)

    expect(change.views).toBe(15)
    expect(change.was).toBe(10)
    expect(change.ratio).toEqual({ ratio: 1.5, absent: null })
    expect(change.before).toEqual({ from: MIDNIGHT - 24 * HOUR, to: MIDNIGHT })
  })

  /**
   * The figure that is a lie if it is reported as nought: a deployment that
   * upgraded on Tuesday did not lose every reader it had on Monday.
   */
  it("has no earlier figure where counting began inside the earlier period", () => {
    const change = arrivalChangeOf(stored([row(2, 5)], MIDNIGHT - 2 * HOUR), DAY)

    expect(change.views).toBe(5)
    expect(change.was).toBeNull()
    expect(change.ratio).toEqual({ ratio: null, absent: "unmeasured" })
  })

  it("has no earlier figure where nothing has ever been counted", () => {
    const change = arrivalChangeOf(stored([]), DAY)

    expect(change.was).toBeNull()
    expect(change.ratio).toEqual({ ratio: null, absent: "unmeasured" })
  })

  /** A rise from nothing is a measurement, and the one a surface most wants to draw. */
  it("says the earlier period was counted and held nobody", () => {
    const change = arrivalChangeOf(stored([row(2, 5)], MIDNIGHT - 48 * HOUR), DAY)

    expect(change.was).toBe(0)
    expect(change.ratio).toEqual({ ratio: null, absent: "from-nothing" })
  })

  it("takes both periods over the same number of hours", () => {
    const change = arrivalChangeOf(twoDays, DAY)

    expect(change.range.to - change.range.from).toBe(change.before.to - change.before.from)
  })
})

describe("the chart and its figures, from one read", () => {
  /**
   * A handle that records what it was asked for, because the whole point of
   * the call is the range it derives — the composition this prevents reads only
   * the range on the screen and reports an earlier period that was never read.
   */
  const handle = (hours: readonly StoredArrivalHour[], begins?: number) => {
    const asked: { from?: number; to?: number }[] = []

    return {
      asked,
      arrivals: (request?: { readonly from?: number; readonly to?: number }) => {
        asked.push({ ...request })

        return Promise.resolve(
          ok<StoredArrivals>({
            hours: hours.filter(
              (hour) =>
                (request?.from === undefined || hour.hour >= request.from) &&
                (request?.to === undefined || hour.hour < request.to)
            ),
            ...(begins === undefined ? {} : { begins }),
          })
        )
      },
    }
  }

  it("reads both periods, so the earlier figure is measured rather than missing", async () => {
    const store = handle([row(-2, 6), row(2, 5)], MIDNIGHT - 100 * HOUR)
    const read = await readReaderArrivals(store, { range: DAY })

    expect(store.asked).toEqual([{ from: MIDNIGHT - 24 * HOUR, to: MIDNIGHT + 24 * HOUR }])
    expect(read.ok && read.value.change.views).toBe(5)
    expect(read.ok && read.value.change.was).toBe(6)
  })

  it("draws the series over the range asked for and not over the read", async () => {
    const store = handle([row(-2, 6), row(2, 5)], MIDNIGHT - 100 * HOUR)
    const read = await readReaderArrivals(store, { range: DAY })

    expect(read.ok && read.value.series.hours).toHaveLength(24)
    expect(read.ok && read.value.series.views).toBe(5)
  })

  it("passes the narrowing through, so a chart of one page is one argument", async () => {
    const store = handle([], MIDNIGHT)
    await readReaderArrivals(store, { range: DAY, treeId: OTHER_TREE, audience: RIDERS, revision: 2 })

    expect(store.asked[0]).toEqual({
      treeId: OTHER_TREE,
      audience: RIDERS,
      revision: 2,
      from: MIDNIGHT - 24 * HOUR,
      to: MIDNIGHT + 24 * HOUR,
    })
  })

  it("marks the hour in progress on both the series and nothing else", async () => {
    const store = handle([row(23, 2)], MIDNIGHT)
    const read = await readReaderArrivals(store, {
      range: DAY,
      now: MIDNIGHT + 23 * HOUR + 60_000,
    })

    expect(read.ok && read.value.series.hours[23]?.whole).toBe(false)
    expect(read.ok && read.value.series.hours[22]?.whole).toBe(true)
  })

  it("hands back the store's failure rather than an empty chart", async () => {
    const read = await readReaderArrivals(
      {
        arrivals: () =>
          Promise.resolve(err<ReaderSignalStoreError>({ code: "unavailable", detail: "no" })),
      },
      { range: DAY }
    )

    expect(read.ok).toBe(false)
  })
})
