import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type TreeId } from "../ids.js"
import { sampleTree } from "../testing/fixtures.js"

import { applyDelta } from "./apply.js"
import { buildElement, buildText } from "./builders.js"
import type { TreeDelta, TreeOperation } from "./delta.js"
import { invertDelta, invertOperations } from "./inverse.js"
import { findNode } from "./navigation.js"
import type { LoomTree } from "./tree.js"

const spare = sequentialIdFactory("inv")

const deltaOf = (treeId: TreeId, baseRevision: number, operations: TreeOperation[]): TreeDelta => ({
  deltaId: spare.deltaId(),
  treeId,
  baseRevision,
  operations,
})

/** Applies a delta, then its inverse, and returns the tree that comes back. */
const roundTrip = (tree: LoomTree, operations: TreeOperation[]): LoomTree => {
  const delta = deltaOf(tree.treeId, tree.revision, operations)

  const inverse = invertDelta(tree, delta, spare.deltaId())
  if (!inverse.ok) throw new Error(`invert: ${inverse.error.code}`)

  const applied = applyDelta(tree, delta)
  if (!applied.ok) throw new Error(`apply: ${applied.error.code}`)

  const undone = applyDelta(applied.value, inverse.value)
  if (!undone.ok) throw new Error(`undo: ${undone.error.code}`)

  return undone.value
}

describe("invertDelta round trips", () => {
  it("undoes an insert", () => {
    const { tree, ids } = sampleTree()
    const banner = buildElement(spare, { type: "loom.banner", children: [buildText(spare, "Sale")] })

    const undone = roundTrip(tree, [
      { op: "insert", parentId: ids.page, index: 1, node: banner },
    ])

    expect(undone.root).toEqual(tree.root)
  })

  it("undoes a removal, restoring the subtree at its original index", () => {
    const { tree, ids } = sampleTree()
    const undone = roundTrip(tree, [{ op: "remove", nodeId: ids.card }])

    expect(undone.root).toEqual(tree.root)
    expect(findNode(undone.root, ids.body)?.id).toBe(ids.body)
  })

  it("undoes a move between parents", () => {
    const { tree, ids } = sampleTree()
    const undone = roundTrip(tree, [
      { op: "move", nodeId: ids.footer, parentId: ids.main, index: 0 },
    ])

    expect(undone.root).toEqual(tree.root)
  })

  it("undoes a reorder within one parent", () => {
    const { tree, ids } = sampleTree()
    const undone = roundTrip(tree, [
      { op: "move", nodeId: ids.header, parentId: ids.page, index: 2 },
    ])

    expect(undone.root).toEqual(tree.root)
  })

  it("undoes a configure that both sets and unsets", () => {
    const { tree, ids } = sampleTree()
    const undone = roundTrip(tree, [
      { op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: ["elevation"] },
    ])

    expect(undone.root).toEqual(tree.root)
  })

  it("undoes a configure that introduces a brand-new key", () => {
    const { tree, ids } = sampleTree()
    const undone = roundTrip(tree, [
      { op: "configure", nodeId: ids.card, set: { tone: "loud" }, unset: [] },
    ])

    expect(undone.root).toEqual(tree.root)
  })

  it("undoes text and slot configuration", () => {
    const { tree, ids } = sampleTree()
    const undone = roundTrip(tree, [
      { op: "configure", nodeId: ids.body, set: { value: "Rewritten" }, unset: [] },
      { op: "configure", nodeId: ids.main, set: { name: "secondary" }, unset: [] },
    ])

    expect(undone.root).toEqual(tree.root)
  })

  it("undoes a multi-operation delta in reverse order", () => {
    const { tree, ids } = sampleTree()
    const banner = buildElement(spare, { type: "loom.banner" })

    const undone = roundTrip(tree, [
      { op: "insert", parentId: ids.page, index: 0, node: banner },
      { op: "move", nodeId: ids.footer, parentId: ids.main, index: 0 },
      { op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: ["elevation"] },
      { op: "remove", nodeId: ids.header },
    ])

    expect(undone.root).toEqual(tree.root)
  })

  it("undoes operations that depend on earlier ones in the same delta", () => {
    const { tree, ids } = sampleTree()
    const banner = buildElement(spare, { type: "loom.banner" })

    const undone = roundTrip(tree, [
      { op: "insert", parentId: ids.page, index: 0, node: banner },
      { op: "configure", nodeId: banner.id, set: { tone: "loud" }, unset: [] },
      { op: "move", nodeId: banner.id, parentId: ids.main, index: 0 },
    ])

    expect(undone.root).toEqual(tree.root)
  })
})

describe("invertDelta revisions", () => {
  it("targets the revision the original delta produces", () => {
    const { tree, ids } = sampleTree()
    const delta = deltaOf(tree.treeId, tree.revision, [{ op: "remove", nodeId: ids.footer }])

    const inverse = invertDelta(tree, delta, spare.deltaId())

    expect(inverse.ok && inverse.value.baseRevision).toBe(tree.revision + 1)
    expect(inverse.ok && inverse.value.treeId).toBe(tree.treeId)
  })

  it("leaves the tree at the original revision after a full round trip", () => {
    const { tree, ids } = sampleTree()
    const undone = roundTrip(tree, [{ op: "remove", nodeId: ids.footer }])

    expect(undone.revision).toBe(tree.revision + 2)
  })
})

describe("invertDelta failures", () => {
  it("fails when an operation could not be applied, proving applicability", () => {
    const { tree } = sampleTree()
    const delta = deltaOf(tree.treeId, tree.revision, [{ op: "remove", nodeId: spare.nodeId() }])

    const inverse = invertDelta(tree, delta, spare.deltaId())
    expect(!inverse.ok && inverse.error.code).toBe("node-not-found")
  })

  it("refuses to invert a move of the root", () => {
    const { tree, ids } = sampleTree()
    const delta = deltaOf(tree.treeId, tree.revision, [
      { op: "move", nodeId: ids.page, parentId: ids.main, index: 0 },
    ])

    const inverse = invertDelta(tree, delta, spare.deltaId())
    expect(!inverse.ok && inverse.error.code).toBe("root-not-detachable")
  })

  it("fails to invert a move of a node that is not there", () => {
    const { tree, ids } = sampleTree()
    const delta = deltaOf(tree.treeId, tree.revision, [
      { op: "move", nodeId: spare.nodeId(), parentId: ids.main, index: 0 },
    ])

    const inverse = invertDelta(tree, delta, spare.deltaId())
    expect(!inverse.ok && inverse.error.code).toBe("node-not-found")
  })

  it("fails to invert a configure of a node that is not there", () => {
    const { tree } = sampleTree()
    const delta = deltaOf(tree.treeId, tree.revision, [
      { op: "configure", nodeId: spare.nodeId(), set: { a: 1 }, unset: [] },
    ])

    const inverse = invertDelta(tree, delta, spare.deltaId())
    expect(!inverse.ok && inverse.error.code).toBe("node-not-found")
  })

  it("refuses to invert a removal of the root", () => {
    const { tree, ids } = sampleTree()
    const delta = deltaOf(tree.treeId, tree.revision, [{ op: "remove", nodeId: ids.page }])

    const inverse = invertDelta(tree, delta, spare.deltaId())
    expect(!inverse.ok && inverse.error.code).toBe("root-not-detachable")
  })
})

describe("invertOperations", () => {
  /**
   * The two share a walk, and the wrapper is what decides where the undo lands.
   * Reverting a revision from the log needs the operations without that
   * decision, so the split has to leave the operations identical.
   */
  it("returns exactly the operations invertDelta wraps", () => {
    const { tree, ids } = sampleTree()
    const delta = deltaOf(tree.treeId, tree.revision, [
      { op: "remove", nodeId: ids.card },
      { op: "configure", nodeId: ids.page, set: { title: "Away" }, unset: [] },
    ])

    const operations = invertOperations(tree, delta)
    const inverse = invertDelta(tree, delta, spare.deltaId())

    expect(operations.ok && inverse.ok && operations.value).toEqual(
      inverse.ok ? inverse.value.operations : undefined
    )
  })

  it("fails for the same reason the wrapper does", () => {
    const { tree } = sampleTree()
    const delta = deltaOf(tree.treeId, tree.revision, [
      { op: "configure", nodeId: spare.nodeId(), set: { a: 1 }, unset: [] },
    ])

    const operations = invertOperations(tree, delta)
    expect(!operations.ok && operations.error.code).toBe("node-not-found")
  })
})
