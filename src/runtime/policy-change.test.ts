import { describe, expect, it } from "vitest"

import { policyChangeOf, type PolicyDirection } from "./policy-change.js"
import { policyFingerprintOf } from "./policy-fingerprint.js"
import { defaultGatePolicy, gatePolicySchema, type GatePolicy } from "./policy.js"

const policyWith = (overrides: Record<string, unknown>): GatePolicy =>
  gatePolicySchema.parse(overrides)

const fieldsOf = (was: GatePolicy, now: GatePolicy): readonly (keyof GatePolicy)[] =>
  policyChangeOf(was, now).fields.map((change) => change.field)

const changeTo = (overrides: Record<string, unknown>) =>
  policyChangeOf(defaultGatePolicy, policyWith(overrides))

const directionOf = (field: keyof GatePolicy, overrides: Record<string, unknown>): PolicyDirection => {
  const change = changeTo(overrides)
  const found = change.fields.find((candidate) => candidate.field === field)

  expect(found, `no change reported for ${field}`).toBeDefined()

  return found!.direction
}

describe("policyChangeOf", () => {
  it("reports nothing changed when nothing did", () => {
    const change = policyChangeOf(defaultGatePolicy, defaultGatePolicy)

    expect(change.changed).toBe(false)
    expect(change.fields).toEqual([])
    expect(change.renamed).toBe(false)
    expect(change.direction).toBe("incomparable")
  })

  it("answers for a parsed copy of one policy the way it answers for the policy", () => {
    expect(policyChangeOf(defaultGatePolicy, policyWith({})).changed).toBe(false)
  })

  it("carries the fingerprint on each side, so a reader can find the judgments either way", () => {
    const now = policyWith({ minimumConfidence: 0.9 })
    const change = policyChangeOf(defaultGatePolicy, now)

    expect(change.fingerprints.was).toBe(policyFingerprintOf(defaultGatePolicy))
    expect(change.fingerprints.now).toBe(policyFingerprintOf(now))
  })

  it("names only the fields that moved", () => {
    expect(fieldsOf(defaultGatePolicy, policyWith({ breadthThreshold: 20 }))).toEqual([
      "breadthThreshold",
    ])
  })

  it("reports fields in the order the policy declares them, not alphabetically", () => {
    const now = policyWith({
      policyId: "strict",
      refusalFloor: "high",
      protectedPropKeys: ["href"],
      minimumConfidence: 0.9,
    })

    expect(fieldsOf(defaultGatePolicy, now)).toEqual([
      "policyId",
      "protectedPropKeys",
      "minimumConfidence",
      "refusalFloor",
    ])
  })
})

describe("policyChangeOf — a rename", () => {
  it("is a change, and is not a direction", () => {
    const change = changeTo({ policyId: "renamed" })

    expect(change.changed).toBe(true)
    expect(change.renamed).toBe(true)
    expect(change.direction).toBe("incomparable")
    expect(change.fields).toEqual([
      { field: "policyId", direction: "incomparable", detail: "default became renamed" },
    ])
  })

  it("does not hide the direction of what was edited beside it", () => {
    const change = changeTo({ policyId: "stricter-v2", minimumConfidence: 0.9 })

    expect(change.renamed).toBe(true)
    expect(change.direction).toBe("stricter")
  })

  it("is absent from an edit that kept the name, which 0033 says is the reportable case", () => {
    const change = changeTo({ minimumConfidence: 0.9 })

    expect(change.renamed).toBe(false)
    expect(change.changed).toBe(true)
  })
})

describe("policyChangeOf — which way each knob moves the Gate", () => {
  it("elevates more changes when a protected type is added", () => {
    expect(directionOf("protectedPrimitiveTypes", { protectedPrimitiveTypes: ["loom.card"] })).toBe(
      "stricter"
    )
  })

  it("elevates fewer when one is removed", () => {
    const was = policyWith({ protectedPrimitiveTypes: ["loom.card", "loom.page"] })
    const now = policyWith({ protectedPrimitiveTypes: ["loom.page"] })

    expect(policyChangeOf(was, now).direction).toBe("looser")
  })

  it("is mixed when one list gains and loses in the same edit", () => {
    const was = policyWith({ protectedPropKeys: ["href"] })
    const now = policyWith({ protectedPropKeys: ["action"] })
    const change = policyChangeOf(was, now)

    expect(change.direction).toBe("mixed")
    expect(change.fields[0]?.detail).toBe("added action; removed href")
  })

  it("holds more back when the confidence bar is raised and refuses more when the floor is", () => {
    expect(directionOf("minimumConfidence", { minimumConfidence: 0.9 })).toBe("stricter")
    expect(directionOf("minimumConfidence", { minimumConfidence: 0.5 })).toBe("looser")
    expect(directionOf("confidenceFloor", { confidenceFloor: 0.6 })).toBe("stricter")
    expect(directionOf("confidenceFloor", { confidenceFloor: 0.1 })).toBe("looser")
  })

  it("reads a raised threshold as latitude, because a bigger number is a later alarm", () => {
    expect(directionOf("breadthThreshold", { breadthThreshold: 20 })).toBe("looser")
    expect(directionOf("breadthThreshold", { breadthThreshold: 2 })).toBe("stricter")
    expect(directionOf("shallowDepthThreshold", { shallowDepthThreshold: 4 })).toBe("looser")
    expect(directionOf("inverseRetentionBudget", { inverseRetentionBudget: 500 })).toBe("looser")
  })

  it("reads both removal thresholds, and calls a pair that moved apart mixed", () => {
    const raised = directionOf("removalThresholds", {
      removalThresholds: { medium: 6, high: 20 },
    })
    expect(raised).toBe("looser")

    const change = changeTo({ removalThresholds: { medium: 1, high: 20 } })
    const found = change.fields.find((candidate) => candidate.field === "removalThresholds")

    expect(found?.direction).toBe("mixed")
    expect(found?.detail).toBe("medium 3 became 1, high 12 became 20")
  })

  it("reads a raised auto-apply ceiling as latitude and a lowered one as caution", () => {
    const was = policyWith({})
    const raised = policyWith({
      autoApplyCeiling: { ...was.autoApplyCeiling, "system-signal": "high" },
    })

    expect(policyChangeOf(was, raised).direction).toBe("looser")
    expect(policyChangeOf(raised, was).direction).toBe("stricter")
  })

  it("does not call writing the Gate's own fallback a change", () => {
    const was = policyWith({ autoApplyCeiling: { developer: "high" } })
    const now = policyWith({ autoApplyCeiling: { developer: "high", "system-signal": "low" } })

    expect(policyChangeOf(was, now).changed).toBe(false)
  })

  it("reads a lowered refusal floor as caution, because the floor is what gets refused", () => {
    expect(directionOf("refusalFloor", { refusalFloor: "high" })).toBe("stricter")

    const strict = policyWith({ refusalFloor: "high" })

    expect(policyChangeOf(strict, defaultGatePolicy).direction).toBe("looser")
  })
})

describe("policyChangeOf — the registered library, where empty is undeclared", () => {
  it("calls a list arriving where there was none the strictest move the field makes", () => {
    const change = changeTo({ registeredPrimitiveTypes: ["loom.page", "loom.card"] })
    const found = change.fields.find(
      (candidate) => candidate.field === "registeredPrimitiveTypes"
    )

    expect(found?.direction).toBe("stricter")
    expect(found?.detail).toContain("undeclared before")
  })

  it("calls emptying a declared list looser, because the check goes away", () => {
    const was = policyWith({ registeredPrimitiveTypes: ["loom.page"] })
    const change = policyChangeOf(was, defaultGatePolicy)
    const found = change.fields.find(
      (candidate) => candidate.field === "registeredPrimitiveTypes"
    )

    expect(found?.direction).toBe("looser")
    expect(found?.detail).toContain("undeclared now")
  })

  it("reads an edit inside a declared list the ordinary way round", () => {
    const was = policyWith({ registeredPrimitiveTypes: ["loom.page"] })
    const wider = policyWith({ registeredPrimitiveTypes: ["loom.page", "loom.card"] })

    expect(policyChangeOf(was, wider).direction).toBe("looser")
    expect(policyChangeOf(wider, was).direction).toBe("stricter")
  })
})

describe("policyChangeOf — the interactive vocabulary", () => {
  it("reads a type arriving as a tighter gate, because more nodes become targets", () => {
    const change = changeTo({ interactiveTypes: { "loom.card": "always" } })
    const found = change.fields.find((candidate) => candidate.field === "interactiveTypes")

    expect(found?.direction).toBe("stricter")
    expect(found?.detail).toBe("added loom.card (always)")
  })

  it("reads a type leaving as a looser one", () => {
    const was = policyWith({ interactiveTypes: { "loom.card": "always" } })

    expect(policyChangeOf(was, defaultGatePolicy).fields[0]?.detail).toBe("removed loom.card")
  })

  it("refuses a direction for a condition that was rewritten", () => {
    const was = policyWith({ interactiveTypes: { "loom.card": "always" } })
    const now = policyWith({ interactiveTypes: { "loom.card": { whenProps: ["href"] } } })
    const found = policyChangeOf(was, now).fields[0]

    expect(found?.direction).toBe("mixed")
    expect(found?.detail).toBe("changed loom.card (always became when href)")
  })

  it("does not report an edit when a prop list was only reordered or repeated", () => {
    const was = policyWith({
      interactiveTypes: { "loom.card": { whenProps: ["href", "action"] } },
    })
    const now = policyWith({
      interactiveTypes: { "loom.card": { whenProps: ["action", "href", "action"] } },
    })

    expect(policyChangeOf(was, now).changed).toBe(false)
  })

  /**
   * The trap `interactivity.ts` records, met from this side. A policy keyed on
   * `constructor` is one the Gate judges perfectly well, so a comparison that
   * read the key off `Object.prototype` would crash on a working deployment.
   */
  it("treats a type named after an Object member as absent rather than as a function", () => {
    const was = policyWith({ interactiveTypes: { constructor: "always" } })

    expect(policyChangeOf(was, defaultGatePolicy).fields[0]?.detail).toBe("removed constructor")
    expect(policyChangeOf(defaultGatePolicy, was).fields[0]?.detail).toBe(
      "added constructor (always)"
    )
    expect(policyChangeOf(was, was).changed).toBe(false)
  })
})

describe("policyChangeOf — the direction of a whole edit", () => {
  it("is the one direction when every ordered field agrees", () => {
    const change = changeTo({ minimumConfidence: 0.9, breadthThreshold: 2 })

    expect(change.direction).toBe("stricter")
  })

  it("is mixed when two ordered fields disagree", () => {
    const change = changeTo({ minimumConfidence: 0.9, breadthThreshold: 20 })

    expect(change.direction).toBe("mixed")
  })

  it("is mixed when any one field is", () => {
    const was = policyWith({ protectedPropKeys: ["href"] })
    const now = policyWith({ protectedPropKeys: ["action"], minimumConfidence: 0.9 })

    expect(policyChangeOf(was, now).direction).toBe("mixed")
  })

  /**
   * The asymmetry worth stating: a fold that counted the rename would have
   * reported `mixed` here and hidden the half that is knowable.
   */
  it("skips the fields with no order rather than counting them against the ones that have", () => {
    const change = changeTo({ policyId: "v2", breadthThreshold: 2 })

    expect(change.direction).toBe("stricter")
  })
})

/**
 * The guard rail, measured rather than assumed. `policy-fingerprint.ts` makes
 * the same claim about itself and the two have to hold together: a field added
 * to the policy that nobody taught this module to compare would report
 * *nothing changed* about an edit that changed something.
 */
describe("policyChangeOf — the fields it covers", () => {
  it("compares every field the policy has", () => {
    const covered = new Set<string>()
    const policy = defaultGatePolicy

    for (const field of Object.keys(policy) as readonly (keyof GatePolicy)[]) {
      covered.add(field)
    }

    /**
     * Driven by changing each field rather than by reading the comparison table,
     * because a table entry that returns `undefined` for every input would be
     * covered and useless.
     */
    const moved: Record<string, GatePolicy> = {
      policyId: policyWith({ policyId: "other" }),
      protectedPrimitiveTypes: policyWith({ protectedPrimitiveTypes: ["loom.card"] }),
      outOfTreeEffectTypes: policyWith({ outOfTreeEffectTypes: ["loom.card"] }),
      protectedPropKeys: policyWith({ protectedPropKeys: ["href"] }),
      interactiveTypes: policyWith({ interactiveTypes: { "loom.card": "always" } }),
      registeredPrimitiveTypes: policyWith({ registeredPrimitiveTypes: ["loom.card"] }),
      removalThresholds: policyWith({ removalThresholds: { medium: 4, high: 12 } }),
      breadthThreshold: policyWith({ breadthThreshold: 9 }),
      shallowDepthThreshold: policyWith({ shallowDepthThreshold: 2 }),
      inverseRetentionBudget: policyWith({ inverseRetentionBudget: 201 }),
      minimumConfidence: policyWith({ minimumConfidence: 0.71 }),
      confidenceFloor: policyWith({ confidenceFloor: 0.31 }),
      autoApplyCeiling: policyWith({
        autoApplyCeiling: { ...policy.autoApplyCeiling, developer: "critical" },
      }),
      refusalFloor: policyWith({ refusalFloor: "high" }),
    }

    expect(new Set(Object.keys(moved))).toEqual(covered)

    for (const [field, now] of Object.entries(moved)) {
      expect(fieldsOf(policy, now), `${field} was not reported`).toEqual([field])
    }
  })

  it("reports an edit for every field a fingerprint would notice", () => {
    const edited = policyWith({
      policyId: "everything",
      protectedPrimitiveTypes: ["loom.card"],
      outOfTreeEffectTypes: ["loom.checkout"],
      protectedPropKeys: ["href"],
      interactiveTypes: { "loom.card": "always" },
      registeredPrimitiveTypes: ["loom.page"],
      removalThresholds: { medium: 5, high: 20 },
      breadthThreshold: 12,
      shallowDepthThreshold: 2,
      inverseRetentionBudget: 400,
      minimumConfidence: 0.8,
      confidenceFloor: 0.4,
      autoApplyCeiling: { developer: "critical" },
      refusalFloor: "high",
    })

    const change = policyChangeOf(defaultGatePolicy, edited)

    expect(change.fields).toHaveLength(Object.keys(defaultGatePolicy).length)
    expect(policyFingerprintOf(defaultGatePolicy)).not.toBe(policyFingerprintOf(edited))
  })
})
