import { describe, expect, it } from "vitest"

import {
  policyFingerprintOf,
  policyShapeOf,
  rulesetContinuityOf,
  type RulesetContinuity,
} from "./policy-fingerprint.js"
import { defaultGatePolicy, gatePolicySchema, type GatePolicy } from "./policy.js"

const policyWith = (overrides: Record<string, unknown>): GatePolicy =>
  gatePolicySchema.parse(overrides)

describe("policyFingerprintOf", () => {
  it("gives the same policy the same fingerprint every time", () => {
    expect(policyFingerprintOf(defaultGatePolicy)).toBe(policyFingerprintOf(defaultGatePolicy))
  })

  it("reads as a shape and a set of values, separated", () => {
    const [shape, values, ...rest] = policyFingerprintOf(defaultGatePolicy).split(":")

    expect(shape).toMatch(/^[0-9a-f]{8}$/)
    expect(values).toMatch(/^[0-9a-f]{16}$/)
    expect(rest).toEqual([])
  })

  it("ignores the name, so a renamed policy is recognisably the same rules", () => {
    const strict = policyWith({ policyId: "strict", minimumConfidence: 0.9 })
    const renamed = policyWith({ policyId: "strict-v2", minimumConfidence: 0.9 })

    expect(policyFingerprintOf(renamed)).toBe(policyFingerprintOf(strict))
  })

  it("changes when any knob the Gate consults changes", () => {
    const variants: readonly Record<string, unknown>[] = [
      { protectedPrimitiveTypes: ["commerce.checkout"] },
      { outOfTreeEffectTypes: ["commerce.checkout"] },
      { protectedPropKeys: ["href"] },
      { registeredPrimitiveTypes: ["loom.card"] },
      { removalThresholds: { medium: 4, high: 12 } },
      { removalThresholds: { medium: 3, high: 13 } },
      { breadthThreshold: 9 },
      { shallowDepthThreshold: 2 },
      { inverseRetentionBudget: 201 },
      { minimumConfidence: 0.71 },
      { confidenceFloor: 0.31 },
      { autoApplyCeiling: { "user-instruction": "high" } },
      { refusalFloor: "high" },
    ]

    const fingerprints = variants.map((overrides) => policyFingerprintOf(policyWith(overrides)))

    expect(new Set(fingerprints).size).toBe(variants.length)
    expect(fingerprints).not.toContain(policyFingerprintOf(defaultGatePolicy))
  })

  it("keeps the shape half fixed while only values differ", () => {
    const loose = policyWith({ minimumConfidence: 0.5 })
    const tight = policyWith({ minimumConfidence: 0.95 })

    expect(policyShapeOf(policyFingerprintOf(loose))).toBe(
      policyShapeOf(policyFingerprintOf(tight))
    )
    expect(policyFingerprintOf(loose)).not.toBe(policyFingerprintOf(tight))
  })

  /**
   * A policy is fingerprinted by what it means to the Gate, not by how it was
   * written down. Vocabulary lists are membership tests, and `ceilingFor` reads
   * a record by key — so order, repetition and key order change no decision and
   * must change no digest, or every reformatted config would read as an edit.
   */
  it("does not depend on the order of a vocabulary list", () => {
    const forwards = policyWith({ protectedPropKeys: ["href", "amount", "sku"] })
    const backwards = policyWith({ protectedPropKeys: ["sku", "href", "amount"] })

    expect(policyFingerprintOf(backwards)).toBe(policyFingerprintOf(forwards))
  })

  it("does not depend on a repeated entry in a vocabulary list", () => {
    const once = policyWith({ outOfTreeEffectTypes: ["commerce.checkout"] })
    const twice = policyWith({ outOfTreeEffectTypes: ["commerce.checkout", "commerce.checkout"] })

    expect(policyFingerprintOf(twice)).toBe(policyFingerprintOf(once))
  })

  it("does not depend on the key order of the ceiling map", () => {
    const forwards = policyWith({
      autoApplyCeiling: { developer: "high", "user-instruction": "medium" },
    })
    const backwards = policyWith({
      autoApplyCeiling: { "user-instruction": "medium", developer: "high" },
    })

    expect(policyFingerprintOf(backwards)).toBe(policyFingerprintOf(forwards))
  })

  it("counts adding a ceiling as an edit, since it is one", () => {
    const narrow = policyWith({ autoApplyCeiling: { developer: "high" } })
    const wide = policyWith({ autoApplyCeiling: { developer: "high", "user-instruction": "low" } })

    expect(policyFingerprintOf(wide)).not.toBe(policyFingerprintOf(narrow))
  })

  /**
   * Values are JSON-encoded before they are joined, so a prop key containing the
   * separators cannot make one policy's digest input look like another's.
   */
  it("cannot be forged by a value that contains the encoding's separators", () => {
    const injected = policyWith({ protectedPropKeys: ['a"]\nbreadthThreshold=99'] })

    expect(policyFingerprintOf(injected)).not.toBe(
      policyFingerprintOf(policyWith({ breadthThreshold: 99 }))
    )
  })
})

describe("policyFingerprintOf over the interactive vocabulary", () => {
  it("calls declaring a target an edit", () => {
    const before = policyWith({ policyId: "library" })
    const after = policyWith({
      policyId: "library",
      interactiveTypes: { "loom.card": { whenProps: ["href"] } },
    })

    expect(rulesetContinuityOf([policyFingerprintOf(before), policyFingerprintOf(after)])).toBe(
      "changed"
    )
  })

  it("calls a changed trigger an edit, even with the same types declared", () => {
    const byHref = policyWith({ interactiveTypes: { "loom.card": { whenProps: ["href"] } } })
    const always = policyWith({ interactiveTypes: { "loom.card": "always" } })

    expect(policyFingerprintOf(byHref)).not.toBe(policyFingerprintOf(always))
  })

  it("reads the same vocabulary written in another order as unchanged", () => {
    const one = policyWith({
      interactiveTypes: { "loom.card": { whenProps: ["href", "onSelect"] }, "loom.action": "always" },
    })
    const other = policyWith({
      interactiveTypes: { "loom.action": "always", "loom.card": { whenProps: ["onSelect", "href"] } },
    })

    expect(policyFingerprintOf(one)).toBe(policyFingerprintOf(other))
  })
})

describe("policyFingerprintOf over the declared library", () => {
  it("calls declaring one an edit, because it changes what the Gate refuses", () => {
    const before = policyWith({ policyId: "library" })
    const after = policyWith({ policyId: "library", registeredPrimitiveTypes: ["loom.card"] })

    expect(rulesetContinuityOf([policyFingerprintOf(before), policyFingerprintOf(after)])).toBe(
      "changed"
    )
  })

  /** A list is a membership test, so neither order nor a repeat reaches a decision. */
  it("reads the same library written in another order as unchanged", () => {
    const one = policyWith({ registeredPrimitiveTypes: ["loom.card", "loom.page"] })
    const other = policyWith({ registeredPrimitiveTypes: ["loom.page", "loom.card", "loom.page"] })

    expect(policyFingerprintOf(one)).toBe(policyFingerprintOf(other))
  })
})

describe("policyShapeOf", () => {
  it("is the half before the separator", () => {
    expect(policyShapeOf("abcdef01:0123456789abcdef")).toBe("abcdef01")
  })

  it("treats a string it did not produce as its own shape, so it compares to nothing", () => {
    expect(policyShapeOf("not-a-fingerprint")).toBe("not-a-fingerprint")
    expect(rulesetContinuityOf(["not-a-fingerprint", "abcdef01:0123456789abcdef"])).toBe(
      "incomparable"
    )
  })
})

describe("rulesetContinuityOf", () => {
  const cases: readonly (readonly [string, readonly string[], RulesetContinuity])[] = [
    ["nothing recorded a fingerprint", [], "unrecorded"],
    ["one ruleset judged everything", ["aaaaaaaa:1111111111111111"], "single"],
    [
      "the same ruleset seen many times",
      ["aaaaaaaa:1111111111111111", "aaaaaaaa:1111111111111111"],
      "single",
    ],
    [
      "one name over two rulesets of the same shape",
      ["aaaaaaaa:1111111111111111", "aaaaaaaa:2222222222222222"],
      "changed",
    ],
    [
      "two versions of the policy schema",
      ["aaaaaaaa:1111111111111111", "bbbbbbbb:2222222222222222"],
      "incomparable",
    ],
    [
      "an edit on one side of a schema change is still an edit",
      [
        "aaaaaaaa:1111111111111111",
        "aaaaaaaa:2222222222222222",
        "bbbbbbbb:3333333333333333",
      ],
      "changed",
    ],
  ]

  it.each(cases)("reads %s as %s", (_name, fingerprints, expected) => {
    expect(rulesetContinuityOf(fingerprints)).toBe(expected)
  })

  it("calls a real edit to a real policy a change", () => {
    const before = policyFingerprintOf(policyWith({ policyId: "checkout", minimumConfidence: 0.7 }))
    const after = policyFingerprintOf(policyWith({ policyId: "checkout", minimumConfidence: 0.8 }))

    expect(rulesetContinuityOf([before, after])).toBe("changed")
  })
})
