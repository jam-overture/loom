import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { Application, Project } from "@jam-overture/loom/store"

import type { Readings } from "@/app/_lib/reader-signals/intake"

import type { SignalsReading } from "../_lib/reading"

import { drawsTab, SignalsFrame } from "./signals-frame"

const project = { projectId: "prj_a", name: "Marketing site" } as unknown as Project
const application = { applicationId: "app_a", projectId: "prj_a" } as unknown as Application

const read = (latest: "arrived" | undefined): SignalsReading => ({
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
})

describe("the Signals frame", () => {
  it("draws the figures and the two tabs, marking the one shown, once something has arrived", () => {
    render(
      <SignalsFrame reading={read("arrived")} projectId="prj_a" tab="pages">
        <p>the list</p>
      </SignalsFrame>
    )

    expect(screen.getByRole("link", { name: "Events" }).getAttribute("href")).toBe(
      "/portal/prj_a/signals"
    )
    expect(screen.getByRole("link", { name: "By page" }).getAttribute("aria-current")).toBe("page")
    expect(screen.getByText("12")).toBeTruthy()
    expect(screen.getByText("the list")).toBeTruthy()
    expect(drawsTab(read("arrived"))).toBe(true)
  })

  it("says nothing has arrived, and draws no tab, before anything has", () => {
    render(
      <SignalsFrame reading={read(undefined)} projectId="prj_a" tab="events">
        <p>the list</p>
      </SignalsFrame>
    )

    expect(screen.getByText("Nothing has arrived yet")).toBeTruthy()
    expect(screen.queryByText("the list")).toBeNull()
    expect(drawsTab(read(undefined))).toBe(false)
  })

  it("says the store did not answer rather than drawing an empty project", () => {
    render(<SignalsFrame reading={{ state: "failed", project }} projectId="prj_a" tab="events" />)

    expect(screen.getByText("The store did not answer")).toBeTruthy()
    expect(screen.getByText("Marketing site")).toBeTruthy()
  })
})
