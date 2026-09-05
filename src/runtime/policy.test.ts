import { describe, expect, it } from "vitest"

import { primitiveTypeSchema } from "../primitive-type.js"

import { ceilingFor, defaultGatePolicy, gatePolicySchema, type GatePolicy } from "./policy.js"

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

/**
 * The record below has to name every knob or this file does not compile, and
 * the assertion carries that across to the schema — so a fourteenth field
 * reaches `keyof GatePolicy`, this test and every consumer keyed on the type in
 * one step, rather than reaching the schema alone and being silently dropped by
 * the rest.
 *
 * `Loom docs` filed the hole on 4 September, having caught it from their own
 * side with a test comparing `KNOB_ORDER` to `Object.keys(gatePolicySchema.shape)`.
 * That check belongs here as well as there: theirs proves the documentation
 * grew a sentence, this one proves the runtime's own type did.
 */
const everyKnob: Readonly<Record<keyof GatePolicy, true>> = {
  policyId: true,
  protectedPrimitiveTypes: true,
  outOfTreeEffectTypes: true,
  protectedPropKeys: true,
  interactiveTypes: true,
  removalThresholds: true,
  breadthThreshold: true,
  shallowDepthThreshold: true,
  inverseRetentionBudget: true,
  minimumConfidence: true,
  confidenceFloor: true,
  autoApplyCeiling: true,
  refusalFloor: true,
}

describe("GatePolicy", () => {
  it("states exactly the fields the schema states", () => {
    expect(Object.keys(everyKnob).sort()).toEqual(Object.keys(gatePolicySchema.shape).sort())
  })

  it("is the type the schema parses into, so the two cannot drift", () => {
    expect(Object.keys(defaultGatePolicy).sort()).toEqual(Object.keys(everyKnob).sort())
  })
})
