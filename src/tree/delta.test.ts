import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { sampleTree } from "../testing/fixtures.js"

import { buildElement } from "./builders.js"
import {
  configureOperationSchema,
  parseDelta,
  TREE_OPERATIONS,
  treeOperationSchema,
} from "./delta.js"

const idFactory = sequentialIdFactory("d")

describe("treeOperationSchema", () => {
  it("parses each of the four operations", () => {
    const { ids } = sampleTree()
    const node = buildElement(idFactory, { type: "loom.banner" })

    const operations = [
      { op: "insert", parentId: ids.page, index: 0, node },
      { op: "remove", nodeId: ids.footer },
      { op: "move", nodeId: ids.footer, parentId: ids.main, index: 0 },
      { op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: [] },
    ]

    for (const operation of operations) {
      expect(treeOperationSchema.safeParse(operation).success).toBe(true)
    }
  })

  it("rejects an unknown operation name", () => {
    const { ids } = sampleTree()
    expect(treeOperationSchema.safeParse({ op: "replace", nodeId: ids.card }).success).toBe(false)
  })

  it("rejects a negative or fractional insert index", () => {
    const { ids } = sampleTree()
    const node = buildElement(idFactory, { type: "loom.banner" })

    expect(treeOperationSchema.safeParse({ op: "insert", parentId: ids.page, index: -1, node }).success).toBe(false)
    expect(treeOperationSchema.safeParse({ op: "insert", parentId: ids.page, index: 0.5, node }).success).toBe(false)
  })

  it("defaults an omitted configure patch to a no-op", () => {
    const { ids } = sampleTree()
    const parsed = configureOperationSchema.safeParse({ op: "configure", nodeId: ids.card })

    expect(parsed.success && parsed.data.set).toEqual({})
    expect(parsed.success && parsed.data.unset).toEqual([])
  })
})

describe("parseDelta", () => {
  it("accepts a well-formed delta", () => {
    const { tree, ids } = sampleTree()
    const result = parseDelta({
      deltaId: idFactory.deltaId(),
      treeId: tree.treeId,
      baseRevision: 0,
      operations: [{ op: "remove", nodeId: ids.footer }],
    })

    expect(result.ok).toBe(true)
  })

  it("rejects a delta with no operations", () => {
    const { tree } = sampleTree()
    const result = parseDelta({
      deltaId: idFactory.deltaId(),
      treeId: tree.treeId,
      baseRevision: 0,
      operations: [],
    })

    expect(!result.ok && result.error.code).toBe("schema-violation")
    expect(!result.ok && result.error.code === "schema-violation" && result.error.path).toBe(
      "operations"
    )
  })

  it("rejects a delta whose node payload is not a valid node", () => {
    const { tree, ids } = sampleTree()
    const result = parseDelta({
      deltaId: idFactory.deltaId(),
      treeId: tree.treeId,
      baseRevision: 0,
      operations: [{ op: "insert", parentId: ids.page, index: 0, node: { kind: "element" } }],
    })

    expect(result.ok).toBe(false)
  })
})

/**
 * Four is a claim this project makes in prose on four surfaces, and it was a
 * digit in each of them. This is the list those sentences can be held against.
 */
describe("TREE_OPERATIONS", () => {
  it("is every operation the schema parses, in the order the delta doc argues them", () => {
    const parsed = treeOperationSchema.options.map((option) => option.shape.op.value)

    expect(TREE_OPERATIONS).toEqual(parsed)
  })

  it("is four, which is the number the vocabulary is", () => {
    expect(TREE_OPERATIONS).toHaveLength(4)
  })
})
