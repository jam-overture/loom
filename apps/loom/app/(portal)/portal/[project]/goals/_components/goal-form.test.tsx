import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { RangeTotals } from "@/app/(portal)/_lib/goals/goal-preview"
import type { PageChoice } from "@/app/(portal)/_lib/goals/goal-view"

import { GoalForm } from "./goal-form"

vi.mock("../actions", () => ({ addGoalAction: vi.fn() }))

const pages: readonly PageChoice[] = [
  {
    treeId: "t_home",
    name: "Welcome home",
    parts: [{ nodeId: "n_start", name: "the button “Start”" }],
  },
  {
    treeId: "t_bare",
    name: undefined,
    parts: [{ nodeId: "n_form", name: "the form" }],
  },
]

const totals: RangeTotals = {
  kind: "read",
  from: Date.UTC(2026, 10, 1),
  clipped: false,
  pages: [
    { treeId: "t_home", views: 300 },
    { treeId: "t_bare", views: 50 },
  ],
  parts: [
    { treeId: "t_home", nodeId: "n_start", counts: { activated: 9, completed: 0, disclosed: 0 } },
    { treeId: "t_bare", nodeId: "n_form", counts: { activated: 1, completed: 4, disclosed: 0 } },
  ],
}

describe("New goal", () => {
  it("offers each published page's parts by name, with the id beside it", () => {
    render(<GoalForm projectId="prj_a" pages={pages} first={false} totals={totals} />)

    const part = screen.getByRole("combobox", { name: "The part" })

    expect(
      within(part).getByRole("option", {
        name: "the button “Start” (n_start)",
      })
    ).toBeTruthy()
    expect(within(part).getByRole("group", { name: "t_bare" })).toBeTruthy()
  })

  it("offers the three things a reader does that a goal can count", () => {
    render(<GoalForm projectId="prj_a" pages={pages} first={false} totals={totals} />)

    expect(
      screen
        .getAllByRole("radio", { name: /Presses it|Sends it|Opens it/u })
        .map((radio) => radio.getAttribute("value"))
    ).toEqual(["activated", "completed", "disclosed"])
  })

  it("says the first goal is the primary one rather than asking", () => {
    render(<GoalForm projectId="prj_a" pages={pages} first totals={totals} />)

    const primary = screen.getByRole("checkbox", {
      name: /Make this the primary goal/u,
    })

    expect((primary as HTMLInputElement).checked).toBe(true)
    expect((primary as HTMLInputElement).disabled).toBe(true)
    expect(screen.getByText(/first goal, so it is the primary one/u)).toBeTruthy()
  })

  it("previews what the goal would have counted over the last 7 days as the part and kind change", () => {
    render(<GoalForm projectId="prj_a" pages={pages} first={false} totals={totals} />)

    const band = screen.getByRole("status", { name: "Last 7 days" })

    expect(band.textContent).toBe(
      "Choose the part, and this says what the goal would have counted over the last 7 days."
    )

    fireEvent.change(screen.getByRole("combobox", { name: "The part" }), {
      target: { value: "n_start" },
    })

    expect(band.textContent).toBe(
      "Over the last 7 days it would have counted 9 presses in 300 page views, 3 per 100."
    )

    fireEvent.change(screen.getByRole("combobox", { name: "The part" }), {
      target: { value: "n_form" },
    })
    fireEvent.click(screen.getByRole("radio", { name: /Sends it/u }))

    expect(band.textContent).toBe(
      "Over the last 7 days it would have counted 4 forms sent in 50 page views, 8 per 100."
    )
  })
})
