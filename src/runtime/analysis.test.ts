import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type TreeId } from "../ids.js"
import { sampleTree, type SampleTree } from "../testing/fixtures.js"
import { buildElement, buildText } from "../tree/builders.js"
import type { TreeDelta, TreeOperation } from "../tree/delta.js"

import { analyzeDelta } from "./analysis.js"

const spare = sequentialIdFactory("an")

const deltaOf = (treeId: TreeId, operations: TreeOperation[]): TreeDelta => ({
  deltaId: spare.deltaId(),
  treeId,
  baseRevision: 0,
  operations,
})

/** Builds the operations from the fixture's ids, then analyses them. */
const analyze = (build: (ids: SampleTree["ids"]) => TreeOperation[]) => {
  const { tree, ids } = sampleTree()
  const result = analyzeDelta(tree, deltaOf(tree.treeId, build(ids)))
  if (!result.ok) throw new Error(result.error.code)

  return { analysis: result.value, ids }
}

describe("analyzeDelta counts", () => {
  it("counts every node in an inserted subtree, not just its root", () => {
    const banner = buildElement(spare, {
      type: "loom.banner",
      children: [buildText(spare, "Sale"), buildText(spare, "Ends Friday")],
    })

    const { analysis } = analyze((ids) => [
      { op: "insert", parentId: ids.page, index: 0, node: banner },
    ])

    expect(analysis.insertedNodeCount).toBe(3)
    expect(analysis.operationCount).toBe(1)
  })

  it("counts every node destroyed by a removal", () => {
    const { analysis, ids } = analyze((fixture) => [{ op: "remove", nodeId: fixture.main }])

    expect(analysis.removedNodeCount).toBe(3)
    expect(analysis.affectedNodeIds).toContain(ids.body)
  })

  it("counts a move as one node, not the subtree riding along", () => {
    const { analysis, ids } = analyze((fixture) => [
      { op: "move", nodeId: fixture.card, parentId: fixture.header, index: 0 },
    ])

    expect(analysis.movedNodeCount).toBe(1)
    expect(analysis.affectedNodeIds).toEqual([ids.card])
  })

  it("records the prop keys a configure touches, set and unset alike", () => {
    const { analysis } = analyze((ids) => [
      { op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: ["elevation"] },
    ])

    expect(analysis.configuredNodeCount).toBe(1)
    expect([...analysis.configuredPropKeys].sort()).toEqual(["elevation", "variant"])
  })
})

describe("analyzeDelta primitive types", () => {
  it("collects element types from a removed subtree", () => {
    const { analysis } = analyze((ids) => [{ op: "remove", nodeId: ids.main }])

    expect(analysis.touchedPrimitiveTypes).toContain("loom.card")
  })

  it("separates types destroyed from types merely touched", () => {
    const { analysis } = analyze((ids) => [
      { op: "remove", nodeId: ids.card },
      { op: "configure", nodeId: ids.footer, set: { sticky: true }, unset: [] },
    ])

    expect(analysis.removedPrimitiveTypes).toEqual(["loom.card"])
    expect([...analysis.touchedPrimitiveTypes].sort()).toEqual(["loom.card", "loom.footer"])
  })

  it("ignores text and slot nodes, which have no primitive type", () => {
    const { analysis } = analyze((ids) => [
      { op: "configure", nodeId: ids.headline, set: { value: "Hi" }, unset: [] },
    ])

    expect(analysis.touchedPrimitiveTypes).toEqual([])
  })
})

describe("analyzeDelta depth", () => {
  it("reports the root as depth zero", () => {
    const { analysis } = analyze((ids) => [
      { op: "configure", nodeId: ids.page, set: { title: "Home" }, unset: [] },
    ])

    expect(analysis.shallowestAffectedDepth).toBe(0)
  })

  it("measures an insert at the depth of the new child", () => {
    const banner = buildElement(spare, { type: "loom.banner" })
    const { analysis } = analyze((ids) => [
      { op: "insert", parentId: ids.main, index: 0, node: banner },
    ])

    expect(analysis.shallowestAffectedDepth).toBe(2)
  })

  it("takes the shallowest position across all operations", () => {
    const { analysis } = analyze((ids) => [
      { op: "configure", nodeId: ids.body, set: { value: "Deep" }, unset: [] },
      { op: "remove", nodeId: ids.footer },
    ])

    expect(analysis.shallowestAffectedDepth).toBe(1)
  })

  it("takes the shallower of a move's origin and destination", () => {
    const { analysis } = analyze((ids) => [
      { op: "move", nodeId: ids.body, parentId: ids.page, index: 0 },
    ])

    expect(analysis.shallowestAffectedDepth).toBe(1)
  })
})

describe("analyzeDelta sequencing", () => {
  it("measures an operation against the tree earlier operations produced", () => {
    const banner = buildElement(spare, { type: "loom.banner" })
    const { analysis } = analyze((ids) => [
      { op: "insert", parentId: ids.main, index: 0, node: banner },
      { op: "configure", nodeId: banner.id, set: { tone: "loud" }, unset: [] },
    ])

    expect(analysis.configuredNodeCount).toBe(1)
    expect(analysis.touchedPrimitiveTypes).toContain("loom.banner")
  })

  it("fails when the delta does not apply", () => {
    const { tree } = sampleTree()
    const result = analyzeDelta(
      tree,
      deltaOf(tree.treeId, [{ op: "remove", nodeId: spare.nodeId() }])
    )

    expect(!result.ok && result.error.code).toBe("node-not-found")
  })
})
