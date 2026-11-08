import { describe, expect, it } from "vitest"

import { nodeIdSchema, primitiveTypeSchema, treeIdSchema } from "@jam-overture/loom"
import type { StoredActed, StoredArrivals } from "@jam-overture/loom/signals"
import { DEFAULT_AUDIENCE_ID } from "@jam-overture/loom/store"

import { CHART_DAYS, chartRangeOf, dailyChartOf, DAY_MS } from "./daily-rate"
import type { Mark } from "./page-history"

const HOUR = 3_600_000
const PAGE = treeIdSchema.parse("t_home")
const PART = nodeIdSchema.parse("n_start")
const BUTTON = primitiveTypeSchema.parse("loom.button")
/** Half past nine on 7 November 2026, UTC: today is part way through. */
const NOW = Date.UTC(2026, 10, 7, 9, 30)
const RANGE = chartRangeOf(NOW)
const TODAY = Date.UTC(2026, 10, 7)
const dayBefore = (days: number): number => TODAY - days * DAY_MS

const arrivals = (
  rows: readonly (readonly [number, number])[],
  begins: number | undefined
): StoredArrivals => ({
  hours: rows.map(([hour, views]) => ({
    treeId: PAGE,
    revision: 1,
    hour,
    views,
    audienceId: DEFAULT_AUDIENCE_ID,
    updatedAt: new Date(hour).toISOString(),
  })),
  ...(begins === undefined ? {} : { begins }),
})

const acted = (rows: readonly (readonly [number, number])[]): StoredActed => ({
  hours: rows.map(([hour, activations]) => ({
    treeId: PAGE,
    revision: 1,
    nodeId: PART,
    type: BUTTON,
    hour,
    activations,
    opens: 0,
    closes: 0,
    completions: 0,
    audienceId: DEFAULT_AUDIENCE_ID,
    updatedAt: new Date(hour).toISOString(),
  })),
})

const chartOf = (input: {
  readonly views: readonly (readonly [number, number])[]
  readonly presses?: readonly (readonly [number, number])[]
  readonly marks?: readonly Mark[]
  readonly begins?: number | undefined
  readonly actedBegins?: number | undefined
}) =>
  dailyChartOf({
    now: NOW,
    range: RANGE,
    kind: "activated",
    goal: "Start pressed",
    marks: input.marks ?? [],
    arrivals: arrivals(input.views, "begins" in input ? input.begins : RANGE.from),
    acted: acted(input.presses ?? []),
    actedBegins: "actedBegins" in input ? input.actedBegins : RANGE.from,
  })

describe("chartRangeOf", () => {
  it("is 8 whole UTC days a week, today last", () => {
    expect(RANGE.to).toBe(TODAY + DAY_MS)
    expect((RANGE.to - RANGE.from) / DAY_MS).toBe(CHART_DAYS)
    expect(CHART_DAYS).toBe(56)
  })
})

describe("dailyChartOf", () => {
  it("draws one bar a day for 8 weeks, each the goal's count over that day's page views", () => {
    const chart = chartOf({
      views: [
        [dayBefore(1) + 3 * HOUR, 60],
        [dayBefore(1) + 20 * HOUR, 40],
        [dayBefore(2), 200],
      ],
      presses: [
        [dayBefore(1) + 3 * HOUR, 5],
        [dayBefore(2) + HOUR, 4],
      ],
    })

    expect(chart.bars).toHaveLength(CHART_DAYS)

    const yesterday = chart.bars.at(-2)
    const before = chart.bars.at(-3)

    expect(yesterday).toMatchObject({ day: dayBefore(1), views: 100, count: 5, height: 1 })
    expect(before).toMatchObject({ day: dayBefore(2), views: 200, count: 4 })
    expect(before?.height).toBeCloseTo(0.4)
    expect(yesterday?.title).toBe(
      "6 November 2026: 5 presses in 100 page views, 5 per 100, on the page as Loom first saw it"
    )
  })

  it("draws a day with no page views as no bar, and says so", () => {
    const chart = chartOf({ views: [] })

    expect(chart.bars.every((bar) => bar.height === 0)).toBe(true)
    expect(chart.bars[0]?.title).toContain("no page views")
    expect(chart.summary).toBe(
      "Start pressed by day over 56 days: no page views; 0 versions start on it."
    )
  })

  it("marks today as still being counted", () => {
    const chart = chartOf({ views: [[TODAY + HOUR, 10]], presses: [[TODAY + HOUR, 1]] })

    expect(chart.bars.at(-1)).toMatchObject({ whole: false })
    expect(chart.bars.at(-1)?.title).toContain(", so far,")
    expect(chart.bars.at(-2)).toMatchObject({ whole: true })
  })

  it("colours each day by the version it ended on, and names each version where it starts", () => {
    const loomLive = dayBefore(10) + 15 * HOUR
    const siteAt = dayBefore(3) + 2 * HOUR
    const chart = chartOf({
      views: [],
      marks: [
        { at: dayBefore(80), origin: "loom", label: "Version 2" },
        { at: loomLive, origin: "loom", label: "Version 3" },
        { at: siteAt, origin: "site", label: "Your site's version" },
      ],
    })
    const originOn = (at: number) => chart.bars.find((bar) => bar.day === at)?.origin

    expect(chart.bars[0]?.origin).toBe("loom")
    expect(originOn(dayBefore(10))).toBe("loom")
    expect(originOn(dayBefore(4))).toBe("loom")
    expect(originOn(dayBefore(3))).toBe("site")
    expect(originOn(TODAY)).toBe("site")
    expect(chart.boundaries).toEqual([
      { index: CHART_DAYS - 11, origin: "loom", label: "Version 3" },
      { index: CHART_DAYS - 4, origin: "site", label: "Your site's version" },
    ])
  })

  it("is grey before any change Loom knows of", () => {
    const chart = chartOf({ views: [] })

    expect(chart.bars.every((bar) => bar.origin === "first")).toBe(true)
    expect(chart.boundaries).toEqual([])
  })

  it("starts where counting began, by the later of the page views and what readers did", () => {
    const chart = chartOf({
      views: [],
      begins: dayBefore(20) + 5 * HOUR,
      actedBegins: dayBefore(9) + 7 * HOUR,
    })

    expect(chart.bars).toHaveLength(10)
    expect(chart.bars[0]?.day).toBe(dayBefore(9))
    expect(chart.starts).toBe("29 October 2026")
    expect(chart.ends).toBe("7 November 2026")
    expect(chart.note).toBe(
      "Counting by the hour began on 29 October 2026, so the chart starts there."
    )
  })

  it("draws nothing where nothing has ever been counted, and says so", () => {
    const chart = chartOf({ views: [], begins: undefined, actedBegins: undefined })

    expect(chart.bars).toEqual([])
    expect(chart.starts).toBeUndefined()
    expect(chart.note).toBe("Nothing has been counted by the hour on this page yet.")
    expect(chart.summary).toBe("Start pressed by day: nothing counted yet.")
  })

  it("sums the whole chart in one sentence with its highest day", () => {
    const chart = chartOf({
      views: [
        [dayBefore(1), 100],
        [dayBefore(2), 300],
      ],
      presses: [
        [dayBefore(1), 5],
        [dayBefore(2), 3],
      ],
      marks: [{ at: dayBefore(2), origin: "loom", label: "Version 4" }],
    })

    expect(chart.summary).toBe(
      "Start pressed by day over 56 days: 8 presses in 400 page views, 2 per 100, at most 5 per 100 in one day; 1 version starts on it."
    )
  })
})
