import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"

import { buildElement, buildText } from "./builders.js"
import {
  collectNodeIds,
  findParent,
  isDescendantOf,
  nodePath,
  textOf,
  walkTree,
} from "./navigation.js"
import type { LoomNode } from "./node.js"
import { outlineTree } from "./outline.js"

/**
 * A tree's depth is data, so every read of a tree has to answer at a depth a
 * tree is allowed to reach (0372). Until these existed every read here was a
 * recursive generator, which threw `RangeError: Maximum call stack size
 * exceeded` somewhere between two and four thousand deep and cost the sum of
 * the depths rather than the number of nodes on the way up to it.
 *
 * Ten thousand is the figure the finding that asked for this named. It is far
 * past any page anyone has written — a real page is wide and shallow — and that
 * is the point: a bound this far out is one no page meets by accident.
 */
const DEEP = 10_000

/** A chain: one child per node, a text leaf at the bottom. */
const deepChain = (depth: number): LoomNode => {
  const ids = sequentialIdFactory()
  let node: LoomNode = buildText(ids, "bottom")

  for (let level = 1; level < depth; level += 1) {
    node = buildElement(ids, { type: "loom.page", children: [node] })
  }

  return node
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
