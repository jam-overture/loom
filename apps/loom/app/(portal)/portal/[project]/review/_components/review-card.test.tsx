import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { goalIdSchema } from "@/app/(portal)/_lib/goals/goal"
import type { QueueRow } from "@/app/(portal)/_lib/queue"
import { STAKES } from "@/app/(portal)/_lib/vocabulary"

import { ReviewCard, ReviewGaps } from "./review-card"

vi.mock("../actions", () => ({ answerAction: vi.fn() }))

const ROW: QueueRow = {
  proposalId: "p_one",
  goalId: goalIdSchema.parse(`g_${"a".repeat(32)}`),
  goal: "Sign-ups",
  pageId: "t_home",
  page: "Welcome",
  asked: "Move the sign-up button above the fold",
  askedBy: null,
  since: "8 November 2026 at 09:30 UTC",
  why: "It changes a part readers press.",
  stakes: STAKES.medium,
  waitsOn: null,
  standing: "current",
  standingSentence: null,
}

const OPEN = "/portal/prj_a/review?change=p_one"

describe("a change waiting for review", () => {
  it("leads with its goal, names its page and offers Accept and Turn down", () => {
    render(<ReviewCard row={ROW} projectId="prj_a" goalsRead open={OPEN} />)

    expect(screen.getByText("Goal: Sign-ups")).toBeDefined()
    expect(screen.getByRole("link", { name: "Welcome" }).getAttribute("href")).toBe(
      "/portal/prj_a/pages/t_home"
    )
    expect(screen.getByRole("button", { name: "Accept" })).toBeDefined()
    expect(screen.getByRole("button", { name: "Turn down" })).toBeDefined()
  })

  it("opens its drawer from the change itself", () => {
    render(<ReviewCard row={ROW} projectId="prj_a" goalsRead open={OPEN} />)

    expect(
      screen
        .getByRole("link", { name: "“Move the sign-up button above the fold”" })
        .getAttribute("href")
    ).toBe(OPEN)
  })

  it("offers no Accept on a change that conflicts with the site's newer version", () => {
    render(
      <ReviewCard
        row={{ ...ROW, standing: "conflicts", standingSentence: "It no longer fits." }}
        projectId="prj_a"
        open={OPEN}
        goalsRead
      />
    )

    expect(screen.getByText("It no longer fits.")).toBeDefined()
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull()
  })

  it("says who can answer where the person looking may not", () => {
    render(
      <ReviewCard row={{ ...ROW, waitsOn: "owner" }} projectId="prj_a" goalsRead open={OPEN} />
    )

    expect(screen.getByText("Waiting on an owner.")).toBeDefined()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("draws no goal chip where which goal each change serves could not be read", () => {
    render(<ReviewCard row={ROW} projectId="prj_a" goalsRead={false} open={OPEN} />)

    expect(screen.queryByText("Goal: Sign-ups")).toBeNull()
  })
})

describe("what a list for review could not read", () => {
  it("counts the changes it could not read, and says when goals could not be read", () => {
    render(<ReviewGaps unreadable={2} goalsRead={false} />)

    expect(
      screen.getByText("2 changes for review could not be read, so they are not shown.")
    ).toBeDefined()
    expect(screen.getByText(/Which goal each change serves cannot be read here/)).toBeDefined()
  })

  it("says nothing when it read everything", () => {
    const { container } = render(<ReviewGaps unreadable={0} goalsRead />)

    expect(container.textContent).toBe("")
  })
})
