import { describe, expect, it } from "vitest"

import {
  compareStakes,
  highestStake,
  isAbove,
  isAtLeast,
  STAKE_ORDER,
  stakeLevelSchema,
  type StakeLevel,
} from "./stake-level.js"

/**
 * The level that reaches this module without passing through its types: cast at
 * a seam, or read back off a record a newer deployment wrote. The cast is the
 * subject of the third block below, not an escape from it.
 */
const unnamed = "catastrophic" as unknown as StakeLevel

describe("stake ordering", () => {
  /**
   * Against the schema rather than against a literal. A fourth hand-written copy
   * of the same four strings fails when somebody edits the copy, which is never
   * the edit that breaks the Gate.
   */
  it("names every level the schema accepts, once each", () => {
    expect([...STAKE_ORDER].sort()).toEqual([...stakeLevelSchema.options].sort())
    expect(new Set(STAKE_ORDER).size).toBe(STAKE_ORDER.length)
  })

  it("orders the scale by how much damage the level stands for", () => {
    expect(isAbove("medium", "low")).toBe(true)
    expect(isAbove("high", "medium")).toBe(true)
    expect(isAbove("critical", "high")).toBe(true)
    expect(compareStakes("low", "critical")).toBeLessThan(0)
    expect(compareStakes("high", "high")).toBe(0)
  })

  it("treats a floor as inclusive and a ceiling as exclusive", () => {
    expect(isAtLeast("high", "high")).toBe(true)
    expect(isAtLeast("medium", "high")).toBe(false)
    expect(isAbove("high", "high")).toBe(false)
    expect(isAbove("critical", "high")).toBe(true)
  })
})

describe("highestStake", () => {
  it("returns the highest level present", () => {
    expect(highestStake(["low", "high", "medium"])).toBe("high")
  })

  it("defaults to low when nothing raised a concern", () => {
    expect(highestStake([])).toBe("low")
  })
})

/**
 * Pinned as it stands today, which is not as it should stand.
 *
 * A level the order cannot place ranks beneath `low`, so the Gate accepts it —
 * measured, and written up in 0166. The fix is one line here and a rewrite of
 * lesson 25, which teaches this arithmetic as its worked example and live-checks
 * the transcript, so it lands in that order and this block is what the second
 * half will invert. Kept rather than left blank because an untested defect and a
 * tested one are different amounts of known.
 */
describe("a level the scale does not name", () => {
  it("ranks beneath every level it does name, which is the wrong direction", () => {
    expect(isAtLeast(unnamed, "low")).toBe(false)
    expect(isAbove(unnamed, "low")).toBe(false)
    expect(compareStakes(unnamed, "critical")).toBe(-4)
  })

  it("vanishes out of the fold rather than winning it", () => {
    expect(highestStake(["low", unnamed, "high"])).toBe("high")
  })
})
