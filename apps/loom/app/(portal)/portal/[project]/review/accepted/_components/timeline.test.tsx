import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { TimelineStep } from "@/app/(portal)/_lib/going-live"

import { Timeline } from "./timeline"

const AT = Date.UTC(2026, 10, 7, 9, 5)

const STEPS: readonly TimelineStep[] = [
  { title: "Accepted", state: "done", at: AT, lines: ["It was accepted."] },
  {
    title: "Your site is not pulling yet",
    state: "current",
    lines: ["It is connected for observation only."],
    connect: true,
  },
  { title: "Measuring", state: "upcoming", lines: ["Once it is live."] },
]

describe("the timeline from Accept", () => {
  it("draws each step in order, with its time where it has one", () => {
    render(<Timeline steps={STEPS} projectId="prj_shop" />)

    expect(
      screen.getAllByRole("listitem").map((item) => item.querySelector("p")?.textContent)
    ).toEqual(["Accepted", "Your site is not pulling yet", "Measuring"])
    expect(screen.getByText("7 November 2026 at 09:05 UTC").getAttribute("datetime")).toBe(
      new Date(AT).toISOString()
    )
  })

  it("rings the current step and links it to where the site is connected", () => {
    render(<Timeline steps={STEPS} projectId="prj_shop" />)

    const current = screen
      .getAllByRole("listitem")
      .find((item) => item.getAttribute("aria-current"))

    expect(current?.textContent).toContain("Your site is not pulling yet")
    expect(screen.getByRole("link", { name: "Connect your site" }).getAttribute("href")).toBe(
      "/portal/prj_shop/connect"
    )
  })
})
