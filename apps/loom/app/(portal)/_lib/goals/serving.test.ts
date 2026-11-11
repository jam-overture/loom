import { describe, expect, it } from "vitest"

import { intentIdSchema, nodeIdSchema, treeIdSchema } from "@jam-overture/loom"

import { pageFixture } from "@/app/_lib/pages/fixtures"

import { elementIdsOf, goalOn } from "../proposing/fixtures"
import { goalIdSchema } from "./goal"
import { goalForPage, goalsOnPage, measuredOnFor, proposalGoalOf, waitingByGoalOf } from "./serving"

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

describe("goalsOnPage", () => {
  it("is every goal on the page, the primary first and then the oldest", () => {
    expect(goalsOnPage([own, older, primary], HOME)).toEqual([primary, older, own])
  })

  it("leaves out a goal on other pages and one counting a part the page lacks", () => {
    const elsewhere = { ...older, pages: [PRICING] }
    const missing = { ...own, nodeId: nodeIdSchema.parse("n_elsewhere") }

    expect(goalsOnPage([primary, elsewhere, missing], HOME)).toEqual([primary])
  })
})

describe("measuredOnFor", () => {
  it("is the goal the address names, where it is on the page", () => {
    expect(measuredOnFor([primary, older, own], HOME, older.goalId)).toBe(older)
  })

  it("is the goal a change to the page serves when the address names none", () => {
    expect(measuredOnFor([primary, older, own], HOME, undefined)).toBe(own)
  })

  it("is the goal a change to the page serves when the address names one not on the page", () => {
    const elsewhere = { ...older, pages: [PRICING] }

    expect(measuredOnFor([primary, elsewhere], HOME, elsewhere.goalId)).toBe(primary)
    expect(measuredOnFor([primary], HOME, "g_unknown")).toBe(primary)
  })

  it("is nothing for a page no goal is on", () => {
    expect(measuredOnFor([], HOME, primary.goalId)).toBeUndefined()
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

describe("waitingByGoalOf", () => {
  const intent = (n: number) => intentIdSchema.parse(`i_${n}`)
  const served = new Map([
    [intent(1), proposalGoalOf(primary, intent(1), 1)],
    [intent(2), proposalGoalOf(primary, intent(2), 2)],
    [intent(3), proposalGoalOf(own, intent(3), 3)],
    [intent(9), proposalGoalOf(older, intent(9), 9)],
  ])

  it("counts the waiting changes each goal is served by, and only the waiting ones", () => {
    expect(waitingByGoalOf([intent(1), intent(2), intent(3)], served)).toEqual(
      new Map([
        [primary.goalId, 2],
        [own.goalId, 1],
      ])
    )
  })

  it("counts a change no goal was recorded for towards none", () => {
    expect(waitingByGoalOf([intent(4)], served)).toEqual(new Map())
    expect(waitingByGoalOf([], served)).toEqual(new Map())
  })
})
