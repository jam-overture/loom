import { describe, expect, it } from "vitest"

import { intentIdSchema, nodeIdSchema, proposalIdSchema, treeIdSchema } from "@jam-overture/loom"

import { DAY_MS } from "./daily-rate"
import { goalIdSchema } from "./goals/goal"
import type { ProposalGoal } from "./goals/serving"
import type { TurnedDown } from "./proposing/turned-down"
import {
  countWords,
  NOT_RECORDED,
  RECENT_DAYS,
  RECENT_LIMIT,
  recentCountOf,
  recentSince,
  turnedDownGoalsOf,
  turnedDownRowOf,
} from "./turned-down-list"

const NOW = Date.UTC(2026, 10, 8, 12)

const entry = (request: string, reason: string | null = null): TurnedDown => ({
  proposalId: proposalIdSchema.parse("p_one"),
  pageId: treeIdSchema.parse("t_pricing"),
  request,
  reason,
  by: "jonathan",
  at: NOW - DAY_MS,
})

describe("recently", () => {
  it("starts thirty days before now", () => {
    expect(RECENT_DAYS).toBe(30)
    expect(recentSince(NOW)).toBe(NOW - 30 * DAY_MS)
  })
})

describe("recentCountOf", () => {
  it("counts what was read, exactly while the read stopped short of the limit", () => {
    expect(recentCountOf([entry("A."), entry("B.")])).toEqual({ count: 2, more: false })
    expect(countWords({ count: 2, more: false })).toBe("2")
  })

  it("says there may be more when the read stopped at the limit", () => {
    const full = recentCountOf(Array.from({ length: RECENT_LIMIT }, () => entry("A.")))

    expect(full).toEqual({ count: RECENT_LIMIT, more: true })
    expect(countWords(full)).toBe(`${RECENT_LIMIT} or more`)
  })
})

describe("turnedDownRowOf", () => {
  const names = new Map([["t_pricing", "Pricing"]])

  it("reads the change and the figure back out of the request, and names the page", () => {
    expect(
      turnedDownRowOf(
        entry("Move the plans up (Why: Readers leave before them)", "Not now."),
        names,
        { kind: "recorded", goal: "Start a trial" }
      )
    ).toEqual({
      proposalId: "p_one",
      pageId: "t_pricing",
      pageName: "Pricing",
      change: "Move the plans up",
      why: "Readers leave before them",
      reason: "Not now.",
      by: "jonathan",
      at: NOW - DAY_MS,
      goal: { kind: "recorded", goal: "Start a trial" },
    })
  })

  it("keeps a request it cannot split whole, and a page it cannot name by its id alone", () => {
    const row = turnedDownRowOf(entry("Swap the hero image."), new Map(), NOT_RECORDED)

    expect(row.change).toBe("Swap the hero image.")
    expect(row.why).toBeNull()
    expect(row.pageName).toBeNull()
  })
})

describe("turnedDownGoalsOf", () => {
  const proposal = (id: string) => proposalIdSchema.parse(`p_${id}`)
  const intent = (id: string) => intentIdSchema.parse(`i_${id}`)
  const trial: ProposalGoal = {
    intentId: intent("trial"),
    goalId: goalIdSchema.parse(`g_${"a".repeat(32)}`),
    name: "Start a trial",
    kind: "activated",
    nodeId: nodeIdSchema.parse("n_start"),
    at: NOW,
  }
  const goalOf = turnedDownGoalsOf(
    new Map([
      [proposal("trial"), intent("trial")],
      [proposal("none"), intent("none")],
    ]),
    new Map([[intent("trial"), trial]])
  )

  it("names the goal kept by the intent the change was made from", () => {
    expect(goalOf(proposal("trial"))).toEqual({ kind: "recorded", goal: "Start a trial" })
  })

  it("says a change whose intent named no goal named none", () => {
    expect(goalOf(proposal("none"))).toEqual({ kind: "recorded", goal: null })
  })

  it("knows nothing of a change turned down before its intent was kept", () => {
    expect(goalOf(proposal("older"))).toEqual(NOT_RECORDED)
  })
})
