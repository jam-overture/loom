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
   * This checked that five fixtures carried five distinct codes, which five
   * fixtures do whether or not they are the union's five. `STORE_ERROR_CODES`
   * gives it something outside itself to agree with, and `everyMemberOf` fails
   * the compile if that list ever stops being the union.
   */
  it("covers the whole StoreError union", () => {
    const codes = everyError.map((error) => error.code)

    expect(new Set(codes).size).toBe(everyError.length)
    expect([...codes].sort()).toEqual([...STORE_ERROR_CODES].sort())
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
