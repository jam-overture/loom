import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import { assessChange, type ChangeAssessment } from "../runtime/assessment.js"
import { defaultGatePolicy, gatePolicySchema, type GatePolicy } from "../runtime/policy.js"
import type { ProposedChange } from "../runtime/proposal.js"
import { assessStakes, FIXED_STAKE_FACTOR_CODES } from "../runtime/stakes.js"
import { buildIntent, buildProposal, FIXED_INSTANT } from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"
import { buildElement } from "../tree/builders.js"
import type { TreeDelta } from "../tree/delta.js"

import { recordOf, type AssessmentSummary } from "./event.js"
import { remeasureStakes } from "./remeasure.js"

const ids = sequentialIdFactory("r")
const { tree, ids: nodes } = sampleTree()

const intent = buildIntent(ids, { treeId: tree.treeId, baseRevision: 0, utterance: "change it" })

const proposalOf = (operations: TreeDelta["operations"]): ProposedChange =>
  buildProposal(ids, {
    intentId: intent.intentId,
    delta: { deltaId: ids.deltaId(), treeId: tree.treeId, baseRevision: 0, operations },
  })

const assessUnder = (policy: GatePolicy, change: ProposedChange): ChangeAssessment => {
  const result = assessChange(tree, change, policy, ids.deltaId())
  if (!result.ok) throw new Error("the fixture delta must assess")

  return result.value
}

/** The record as the journal would hold it, which is the only input this has. */
const summaryOf = (assessment: ChangeAssessment): AssessmentSummary => {
  const { event } = recordOf({
    treeId: tree.treeId,
    occurredAt: FIXED_INSTANT,
    event: { type: "change-assessed", assessment },
  })
  if (event.type !== "change-assessed") throw new Error("the fixture must narrow to an assessment")

  return event.assessment
}

const without = (
  summary: AssessmentSummary,
  ...absent: readonly (keyof AssessmentSummary)[]
): AssessmentSummary => {
  const kept = Object.entries(summary).filter(([key]) => !absent.includes(key as keyof AssessmentSummary))

  return Object.fromEntries(kept) as AssessmentSummary
}

/**
 * Deltas with genuinely different shapes, each assessed against the real tree.
 *
 * The corpus is what makes the round trip below an argument rather than an
 * example: a removal that takes a subtree with it, a move, a configure that
 * names prop keys, an insert of a type nothing is registered for, and a change
 * broad enough to trip breadth.
 */
const CORPUS: readonly { readonly what: string; readonly change: ProposedChange }[] = [
  { what: "a deep prop tweak", change: proposalOf([{ op: "configure", nodeId: nodes.card, set: { variant: "filled" }, unset: [] }]) },
  { what: "a removal with a subtree under it", change: proposalOf([{ op: "remove", nodeId: nodes.header }]) },
  { what: "a shallow removal", change: proposalOf([{ op: "remove", nodeId: nodes.footer }]) },
  { what: "a move", change: proposalOf([{ op: "move", nodeId: nodes.footer, parentId: nodes.main, index: 0 }]) },
  {
    what: "an insert",
    change: proposalOf([
      { op: "insert", parentId: nodes.main, index: 0, node: buildElement(ids, { type: primitiveTypeSchema.parse("loom.card") }) },
    ]),
  },
  {
    what: "four operations at once",
    change: proposalOf([
      { op: "configure", nodeId: nodes.card, set: { elevation: 2 }, unset: [] },
      { op: "configure", nodeId: nodes.page, set: { title: "Index" }, unset: [] },
      { op: "remove", nodeId: nodes.footer },
      { op: "move", nodeId: nodes.header, parentId: nodes.main, index: 0 },
    ]),
  },
]

/** Policies that each reach a different set of the measuring rules. */
const POLICIES: readonly { readonly what: string; readonly policy: GatePolicy }[] = [
  { what: "the default", policy: defaultGatePolicy },
  { what: "one that protects a type", policy: gatePolicySchema.parse({ protectedPrimitiveTypes: ["loom.card", "loom.header"] }) },
  { what: "one that protects a prop", policy: gatePolicySchema.parse({ protectedPropKeys: ["variant", "title"] }) },
  { what: "one that calls two nodes broad", policy: gatePolicySchema.parse({ breadthThreshold: 2 }) },
  { what: "one that calls any removal large", policy: gatePolicySchema.parse({ removalThresholds: { medium: 1, high: 2 } }) },
  { what: "one that calls depth 4 shallow", policy: gatePolicySchema.parse({ shallowDepthThreshold: 4 }) },
]

describe("remeasureStakes reproduces the Gate it is standing in for", () => {
  for (const { what: shape, change } of CORPUS) {
    for (const { what: rules, policy } of POLICIES) {
      it(`gives ${shape} under ${rules} the level the Gate gave it`, () => {
        const assessment = assessUnder(policy, change)
        const expected = assessStakes({ analysis: assessment.analysis, discards: [] }, policy)

        const remeasured = remeasureStakes(summaryOf(assessment), policy)

        expect(remeasured.unreadable).toEqual([])
        expect(remeasured.level).toBe(expected.level)
        expect(remeasured.factors.map((factor) => factor.code)).toEqual(
          expected.factors.map((factor) => factor.code)
        )
        expect(remeasured.factors.map((factor) => factor.level)).toEqual(
          expected.factors.map((factor) => factor.level)
        )
      })
    }
  }

  /**
   * The premise `affectedNodeCeiling` rests on, pinned against the real analysis
   * rather than argued in a comment. A change to how `affectedNodeIds` is
   * tallied breaks this rather than quietly making a record read as narrower
   * than it was.
   */
  it("never counts more affected nodes than the four recorded counts allow", () => {
    for (const { change } of CORPUS) {
      const summary = summaryOf(assessUnder(defaultGatePolicy, change))

      expect(summary.affectedNodeCount).toBeLessThanOrEqual(
        summary.insertedNodeCount +
          summary.removedNodeCount +
          summary.movedNodeCount +
          summary.configuredNodeCount
      )
    }
  })
})

describe("remeasureStakes under a policy that was never in force", () => {
  const quietly = summaryOf(
    assessUnder(
      defaultGatePolicy,
      proposalOf([{ op: "configure", nodeId: nodes.card, set: { variant: "filled" }, unset: [] }])
    )
  )

  it("raises a change the deployment judged low, under a policy that protects what it touched", () => {
    expect(quietly.stakes).toBe("low")

    const remeasured = remeasureStakes(
      quietly,
      gatePolicySchema.parse({ protectedPrimitiveTypes: ["loom.card"] })
    )

    expect(remeasured.level).toBe("high")
    expect(remeasured.factors).toEqual([
      { code: "protected-type-touched", level: "high", source: "remeasured" },
    ])
    expect(remeasured.unreadable).toEqual([])
  })

  it("answers the prop question the record could not be asked before", () => {
    expect(quietly.configuredPropKeys).toEqual(["variant"])

    const remeasured = remeasureStakes(quietly, gatePolicySchema.parse({ protectedPropKeys: ["variant"] }))

    expect(remeasured.factors.map((factor) => factor.code)).toEqual(["protected-prop-configured"])
    expect(remeasured.level).toBe("high")
  })

  it("carries a rule no policy can move at the level its code fixes", () => {
    const undrawable = summaryOf(
      assessUnder(
        gatePolicySchema.parse({ registeredPrimitiveTypes: ["loom.page", "loom.header", "loom.card"] }),
        proposalOf([
          {
            op: "insert",
            parentId: nodes.card,
            index: 0,
            node: buildElement(ids, { type: primitiveTypeSchema.parse("app.nonesuch") }),
          },
        ])
      )
    )

    const remeasured = remeasureStakes(undrawable, defaultGatePolicy)

    expect(remeasured.factors).toContainEqual({
      code: "unknown-primitive",
      level: "critical",
      source: "recorded",
    })
    expect(remeasured.level).toBe("critical")
  })
})

describe("remeasureStakes refuses to read what a record does not say", () => {
  const removal = summaryOf(assessUnder(defaultGatePolicy, proposalOf([{ op: "remove", nodeId: nodes.header }])))
  const protects = gatePolicySchema.parse({ protectedPrimitiveTypes: ["loom.header"] })

  /**
   * A floor and not an answer, shown with both numbers. The record still says
   * the header was *touched*, which is a required field, so the rule that
   * survives reaches `high` — and the rule that was lost is the one that would
   * have reached `critical`. A caller that read the floor as the answer would
   * put a change the Gate refused in front of somebody as one it would hold.
   */
  it("names the rule and leaves the level a floor when the list it reads was never written", () => {
    const older = without(removal, "removedPrimitiveTypes")

    const remeasured = remeasureStakes(older, protects)

    expect(remeasured.unreadable).toEqual(["protected-type-removed"])
    expect(remeasured.level).toBe("high")
    expect(remeasureStakes(removal, protects).level).toBe("critical")
  })

  it("reads the same record in full under a policy that protects nothing", () => {
    const remeasured = remeasureStakes(without(removal, "removedPrimitiveTypes"), defaultGatePolicy)

    expect(remeasured.unreadable).toEqual([])
  })

  it("reads an absent list in full when the record proves the rule cannot fire", () => {
    const tweak = summaryOf(
      assessUnder(
        defaultGatePolicy,
        proposalOf([{ op: "configure", nodeId: nodes.card, set: { variant: "filled" }, unset: [] }])
      )
    )

    expect(tweak.removedNodeCount).toBe(0)
    expect(remeasureStakes(without(tweak, "removedPrimitiveTypes"), protects).unreadable).toEqual([])
  })

  it("holds breadth readable while the counts cannot reach the threshold, and not past it", () => {
    const tweak = summaryOf(
      assessUnder(
        defaultGatePolicy,
        proposalOf([{ op: "configure", nodeId: nodes.card, set: { elevation: 3 }, unset: [] }])
      )
    )
    const older = without(tweak, "affectedNodeCount")

    expect(tweak.affectedNodeCount).toBe(1)

    expect(remeasureStakes(older, gatePolicySchema.parse({ breadthThreshold: 2 })).unreadable).toEqual([])
    expect(remeasureStakes(older, gatePolicySchema.parse({ breadthThreshold: 1 })).unreadable).toEqual([
      "broad-change",
    ])
  })

  it("names all seven fixed rules when the record predates the codes", () => {
    const remeasured = remeasureStakes(without(removal, "stakeFactorCodes"), defaultGatePolicy)

    expect(remeasured.unreadable).toEqual(FIXED_STAKE_FACTOR_CODES)
    expect(remeasured.factors.every((factor) => factor.source === "remeasured")).toBe(true)
  })

  it("reports every rule it could not read, not only the first", () => {
    const older = without(removal, "removedPrimitiveTypes", "stakeFactorCodes")

    expect(remeasureStakes(older, protects).unreadable).toEqual([
      "protected-type-removed",
      ...FIXED_STAKE_FACTOR_CODES,
    ])
  })
})
