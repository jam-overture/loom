import { describe, expect, it } from "vitest"

import { nodeIdSchema } from "../ids.js"
import { sampleTree } from "../testing/fixtures.js"

import {
  collectNodeIds,
  containsNode,
  duplicateNodeIds,
  findNode,
  findParent,
  isDescendantOf,
  pathToNode,
  textOf,
  walkTree,
} from "./navigation.js"
import { withChildren } from "./node.js"

const missingId = nodeIdSchema.parse("n_missing")

describe("walkTree", () => {
  it("visits every node depth-first, parents before children", () => {
    const { tree, ids } = sampleTree()

    expect(Array.from(walkTree(tree.root), (node) => node.id)).toEqual([
      ids.page,
      ids.header,
      ids.headline,
      ids.main,
      ids.card,
      ids.body,
      ids.footer,
    ])
  })
})

describe("findNode", () => {
  it("finds nodes at any depth and reports absence as null", () => {
    const { tree, ids } = sampleTree()

    expect(findNode(tree.root, ids.body)?.id).toBe(ids.body)
    expect(findNode(tree.root, ids.page)?.id).toBe(ids.page)
    expect(findNode(tree.root, missingId)).toBeNull()
    expect(containsNode(tree.root, ids.card)).toBe(true)
    expect(containsNode(tree.root, missingId)).toBe(false)
  })
})

describe("findParent", () => {
  it("returns the immediate parent, and null for the root", () => {
    const { tree, ids } = sampleTree()

    expect(findParent(tree.root, ids.card)?.id).toBe(ids.main)
    expect(findParent(tree.root, ids.header)?.id).toBe(ids.page)
    expect(findParent(tree.root, ids.page)).toBeNull()
  })
})

describe("pathToNode", () => {
  it("derives the id chain from the root", () => {
    const { tree, ids } = sampleTree()

    expect(pathToNode(tree.root, ids.body)).toEqual([ids.page, ids.main, ids.card, ids.body])
    expect(pathToNode(tree.root, ids.page)).toEqual([ids.page])
    expect(pathToNode(tree.root, missingId)).toBeNull()
  })
})

describe("isDescendantOf", () => {
  it("is true at any depth below the ancestor and false otherwise", () => {
    const { tree, ids } = sampleTree()

    expect(isDescendantOf(tree.root, ids.main, ids.body)).toBe(true)
    expect(isDescendantOf(tree.root, ids.page, ids.footer)).toBe(true)
    expect(isDescendantOf(tree.root, ids.header, ids.card)).toBe(false)
    expect(isDescendantOf(tree.root, ids.card, ids.card)).toBe(false)
    expect(isDescendantOf(tree.root, missingId, ids.card)).toBe(false)
  })
})

describe("textOf", () => {
  it("reads every text node under a subtree, in tree order", () => {
    const { tree, ids } = sampleTree()

    expect(textOf(tree.root)).toBe("WelcomeBody copy")

    const header = findNode(tree.root, ids.header)
    if (!header) throw new Error("fixture missing header")

    expect(textOf(header)).toBe("Welcome")
  })

  it("is empty for a node that says nothing", () => {
    const { tree, ids } = sampleTree()

    const footer = findNode(tree.root, ids.footer)
    if (!footer) throw new Error("fixture missing footer")

    expect(textOf(footer)).toBe("")
  })
})

describe("duplicateNodeIds", () => {
  it("is empty for a well-formed tree and names repeats otherwise", () => {
    const { tree, ids } = sampleTree()
    expect(duplicateNodeIds(tree.root)).toEqual([])

    const footer = findNode(tree.root, ids.footer)
    if (!footer) throw new Error("fixture missing footer")

    const cloned = withChildren(tree.root, [...tree.root.children, footer])
    expect(duplicateNodeIds(cloned)).toEqual([ids.footer])
    expect(collectNodeIds(cloned)).toHaveLength(8)
  })
})
