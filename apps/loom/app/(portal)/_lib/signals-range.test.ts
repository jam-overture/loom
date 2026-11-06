import { describe, expect, it } from "vitest"

import {
  arrivalChangeOf,
  arrivalSeriesOf,
  type ArrivalRange,
  type StoredArrivals,
} from "@jam-overture/loom/signals"
import { treeIdSchema } from "@jam-overture/loom"
import { DEFAULT_AUDIENCE_ID } from "@jam-overture/loom/store"

import {
  arrivalRangeFor,
  changeSentence,
  DEFAULT_RANGE,
  rangeChartOf,
  rangeFigureOf,
  rangeOf,
  rangeParam,
} from "./signals-range"

const HOUR = 3_600_000
const NOW = Date.parse("2026-11-06T15:20:00.000Z")
const THIS_HOUR = Date.parse("2026-11-06T15:00:00.000Z")

const stored = (hours: readonly [number, number][], begins?: number): StoredArrivals => ({
  hours: hours.map(([hour, views]) => ({
    treeId: treeIdSchema.parse("t_home"),
    revision: 1,
    hour,
    views,
    audienceId: DEFAULT_AUDIENCE_ID,
    updatedAt: new Date(hour).toISOString(),
  })),
  ...(begins === undefined ? {} : { begins }),
})

const readingOf = (arrivals: StoredArrivals, range: ArrivalRange) => ({
  series: arrivalSeriesOf(arrivals, range, { now: NOW }),
  change: arrivalChangeOf(arrivals, range, { now: NOW }),
})

describe("the range Signals is read over", () => {
  it("is the last 24 hours unless the address names one of the three", () => {
    expect(rangeOf(undefined)).toBe("24h")
    expect(rangeOf("7d")).toBe("7d")
    expect(rangeOf("30d")).toBe("30d")
    expect(rangeOf("365d")).toBe(DEFAULT_RANGE)
  })

  it("writes nothing into an address for the default", () => {
    expect(rangeParam("24h")).toBeUndefined()
    expect(rangeParam("30d")).toBe("30d")
  })

  it("is whole hours, ending with the one in progress", () => {
    const day = arrivalRangeFor("24h", NOW)

    expect(day.to).toBe(THIS_HOUR + HOUR)
    expect((day.to - day.from) / HOUR).toBe(24)
    expect((arrivalRangeFor("30d", NOW).to - arrivalRangeFor("30d", NOW).from) / HOUR).toBe(720)
  })
})

describe("page views in the range", () => {
  const day = arrivalRangeFor("24h", NOW)
  const begun = day.from - 48 * HOUR

  it("compares with the period before as a percentage", () => {
    const reading = readingOf(
      stored(
        [
          [day.from - HOUR, 20],
          [THIS_HOUR, 15],
        ],
        begun
      ),
      day
    )

    expect(changeSentence(reading.change, "24h")).toBe("Down 25% on the 24 hours before (20).")
    expect(rangeFigureOf(reading, "24h", 1_234)).toEqual({
      label: "Page views, last 24 hours",
      value: "15",
      note: "Down 25% on the 24 hours before (20). 1,234 since counting began.",
    })
  })

  it("says none were in the period before, rather than an endless rise", () => {
    const reading = readingOf(stored([[THIS_HOUR, 3]], begun), day)

    expect(changeSentence(reading.change, "24h")).toBe("None in the 24 hours before.")
  })

  it("says there is nothing to compare when the period before was not counted", () => {
    const reading = readingOf(stored([[THIS_HOUR, 3]], THIS_HOUR), day)

    expect(changeSentence(reading.change, "7d")).toBe(
      "Nothing to compare with: the 7 days before were not counted."
    )
  })

  it("says no change when the two periods match", () => {
    const reading = readingOf(
      stored(
        [
          [day.from - HOUR, 4],
          [THIS_HOUR, 4],
        ],
        begun
      ),
      day
    )

    expect(changeSentence(reading.change, "24h")).toBe("No change on the 24 hours before (4).")
  })

  it("falls back to the total, and says why, when the hours could not be read", () => {
    expect(rangeFigureOf(undefined, "7d", 9)).toEqual({
      label: "Page views counted",
      value: "9",
      note: "Every time a reader opened one of this project's pages. Page views by hour could not be read, so this is every one since counting began.",
    })
  })
})

describe("the chart of page views by hour", () => {
  const day = arrivalRangeFor("24h", NOW)

  it("draws one bar an hour against the tallest, the hour in progress marked", () => {
    const chart = rangeChartOf(
      readingOf(
        stored(
          [
            [day.from, 8],
            [THIS_HOUR, 2],
          ],
          day.from - HOUR
        ),
        day
      ).series,
      "24h"
    )

    expect(chart.bars).toHaveLength(24)
    expect(chart.tallest).toBe(8)
    expect(chart.bars[0]).toMatchObject({ views: 8, height: 1, whole: true })
    expect(chart.bars.at(-1)).toMatchObject({
      views: 2,
      height: 0.25,
      whole: false,
      title: "6 November 2026 at 15:00 UTC: 2 page views, so far",
    })
    expect(chart.bars[1]?.title).toBe("5 November 2026 at 17:00 UTC: 0 page views")
    expect(chart.starts).toBe("5 November 2026 at 16:00 UTC")
    expect(chart.ends).toBe("6 November 2026 at 15:00 UTC")
    expect(chart.note).toBeUndefined()
    expect(chart.summary).toBe(
      "Page views by hour, last 24 hours: 10 in all, at most 8 in one hour."
    )
  })

  it("starts where counting by hour began, and says so", () => {
    const begins = THIS_HOUR - 2 * HOUR
    const chart = rangeChartOf(readingOf(stored([[THIS_HOUR, 1]], begins), day).series, "24h")

    expect(chart.bars).toHaveLength(3)
    expect(chart.note).toBe(
      "Page views are counted by hour from 6 November 2026 at 13:00 UTC, so the chart starts there."
    )
  })

  it("draws no bar where nothing has been counted by hour, and says so", () => {
    const chart = rangeChartOf(readingOf(stored([]), day).series, "24h")

    expect(chart.bars).toEqual([])
    expect(chart.starts).toBeUndefined()
    expect(chart.note).toBe("No page view has been counted by hour yet.")
  })

  it("labels a range of days by the day", () => {
    const week = arrivalRangeFor("7d", NOW)
    const chart = rangeChartOf(readingOf(stored([], week.from - HOUR), week).series, "7d")

    expect(chart.bars).toHaveLength(168)
    expect(chart.starts).toBe("30 October 2026")
    expect(chart.ends).toBe("6 November 2026")
  })
})
