import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { ok } from "../result.js"

import { buildElement, buildText } from "./builders.js"
import { detachNode, insertChild, replaceNode } from "./mutation.js"
import {
  collectNodeIds,
  findNode,
  findParent,
  isDescendantOf,
  nodePath,
  textOf,
  walkTree,
} from "./navigation.js"
import { childrenOf, type LoomNode } from "./node.js"
import { outlineTree } from "./outline.js"

/**
 * A tree's shape is data, so every read and every edit of a tree has to answer
 * at a shape a tree is allowed to have (0372, 0373). Until these existed every
 * read here was a recursive generator, which threw `RangeError: Maximum call
 * stack size exceeded` somewhere between two and four thousand deep and cost
 * the sum of the depths rather than the number of nodes on the way up to it;
 * and every edit recursed to rebuild and grew its sibling lists one copy per
 * sibling, so it was quadratic in a page's width as well.
 *
 * Ten thousand is the figure the finding that asked for the depth half named.
 * It is far past any page anyone has written — a real page is wide and shallow
 * — and that is the point: a bound this far out is one no page meets by
 * accident. The width figure is the one a page could meet, and is sized so that
 * the implementation these replaced takes seconds rather than milliseconds.
 */
const DEEP = 10_000
const WIDE = 60_000

/** A chain: one child per node, a text leaf at the bottom. */
const deepChain = (depth: number): LoomNode => {
  const ids = sequentialIdFactory()
  let node: LoomNode = buildText(ids, "bottom")

  for (let level = 1; level < depth; level += 1) {
    node = buildElement(ids, { type: "loom.page", children: [node] })
  }

  return node
}

/** One container, `count` text children, nothing nested. */
const wideParent = (count: number): LoomNode => {
  const ids = sequentialIdFactory("wide")

  return buildElement(ids, {
    type: "loom.page",
    children: Array.from({ length: count }, (_, at) => buildText(ids, `line ${at}`)),
  })
}

const bottomOf = (root: LoomNode): LoomNode => {
  const walked = Array.from(walkTree(root))
  const last = walked[walked.length - 1]
  if (!last) throw new Error("a chain has a bottom")

  return last
}

describe("a tree ten thousand deep", () => {
  it("outlines whole, with the depth and the parent of every row", () => {
    const root = deepChain(DEEP)
    const outline = outlineTree(root)

    expect(outline).toHaveLength(DEEP)
    expect(outline[0]?.depth).toBe(0)
    expect(outline[0]?.parentId).toBeNull()
    expect(outline[DEEP - 1]?.depth).toBe(DEEP - 1)
    expect(outline[DEEP - 1]?.parentId).toBe(outline[DEEP - 2]?.node.id)
    expect(outline.every((entry) => entry.index === 0)).toBe(true)
  })

  it("walks every node", () => {
    const root = deepChain(DEEP)

    expect(collectNodeIds(root)).toHaveLength(DEEP)
  })

  it("gives the whole chain as a path, root first", () => {
    const root = deepChain(DEEP)
    const bottom = bottomOf(root)
    const path = nodePath(root, bottom.id)

    expect(path).toHaveLength(DEEP)
    expect(path?.[0]?.id).toBe(root.id)
    expect(path?.[DEEP - 1]?.id).toBe(bottom.id)
  })

  it("names the parent of the deepest node, and reads what it says", () => {
    const root = deepChain(DEEP)
    const bottom = bottomOf(root)

    expect(findParent(root, bottom.id)?.id).toBe(outlineTree(root)[DEEP - 2]?.node.id)
    expect(isDescendantOf(root, root.id, bottom.id)).toBe(true)
    expect(textOf(root)).toBe("bottom")
  })
})

describe("an edit to a tree ten thousand deep", () => {
  it("swaps the deepest node and hands back the whole chain", () => {
    const root = deepChain(DEEP)
    const bottom = bottomOf(root)
    const spare = sequentialIdFactory("spare")
    const replacement = buildText(spare, "swapped")

    const result = replaceNode(root, bottom.id, () => ok(replacement))
    if (!result.ok) throw new Error(result.error.code)

    expect(collectNodeIds(result.value)).toHaveLength(DEEP)
    expect(findNode(result.value, replacement.id)?.id).toBe(replacement.id)
    expect(findNode(result.value, bottom.id)).toBeNull()
    expect(textOf(result.value)).toBe("swapped")
  })

  it("inserts beside the deepest node and detaches it again", () => {
    const root = deepChain(DEEP)
    const bottom = bottomOf(root)
    const parent = findParent(root, bottom.id)
    if (!parent) throw new Error("a chain's bottom has a parent")
    const spare = sequentialIdFactory("spare")

    const inserted = insertChild(root, parent.id, 0, buildText(spare, "beside"))
    if (!inserted.ok) throw new Error(inserted.error.code)
    expect(textOf(inserted.value)).toBe("besidebottom")

    const detached = detachNode(inserted.value, bottom.id)
    if (!detached.ok) throw new Error(detached.error.code)
    expect(textOf(detached.value.root)).toBe("beside")
    expect(detached.value.detached.id).toBe(bottom.id)
  })

  it("leaves every node above the edit addressable, and reports an absent one", () => {
    const root = deepChain(DEEP)
    const bottom = bottomOf(root)

    const result = replaceNode(root, bottom.id, (node) => ok(node))
    if (!result.ok) throw new Error(result.error.code)

    expect(nodePath(result.value, bottom.id)).toHaveLength(DEEP)
    expect(outlineTree(result.value)[DEEP - 1]?.depth).toBe(DEEP - 1)
    expect(isDescendantOf(result.value, root.id, bottom.id)).toBe(true)

    const absent = replaceNode(root, sequentialIdFactory("gone").nodeId(), (node) => ok(node))
    expect(!absent.ok && absent.error.code).toBe("node-not-found")
  })
})

describe("an edit to a node with sixty thousand siblings", () => {
  it("swaps one of them and keeps the order of the rest", () => {
    const root = wideParent(WIDE)
    const siblings = childrenOf(root)
    const target = siblings[WIDE - 2]
    if (!target) throw new Error("a wide parent has a second-to-last child")
    const spare = sequentialIdFactory("spare")
    const replacement = buildText(spare, "swapped")

    const result = replaceNode(root, target.id, () => ok(replacement))
    if (!result.ok) throw new Error(result.error.code)

    const after = childrenOf(result.value)
    expect(after).toHaveLength(WIDE)
    expect(after[WIDE - 2]?.id).toBe(replacement.id)
    expect(after[WIDE - 3]).toBe(siblings[WIDE - 3])
    expect(after[WIDE - 1]).toBe(siblings[WIDE - 1])
  })

  it("inserts into the middle and detaches from it", () => {
    const root = wideParent(WIDE)
    const spare = sequentialIdFactory("spare")
    const inserted = buildText(spare, "wedged")

    const grown = insertChild(root, root.id, WIDE / 2, inserted)
    if (!grown.ok) throw new Error(grown.error.code)
    expect(childrenOf(grown.value)).toHaveLength(WIDE + 1)
    expect(childrenOf(grown.value)[WIDE / 2]?.id).toBe(inserted.id)

    const pruned = detachNode(grown.value, inserted.id)
    if (!pruned.ok) throw new Error(pruned.error.code)
    expect(childrenOf(pruned.value.root)).toHaveLength(WIDE)
    expect(findNode(pruned.value.root, inserted.id)).toBeNull()
  })
})
