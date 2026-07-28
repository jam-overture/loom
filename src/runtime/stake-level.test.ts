import { describe, expect, it } from "vitest"

import { compareStakes, highestStake, isAbove, isAtLeast, STAKE_ORDER } from "./stake-level.js"

describe("stake ordering", () => {
  it("orders low below critical", () => {
    expect(STAKE_ORDER).toEqual(["low", "medium", "high", "critical"])
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
