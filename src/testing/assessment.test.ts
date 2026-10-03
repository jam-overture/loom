import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { defaultGatePolicy } from "../runtime/policy.js"
import { assessChange, type ChangeAssessment } from "../runtime/assessment.js"
import { highestStake } from "../runtime/stake-level.js"
import { assessmentSummarySchema, recordOf } from "../telemetry/event.js"
import type { TreeDelta, TreeOperation } from "../tree/delta.js"

import { buildAssessment, buildProposal, FIXED_INSTANT, NOTHING_MEASURED } from "./doubles.js"
import { sampleTree } from "./fixtures.js"

/**
 * What a published double owes the thing it stands in for.
 *
 * `buildAssessment` is not `assessChange` and cannot be: reaching a particular
 * Gate rule through the real one means crafting a delta that raises exactly
 * that rule against a real tree, which is the right test for the Gate and an
 * absurd amount of apparatus for a screen that needs a critical change to draw.
 * So it assembles the record directly, and the price of that is this file —
 * every claim it makes about the record is checked against a record the runtime
 * actually produced, in the same run, rather than against a second reading of
 * the same source.
 */

const ids = sequentialIdFactory("ba")

/** The real thing, judged by the real Gate over the published fixture. */
const measured = (operations: readonly TreeOperation[]): ChangeAssessment => {
  const { tree } = sampleTree()

  const delta: TreeDelta = {
    deltaId: ids.deltaId(),
    treeId: tree.treeId,
    baseRevision: tree.revision,
    operations: [...operations],
  }

  const assessed = assessChange(
    tree,
    buildProposal(ids, { intentId: ids.intentId(), delta }),
    defaultGatePolicy,
    ids.deltaId()
  )
  if (!assessed.ok) throw new Error(assessed.error.code)

  return assessed.value
}

const built = (draft: Omit<Parameters<typeof buildAssessment>[1], "proposal">): ChangeAssessment => {
  const { tree } = sampleTree()

  return buildAssessment(ids, {
    proposal: buildProposal(ids, {
      intentId: ids.intentId(),
      delta: { deltaId: ids.deltaId(), treeId: tree.treeId, baseRevision: tree.revision, operations: [] },
    }),
    ...draft,
  })
}

/** A removal, which is the one operation that makes all three invariants interesting. */
const removal = (): ChangeAssessment => {
  const { ids: nodes } = sampleTree()

  return measured([{ op: "remove", nodeId: nodes.body }])
}

const keysOf = (value: object): readonly string[] => Object.keys(value).sort()

describe("buildAssessment", () => {
  /**
   * The assertion the three drifted fixtures needed and could not have written.
   *
   * A hand-built record is right on the day it is written and silently narrower
   * every day after. This compares the double against a record `assessChange`
   * produced moments earlier, so the day a field is added to any of the four
   * halves, this fails in the lane that added it.
   */
  it("carries every field a measured assessment carries, and no others", () => {
    const real = removal()
    const double = built({ analysis: { removedNodeCount: 1 } })

    expect(keysOf(double)).toEqual(keysOf(real))
    expect(keysOf(double.analysis)).toEqual(keysOf(real.analysis))
    expect(keysOf(double.stakes)).toEqual(keysOf(real.stakes))
    expect(keysOf(double.reversibility)).toEqual(keysOf(real.reversibility))
  })

  it("measures nothing it was not asked to measure", () => {
    expect(built({}).analysis).toEqual(NOTHING_MEASURED)
  })

  it("keeps the facts it was asked for and defaults the rest", () => {
    const { analysis } = built({ analysis: { operationCount: 2, configuredPropKeys: ["href"] } })

    expect(analysis.operationCount).toBe(2)
    expect(analysis.configuredPropKeys).toEqual(["href"])
    expect(analysis.insertedNodeCount).toBe(0)
    expect(analysis.unreadBindings).toEqual([])
  })

  /**
   * The first of the three invariants, held at both ends: the double derives
   * the level the way `assessStakes` does, and the measured record is asserted
   * to agree — so a Gate that stopped taking the highest would fail here as
   * well as in its own suite.
   */
  it("takes the level from the highest factor, as the Gate does", () => {
    const double = built({
      factors: [
        { code: "large-removal", level: "medium", detail: "4 nodes" },
        { code: "invalid-props", level: "critical", detail: "tone" },
      ],
    })

    expect(double.stakes.level).toBe("critical")

    const real = removal()
    expect(real.stakes.level).toBe(highestStake(real.stakes.factors.map((factor) => factor.level)))
  })

  it("is low with no factors, which is what nothing raised means", () => {
    expect(built({}).stakes).toEqual({ level: "low", factors: [] })
  })

  it("is reversible exactly when nothing says otherwise", () => {
    expect(built({}).reversibility.reversible).toBe(true)
    expect(
      built({
        irreversibilityReasons: [
          { code: "retention-budget-exceeded", retainedNodeCount: 40, budget: 20 },
        ],
      }).reversibility.reversible
    ).toBe(false)

    const real = removal()
    expect(real.reversibility.reversible).toBe(real.reversibility.reasons.length === 0)
  })

  it("retains what the removal destroyed", () => {
    expect(built({ analysis: { removedNodeCount: 3 } }).reversibility.retainedNodeCount).toBe(3)

    const real = removal()
    expect(real.reversibility.retainedNodeCount).toBe(real.analysis.removedNodeCount)
  })

  /**
   * An inverse applies to the tree the change left behind, not the one it found,
   * and a fixture whose inverse is written against the wrong revision is a
   * fixture no store would accept.
   */
  it("writes its inverse against the revision after the change", () => {
    const double = built({})

    expect(double.reversibility.inverse.baseRevision).toBe(double.proposal.delta.baseRevision + 1)
    expect(double.reversibility.inverse.treeId).toBe(double.proposal.delta.treeId)

    const real = removal()
    expect(real.reversibility.inverse.baseRevision).toBe(real.proposal.delta.baseRevision + 1)
  })

  /**
   * Why one double covers two shapes. A surface that needs the *record* rather
   * than the assessment gets one by narrating a real envelope, so no fixture
   * anywhere has to spell an `AssessmentSummary` out either — and the schema is
   * what says the result is one.
   */
  it("narrates into a summary the journal's own schema accepts", () => {
    const assessment = built({
      analysis: { operationCount: 1, removedNodeCount: 1 },
      factors: [{ code: "large-removal", level: "medium", detail: "1 node" }],
    })

    const record = recordOf({
      treeId: assessment.proposal.delta.treeId,
      occurredAt: FIXED_INSTANT,
      event: { type: "change-assessed", assessment },
    })

    expect(record.event.type).toBe("change-assessed")
    if (record.event.type !== "change-assessed") throw new Error("narrated the wrong event")

    const summary = assessmentSummarySchema.parse(record.event.assessment)
    expect(summary.stakes).toBe("medium")
    expect(summary.stakeFactorCodes).toEqual(["large-removal"])
    expect(summary.retainedNodeCount).toBe(1)
    expect(summary.irreversibilityReasons).toEqual([])
  })
})
