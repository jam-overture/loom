import { describe, expect, it } from "vitest"

import { sequentialIdFactory, treeIdSchema, type TreeId } from "../ids.js"
import { sampleTree } from "../testing/fixtures.js"

import { applyDelta, applyOperation } from "./apply.js"
import { buildElement, buildText } from "./builders.js"
import type { TreeDelta, TreeOperation } from "./delta.js"
import { childrenOf } from "./node.js"
import { findNode } from "./navigation.js"

const spare = sequentialIdFactory("spare")

const deltaOf = (treeId: TreeId, baseRevision: number, operations: TreeOperation[]): TreeDelta => ({
  deltaId: spare.deltaId(),
  treeId,
  baseRevision,
  operations,
})

describe("insert", () => {
  it("adds a subtree at the requested position", () => {
    const { tree, ids } = sampleTree()
    const banner = buildElement(spare, {
      type: "loom.banner",
      children: [buildText(spare, "Sale")],
    })

    const result = applyOperation(tree.root, {
      op: "insert",
      parentId: ids.page,
      index: 0,
      node: banner,
    })
    if (!result.ok) throw new Error(result.error.code)

    expect(childrenOf(result.value).map((child) => child.id)).toEqual([
      banner.id,
      ids.header,
      ids.main,
      ids.footer,
    ])
  })

  it("rejects a node whose id already exists in the tree", () => {
    const { tree, ids } = sampleTree()
    const existing = findNode(tree.root, ids.footer)
    if (!existing) throw new Error("fixture missing footer")

    const result = applyOperation(tree.root, {
      op: "insert",
      parentId: ids.main,
      index: 0,
      node: existing,
    })

    expect(!result.ok && result.error.code).toBe("duplicate-node-id")
  })

  it("rejects a subtree that repeats an id internally", () => {
    const { tree, ids } = sampleTree()
    const twin = buildText(spare, "twin")
    const banner = buildElement(spare, { type: "loom.banner", children: [twin, twin] })

    const result = applyOperation(tree.root, {
      op: "insert",
      parentId: ids.page,
      index: 0,
      node: banner,
    })

    expect(!result.ok && result.error.code).toBe("duplicate-node-id")
  })
})

describe("remove", () => {
  it("drops the node and everything under it", () => {
    const { tree, ids } = sampleTree()
    const result = applyOperation(tree.root, { op: "remove", nodeId: ids.card })
    if (!result.ok) throw new Error(result.error.code)

    expect(findNode(result.value, ids.card)).toBeNull()
    expect(findNode(result.value, ids.body)).toBeNull()
    expect(findNode(result.value, ids.main)?.id).toBe(ids.main)
  })

  it("refuses to remove the root", () => {
    const { tree, ids } = sampleTree()
    const result = applyOperation(tree.root, { op: "remove", nodeId: ids.page })

    expect(!result.ok && result.error.code).toBe("root-not-detachable")
  })
})

describe("move", () => {
  it("relocates a node into a different parent", () => {
    const { tree, ids } = sampleTree()
    const result = applyOperation(tree.root, {
      op: "move",
      nodeId: ids.footer,
      parentId: ids.main,
      index: 0,
    })
    if (!result.ok) throw new Error(result.error.code)

    const main = findNode(result.value, ids.main)
    expect(main && childrenOf(main).map((child) => child.id)).toEqual([ids.footer, ids.card])
    expect(childrenOf(result.value).map((child) => child.id)).toEqual([ids.header, ids.main])
  })

  it("keeps the node's id and its subtree", () => {
    const { tree, ids } = sampleTree()
    const result = applyOperation(tree.root, {
      op: "move",
      nodeId: ids.card,
      parentId: ids.header,
      index: 0,
    })
    if (!result.ok) throw new Error(result.error.code)

    expect(findNode(result.value, ids.card)?.id).toBe(ids.card)
    expect(findNode(result.value, ids.body)?.id).toBe(ids.body)
  })

  it("interprets the index against the post-detach child list", () => {
    const { tree, ids } = sampleTree()
    const result = applyOperation(tree.root, {
      op: "move",
      nodeId: ids.header,
      parentId: ids.page,
      index: 2,
    })
    if (!result.ok) throw new Error(result.error.code)

    expect(childrenOf(result.value).map((child) => child.id)).toEqual([
      ids.main,
      ids.footer,
      ids.header,
    ])
  })

  it("rejects a move into itself", () => {
    const { tree, ids } = sampleTree()
    const result = applyOperation(tree.root, {
      op: "move",
      nodeId: ids.card,
      parentId: ids.card,
      index: 0,
    })

    expect(!result.ok && result.error.code).toBe("move-into-self")
  })

  it("rejects a move into its own descendant", () => {
    const { tree, ids } = sampleTree()
    const result = applyOperation(tree.root, {
      op: "move",
      nodeId: ids.main,
      parentId: ids.card,
      index: 0,
    })

    expect(!result.ok && result.error.code).toBe("move-into-descendant")
  })

  it("refuses to move the root", () => {
    const { tree, ids } = sampleTree()
    const result = applyOperation(tree.root, {
      op: "move",
      nodeId: ids.page,
      parentId: ids.main,
      index: 0,
    })

    expect(!result.ok && result.error.code).toBe("root-not-detachable")
  })
})

describe("configure", () => {
  it("patches props on an element", () => {
    const { tree, ids } = sampleTree()
    const result = applyOperation(tree.root, {
      op: "configure",
      nodeId: ids.card,
      set: { variant: "filled" },
      unset: ["elevation"],
    })
    if (!result.ok) throw new Error(result.error.code)

    const card = findNode(result.value, ids.card)
    expect(card?.kind === "element" && card.props).toEqual({ variant: "filled" })
  })

  it("configures the root in place", () => {
    const { tree, ids } = sampleTree()
    const result = applyOperation(tree.root, {
      op: "configure",
      nodeId: ids.page,
      set: { title: "Landing" },
      unset: [],
    })

    expect(result.ok && result.value.kind === "element" && result.value.props).toEqual({
      title: "Landing",
    })
  })

  it("reports an absent target", () => {
    const { tree } = sampleTree()
    const result = applyOperation(tree.root, {
      op: "configure",
      nodeId: spare.nodeId(),
      set: {},
      unset: [],
    })

    expect(!result.ok && result.error.code).toBe("node-not-found")
  })
})

describe("applyDelta", () => {
  it("applies operations in order and bumps the revision", () => {
    const { tree, ids } = sampleTree()
    const banner = buildElement(spare, { type: "loom.banner" })

    const result = applyDelta(
      tree,
      deltaOf(tree.treeId, 0, [
        { op: "insert", parentId: ids.page, index: 0, node: banner },
        { op: "move", nodeId: banner.id, parentId: ids.main, index: 1 },
        { op: "configure", nodeId: banner.id, set: { tone: "loud" }, unset: [] },
      ])
    )
    if (!result.ok) throw new Error(result.error.code)

    expect(result.value.revision).toBe(1)

    const main = findNode(result.value.root, ids.main)
    expect(main && childrenOf(main).map((child) => child.id)).toEqual([ids.card, banner.id])

    const moved = findNode(result.value.root, banner.id)
    expect(moved?.kind === "element" && moved.props).toEqual({ tone: "loud" })
  })

  it("is atomic — a failing operation leaves the tree untouched", () => {
    const { tree, ids } = sampleTree()
    const banner = buildElement(spare, { type: "loom.banner" })

    const result = applyDelta(
      tree,
      deltaOf(tree.treeId, 0, [
        { op: "insert", parentId: ids.page, index: 0, node: banner },
        { op: "remove", nodeId: spare.nodeId() },
      ])
    )

    expect(!result.ok && result.error.code).toBe("node-not-found")
    expect(tree.revision).toBe(0)
    expect(childrenOf(tree.root).map((child) => child.id)).toEqual([ids.header, ids.main, ids.footer])
  })

  it("rejects a delta authored against a different revision", () => {
    const { tree, ids } = sampleTree()
    const result = applyDelta(tree, deltaOf(tree.treeId, 3, [{ op: "remove", nodeId: ids.footer }]))

    expect(!result.ok && result.error.code).toBe("revision-mismatch")
  })

  it("rejects a delta authored against a different tree", () => {
    const { tree, ids } = sampleTree()
    const otherTreeId = treeIdSchema.parse("t_other")
    const result = applyDelta(tree, deltaOf(otherTreeId, 0, [{ op: "remove", nodeId: ids.footer }]))

    expect(!result.ok && result.error.code).toBe("tree-mismatch")
  })

  it("supports chaining deltas across revisions", () => {
    const { tree, ids } = sampleTree()

    const first = applyDelta(tree, deltaOf(tree.treeId, 0, [{ op: "remove", nodeId: ids.footer }]))
    if (!first.ok) throw new Error(first.error.code)

    const second = applyDelta(
      first.value,
      deltaOf(tree.treeId, 1, [{ op: "remove", nodeId: ids.header }])
    )
    if (!second.ok) throw new Error(second.error.code)

    expect(second.value.revision).toBe(2)
    expect(childrenOf(second.value.root).map((child) => child.id)).toEqual([ids.main])
  })
})

/**
 * Uniqueness over the live tree is not enough to keep an id naming one node
 * (0038). A `remove` takes an id out of the tree, and everything downstream of
 * a delta then joins on an address two different nodes have worn.
 */
describe("a retired id inside one delta", () => {
  it("refuses a different node arriving at an id the same delta removed", () => {
    const { tree, ids } = sampleTree()
    const impostor = { ...buildText(spare, "Sale"), id: ids.footer }

    const result = applyDelta(
      tree,
      deltaOf(tree.treeId, 0, [
        { op: "remove", nodeId: ids.footer },
        { op: "insert", parentId: ids.page, index: 0, node: impostor },
      ])
    )

    expect(!result.ok && result.error.code).toBe("recycled-node-id")
    expect(!result.ok && result.error.code === "recycled-node-id" && result.error.nodeId).toBe(
      ids.footer
    )
  })

  /** Undo re-inserts the exact subtree it removed, and must stay expressible. */
  it("accepts the node that left coming back unchanged", () => {
    const { tree, ids } = sampleTree()
    const footer = findNode(tree.root, ids.footer)
    if (!footer) throw new Error("fixture missing footer")

    const result = applyDelta(
      tree,
      deltaOf(tree.treeId, 0, [
        { op: "remove", nodeId: ids.footer },
        { op: "insert", parentId: ids.page, index: 0, node: footer },
      ])
    )

    expect(result.ok && childrenOf(result.value.root).map((child) => child.id)).toEqual([
      ids.footer,
      ids.header,
      ids.main,
    ])
  })

  /** A `remove` names one id and retires every id it takes with it. */
  it("refuses a fresh node at the id of a removed subtree's child", () => {
    const { tree, ids } = sampleTree()
    const impostor = { ...buildText(spare, "Different"), id: ids.body }

    const result = applyDelta(
      tree,
      deltaOf(tree.treeId, 0, [
        { op: "remove", nodeId: ids.card },
        { op: "insert", parentId: ids.page, index: 0, node: impostor },
      ])
    )

    expect(!result.ok && result.error.code).toBe("recycled-node-id")
  })

  /** A move never takes an id out of the tree, so it retires nothing. */
  it("does not treat a moved node's id as retired", () => {
    const { tree, ids } = sampleTree()
    const banner = buildElement(spare, { type: "loom.banner" })

    const result = applyDelta(
      tree,
      deltaOf(tree.treeId, 0, [
        { op: "move", nodeId: ids.footer, parentId: ids.main, index: 0 },
        { op: "insert", parentId: ids.page, index: 0, node: banner },
      ])
    )

    expect(result.ok).toBe(true)
  })

  /**
   * The deliberate limit. Enforcing this across a log would mean the tree
   * carrying the ids it has retired, which is a schema change nobody has agreed
   * to; `auditSnapshot` reports it instead (0038).
   */
  it("accepts a recycled id when the removal was in an earlier delta", () => {
    const { tree, ids } = sampleTree()
    const removed = applyDelta(
      tree,
      deltaOf(tree.treeId, 0, [{ op: "remove", nodeId: ids.footer }])
    )
    if (!removed.ok) throw new Error(removed.error.code)

    const impostor = { ...buildText(spare, "Sale"), id: ids.footer }
    const result = applyDelta(
      removed.value,
      deltaOf(tree.treeId, 1, [{ op: "insert", parentId: ids.page, index: 0, node: impostor }])
    )

    expect(result.ok).toBe(true)
  })

  /**
   * Inverting a delta walks operations one at a time against the tree each one
   * observed, so an operation applied on its own has retired nothing. Undo must
   * never be stricter than the change it undoes.
   */
  it("does not fire for an operation applied outside a delta", () => {
    const { tree, ids } = sampleTree()
    const removed = applyOperation(tree.root, { op: "remove", nodeId: ids.footer })
    if (!removed.ok) throw new Error(removed.error.code)

    const impostor = { ...buildText(spare, "Sale"), id: ids.footer }
    const result = applyOperation(removed.value, {
      op: "insert",
      parentId: ids.page,
      index: 0,
      node: impostor,
    })

    expect(result.ok).toBe(true)
  })
})
