import { describe, expect, it } from "vitest"

import { nodeIdSchema } from "@jam-overture/loom"

import { goalIdSchema } from "./goals/goal"
import { goalOn } from "./proposing/fixtures"
import {
  EVERY_CHANGE,
  filteredRows,
  goalChoicesOf,
  reviewFilterOf,
  reviewHrefOf,
  standingChoicesOf,
  type Filterable,
} from "./review-filter"

const id = (n: number) => goalIdSchema.parse(`g_${n.toString(16).padStart(32, "0")}`)
const PART = nodeIdSchema.parse("n_start")

const trial = goalOn(PART, { goalId: id(1), name: "Starts a trial", primarySince: 1 })
const signup = goalOn(PART, { goalId: id(2), name: "Signs up", primarySince: null })

const row = (
  goalId: Filterable["goalId"],
  standing: Filterable["standing"],
  goal = "Recorded"
) => ({
  goalId,
  goal: goalId === null ? null : goal,
  standing,
})

const ROWS = [
  row(trial.goalId, "current"),
  row(trial.goalId, "stale"),
  row(signup.goalId, "current"),
  row(null, "conflicts"),
  row(id(9), "current", "Opens pricing"),
]

describe("reviewFilterOf", () => {
  it("reads a goal, no goal, and a standing from the address", () => {
    expect(reviewFilterOf({ goal: trial.goalId, standing: "stale" })).toEqual({
      goal: trial.goalId,
      standing: "stale",
    })
    expect(reviewFilterOf({ goal: "none", standing: undefined })).toEqual({
      goal: "none",
      standing: null,
    })
  })

  it("treats anything it cannot read as no filter", () => {
    expect(reviewFilterOf({ goal: "g_nope", standing: "nearly" })).toEqual(EVERY_CHANGE)
    expect(reviewFilterOf({ goal: undefined, standing: undefined })).toEqual(EVERY_CHANGE)
  })
})

describe("reviewHrefOf", () => {
  it("carries only what narrows the list", () => {
    expect(reviewHrefOf("prj_1", EVERY_CHANGE)).toBe("/portal/prj_1/review")
    expect(reviewHrefOf("prj_1", { goal: "none", standing: "conflicts" })).toBe(
      "/portal/prj_1/review?goal=none&standing=conflicts"
    )
  })

  it("round-trips through reviewFilterOf", () => {
    const filter = { goal: trial.goalId, standing: "current" as const }
    const query = new URL(reviewHrefOf("prj_1", filter), "https://loom.test").searchParams

    expect(
      reviewFilterOf({
        goal: query.get("goal") ?? undefined,
        standing: query.get("standing") ?? undefined,
      })
    ).toEqual(filter)
  })
})

describe("filteredRows", () => {
  it("keeps every row with no filter, in the order given", () => {
    expect(filteredRows(ROWS, EVERY_CHANGE)).toEqual(ROWS)
  })

  it("keeps the rows of one goal, of no goal, and of one standing, and both at once", () => {
    expect(filteredRows(ROWS, { goal: trial.goalId, standing: null })).toEqual(ROWS.slice(0, 2))
    expect(filteredRows(ROWS, { goal: "none", standing: null })).toEqual([ROWS[3]])
    expect(filteredRows(ROWS, { goal: null, standing: "current" })).toEqual([
      ROWS[0],
      ROWS[2],
      ROWS[4],
    ])
    expect(filteredRows(ROWS, { goal: trial.goalId, standing: "stale" })).toEqual([ROWS[1]])
  })
})

describe("goalChoicesOf", () => {
  it("offers every goal, primary first, then removed goals by their recorded name, then no goal", () => {
    expect(
      goalChoicesOf(ROWS, [trial, signup], EVERY_CHANGE, "prj_1").map(({ label, count }) => [
        label,
        count,
      ])
    ).toEqual([
      ["All goals", 5],
      ["Starts a trial", 2],
      ["Signs up", 1],
      ["Opens pricing (removed)", 1],
      ["No goal named", 1],
    ])
  })

  it("offers a goal nothing waits for, counted as none", () => {
    expect(
      goalChoicesOf([], [trial], EVERY_CHANGE, "prj_1").map(({ label, count }) => [label, count])
    ).toEqual([
      ["All goals", 0],
      ["Starts a trial", 0],
    ])
  })

  it("counts within the standing picked, keeps it in every link, and marks the goal picked", () => {
    const choices = goalChoicesOf(
      ROWS,
      [trial, signup],
      { goal: trial.goalId, standing: "current" },
      "prj_1"
    )

    expect(choices.map(({ count }) => count)).toEqual([3, 1, 1, 1, 0])
    expect(choices.filter(({ selected }) => selected).map(({ label }) => label)).toEqual([
      "Starts a trial",
    ])
    expect(choices.every(({ href }) => href.includes("standing=current"))).toBe(true)
  })

  it("keeps *No goal named* on offer while it is picked, even with nothing under it", () => {
    expect(
      goalChoicesOf([], [], { goal: "none", standing: null }, "prj_1").map(({ label }) => label)
    ).toEqual(["All goals", "No goal named"])
  })
})

describe("standingChoicesOf", () => {
  it("offers All and each standing in its own words, with counts within the goal picked", () => {
    expect(
      standingChoicesOf(ROWS, { goal: trial.goalId, standing: null }, "prj_1").map(
        ({ label, count, selected }) => [label, count, selected]
      )
    ).toEqual([
      ["All", 2, true],
      ["Fits the live page", 1, false],
      ["Stale", 1, false],
      ["Conflicts", 0, false],
    ])
  })

  it("links each standing with the goal picked kept", () => {
    expect(standingChoicesOf(ROWS, { goal: "none", standing: null }, "prj_1")[3]?.href).toBe(
      "/portal/prj_1/review?goal=none&standing=conflicts"
    )
  })
})
