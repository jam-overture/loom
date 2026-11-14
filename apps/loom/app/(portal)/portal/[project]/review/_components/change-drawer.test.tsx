import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { proposalIdSchema, treeIdSchema } from "@jam-overture/loom"

import { edgesOf } from "@/app/(portal)/_lib/expectation"
import { goalIdSchema } from "@/app/(portal)/_lib/goals/goal"
import type { HeldDrawn } from "@/app/(portal)/_lib/held-change"
import type { RequestParts } from "@/app/(portal)/_lib/proposing/brief"
import type { QueueRow } from "@/app/(portal)/_lib/queue"
import { STAKES } from "@/app/(portal)/_lib/vocabulary"

import { ChangeDrawer, type GoalStanding } from "./change-drawer"

vi.mock("../actions", () => ({ answerAction: vi.fn() }))

const ROW: QueueRow = {
  proposalId: "p_one",
  goalId: goalIdSchema.parse(`g_${"a".repeat(32)}`),
  goal: "Sign-ups",
  pageId: "t_home",
  page: "Welcome",
  asked: "Move the sign-up button above the fold (Why: 60% leave before it)",
  askedBy: null,
  since: "8 November 2026 at 09:30 UTC",
  why: "It changes a part readers press.",
  stakes: STAKES.medium,
  waitsOn: null,
  standing: "current",
  standingSentence: null,
}

const PARTS: RequestParts = {
  change: "Move the sign-up button above the fold",
  why: "60% leave before it",
  again: null,
}

const DRAWN: HeldDrawn = {
  kind: "drawn",
  comparison: {
    before: [{ nodeId: "n_cta", name: "Button “Sign up”", depth: 0, mark: "moved" }],
    after: [{ nodeId: "n_cta", name: "Button “Sign up”", depth: 0, mark: "moved" }],
    summary: "1 part moved.",
  },
}

const CLOSE = "/portal/prj_a/review"

const NOW_SIDE = { range: { from: 0, to: 14 * 24 * 3_600_000 }, views: 2_000, count: 70 }

const STANDING: GoalStanding = {
  kind: "read",
  goal: { name: "Sign-ups", kind: "activated" },
  expectation: {
    kind: "read",
    now: NOW_SIDE,
    clipped: false,
    views: 2_000,
    band: edgesOf(NOW_SIDE),
  },
}

const drawer = (over: Partial<Parameters<typeof ChangeDrawer>[0]> = {}) =>
  render(
    <ChangeDrawer
      row={ROW}
      parts={PARTS}
      drawn={DRAWN}
      lastTurnedDown={null}
      acceptedBy="approver"
      goalsRead
      standing={STANDING}
      segments={[]}
      projectId="prj_a"
      close={CLOSE}
      {...over}
    />
  )

describe("the drawer for one change waiting for review", () => {
  it("leads with the goal and the change, and draws the page before and after", () => {
    drawer()

    expect(screen.getByText("Goal: Sign-ups")).toBeDefined()
    expect(screen.getByRole("heading", { name: PARTS.change })).toBeDefined()
    expect(screen.getByRole("link", { name: "Welcome" }).getAttribute("href")).toBe(
      "/portal/prj_a/pages/t_home"
    )
    expect(screen.getByText("1 part moved.")).toBeDefined()
    expect(screen.getByRole("region", { name: "Before" })).toBeDefined()
    expect(screen.getByRole("region", { name: "After" })).toBeDefined()
    expect(screen.getByRole("link", { name: "Close" }).getAttribute("href")).toBe(CLOSE)
  })

  it("says why Loom proposes it, how it will be measured, and who may accept it", () => {
    drawer()

    expect(screen.getByText(PARTS.why ?? "")).toBeDefined()
    expect(screen.getByText(/measured on “Sign-ups” for the 14 days after/u)).toBeDefined()
    expect(screen.getByText("An approver or an owner can accept it.")).toBeDefined()
    expect(screen.getByRole("button", { name: "Accept" })).toBeDefined()
    expect(screen.getByText(/your site has it from its next pull/u)).toBeDefined()
  })

  it("says where its goal stands on the page and the band a result has to leave, and predicts nothing", () => {
    drawer()

    expect(screen.getByText(/counted 70 presses in 2,000 page views, 3.5 per 100/u)).toBeDefined()
    expect(screen.getByText(/reads Helped at [\d.]+ per 100 or more and Hurt at/u)).toBeDefined()
    expect(screen.getByText(/does not predict where in that band it will land/u)).toBeDefined()
  })

  it("says where a goal stands could not be read, or is no longer read, and still how it is measured", () => {
    const { unmount } = drawer({ standing: { kind: "unreadable" } })

    expect(
      screen.getByText(/Where “Sign-ups” stands on this page could not be read/u)
    ).toBeDefined()
    expect(screen.getByText(/measured on “Sign-ups” for the 14 days after/u)).toBeDefined()
    unmount()

    drawer({ standing: { kind: "unplaced" } })

    expect(screen.getByText(/“Sign-ups” is no longer one of the project's goals/u)).toBeDefined()
    expect(screen.getByText(/measured on “Sign-ups” for the 14 days after/u)).toBeDefined()
  })

  it("marks a change that no longer fits red, draws nothing and offers no Accept", () => {
    drawer({
      row: { ...ROW, standing: "conflicts", standingSentence: "It no longer fits." },
      drawn: { kind: "conflicts" },
    })

    expect(screen.getByRole("note").className).toMatch(/bg-rejected/u)
    expect(screen.getByText(/no longer the one your site serves/u)).toBeDefined()
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull()
    expect(screen.getByRole("button", { name: "Turn down" })).toBeDefined()
  })

  it("offers Accept for each segment the page has readers counted in, beside Accept for everyone", () => {
    drawer({ segments: ["phone", "search"] })

    expect(screen.getByRole("button", { name: "Accept" })).toBeDefined()
    expect(
      (screen.getByRole("button", { name: "Accept for phone only" }) as HTMLButtonElement).value
    ).toBe("accept-for:phone")
    expect(screen.getByRole("button", { name: "Accept for search only" })).toBeDefined()
    expect(screen.getByText(/Everyone else keeps the page as it is/u)).toBeDefined()
  })

  it("offers no segment where none has readers counted, or where the change no longer fits", () => {
    drawer()

    expect(screen.queryByRole("button", { name: /only$/u })).toBeNull()
    expect(screen.queryByText(/Accepting for one segment/u)).toBeNull()

    drawer({
      row: { ...ROW, standing: "conflicts", standingSentence: "It no longer fits." },
      drawn: { kind: "conflicts" },
      segments: ["phone"],
    })

    expect(screen.queryByRole("button", { name: "Accept for phone only" })).toBeNull()
  })

  it("marks a stale change amber", () => {
    drawer({ row: { ...ROW, standing: "stale", standingSentence: "Proposed for an older one." } })

    expect(screen.getByRole("note").className).toMatch(/bg-awaiting/u)
  })

  it("says why a change turned down before is back, and the last one turned down", () => {
    drawer({
      parts: { ...PARTS, again: "Twice the readers now" },
      lastTurnedDown: {
        proposalId: proposalIdSchema.parse("p_old"),
        pageId: treeIdSchema.parse("t_home"),
        request: "Move the button",
        reason: "Keep the hero clean",
        by: null,
        at: Date.UTC(2026, 10, 2, 10, 0),
      },
    })

    expect(screen.getByText("A change like this was turned down before.")).toBeDefined()
    expect(screen.getByText(/proposes it again because: Twice the readers now/u)).toBeDefined()
    expect(screen.getByText(/2 November 2026 at 10:00 UTC: “Keep the hero clean”/u)).toBeDefined()
  })

  it("says a change with no goal is not measured, and one with no figure has none", () => {
    drawer({ row: { ...ROW, goal: null, goalId: null }, parts: { ...PARTS, why: null } })

    expect(screen.getByText("No goal named")).toBeDefined()
    expect(screen.getByText(/names no goal, so once it is live it is not measured/u)).toBeDefined()
    expect(screen.getByText(/No figure was recorded with this change/u)).toBeDefined()
  })

  it("says who can answer where the person looking may not", () => {
    drawer({ row: { ...ROW, waitsOn: "owner" }, acceptedBy: "owner" })

    expect(screen.getByText("Only an owner can accept it.")).toBeDefined()
    expect(screen.getByText("Waiting on an owner.")).toBeDefined()
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("says the page could not be read rather than drawing a guess", () => {
    drawer({ drawn: { kind: "unreadable" } })

    expect(screen.getByText(/The page could not be read/u)).toBeDefined()
  })
})
