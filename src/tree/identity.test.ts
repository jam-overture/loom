import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type NodeId } from "../ids.js"
import { sampleTree } from "../testing/fixtures.js"

import { applyDelta } from "./apply.js"
import { buildElement, buildText } from "./builders.js"
import type { TreeDelta, TreeOperation } from "./delta.js"
import {
  idReturnsIn,
  nodeFingerprint,
  recycledIds,
  seedIdHistory,
  trackIds,
  type IdHistory,
} from "./identity.js"
import { findNode } from "./navigation.js"
import type { LoomNode } from "./node.js"
import type { LoomTree } from "./tree.js"

const spare = sequentialIdFactory("spare")

const deltaOf = (tree: LoomTree, operations: readonly TreeOperation[]): TreeDelta => ({
  deltaId: spare.deltaId(),
  treeId: tree.treeId,
  baseRevision: tree.revision,
  operations,
})

/**
 * Applies a delta and tracks the ids across it, which is exactly what a fold of
 * a log does — the pairing under test is "the two states either side of one
 * revision", not "a delta".
 */
const step = (
  history: IdHistory,
  tree: LoomTree,
  operations: readonly TreeOperation[]
): { readonly history: IdHistory; readonly tree: LoomTree } => {
  const applied = applyDelta(tree, deltaOf(tree, operations))
  if (!applied.ok) throw new Error(applied.error.code)

  return { history: trackIds(history, tree, applied.value), tree: applied.value }
}

const nodeIn = (tree: LoomTree, nodeId: NodeId): LoomNode => {
  const found = findNode(tree.root, nodeId)
  if (!found) throw new Error(`fixture is missing ${nodeId}`)

  return found
}

describe("nodeFingerprint", () => {
  it("is the same for a node and an untouched copy of it", () => {
    const { tree, ids } = sampleTree()
    const card = nodeIn(tree, ids.card)

    expect(nodeFingerprint({ ...card })).toBe(nodeFingerprint(card))
  })

  it("distinguishes two nodes that differ only in id", () => {
    const first = buildText(spare, "Sale")
    const second = { ...first, id: spare.nodeId() }

    expect(nodeFingerprint(second)).not.toBe(nodeFingerprint(first))
  })

  /**
   * A subtree rebuilt with fresh children under a retired parent id is a new
   * node wearing an old address, so the children have to count.
   */
  it("distinguishes two nodes whose children have different ids", () => {
    const original = buildElement(spare, { type: "loom.card", children: [buildText(spare, "Hi")] })
    const rebuilt = {
      ...original,
      children: [buildText(spare, "Hi")],
    }

    expect(nodeFingerprint(rebuilt)).not.toBe(nodeFingerprint(original))
  })

  it("distinguishes two nodes that differ only in props", () => {
    const original = buildElement(spare, { type: "loom.card", props: { variant: "outlined" } })

    expect(nodeFingerprint({ ...original, props: { variant: "filled" } })).not.toBe(
      nodeFingerprint(original)
    )
  })

  /** Same reason `compareTrees` is order-sensitive: two orderings, two writes. */
  it("distinguishes two props bags that differ only in key order", () => {
    const original = buildElement(spare, { type: "loom.card", props: { a: 1, b: 2 } })

    expect(nodeFingerprint({ ...original, props: { b: 2, a: 1 } })).not.toBe(
      nodeFingerprint(original)
    )
  })
})

describe("seedIdHistory", () => {
  it("records every id in the seed as having arrived at its revision", () => {
    const { tree, ids } = sampleTree()

    const history = seedIdHistory(tree)

    expect(history.size).toBe(7)
    expect(history.get(ids.card)).toEqual([
      { enteredAt: 0, entered: expect.anything(), leftAt: null, left: null },
    ])
  })

  /** A caller auditing from a later known state gets an honest start, not a fiction. */
  it("dates the arrivals at the seed's own revision", () => {
    const { tree, ids } = sampleTree()
    const later = { ...tree, revision: 4 }

    expect(seedIdHistory(later).get(ids.card)?.[0]?.enteredAt).toBe(4)
  })

  it("reports no returns on a tree nothing has happened to", () => {
    const { tree } = sampleTree()

    expect(idReturnsIn(seedIdHistory(tree))).toEqual([])
  })
})

describe("trackIds", () => {
  it("closes the tenancy of a node that was removed", () => {
    const { tree, ids } = sampleTree()

    const after = step(seedIdHistory(tree), tree, [{ op: "remove", nodeId: ids.footer }])

    expect(after.history.get(ids.footer)).toEqual([
      { enteredAt: 0, entered: expect.anything(), leftAt: 1, left: expect.anything() },
    ])
  })

  /**
   * A `remove` names one id and takes a whole subtree with it. Every id in that
   * subtree is an address that could be reused later, so every one is recorded
   * as having left.
   */
  it("records a departure for every id in a removed subtree", () => {
    const { tree, ids } = sampleTree()

    const after = step(seedIdHistory(tree), tree, [{ op: "remove", nodeId: ids.card }])

    expect(after.history.get(ids.card)?.[0]?.leftAt).toBe(1)
    expect(after.history.get(ids.body)?.[0]?.leftAt).toBe(1)
  })

  it("opens a tenancy for an inserted node", () => {
    const { tree, ids } = sampleTree()
    const banner = buildElement(spare, { type: "loom.banner" })

    const after = step(seedIdHistory(tree), tree, [
      { op: "insert", parentId: ids.page, index: 0, node: banner },
    ])

    expect(after.history.get(banner.id)).toEqual([
      { enteredAt: 1, entered: expect.anything(), leftAt: null, left: null },
    ])
  })

  /** Presence is the only thing identity turns on, and a move cannot change it. */
  it("leaves a moved node's tenancy open and unbroken", () => {
    const { tree, ids } = sampleTree()

    const after = step(seedIdHistory(tree), tree, [
      { op: "move", nodeId: ids.footer, parentId: ids.main, index: 0 },
    ])

    expect(after.history.get(ids.footer)).toEqual([
      { enteredAt: 0, entered: expect.anything(), leftAt: null, left: null },
    ])
  })

  it("leaves a configured node's tenancy open and unbroken", () => {
    const { tree, ids } = sampleTree()

    const after = step(seedIdHistory(tree), tree, [
      { op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: [] },
    ])

    expect(after.history.get(ids.card)).toEqual([
      { enteredAt: 0, entered: expect.anything(), leftAt: null, left: null },
    ])
  })

  it("does not change the history it was given", () => {
    const { tree, ids } = sampleTree()
    const history = seedIdHistory(tree)

    step(history, tree, [{ op: "remove", nodeId: ids.footer }])

    expect(history.get(ids.footer)?.[0]?.leftAt).toBe(null)
  })

  /**
   * The shape an id left with is the shape it had *then*, not the shape it
   * arrived with — otherwise a node that was configured and then removed would
   * be unrecognisable when it came back unchanged.
   */
  it("records the shape a node had when it left, not when it arrived", () => {
    const { tree, ids } = sampleTree()

    const configured = step(seedIdHistory(tree), tree, [
      { op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: [] },
    ])
    const removed = step(configured.history, configured.tree, [{ op: "remove", nodeId: ids.card }])

    expect(removed.history.get(ids.card)?.[0]?.left?.fingerprint).toBe(
      nodeFingerprint(nodeIn(configured.tree, ids.card))
    )
  })
})

describe("idReturnsIn", () => {
  /** The undo of a `remove`, which is the shape `inverse.ts` produces. */
  it("calls a node put back exactly as it left a restoration", () => {
    const { tree, ids } = sampleTree()
    const card = nodeIn(tree, ids.card)

    const removed = step(seedIdHistory(tree), tree, [{ op: "remove", nodeId: ids.card }])
    const restored = step(removed.history, removed.tree, [
      { op: "insert", parentId: ids.main, index: 0, node: card },
    ])

    expect(idReturnsIn(restored.history)).toEqual([
      { code: "restored", nodeId: ids.body, label: "text", leftAt: 1, returnedAt: 2 },
      { code: "restored", nodeId: ids.card, label: "loom.card", leftAt: 1, returnedAt: 2 },
    ])
  })

  /** The fault: one address, two nodes, and every id-joined reading now ambiguous. */
  it("calls a different node arriving at a retired id a recycling", () => {
    const { tree, ids } = sampleTree()

    const removed = step(seedIdHistory(tree), tree, [{ op: "remove", nodeId: ids.footer }])
    const impostor = { ...buildText(spare, "Sale"), id: ids.footer }
    const recycled = step(removed.history, removed.tree, [
      { op: "insert", parentId: ids.page, index: 0, node: impostor },
    ])

    expect(idReturnsIn(recycled.history)).toEqual([
      {
        code: "recycled",
        nodeId: ids.footer,
        leftAs: "loom.footer",
        returnedAs: "text",
        leftAt: 1,
        returnedAt: 2,
      },
    ])
  })

  /**
   * The case that makes the fingerprint include ids: it looks like the node that
   * left, and it is not — the children are different nodes.
   */
  it("calls a look-alike rebuilt with fresh children a recycling", () => {
    const { tree, ids } = sampleTree()
    const card = nodeIn(tree, ids.card)

    const removed = step(seedIdHistory(tree), tree, [{ op: "remove", nodeId: ids.card }])
    const lookAlike = { ...card, children: [buildText(spare, "Body copy")] }
    const rebuilt = step(removed.history, removed.tree, [
      { op: "insert", parentId: ids.main, index: 0, node: lookAlike },
    ])

    expect(recycledIds(idReturnsIn(rebuilt.history)).map((found) => found.nodeId)).toEqual([
      ids.card,
    ])
  })

  it("reports nothing for a node that has only ever been removed", () => {
    const { tree, ids } = sampleTree()

    const removed = step(seedIdHistory(tree), tree, [{ op: "remove", nodeId: ids.footer }])

    expect(idReturnsIn(removed.history)).toEqual([])
  })

  it("reports nothing for a node that has only ever been inserted", () => {
    const { tree, ids } = sampleTree()
    const banner = buildElement(spare, { type: "loom.banner" })

    const inserted = step(seedIdHistory(tree), tree, [
      { op: "insert", parentId: ids.page, index: 0, node: banner },
    ])

    expect(idReturnsIn(inserted.history)).toEqual([])
  })

  it("reports one return per round trip when an id leaves twice", () => {
    const { tree, ids } = sampleTree()
    const footer = nodeIn(tree, ids.footer)

    const first = step(seedIdHistory(tree), tree, [{ op: "remove", nodeId: ids.footer }])
    const back = step(first.history, first.tree, [
      { op: "insert", parentId: ids.page, index: 2, node: footer },
    ])
    const second = step(back.history, back.tree, [{ op: "remove", nodeId: ids.footer }])
    const backAgain = step(second.history, second.tree, [
      { op: "insert", parentId: ids.page, index: 2, node: footer },
    ])

    expect(idReturnsIn(backAgain.history)).toEqual([
      { code: "restored", nodeId: ids.footer, label: "loom.footer", leftAt: 1, returnedAt: 2 },
      { code: "restored", nodeId: ids.footer, label: "loom.footer", leftAt: 3, returnedAt: 4 },
    ])
  })

  it("orders returns by the revision they came back at", () => {
    const { tree, ids } = sampleTree()
    const footer = nodeIn(tree, ids.footer)
    const card = nodeIn(tree, ids.card)

    const removed = step(seedIdHistory(tree), tree, [
      { op: "remove", nodeId: ids.footer },
      { op: "remove", nodeId: ids.card },
    ])
    const cardBack = step(removed.history, removed.tree, [
      { op: "insert", parentId: ids.main, index: 0, node: card },
    ])
    const footerBack = step(cardBack.history, cardBack.tree, [
      { op: "insert", parentId: ids.page, index: 2, node: footer },
    ])

    expect(idReturnsIn(footerBack.history).map((found) => found.returnedAt)).toEqual([2, 2, 3])
  })

  it("keeps only the ambiguous returns when asked for recycling", () => {
    const { tree, ids } = sampleTree()
    const card = nodeIn(tree, ids.card)

    const removed = step(seedIdHistory(tree), tree, [
      { op: "remove", nodeId: ids.card },
      { op: "remove", nodeId: ids.footer },
    ])
    const impostor = { ...buildText(spare, "Sale"), id: ids.footer }
    const back = step(removed.history, removed.tree, [
      { op: "insert", parentId: ids.main, index: 0, node: card },
      { op: "insert", parentId: ids.page, index: 1, node: impostor },
    ])

    const returns = idReturnsIn(back.history)

    expect(returns).toHaveLength(3)
    expect(recycledIds(returns).map((found) => found.nodeId)).toEqual([ids.footer])
  })
})
