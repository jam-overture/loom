import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { ArrivalReading } from "@jam-overture/loom/signals"
import type { Application, Project } from "@jam-overture/loom/store"

import type { SignalsRange } from "@/app/(portal)/_lib/signals-range"

import type { Readings } from "@/app/_lib/reader-signals/intake"

import type { SignalsReading } from "../_lib/reading"

import { drawsTab, SignalsFrame } from "./signals-frame"

const project = { projectId: "prj_a", name: "Marketing site" } as unknown as Project
const application = { applicationId: "app_a", projectId: "prj_a" } as unknown as Application

const HOUR = 3_600_000
const START = Date.parse("2026-11-05T08:00:00.000Z")

const hourly: ArrivalReading = {
  series: {
    range: { from: START, to: START + 2 * HOUR },
    hours: [
      { hour: START, views: 30, whole: true },
      { hour: START + HOUR, views: 10, whole: false },
    ],
    views: 40,
    begins: START - 48 * HOUR,
    clipped: false,
  },
  change: {
    range: { from: START, to: START + 2 * HOUR },
    before: { from: START - 2 * HOUR, to: START },
    views: 40,
    was: 32,
    ratio: { ratio: 1.25, absent: null },
  },
}

const rangeHref = (range: SignalsRange) => `/portal/prj_a/signals?range=${range}`

const read = (
  latest: "arrived" | undefined,
  overrides: Partial<Extract<SignalsReading, { state: "read" }>> = {}
): SignalsReading => ({
  state: "read",
  project,
  application,
  readings: {} as Readings,
  pageViews: [],
  arrivals: {
    opened: 12,
    latest: latest === undefined ? undefined : { kind: latest, at: "2026-11-05T09:30:00.000Z" },
  },
  turnedAway: undefined,
  published: [],
  range: "24h",
  hourly,
  ...overrides,
})

describe("the Signals frame", () => {
  it("draws the figures and the two tabs, marking the one shown, once something has arrived", () => {
    render(
      <SignalsFrame reading={read("arrived")} projectId="prj_a" tab="pages" rangeHref={rangeHref}>
        <p>the list</p>
      </SignalsFrame>
    )

    expect(screen.getByRole("link", { name: "Events" }).getAttribute("href")).toBe(
      "/portal/prj_a/signals"
    )
    expect(screen.getByRole("link", { name: "By page" }).getAttribute("aria-current")).toBe("page")
    expect(screen.getByText("40")).toBeTruthy()
    expect(screen.getByText("the list")).toBeTruthy()
    expect(drawsTab(read("arrived"))).toBe(true)
  })

  it("says nothing has arrived, and draws no tab, before anything has", () => {
    render(
      <SignalsFrame reading={read(undefined)} projectId="prj_a" tab="events" rangeHref={rangeHref}>
        <p>the list</p>
      </SignalsFrame>
    )

    expect(screen.getByText("Nothing has arrived yet")).toBeTruthy()
    expect(screen.queryByText("the list")).toBeNull()
    expect(drawsTab(read(undefined))).toBe(false)
  })

  it("says the store did not answer rather than drawing an empty project", () => {
    render(
      <SignalsFrame
        reading={{ state: "failed", project }}
        projectId="prj_a"
        tab="events"
        rangeHref={rangeHref}
      />
    )

    expect(screen.getByText("The store did not answer")).toBeTruthy()
    expect(screen.getByText("Marketing site")).toBeTruthy()
  })

  it("puts page views in the range over the chart, with the range picker and the total", () => {
    render(
      <SignalsFrame reading={read("arrived")} projectId="prj_a" tab="events" rangeHref={rangeHref}>
        <p>the list</p>
      </SignalsFrame>
    )

    expect(screen.getByText("Page views, last 24 hours")).toBeTruthy()
    expect(
      screen.getByText("Up 25% on the 24 hours before (32). 12 since counting began.")
    ).toBeTruthy()
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe(
      "Page views by hour, last 24 hours: 40 in all, at most 30 in one hour."
    )
    expect(screen.getByRole("link", { name: "Last 7 days" }).getAttribute("href")).toBe(
      "/portal/prj_a/signals?range=7d"
    )
    expect(screen.getByRole("link", { name: "Last 24 hours" }).getAttribute("aria-current")).toBe(
      "true"
    )
  })

  it("keeps a range other than the default on the tabs", () => {
    render(
      <SignalsFrame
        reading={read("arrived", { range: "30d" })}
        projectId="prj_a"
        tab="events"
        rangeHref={rangeHref}
      >
        <p>the list</p>
      </SignalsFrame>
    )

    expect(screen.getByRole("link", { name: "By page" }).getAttribute("href")).toBe(
      "/portal/prj_a/signals/pages?range=30d"
    )
  })

  it("shows the total and says so, with no chart, where the hours could not be read", () => {
    render(
      <SignalsFrame
        reading={read("arrived", { hourly: undefined })}
        projectId="prj_a"
        tab="events"
        rangeHref={rangeHref}
      >
        <p>the list</p>
      </SignalsFrame>
    )

    expect(screen.getByText("Page views counted")).toBeTruthy()
    expect(screen.getByText("12")).toBeTruthy()
    expect(screen.getByText(/Page views by hour could not be read/)).toBeTruthy()
    expect(screen.queryByRole("img")).toBeNull()
  })
})
