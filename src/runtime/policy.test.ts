import { describe, expect, it } from "vitest"

import { primitiveTypeSchema } from "../primitive-type.js"

import { ceilingFor, defaultGatePolicy, gatePolicySchema } from "./policy.js"

describe("defaultGatePolicy", () => {
  it("ships opinionated structural knobs", () => {
    expect(defaultGatePolicy.removalThresholds).toEqual({ medium: 3, high: 12 })
    expect(defaultGatePolicy.breadthThreshold).toBe(8)
    expect(defaultGatePolicy.refusalFloor).toBe("critical")
  })

  it("ships an empty vocabulary, since only the host knows what is consequential", () => {
    expect(defaultGatePolicy.protectedPrimitiveTypes).toEqual([])
    expect(defaultGatePolicy.outOfTreeEffectTypes).toEqual([])
    expect(defaultGatePolicy.protectedPropKeys).toEqual([])
  })
})

describe("ceilingFor", () => {
  it("gives an explicit human instruction more latitude than an unrequested one", () => {
    expect(ceilingFor(defaultGatePolicy, "user-instruction")).toBe("medium")
    expect(ceilingFor(defaultGatePolicy, "system-signal")).toBe("low")
    expect(ceilingFor(defaultGatePolicy, "scheduled-adaptation")).toBe("low")
  })

  it("falls back to the strictest ceiling for an origin the policy omits", () => {
    const sparse = gatePolicySchema.parse({ autoApplyCeiling: { developer: "high" } })

    expect(ceilingFor(sparse, "developer")).toBe("high")
    expect(ceilingFor(sparse, "user-instruction")).toBe("low")
  })
})

describe("gatePolicySchema", () => {
  it("accepts a host-declared vocabulary", () => {
    const policy = gatePolicySchema.parse({
      protectedPrimitiveTypes: ["commerce.checkout"],
      protectedPropKeys: ["href"],
    })

    expect(policy.protectedPrimitiveTypes).toEqual([primitiveTypeSchema.parse("commerce.checkout")])
    expect(policy.protectedPropKeys).toEqual(["href"])
  })

  it("rejects a confidence threshold outside 0..1", () => {
    expect(gatePolicySchema.safeParse({ minimumConfidence: 1.5 }).success).toBe(false)
  })

  it("rejects a malformed primitive type in the vocabulary", () => {
    expect(gatePolicySchema.safeParse({ protectedPrimitiveTypes: ["Checkout"] }).success).toBe(false)
  })
})

describe("gatePolicySchema — policyId", () => {
  it("names the default policy, so a disposition under it is not anonymous", () => {
    expect(defaultGatePolicy.policyId).toBe("default")
  })

  it("keeps the name a host declared", () => {
    expect(gatePolicySchema.parse({ policyId: "storefront" }).policyId).toBe("storefront")
  })

  it("rejects an empty name, which would attribute a judgment to nothing", () => {
    expect(gatePolicySchema.safeParse({ policyId: "" }).success).toBe(false)
  })
})
