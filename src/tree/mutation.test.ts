import { describe, expect, it } from "vitest"

import { nodeIdSchema, sequentialIdFactory } from "../ids.js"
import { ok } from "../result.js"
import { sampleTree } from "../testing/fixtures.js"

import { buildElement, buildText } from "./builders.js"
import { detachNode, insertChild, replaceNode } from "./mutation.js"
import { findNode } from "./navigation.js"
import { childrenOf } from "./node.js"

const missingId = nodeIdSchema.parse("n_missing")
const spare = sequentialIdFactory("spare")

describe("replaceNode", () => {
  it("swaps the addressed node and rebuilds only its ancestors", () => {
    const { tree, ids } = sampleTree()
    const replacement = buildText(spare, "Replaced")

    const result = replaceNode(tree.root, ids.body, () => ok(replacement))
    if (!result.ok) throw new Error(result.error.code)

    expect(findNode(result.value, replacement.id)?.id).toBe(replacement.id)
    expect(findNode(result.value, ids.body)).toBeNull()
    expect(result.value).not.toBe(tree.root)
  })

  it("preserves identity of subtrees off the edited path", () => {
    const { tree, ids } = sampleTree()

    const result = replaceNode(tree.root, ids.body, () => ok(buildText(spare, "Replaced")))
    if (!result.ok) throw new Error(result.error.code)

    const originalHeader = findNode(tree.root, ids.header)
    const nextHeader = findNode(result.value, ids.header)
    expect(nextHeader).toBe(originalHeader)
  })

  it("reports an absent node", () => {
    const { tree } = sampleTree()
    const result = replaceNode(tree.root, missingId, (node) => ok(node))

    expect(!result.ok && result.error.code).toBe("node-not-found")
  })

  it("propagates a failing transform", () => {
    const { tree, ids } = sampleTree()
    const result = replaceNode(tree.root, ids.card, () => ({
      ok: false as const,
      error: { code: "node-not-found" as const, nodeId: ids.card },
    }))

    expect(result.ok).toBe(false)
  })
})

describe("insertChild", () => {
  it("inserts at the requested index", () => {
    const { tree, ids } = sampleTree()
    const inserted = buildElement(spare, { type: "loom.banner" })

    const result = insertChild(tree.root, ids.page, 1, inserted)
    if (!result.ok) throw new Error(result.error.code)

    expect(childrenOf(result.value).map((child) => child.id)).toEqual([
      ids.header,
      inserted.id,
      ids.main,
      ids.footer,
    ])
  })

  it("accepts an index equal to the child count as an append", () => {
    const { tree, ids } = sampleTree()
    const inserted = buildElement(spare, { type: "loom.banner" })

    const result = insertChild(tree.root, ids.page, 3, inserted)
    expect(result.ok && childrenOf(result.value).at(-1)?.id).toBe(inserted.id)
  })

  it("inserts into a slot's fallback content", () => {
    const { tree, ids } = sampleTree()
    const inserted = buildText(spare, "Fallback")

    const result = insertChild(tree.root, ids.main, 0, inserted)
    if (!result.ok) throw new Error(result.error.code)

    const main = findNode(result.value, ids.main)
    expect(main && childrenOf(main).map((child) => child.id)).toEqual([inserted.id, ids.card])
  })

  it("rejects an out-of-range or fractional index", () => {
    const { tree, ids } = sampleTree()
    const inserted = buildElement(spare, { type: "loom.banner" })

    expect(insertChild(tree.root, ids.page, 4, inserted).ok).toBe(false)
    expect(insertChild(tree.root, ids.page, -1, inserted).ok).toBe(false)
    expect(insertChild(tree.root, ids.page, 1.5, inserted).ok).toBe(false)
  })

  it("rejects a text node as a parent", () => {
    const { tree, ids } = sampleTree()
    const result = insertChild(tree.root, ids.headline, 0, buildText(spare, "nope"))

    expect(!result.ok && result.error.code).toBe("not-a-container")
  })

  it("rejects an absent parent", () => {
    const { tree } = sampleTree()
    const result = insertChild(tree.root, missingId, 0, buildText(spare, "nope"))

    expect(!result.ok && result.error.code).toBe("node-not-found")
  })
})

describe("detachNode", () => {
  it("removes the node and returns the detached subtree intact", () => {
    const { tree, ids } = sampleTree()

    const result = detachNode(tree.root, ids.card)
    if (!result.ok) throw new Error(result.error.code)

    expect(findNode(result.value.root, ids.card)).toBeNull()
    expect(findNode(result.value.root, ids.body)).toBeNull()
    expect(findNode(result.value.detached, ids.body)?.id).toBe(ids.body)
  })

  it("refuses to detach the root", () => {
    const { tree, ids } = sampleTree()
    const result = detachNode(tree.root, ids.page)

    expect(!result.ok && result.error.code).toBe("root-not-detachable")
  })

  it("reports an absent node", () => {
    const { tree } = sampleTree()
    expect(detachNode(tree.root, missingId).ok).toBe(false)
  })
})
