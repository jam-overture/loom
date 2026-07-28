import { describe, expect, it } from "vitest"

import { primitiveTypeSchema } from "../primitive-type.js"

import type { ChangeAnalysis } from "./analysis.js"
import { defaultGatePolicy, gatePolicySchema } from "./policy.js"
import { assessStakes } from "./stakes.js"

const analysisOf = (overrides: Partial<ChangeAnalysis> = {}): ChangeAnalysis => ({
  operationCount: 1,
  insertedNodeCount: 0,
  removedNodeCount: 0,
  movedNodeCount: 0,
  configuredNodeCount: 1,
  affectedNodeIds: [],
  touchedPrimitiveTypes: [],
  removedPrimitiveTypes: [],
  configuredPropKeys: [],
  shallowestAffectedDepth: 5,
  ...overrides,
})

const codesOf = (analysis: ChangeAnalysis, policy = defaultGatePolicy) =>
  assessStakes(analysis, policy).factors.map((factor) => factor.code)

describe("assessStakes baseline", () => {
  it("treats an ordinary deep prop tweak as low stakes with no factors", () => {
    const assessment = assessStakes(analysisOf(), defaultGatePolicy)

    expect(assessment.level).toBe("low")
    expect(assessment.factors).toEqual([])
  })
})

describe("structural factors", () => {
  it("escalates a removal past the medium threshold", () => {
    const assessment = assessStakes(analysisOf({ removedNodeCount: 3 }), defaultGatePolicy)

    expect(assessment.level).toBe("medium")
    expect(assessment.factors[0]?.code).toBe("large-removal")
    expect(assessment.factors[0]?.detail).toContain("3 nodes")
  })

  it("escalates a removal past the high threshold", () => {
    expect(assessStakes(analysisOf({ removedNodeCount: 12 }), defaultGatePolicy).level).toBe("high")
  })

  it("leaves a small removal alone", () => {
    expect(codesOf(analysisOf({ removedNodeCount: 2 }))).toEqual([])
  })

  it("escalates a change that touches many nodes at once", () => {
    const analysis = analysisOf({
      affectedNodeIds: Array.from({ length: 8 }, (_, index) => `n_b${index}` as never),
    })

    expect(codesOf(analysis)).toContain("broad-change")
  })

  it("escalates a structural change near the root", () => {
    const analysis = analysisOf({ movedNodeCount: 1, shallowestAffectedDepth: 1 })

    expect(codesOf(analysis)).toContain("shallow-structural-change")
  })

  it("does not treat a shallow prop tweak as restructuring", () => {
    const analysis = analysisOf({ configuredNodeCount: 1, shallowestAffectedDepth: 0 })

    expect(codesOf(analysis)).toEqual([])
  })
})

describe("vocabulary factors", () => {
  const policy = gatePolicySchema.parse({
    protectedPrimitiveTypes: ["commerce.cart"],
    outOfTreeEffectTypes: ["commerce.checkout"],
    protectedPropKeys: ["href"],
  })

  it("escalates a touched protected primitive to high", () => {
    const analysis = analysisOf({
      touchedPrimitiveTypes: [primitiveTypeSchema.parse("commerce.cart")],
    })

    expect(assessStakes(analysis, policy).level).toBe("high")
  })

  it("escalates a configured protected prop key to high", () => {
    const analysis = analysisOf({ configuredPropKeys: ["href"] })
    const assessment = assessStakes(analysis, policy)

    expect(assessment.level).toBe("high")
    expect(assessment.factors[0]?.detail).toContain("href")
  })

  it("escalates destroying a protected primitive to critical", () => {
    const analysis = analysisOf({
      removedNodeCount: 1,
      touchedPrimitiveTypes: [primitiveTypeSchema.parse("commerce.cart")],
      removedPrimitiveTypes: [primitiveTypeSchema.parse("commerce.cart")],
    })

    expect(assessStakes(analysis, policy).level).toBe("critical")
  })

  it("does not raise stakes for an out-of-tree-effect type, which is a reversibility concern", () => {
    const analysis = analysisOf({
      touchedPrimitiveTypes: [primitiveTypeSchema.parse("commerce.checkout")],
    })

    expect(assessStakes(analysis, policy).level).toBe("low")
  })

  it("ignores primitives the host has not declared", () => {
    const analysis = analysisOf({
      touchedPrimitiveTypes: [primitiveTypeSchema.parse("layout.stack")],
    })

    expect(assessStakes(analysis, policy).level).toBe("low")
  })
})

describe("factor aggregation", () => {
  it("takes the highest level while keeping every reason", () => {
    const policy = gatePolicySchema.parse({ protectedPrimitiveTypes: ["commerce.cart"] })
    const analysis = analysisOf({
      removedNodeCount: 4,
      movedNodeCount: 1,
      shallowestAffectedDepth: 0,
      touchedPrimitiveTypes: [primitiveTypeSchema.parse("commerce.cart")],
    })

    const assessment = assessStakes(analysis, policy)

    expect(assessment.level).toBe("high")
    expect(assessment.factors.map((factor) => factor.code)).toEqual([
      "protected-type-touched",
      "large-removal",
      "shallow-structural-change",
    ])
  })

  it("separates destroying a protected primitive from merely touching one", () => {
    const policy = gatePolicySchema.parse({ protectedPrimitiveTypes: ["commerce.cart"] })
    const cart = primitiveTypeSchema.parse("commerce.cart")

    const touched = assessStakes(analysisOf({ touchedPrimitiveTypes: [cart] }), policy)
    const removed = assessStakes(
      analysisOf({ touchedPrimitiveTypes: [cart], removedPrimitiveTypes: [cart] }),
      policy
    )

    expect(touched.level).toBe("high")
    expect(removed.level).toBe("critical")
  })
})
