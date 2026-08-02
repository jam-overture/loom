import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"

import { applyDelta } from "./apply.js"
import { buildElement, buildSlot, buildText } from "./builders.js"
import { compareTrees } from "./compare.js"
import type { ElementNode, LoomNode, SlotNode } from "./node.js"
import { createTree, type LoomTree } from "./tree.js"

/**
 * Two trees built from the same id sequence share an id space, which is the
 * situation `compareTrees` exists for: a snapshot and the fold of its own log
 * are the same tree in two states, not two unrelated documents.
 */
const sample = () => {
  const ids = sequentialIdFactory("cmp")

  const title = buildText(ids, "Title")
  const heading = buildElement(ids, { type: "loom.heading", props: { level: 1 }, children: [title] })
  const inside = buildText(ids, "Inside")
  const body = buildSlot(ids, "body", [inside])
  const card = buildElement(ids, { type: "loom.card", children: [body] })
  const tree = createTree(buildElement(ids, { type: "loom.page", children: [heading, card] }), ids)

  return { tree, title, heading, inside, body, card }
}

const withChildren = (tree: LoomTree, children: readonly LoomNode[]): LoomTree => ({
  ...tree,
  root: { ...tree.root, children },
})

describe("compareTrees", () => {
  it("reports nothing when the two trees are the same tree", () => {
    expect(compareTrees(sample().tree, sample().tree)).toEqual([])
  })

  it("ignores the revision counter, because a fold and a snapshot are compared for shape", () => {
    const { tree } = sample()

    expect(compareTrees(tree, { ...tree, revision: tree.revision + 5 })).toEqual([])
  })

  it("names a node the compared tree does not have as missing, with its whole subtree", () => {
    const { tree, heading, card, body, inside } = sample()

    expect(compareTrees(tree, withChildren(tree, [heading]))).toEqual([
      { code: "missing", nodeId: card.id, label: "loom.card" },
      { code: "missing", nodeId: body.id, label: "body" },
      { code: "missing", nodeId: inside.id, label: "text" },
    ])
  })

  it("names a node only the compared tree has as extra", () => {
    const { tree, heading, card, body, inside } = sample()

    expect(compareTrees(withChildren(tree, [heading]), tree)).toEqual([
      { code: "extra", nodeId: card.id, label: "loom.card" },
      { code: "extra", nodeId: body.id, label: "body" },
      { code: "extra", nodeId: inside.id, label: "text" },
    ])
  })

  it("reports a changed prop bag as one changed node, naming the props facet", () => {
    const { tree, heading, card } = sample()
    const compared = withChildren(tree, [{ ...heading, props: { level: 2 } }, card])

    expect(compareTrees(tree, compared)).toEqual([
      { code: "changed", nodeId: heading.id, label: "loom.heading", facets: ["props"] },
    ])
  })

  /**
   * A props bag is rewritten wholesale (0009), so two bags differing only in key
   * order came from two different writes. Calling them equal would hide one.
   */
  it("treats a props bag reordered without changing a value as a difference", () => {
    const { tree, heading, card } = sample()
    const reordered: ElementNode = { ...heading, props: { title: "a", level: 1 } }
    const base = withChildren(tree, [{ ...heading, props: { level: 1, title: "a" } }, card])

    expect(compareTrees(base, withChildren(tree, [reordered, card]))).toEqual([
      { code: "changed", nodeId: heading.id, label: "loom.heading", facets: ["props"] },
    ])
  })

  it("names the text facet when a sentence was re-authored", () => {
    const { tree, title, heading, card } = sample()
    const compared = withChildren(tree, [
      { ...heading, children: [{ ...title, value: "Other" }] },
      card,
    ])

    expect(compareTrees(tree, compared)).toEqual([
      { code: "changed", nodeId: title.id, label: "text", facets: ["text"] },
    ])
  })

  it("names the type facet when a node became a different primitive", () => {
    const { tree, heading, card } = sample()
    const prose = buildElement(sequentialIdFactory("other"), { type: "loom.prose" })
    const compared = withChildren(tree, [{ ...heading, type: prose.type }, card])

    expect(compareTrees(tree, compared)).toEqual([
      { code: "changed", nodeId: heading.id, label: "loom.heading", facets: ["type"] },
    ])
  })

  it("names the kind facet, and stops there, when a node changed kind entirely", () => {
    const { tree, title, heading, card } = sample()
    const compared = withChildren(tree, [{ kind: "text", id: heading.id, value: "Title" }, card])

    expect(compareTrees(tree, compared)).toEqual([
      { code: "changed", nodeId: heading.id, label: "loom.heading", facets: ["kind"] },
      /** A text node has no children, so the heading's did not survive the change. */
      { code: "missing", nodeId: title.id, label: "text" },
    ])
  })

  it("names a renamed slot on the type facet, since a slot's name is what it is", () => {
    const { tree, heading, card, body } = sample()
    const footer = buildSlot(sequentialIdFactory("other"), "footer")
    const renamed: SlotNode = { ...body, name: footer.name }
    const compared = withChildren(tree, [heading, { ...card, children: [renamed] }])

    expect(compareTrees(tree, compared)).toEqual([
      { code: "changed", nodeId: body.id, label: "body", facets: ["type"] },
    ])
  })

  /**
   * The property that makes an id-keyed comparison worth having: a structural
   * diff reports a moved card as a whole subtree removed and a whole subtree
   * added, and an operator reading that cannot tell it apart from real loss.
   */
  it("reports a moved node once, rather than as a removal and an addition", () => {
    const { tree, heading, card } = sample()

    expect(compareTrees(tree, withChildren(tree, [card, heading]))).toEqual([
      { code: "changed", nodeId: heading.id, label: "loom.heading", facets: ["position"] },
      { code: "changed", nodeId: card.id, label: "loom.card", facets: ["position"] },
    ])
  })

  it("names the parent facet when a node was re-parented", () => {
    const { tree, heading, card, body } = sample()
    const compared = withChildren(tree, [{ ...card, children: [body, heading] }])

    expect(compareTrees(tree, compared)).toEqual([
      { code: "changed", nodeId: heading.id, label: "loom.heading", facets: ["parent", "position"] },
      { code: "changed", nodeId: card.id, label: "loom.card", facets: ["position"] },
    ])
  })

  it("lists every facet a node differs on, in a fixed order", () => {
    const { tree, heading, card } = sample()
    const prose = buildElement(sequentialIdFactory("other"), { type: "loom.prose" })
    const compared = withChildren(tree, [card, { ...heading, type: prose.type, props: { level: 4 } }])

    expect(compareTrees(tree, compared)).toContainEqual({
      code: "changed",
      nodeId: heading.id,
      label: "loom.heading",
      facets: ["type", "props", "position"],
    })
  })

  it("orders differences by the base tree first, then whatever only the compared tree holds", () => {
    const { tree, heading, card, body, inside } = sample()
    const extra = buildElement(sequentialIdFactory("added"), { type: "loom.prose" })
    const compared = withChildren(tree, [{ ...heading, props: { level: 6 } }, extra])

    expect(compareTrees(tree, compared).map((difference) => difference.nodeId)).toEqual([
      heading.id,
      card.id,
      body.id,
      inside.id,
      extra.id,
    ])
  })

  /**
   * The real shape of a divergence. Hand-built fixtures can drift from what
   * `applyDelta` actually produces; this one cannot.
   */
  it("describes the effect of a real delta", () => {
    const { tree, card, body, inside } = sample()
    const ids = sequentialIdFactory("delta")

    const applied = applyDelta(tree, {
      deltaId: ids.deltaId(),
      treeId: tree.treeId,
      baseRevision: tree.revision,
      operations: [{ op: "remove", nodeId: card.id }],
    })

    if (!applied.ok) throw new Error(`fixture delta was rejected: ${applied.error.code}`)

    expect(compareTrees(tree, applied.value)).toEqual([
      { code: "missing", nodeId: card.id, label: "loom.card" },
      { code: "missing", nodeId: body.id, label: "body" },
      { code: "missing", nodeId: inside.id, label: "text" },
    ])
  })
})
