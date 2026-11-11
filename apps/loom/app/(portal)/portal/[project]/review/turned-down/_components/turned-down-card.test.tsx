import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { proposalIdSchema, treeIdSchema } from "@jam-overture/loom"

import type { TurnedDownRow } from "@/app/(portal)/_lib/turned-down-list"

import { TurnedDownCard } from "./turned-down-card"

const ROW: TurnedDownRow = {
  proposalId: proposalIdSchema.parse("p_one"),
  pageId: treeIdSchema.parse("t_pricing"),
  pageName: "Pricing",
  change: "Move the plans above the fold",
  why: "Readers leave before they reach them.",
  reason: "The plans are about to change.",
  by: "jonathan",
  at: Date.UTC(2026, 10, 8, 9, 30),
  goal: { kind: "recorded", goal: "Start a trial" },
}

describe("a change turned down", () => {
  it("names its page, when and by whom, the change, the figure and the reason", () => {
    render(<TurnedDownCard row={ROW} projectId="prj_a" />)

    expect(screen.getByRole("link", { name: "Pricing" }).getAttribute("href")).toBe(
      "/portal/prj_a/pages/t_pricing"
    )
    expect(screen.getByText("Turned down 8 November 2026 at 09:30 UTC by jonathan")).toBeDefined()
    expect(screen.getByText("“Move the plans above the fold”")).toBeDefined()
    expect(screen.getByText("Why: Readers leave before they reach them.")).toBeDefined()
    expect(screen.getByText("Reason: The plans are about to change.")).toBeDefined()
  })

  it("leads with the goal it served, or says it named none", () => {
    const { unmount } = render(<TurnedDownCard row={ROW} projectId="prj_a" />)

    expect(screen.getByText("Goal: Start a trial")).toBeDefined()
    unmount()

    render(
      <TurnedDownCard row={{ ...ROW, goal: { kind: "recorded", goal: null } }} projectId="prj_a" />
    )

    expect(screen.getByText("No goal named")).toBeDefined()
  })

  it("names no goal for a change whose goal was not kept, rather than guess", () => {
    render(<TurnedDownCard row={{ ...ROW, goal: { kind: "not-recorded" } }} projectId="prj_a" />)

    expect(screen.queryByText(/^Goal:/)).toBeNull()
    expect(screen.queryByText("No goal named")).toBeNull()
  })

  it("says no reason was given rather than leave a gap, and names a page by its id without a name", () => {
    render(
      <TurnedDownCard
        row={{ ...ROW, pageName: null, why: null, reason: null, by: null }}
        projectId="prj_a"
      />
    )

    expect(screen.getByRole("link", { name: "t_pricing" })).toBeDefined()
    expect(screen.getByText("Turned down 8 November 2026 at 09:30 UTC")).toBeDefined()
    expect(screen.queryByText(/^Why:/)).toBeNull()
    expect(screen.getByText(/^No reason was given\./)).toBeDefined()
  })
})
