import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

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

describe("New goal", () => {
  it("offers each published page's parts by name, with the id beside it", () => {
    render(<GoalForm projectId="prj_a" pages={pages} first={false} />)

    const part = screen.getByRole("combobox", { name: "The part" })

    expect(
      within(part).getByRole("option", {
        name: "the button “Start” (n_start)",
      })
    ).toBeTruthy()
    expect(within(part).getByRole("group", { name: "t_bare" })).toBeTruthy()
  })

  it("offers the three things a reader does that a goal can count", () => {
    render(<GoalForm projectId="prj_a" pages={pages} first={false} />)

    expect(
      screen
        .getAllByRole("radio", { name: /Presses it|Sends it|Opens it/u })
        .map((radio) => radio.getAttribute("value"))
    ).toEqual(["activated", "completed", "disclosed"])
  })

  it("says the first goal is the primary one rather than asking", () => {
    render(<GoalForm projectId="prj_a" pages={pages} first />)

    const primary = screen.getByRole("checkbox", {
      name: /Make this the primary goal/u,
    })

    expect((primary as HTMLInputElement).checked).toBe(true)
    expect((primary as HTMLInputElement).disabled).toBe(true)
    expect(screen.getByText(/first goal, so it is the primary one/u)).toBeTruthy()
  })
})
