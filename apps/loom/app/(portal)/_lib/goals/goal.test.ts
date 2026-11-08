import { describe, expect, it } from "vitest"

import { nodeIdSchema, treeIdSchema } from "@jam-overture/loom"

import {
  goalIdSchema,
  heirOf,
  MAX_GOAL_NAME_LENGTH,
  newGoalId,
  primaryFirst,
  primaryOf,
  goalTypedOf,
  readGoalForm,
  readGoalTarget,
  type Goal,
  type GoalTyped,
} from "./goal"

const PARTS = new Map([
  ["t_home", new Set(["n_start", "n_hero"])],
  ["t_pricing", new Set(["n_buy"])],
])

const form = (fields: Partial<GoalTyped> = {}): GoalTyped => ({
  name: "Starts a trial",
  kind: "activated",
  part: "n_start",
  where: "all",
  pages: [],
  primary: false,
  ...fields,
})

describe("goalTypedOf", () => {
  it("reads the fields as typed, trimmed, with every page ticked and the box as a yes or no", () => {
    const sent = new FormData()
    sent.set("name", "  Starts a trial ")
    sent.set("kind", "completed")
    sent.set("part", new Blob(["n_start"]))
    sent.set("where", "some")
    sent.append("pages", "t_home")
    sent.append("pages", "t_pricing")
    sent.set("primary", "on")

    expect(goalTypedOf(sent)).toEqual({
      name: "Starts a trial",
      kind: "completed",
      part: "",
      where: "some",
      pages: ["t_home", "t_pricing"],
      primary: true,
    })
  })
})

describe("readGoalTarget", () => {
  it("reads what a goal counts and where without a name, for the preview", () => {
    expect(readGoalTarget(form({ name: "" }), PARTS)).toEqual({
      ok: true,
      value: { kind: "activated", nodeId: "n_start", pages: null },
    })
  })

  it("refuses a target with no part, and says nothing about the name", () => {
    expect(readGoalTarget(form({ name: "", part: "" }), PARTS)).toEqual({
      ok: false,
      error: [{ field: "part", detail: "Choose the part of the page it counts." }],
    })
  })
})

describe("readGoalForm", () => {
  it("reads a goal on every page that has the part", () => {
    expect(readGoalForm(form(), PARTS)).toEqual({
      ok: true,
      value: {
        name: "Starts a trial",
        kind: "activated",
        nodeId: "n_start",
        pages: null,
        primary: false,
      },
    })
  })

  it("reads the pages chosen, once each and in order, and the primary box", () => {
    expect(
      readGoalForm(
        form({
          part: "n_buy",
          where: "some",
          pages: ["t_pricing", "t_home", "t_pricing"],
          primary: true,
        }),
        PARTS
      )
    ).toMatchObject({
      ok: true,
      value: { pages: ["t_home", "t_pricing"], primary: true },
    })
  })

  it("reports every fault at once, under its field", () => {
    expect(
      readGoalForm(form({ name: "", kind: "dwelled", part: "", where: "some" }), PARTS)
    ).toEqual({
      ok: false,
      error: [
        { field: "name", detail: "Give the goal a name." },
        { field: "kind", detail: "Choose what a reader does." },
        {
          field: "pages",
          detail: "Choose at least one page, or count it on all of them.",
        },
        { field: "part", detail: "Choose the part of the page it counts." },
      ],
    })
  })

  it("refuses a name too long to read in a chip", () => {
    expect(readGoalForm(form({ name: "x".repeat(MAX_GOAL_NAME_LENGTH + 1) }), PARTS)).toMatchObject(
      {
        ok: false,
        error: [{ field: "name" }],
      }
    )
  })

  it("refuses a part no page it covers has, and ignores pages the site never published", () => {
    expect(
      readGoalForm(form({ part: "n_buy", where: "some", pages: ["t_home", "t_gone"] }), PARTS)
    ).toEqual({
      ok: false,
      error: [
        {
          field: "part",
          detail: "That part is not on any page this goal covers.",
        },
      ],
    })
  })
})

const goal = (n: number, primarySince: number | null): Goal => ({
  goalId: goalIdSchema.parse(`g_${String(n).padStart(32, "0")}`),
  name: `Goal ${n}`,
  kind: "activated",
  nodeId: nodeIdSchema.parse("n_start"),
  pages: [treeIdSchema.parse("t_home")],
  primarySince,
  createdAt: n,
  createdBy: null,
})

describe("the primary mark", () => {
  it("lists the primary goal first and the rest oldest first", () => {
    expect(
      primaryFirst([goal(3, null), goal(2, 9), goal(1, null)]).map((each) => each.name)
    ).toEqual(["Goal 2", "Goal 1", "Goal 3"])
  })

  it("names the primary goal, and the oldest as the heir", () => {
    expect(primaryOf([goal(1, null), goal(2, 5)])?.name).toBe("Goal 2")
    expect(primaryOf([goal(1, null)])).toBeUndefined()
    expect(heirOf([goal(2, null), goal(1, null)])?.name).toBe("Goal 1")
  })

  it("mints ids its own schema accepts", () => {
    expect(goalIdSchema.safeParse(newGoalId()).success).toBe(true)
  })
})
