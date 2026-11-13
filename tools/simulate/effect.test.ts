import type { NodeId } from "../../src/ids.js"

import { goalRateOn, goalRateOver, trueEffectOf } from "./effect.js"
import { SIGN_IN_GOAL, START_GOAL, STARTS_HIGH, STARTS_LOW } from "./fixtures.js"
import { FIRST_WORLD, HELD_OUT_WORLD } from "./world.js"

const TWO_WEEKS = { from: 0, to: 14 }

describe("a change's true effect", () => {
  it("is nothing when the page did not change", () => {
    expect(
      trueEffectOf(FIRST_WORLD, { before: STARTS_LOW, after: STARTS_LOW }, START_GOAL, TWO_WEEKS)
    ).toMatchObject({
      difference: 0,
      relative: 0,
    })
  })

  it("is exact, and the same change undone is the same effect turned round", () => {
    const up = trueEffectOf(
      FIRST_WORLD,
      { before: STARTS_LOW, after: STARTS_HIGH },
      START_GOAL,
      TWO_WEEKS
    )
    const down = trueEffectOf(
      FIRST_WORLD,
      { before: STARTS_HIGH, after: STARTS_LOW },
      START_GOAL,
      TWO_WEEKS
    )

    expect(up.difference).toBeGreaterThan(0.01)
    expect(down.difference).toBeCloseTo(-up.difference, 15)
    expect(up.before).toBe(goalRateOver(FIRST_WORLD, STARTS_LOW, START_GOAL, TWO_WEEKS))
  })

  it("is nothing to measure on a page without the goal's part", () => {
    const nowhere = { kind: "activated", nodeId: "n_nowhere" as NodeId } as const

    expect(goalRateOn(FIRST_WORLD, STARTS_LOW, nowhere, 0)).toBe(0)
    expect(
      trueEffectOf(FIRST_WORLD, { before: STARTS_LOW, after: STARTS_HIGH }, nowhere, TWO_WEEKS)
        .relative
    ).toBeUndefined()
  })

  it("moves with the day's mix of readers, which is the drift a verdict is fooled by", () => {
    expect(goalRateOn(FIRST_WORLD, STARTS_HIGH, START_GOAL, 5)).not.toBeCloseTo(
      goalRateOn(FIRST_WORLD, STARTS_HIGH, START_GOAL, 2),
      4
    )
  })

  it("depends on which world the readers are in", () => {
    const first = trueEffectOf(
      FIRST_WORLD,
      { before: STARTS_LOW, after: STARTS_HIGH },
      START_GOAL,
      TWO_WEEKS
    )
    const heldOut = trueEffectOf(
      HELD_OUT_WORLD,
      { before: STARTS_LOW, after: STARTS_HIGH },
      START_GOAL,
      TWO_WEEKS
    )

    expect(heldOut.relative).not.toBeCloseTo(first.relative ?? 0, 1)
  })

  it("follows each goal on its own: the sign-in goal does not care where the start button is", () => {
    expect(
      trueEffectOf(FIRST_WORLD, { before: STARTS_LOW, after: STARTS_HIGH }, SIGN_IN_GOAL, TWO_WEEKS)
        .difference
    ).toBeCloseTo(0, 15)
  })
})
