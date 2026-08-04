import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { buildProposal } from "../testing/doubles.js"
import { sampleTree, type SampleTree } from "../testing/fixtures.js"
import type { TreeDelta, TreeOperation } from "../tree/delta.js"

import { assessChange, type ChangeAssessment } from "./assessment.js"
import { gate } from "./gate.js"
import type { IntentOrigin } from "./intent.js"
import { defaultGatePolicy, gatePolicySchema, type GatePolicy } from "./policy.js"

const spare = sequentialIdFactory("gate")

type Scenario = {
  readonly build: (ids: SampleTree["ids"]) => TreeOperation[]
  readonly policy?: GatePolicy
  readonly origin?: IntentOrigin
  readonly confidence?: number
}

const assessmentFor = (scenario: Scenario): ChangeAssessment => {
  const { tree, ids } = sampleTree()

  const delta: TreeDelta = {
    deltaId: spare.deltaId(),
    treeId: tree.treeId,
    baseRevision: tree.revision,
    operations: scenario.build(ids),
  }

  const proposal = buildProposal(spare, {
    intentId: spare.intentId(),
    delta,
    ...(scenario.origin ? { origin: scenario.origin } : {}),
    ...(scenario.confidence === undefined ? {} : { confidence: scenario.confidence }),
  })

  const assessed = assessChange(tree, proposal, scenario.policy ?? defaultGatePolicy, spare.deltaId())
  if (!assessed.ok) throw new Error(assessed.error.code)

  return assessed.value
}

const decide = (scenario: Scenario) =>
  gate(assessmentFor(scenario), scenario.policy ?? defaultGatePolicy)

/** A deep, small, fully reversible prop tweak — the uncontroversial baseline. */
const tweak = (ids: SampleTree["ids"]): TreeOperation[] => [
  { op: "configure", nodeId: ids.body, set: { value: "Rewritten" }, unset: [] },
]

describe("acceptance", () => {
  it("accepts a low-stakes, reversible, confident change", () => {
    const disposition = decide({ build: tweak })

    expect(disposition.kind).toBe("accepted")
    expect(disposition.reason.code).toBe("within-policy")
    expect(disposition.stakes).toBe("low")
    expect(disposition.reversible).toBe(true)
  })

  it("carries the inputs it decided on into the disposition", () => {
    const disposition = decide({ build: tweak, confidence: 0.95 })

    expect(disposition.confidence).toBe(0.95)
  })
})

describe("confidence rules", () => {
  it("refuses a change the interpreter is barely guessing at", () => {
    const disposition = decide({ build: tweak, confidence: 0.1 })

    expect(disposition.kind).toBe("rejected")
    expect(disposition.reason.code).toBe("confidence-below-floor")
  })

  it("asks for confirmation when confidence is merely low", () => {
    const disposition = decide({ build: tweak, confidence: 0.5 })

    expect(disposition.kind).toBe("requires-confirmation")
    expect(disposition.reason.code).toBe("confidence-below-minimum")
  })

  it("accepts at exactly the minimum", () => {
    expect(decide({ build: tweak, confidence: 0.7 }).kind).toBe("accepted")
  })
})

describe("stakes rules", () => {
  it("asks for confirmation when stakes exceed the origin's ceiling", () => {
    const disposition = decide({
      build: (ids) => [{ op: "remove", nodeId: ids.main }],
      origin: "system-signal",
    })

    expect(disposition.kind).toBe("requires-confirmation")
    expect(disposition.reason.code).toBe("stakes-above-ceiling")
    expect(disposition.stakes).toBe("medium")
  })

  it("auto-applies the same change when a human asked for it explicitly", () => {
    const disposition = decide({
      build: (ids) => [{ op: "remove", nodeId: ids.main }],
      origin: "user-instruction",
    })

    expect(disposition.kind).toBe("accepted")
  })

  it("refuses outright at the refusal floor, whoever asked", () => {
    const policy = gatePolicySchema.parse({ protectedPrimitiveTypes: ["loom.card"] })
    const disposition = decide({
      build: (ids) => [{ op: "remove", nodeId: ids.card }],
      policy,
      origin: "user-instruction",
    })

    expect(disposition.kind).toBe("rejected")
    expect(disposition.reason.code).toBe("stakes-at-refusal-floor")
    expect(disposition.stakes).toBe("critical")
  })

  it("explains a refusal with the factors that caused it", () => {
    const policy = gatePolicySchema.parse({ protectedPrimitiveTypes: ["loom.card"], refusalFloor: "high" })
    const disposition = decide({
      build: (ids) => [{ op: "configure", nodeId: ids.card, set: { variant: "x" }, unset: [] }],
      policy,
    })

    expect(disposition.reason.detail).toContain("loom.card")
  })
})

describe("reversibility rules", () => {
  it("escalates an irreversible change even when it is small, low-stakes, and confident", () => {
    const policy = gatePolicySchema.parse({ outOfTreeEffectTypes: ["loom.card"] })

    const disposition = decide({
      build: (ids) => [{ op: "configure", nodeId: ids.card, set: { variant: "x" }, unset: [] }],
      policy,
      origin: "user-instruction",
    })

    expect(disposition.kind).toBe("requires-confirmation")
    expect(disposition.reason.code).toBe("irreversible")
    expect(disposition.reversible).toBe(false)
    expect(disposition.stakes).toBe("low")
  })

  it("escalates a change whose undo would exceed the retention budget", () => {
    const policy = gatePolicySchema.parse({ inverseRetentionBudget: 1 })
    const disposition = decide({
      build: (ids) => [{ op: "remove", nodeId: ids.main }],
      policy,
      origin: "user-instruction",
    })

    expect(disposition.kind).toBe("requires-confirmation")
    expect(disposition.reason.code).toBe("irreversible")
  })
})

describe("rule precedence", () => {
  it("refuses rather than asks when both would fire", () => {
    const policy = gatePolicySchema.parse({ protectedPrimitiveTypes: ["loom.card"] })
    const disposition = decide({
      build: (ids) => [{ op: "remove", nodeId: ids.card }],
      policy,
      confidence: 0.1,
    })

    expect(disposition.kind).toBe("rejected")
    expect(disposition.reason.code).toBe("confidence-below-floor")
  })

  it("reports irreversibility ahead of an exceeded stakes ceiling", () => {
    const policy = gatePolicySchema.parse({ inverseRetentionBudget: 1 })
    const disposition = decide({
      build: (ids) => [{ op: "remove", nodeId: ids.main }],
      policy,
      origin: "system-signal",
    })

    expect(disposition.reason.code).toBe("irreversible")
  })
})

/**
 * A disposition that cannot say what it was decided under is a verdict with no
 * standard behind it — reproducible only if the reader already knows which
 * policy was in force, which is exactly what they are asking.
 */
describe("attribution", () => {
  it("names the policy on every verdict it can reach", () => {
    const named = gatePolicySchema.parse({
      policyId: "storefront",
      protectedPrimitiveTypes: ["loom.card"],
      refusalFloor: "high",
      minimumConfidence: 0.9,
    })

    const verdicts = [
      decide({ build: tweak, policy: named }),
      decide({ build: tweak, policy: named, confidence: 0.5 }),
      decide({ build: (ids) => [{ op: "remove", nodeId: ids.card }], policy: named }),
    ]

    expect(verdicts.map((verdict) => verdict.kind)).toEqual([
      "accepted",
      "requires-confirmation",
      "rejected",
    ])
    expect(verdicts.every((verdict) => verdict.policyId === "storefront")).toBe(true)
  })

  it("names the policy that decided, not the one the assessment was made under", () => {
    const assessment = assessmentFor({ build: tweak })
    const other = gatePolicySchema.parse({ policyId: "elsewhere" })

    expect(gate(assessment, other).policyId).toBe("elsewhere")
  })
})

describe("purity", () => {
  it("returns the same disposition for the same inputs", () => {
    const assessment = assessmentFor({ build: tweak })

    expect(gate(assessment, defaultGatePolicy)).toEqual(gate(assessment, defaultGatePolicy))
  })
})
