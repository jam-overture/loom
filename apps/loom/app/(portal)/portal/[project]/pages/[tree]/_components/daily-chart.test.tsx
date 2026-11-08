import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { DailyChart as Chart, DayBar } from "@/app/(portal)/_lib/daily-rate"

import { DailyChart } from "./daily-chart"

const DAY = 86_400_000

const bar = (index: number, overrides: Partial<DayBar> = {}): DayBar => ({
  day: index * DAY,
  views: 100,
  count: 3,
  height: 0.5,
  origin: "first",
  whole: true,
  title: `Day ${index}`,
  ...overrides,
})

const CHART: Chart = {
  bars: [bar(0), bar(1, { origin: "loom" }), bar(2, { origin: "site", whole: false })],
  boundaries: [
    { index: 1, origin: "loom", label: "Version 3" },
    { index: 2, origin: "site", label: "Your site's version" },
  ],
  starts: "1 January 1970",
  ends: "3 January 1970",
  note: undefined,
  summary: "Start pressed by day over 3 days.",
}

describe("the goal by day on a page's history", () => {
  it("is one image named by its summary, a bar a day each saying its figures", () => {
    const { container } = render(<DailyChart chart={CHART} />)

    expect(screen.getByRole("img", { name: "Start pressed by day over 3 days." })).toBeDefined()
    expect(
      Array.from(container.querySelectorAll("rect > title")).map((title) => title.textContent)
    ).toEqual(["Day 0", "Day 1", "Day 2"])
  })

  it("colours a day after a Loom change green and lightens today", () => {
    const { container } = render(<DailyChart chart={CHART} />)
    const bars = Array.from(container.querySelectorAll("rect")).filter(
      (rect) => rect.querySelector("title") !== null
    )

    expect(bars.map((rect) => rect.getAttribute("class"))).toEqual([
      "fill-ink-muted",
      "fill-applied-ink",
      "fill-ink-muted opacity-50",
    ])
  })

  it("names each version where it starts, placed by its share of the width", () => {
    render(<DailyChart chart={CHART} />)

    const names = screen.getAllByRole("listitem")

    expect(names.map((name) => name.textContent)).toEqual(["Version 3", "Your site's version"])
    expect(names[0]?.getAttribute("style")).toContain("left: 33.3")
  })

  it("draws no bars for an empty chart and says why", () => {
    render(
      <DailyChart
        chart={{
          ...CHART,
          bars: [],
          boundaries: [],
          starts: undefined,
          ends: undefined,
          note: "Nothing has been counted by the hour on this page yet.",
        }}
      />
    )

    expect(screen.queryByRole("img")).toBeNull()
    expect(screen.getByText("Nothing has been counted by the hour on this page yet.")).toBeDefined()
  })
})
