import { describe, expect, it } from "vitest"

import { primitiveTypeSchema, type PrimitiveType } from "../primitive-type.js"

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

  /**
   * `GatePolicy` is derived from the schema, so a field in one and not the other
   * is now a thing that cannot be written rather than a thing that is checked.
   * This is here anyway because the derivation is the *claim*, and because the
   * check it replaces lived on the documentation site — `knobs.test.ts` holding
   * its `KNOB_ORDER` against `gatePolicySchema.shape`, which is a surface telling
   * the runtime about a mismatch inside the runtime. A second consumer keying off
   * `keyof GatePolicy` got no such warning. The runtime owns it now.
   */
  it("has a default for every field the schema declares, and no field the schema does not", () => {
    expect(Object.keys(defaultGatePolicy).sort()).toEqual(Object.keys(gatePolicySchema.shape).sort())
  })

  /**
   * A `Record<keyof GatePolicy, true>` is the compile-time half: a fourteenth
   * field added to the schema reaches `keyof GatePolicy` by derivation, and this
   * object then fails to compile until it is named here too. Before the
   * derivation the added field never reached the type at all, so nothing in
   * `src/` could have been written that would notice it.
   */
  it("reaches every field through the type, not only through the parsed value", () => {
    const named: Record<keyof GatePolicy, true> = {
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

    expect(Object.keys(named).sort()).toEqual(Object.keys(gatePolicySchema.shape).sort())
  })

  /**
   * The three host-vocabulary lists carry `.readonly()` so that the derived type
   * keeps the `readonly` arrays the hand-written one promised. Without it the
   * derivation would have narrowed a public type — a caller holding a
   * `readonly PrimitiveType[]` could no longer pass it — which is the one place
   * `z.infer` and the old mirror disagreed.
   */
  it("keeps the vocabulary lists readonly for callers that already hold one", () => {
    const types: readonly PrimitiveType[] = [primitiveTypeSchema.parse("app.card")]
    const policy: GatePolicy = gatePolicySchema.parse({ protectedPrimitiveTypes: types })

    expect(policy.protectedPrimitiveTypes).toEqual(types)
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
