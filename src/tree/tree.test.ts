import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { sampleTree } from "../testing/fixtures.js"

import { buildElement, buildText } from "./builders.js"
import { withChildren } from "./node.js"
import { createTree, parseTree, TREE_SCHEMA_VERSION, validateTreeInvariants, withRoot } from "./tree.js"

describe("createTree", () => {
  it("starts at revision zero with the current schema version", () => {
    const idFactory = sequentialIdFactory()
    const tree = createTree(buildElement(idFactory, { type: "loom.page" }), idFactory)

    expect(tree.revision).toBe(0)
    expect(tree.schemaVersion).toBe(TREE_SCHEMA_VERSION)
  })
})

describe("withRoot", () => {
  it("bumps the revision and keeps the tree id", () => {
    const { tree } = sampleTree()
    const idFactory = sequentialIdFactory("next")
    const next = withRoot(tree, buildElement(idFactory, { type: "loom.page" }))

    expect(next.revision).toBe(1)
    expect(next.treeId).toBe(tree.treeId)
    expect(tree.revision).toBe(0)
  })
})

describe("validateTreeInvariants", () => {
  it("accepts a tree with unique ids", () => {
    const { tree } = sampleTree()
    expect(validateTreeInvariants(tree).ok).toBe(true)
  })

  it("rejects a repeated node id", () => {
    const { tree } = sampleTree()
    const [header] = tree.root.children
    if (!header) throw new Error("fixture missing header")

    const duplicated = { ...tree, root: withChildren(tree.root, [...tree.root.children, header]) }
    const result = validateTreeInvariants(duplicated)

    expect(!result.ok && result.error.code).toBe("duplicate-node-id")
  })
})

describe("parseTree", () => {
  it("round-trips a tree through JSON", () => {
    const { tree } = sampleTree()
    const result = parseTree(JSON.parse(JSON.stringify(tree)))

    expect(result.ok).toBe(true)
    expect(result.ok && result.value).toEqual(tree)
  })

  it("rejects an unknown schema version", () => {
    const { tree } = sampleTree()
    const result = parseTree({ ...tree, schemaVersion: 2 })

    expect(!result.ok && result.error.code).toBe("schema-violation")
    expect(!result.ok && result.error.code === "schema-violation" && result.error.path).toBe(
      "schemaVersion"
    )
  })

  it("rejects a non-element root", () => {
    const { tree } = sampleTree()
    const idFactory = sequentialIdFactory("bad")
    const result = parseTree({ ...tree, root: buildText(idFactory, "bare") })

    expect(!result.ok && result.error.code).toBe("schema-violation")
  })

  it("rejects a negative revision", () => {
    const { tree } = sampleTree()
    expect(parseTree({ ...tree, revision: -1 }).ok).toBe(false)
  })

  it("rejects duplicate ids that Zod alone would accept", () => {
    const { tree, ids } = sampleTree()
    const [, , footer] = tree.root.children
    if (!footer) throw new Error("fixture missing footer")

    const result = parseTree({ ...tree, root: withChildren(tree.root, [...tree.root.children, footer]) })

    expect(!result.ok && result.error.code).toBe("duplicate-node-id")
    expect(!result.ok && result.error.code === "duplicate-node-id" && result.error.nodeId).toBe(
      ids.footer
    )
  })
})
