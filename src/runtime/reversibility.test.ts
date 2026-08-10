import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import { sampleTree, type SampleTree } from "../testing/fixtures.js"
import { applyDelta } from "../tree/apply.js"
import type { TreeDelta, TreeOperation } from "../tree/delta.js"

import { analyzeDelta } from "./analysis.js"
import { defaultGatePolicy, gatePolicySchema, type GatePolicy } from "./policy.js"
import { assessReversibility } from "./reversibility.js"

const spare = sequentialIdFactory("rev")

const assess = (
  build: (ids: SampleTree["ids"]) => TreeOperation[],
  policy: GatePolicy = defaultGatePolicy
) => {
  const { tree, ids } = sampleTree()
  const delta: TreeDelta = {
    deltaId: spare.deltaId(),
    treeId: tree.treeId,
    baseRevision: tree.revision,
    operations: build(ids),
  }

  const analysis = analyzeDelta(tree, delta)
  if (!analysis.ok) throw new Error(analysis.error.code)

  const result = assessReversibility(tree, delta, analysis.value, policy, spare.deltaId())
  if (!result.ok) throw new Error(result.error.code)

  return { reversibility: result.value, tree, delta }
}

describe("assessReversibility", () => {
  it("produces an inverse that actually restores the tree", () => {
    const { reversibility, tree, delta } = assess((ids) => [{ op: "remove", nodeId: ids.card }])

    expect(reversibility.reversible).toBe(true)

    const applied = applyDelta(tree, delta)
    if (!applied.ok) throw new Error(applied.error.code)

    const undone = applyDelta(applied.value, reversibility.inverse)
    expect(undone.ok && undone.value.root).toEqual(tree.root)
  })

  it("reports how much content the inverse has to retain", () => {
    const { reversibility } = assess((ids) => [{ op: "remove", nodeId: ids.main }])

    expect(reversibility.retainedNodeCount).toBe(3)
  })

  it("retains nothing for a change that destroys nothing", () => {
    const { reversibility } = assess((ids) => [
      { op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: [] },
    ])

    expect(reversibility.retainedNodeCount).toBe(0)
    expect(reversibility.reasons).toEqual([])
  })
})

describe("irreversibility", () => {
  it("marks a change touching an out-of-tree-effect primitive as irreversible", () => {
    const policy = gatePolicySchema.parse({ outOfTreeEffectTypes: ["loom.card"] })
    const { reversibility } = assess(
      (ids) => [{ op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: [] }],
      policy
    )

    expect(reversibility.reversible).toBe(false)
    expect(reversibility.reasons[0]).toEqual({
      code: "out-of-tree-effect",
      primitiveTypes: [primitiveTypeSchema.parse("loom.card")],
    })
  })

  it("still hands over the tree-level inverse when the effect is irreversible", () => {
    const policy = gatePolicySchema.parse({ outOfTreeEffectTypes: ["loom.card"] })
    const { reversibility } = assess((ids) => [{ op: "remove", nodeId: ids.card }], policy)

    expect(reversibility.reversible).toBe(false)
    expect(reversibility.inverse.operations).toHaveLength(1)
  })

  it("reads a relocated out-of-tree primitive the same way whichever node the move named", () => {
    const policy = gatePolicySchema.parse({ outOfTreeEffectTypes: ["loom.card"] })
    const byCard = assess(
      (ids) => [{ op: "move", nodeId: ids.card, parentId: ids.header, index: 0 }],
      policy
    )
    const bySlot = assess(
      (ids) => [{ op: "move", nodeId: ids.main, parentId: ids.header, index: 0 }],
      policy
    )

    expect(byCard.reversibility.reversible).toBe(false)
    expect(bySlot.reversibility.reversible).toBe(false)
    expect(bySlot.reversibility.reasons[0]).toEqual({
      code: "out-of-tree-effect",
      primitiveTypes: [primitiveTypeSchema.parse("loom.card")],
    })
  })

  it("names an out-of-tree type once when it is both touched and relocated", () => {
    const policy = gatePolicySchema.parse({ outOfTreeEffectTypes: ["loom.card"] })
    const { reversibility } = assess(
      (ids) => [
        { op: "move", nodeId: ids.card, parentId: ids.header, index: 0 },
        { op: "remove", nodeId: ids.card },
      ],
      policy
    )

    expect(reversibility.reasons[0]).toEqual({
      code: "out-of-tree-effect",
      primitiveTypes: [primitiveTypeSchema.parse("loom.card")],
    })
  })

  it("marks a removal beyond the retention budget as irreversible", () => {
    const policy = gatePolicySchema.parse({ inverseRetentionBudget: 2 })
    const { reversibility } = assess((ids) => [{ op: "remove", nodeId: ids.main }], policy)

    expect(reversibility.reversible).toBe(false)
    expect(reversibility.reasons[0]).toEqual({
      code: "retention-budget-exceeded",
      retainedNodeCount: 3,
      budget: 2,
    })
  })

  it("stays reversible when the removal fits the budget exactly", () => {
    const policy = gatePolicySchema.parse({ inverseRetentionBudget: 3 })
    const { reversibility } = assess((ids) => [{ op: "remove", nodeId: ids.main }], policy)

    expect(reversibility.reversible).toBe(true)
  })

  it("reports every reason, not just the first", () => {
    const policy = gatePolicySchema.parse({
      outOfTreeEffectTypes: ["loom.card"],
      inverseRetentionBudget: 1,
    })
    const { reversibility } = assess((ids) => [{ op: "remove", nodeId: ids.main }], policy)

    expect(reversibility.reasons.map((reason) => reason.code)).toEqual([
      "out-of-tree-effect",
      "retention-budget-exceeded",
    ])
  })
})
