import { describe, expect, it } from "vitest"

import { nodeIdSchema, treeIdSchema } from "../ids.js"

import { describeStoreError, type StoreError } from "./errors.js"

const treeId = treeIdSchema.parse("t_1")

const everyError: readonly StoreError[] = [
  { code: "not-found", treeId },
  { code: "already-exists", treeId },
  { code: "revision-conflict", treeId, expected: 2, found: 3 },
  { code: "delta-rejected", treeId, error: { code: "node-not-found", nodeId: nodeIdSchema.parse("n_1") } },
  { code: "unavailable", detail: "connection reset" },
]

describe("describeStoreError", () => {
  it("produces a non-empty message for every error code", () => {
    for (const error of everyError) {
      expect(describeStoreError(error).length).toBeGreaterThan(0)
    }
  })

  it("covers the whole StoreError union", () => {
    const codes = new Set(everyError.map((error) => error.code))
    expect(codes.size).toBe(everyError.length)
  })

  /**
   * A conflict message that named only one of the two revisions would be the
   * least useful version of the most useful error here: the point of the refusal
   * is that a caller can re-interpret against the head it did not have.
   */
  it("names both revisions in a conflict", () => {
    const described = describeStoreError({ code: "revision-conflict", treeId, expected: 2, found: 3 })

    expect(described).toContain("2")
    expect(described).toContain("3")
  })

  it("carries the underlying tree error through a rejected delta", () => {
    const described = describeStoreError({
      code: "delta-rejected",
      treeId,
      error: { code: "index-out-of-range", parentId: nodeIdSchema.parse("n_1"), index: 4, childCount: 2 },
    })

    expect(described).toContain("index-out-of-range")
  })
})
