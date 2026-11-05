import { describe, expect, it } from "vitest"

import { intentIdSchema, nodeIdSchema, treeIdSchema } from "@jam-overture/loom"

import { pageFixture } from "@/app/_lib/pages/fixtures"

import { elementIdsOf, goalOn } from "../proposing/fixtures"
import { goalIdSchema } from "./goal"
import { goalForPage, proposalGoalOf } from "./serving"

const HOME = pageFixture("home", "Welcome home")
const PRICING = treeIdSchema.parse("t_pricing")
const [, HEADING] = elementIdsOf(HOME)

if (HEADING === undefined) throw new Error("the fixture has a heading")

const id = (n: number) => goalIdSchema.parse(`g_${n.toString(16).padStart(32, "0")}`)

const primary = goalOn(HEADING, {
  goalId: id(1),
  name: "Primary",
  primarySince: 5,
  createdAt: 5,
})
const older = goalOn(HEADING, {
  goalId: id(2),
  name: "Older",
  primarySince: null,
  createdAt: 1,
})
const own = goalOn(HEADING, {
  goalId: id(3),
  name: "Home's own",
  pages: [HOME.treeId],
  primarySince: null,
  createdAt: 9,
})

describe("goalForPage", () => {
  it("is nothing for a project with no goals", () => {
    expect(goalForPage([], HOME)).toBeUndefined()
  })

  it("is the primary goal on a page it covers", () => {
    expect(goalForPage([older, primary], HOME)).toBe(primary)
  })

  it("is the page's own goal, ahead of the primary one", () => {
    expect(goalForPage([primary, own], HOME)).toBe(own)
  })

  it("is the oldest goal on the page when the primary one is on other pages", () => {
    const primaryElsewhere = { ...primary, pages: [PRICING] }

    expect(goalForPage([primaryElsewhere, older], HOME)).toBe(older)
  })

  it("is nothing where every goal is on other pages or counts a part the page lacks", () => {
    expect(goalForPage([{ ...primary, pages: [PRICING] }], HOME)).toBeUndefined()
    expect(
      goalForPage([{ ...primary, nodeId: nodeIdSchema.parse("n_elsewhere") }], HOME)
    ).toBeUndefined()
  })
})

describe("proposalGoalOf", () => {
  it("keeps what the goal was when the proposal was raised", () => {
    const intentId = intentIdSchema.parse("i_1")

    expect(proposalGoalOf(own, intentId, 42)).toEqual({
      intentId,
      goalId: own.goalId,
      name: "Home's own",
      kind: "activated",
      nodeId: HEADING,
      at: 42,
    })
  })
})
