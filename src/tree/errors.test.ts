import { describe, expect, it } from "vitest"

import { nodeIdSchema, treeIdSchema } from "../ids.js"

import { describeTreeError, type TreeError } from "./errors.js"

const nodeId = nodeIdSchema.parse("n_1")
const treeId = treeIdSchema.parse("t_1")

const everyError: readonly TreeError[] = [
  { code: "node-not-found", nodeId },
  { code: "duplicate-node-id", nodeId },
  { code: "recycled-node-id", nodeId },
  { code: "not-a-container", nodeId, nodeKind: "text" },
  { code: "index-out-of-range", parentId: nodeId, index: 4, childCount: 2 },
  { code: "move-into-self", nodeId },
  { code: "move-into-descendant", nodeId, parentId: nodeId },
  { code: "root-not-detachable", nodeId },
  { code: "unconfigurable-key", nodeId, nodeKind: "slot", key: "variant" },
  { code: "invalid-configuration", nodeId, nodeKind: "text", detail: "value must be a string" },
  { code: "revision-mismatch", expected: 2, actual: 3 },
  { code: "tree-mismatch", expected: treeId, actual: treeId },
  { code: "schema-violation", path: "root.children.0", detail: "invalid kind" },
]

describe("describeTreeError", () => {
  it("produces a non-empty message for every error code", () => {
    for (const error of everyError) {
      expect(describeTreeError(error).length).toBeGreaterThan(0)
    }
  })

  it("covers the whole TreeError union", () => {
    const codes = new Set(everyError.map((error) => error.code))
    expect(codes.size).toBe(everyError.length)
  })
})
