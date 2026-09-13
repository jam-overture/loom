import { describe, expect, it } from "vitest"

import { nodeIdSchema, treeIdSchema } from "../ids.js"

import { describeStoreError, STORE_ERROR_CODES, type StoreError } from "./errors.js"

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

  /**
   * The list is what a consumer outside the runtime reads instead of keeping its
   * own copy, so the thing worth testing is that it says the same five things the
   * union does — in both directions. `everyMemberOf` already stops a code being
   * *missing* at compile time; what it cannot see is a code left behind after one
   * is renamed, which is a string in a list matching nothing.
   */
  it("publishes every code the union has, and none it does not", () => {
    expect([...STORE_ERROR_CODES].sort()).toEqual([...everyError.map((error) => error.code)].sort())
  })

  it("publishes the codes in an order a reader can rely on, with nothing said twice", () => {
    expect(new Set(STORE_ERROR_CODES).size).toBe(STORE_ERROR_CODES.length)
    expect(STORE_ERROR_CODES[0]).toBe("not-found")
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

describe("STORE_ERROR_CODES", () => {
  it("names each way persistence can refuse exactly once", () => {
    expect(new Set(STORE_ERROR_CODES).size).toBe(STORE_ERROR_CODES.length)
  })

  it("describes every code it names", () => {
    for (const code of STORE_ERROR_CODES) {
      const described = everyError.find((error) => error.code === code)
      expect(described, `no fixture for ${code}`).toBeDefined()
    }
  })
})
