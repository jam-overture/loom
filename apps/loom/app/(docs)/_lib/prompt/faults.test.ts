import { describeInterpretationError, interpretationFault } from "@loom/runtime"
import { describe, expect, it } from "vitest"

import { faultActors, faultExamples, faultRows } from "./faults"

/**
 * The compiler already holds the seven codes and the five actors to the
 * runtime's own unions — a `Record` keyed by a union has no room for a missing
 * key. What it cannot check is that an entry's *value* is the error its key
 * names, or that the sentence beside a code is the runtime's rather than one
 * somebody pasted, so those are here.
 */

const examples = Object.values(faultExamples)

describe("the interpretation faults the site prints", () => {
  it("keys every example by its own code", () => {
    for (const [key, error] of Object.entries(faultExamples)) {
      expect(error.code).toBe(key)
    }
  })

  it("has a row for every code, once", () => {
    const codes = faultRows.map((row) => row.code)

    expect(codes).toEqual(examples.map((error) => error.code))
    expect(new Set(codes).size).toBe(codes.length)
    expect(codes.length).toBeGreaterThanOrEqual(7)
  })

  it("says what the runtime says, rather than a paraphrase of it", () => {
    for (const error of examples) {
      const row = faultRows.find((candidate) => candidate.code === error.code)

      expect(row?.sentence).toBe(describeInterpretationError(error))
      expect(row?.sentence).toContain(error.detail)
    }
  })

  it("groups every code the way the runtime groups it", () => {
    for (const error of examples) {
      const row = faultRows.find((candidate) => candidate.code === error.code)

      expect(row?.fault).toBe(interpretationFault(error))
    }
  })

  it("explains every actor a row can name", () => {
    for (const row of faultRows) {
      expect(faultActors[row.fault]).not.toBe("")
    }
  })

  it("keeps the two codes that are answers apart from the five that are failures", () => {
    const asker = faultRows.filter((row) => row.fault === "asker").map((row) => row.code)

    expect(asker).toEqual(["not-understood", "no-change-needed"])
  })
})
