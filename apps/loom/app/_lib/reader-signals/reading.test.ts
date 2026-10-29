import { describe, expect, it } from "vitest"

import {
  DEFAULT_REGION_FLOOR,
  placingsIn,
  type DeploymentReadingContext,
} from "@jam-overture/loom/signals"

import { deploymentReadingContextOf } from "./reading"
import { INTAKE_KEY, readIntakeSettings, REGION_FLOOR_KEY, REGION_KEY } from "./settings"

/**
 * Built through the real reading rather than from a hand-made settings object,
 * for the reason `notice.test.ts` is: what is under test is the join between an
 * environment and a context, and a hand-made object would let the two disagree
 * about what a floor means.
 */
const HELD: Omit<DeploymentReadingContext, "floor"> = {
  trees: { treeFor: () => undefined },
  declarations: { copyFor: () => undefined, typesWithRole: () => [] },
  placings: placingsIn([]),
}

const contextOf = (env: Record<string, string | undefined>) =>
  deploymentReadingContextOf(HELD, readIntakeSettings({ [INTAKE_KEY]: "on", ...env }))

describe("deploymentReadingContextOf", () => {
  it("is the deployment's own floor and not the runtime's minimum", () => {
    expect(contextOf({ [REGION_FLOOR_KEY]: "100" }).floor).toBe(100)
  })

  it("is the default where this deployment raised nothing", () => {
    expect(contextOf({}).floor).toBe(DEFAULT_REGION_FLOOR)
  })

  /**
   * A floor below the runtime's own is refused by `regionFloorOf` before it
   * reaches the setting, so the context carries the number a reading will
   * actually suppress at rather than the number an operator asked for.
   */
  it("is the raised floor where a smaller one was refused", () => {
    expect(contextOf({ [REGION_FLOOR_KEY]: "2" }).floor).toBe(DEFAULT_REGION_FLOOR)
  })

  /**
   * The one way this differs from the notice beside it. A deployment that
   * switched regions off still holds the buckets it collected while they were
   * on, and reading those at the minimum because nothing is being counted today
   * would publish exactly what the floor exists to prevent.
   */
  it("keeps the floor where the region switch is off, because the rows are still there", () => {
    expect(contextOf({ [REGION_KEY]: "off", [REGION_FLOOR_KEY]: "100" }).floor).toBe(100)
    expect(contextOf({ [REGION_KEY]: "maybe", [REGION_FLOOR_KEY]: "100" }).floor).toBe(100)
  })

  it("carries the three facts the caller holds through unchanged", () => {
    const context = contextOf({})

    expect(context.trees).toBe(HELD.trees)
    expect(context.declarations).toBe(HELD.declarations)
    expect(context.placings).toBe(HELD.placings)
  })

  it("adds the floor once, however often it is asked", () => {
    const env = { [REGION_FLOOR_KEY]: "100" }

    expect(contextOf(env)).toEqual(contextOf(env))
    expect(Object.keys(contextOf(env)).sort()).toEqual([
      "declarations",
      "floor",
      "placings",
      "trees",
    ])
  })
})
