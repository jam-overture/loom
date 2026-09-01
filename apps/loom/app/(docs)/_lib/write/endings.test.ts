import { describeInterpretationError } from "@loom/runtime"
import { describeStoreError } from "@loom/runtime/store"
import { describe, expect, it } from "vitest"

import { docsExamples } from "../examples/catalogue"
import { docsGatePolicy } from "../propose/policy"

import { produceWriteEndings, WRITE_ENDING_ORDER, type WriteEndingKind } from "./endings"

/**
 * The seven endings, checked for being seven endings that actually happened.
 *
 * `produceWriteEndings` already refuses to return a row whose outcome is not the
 * one it claims — that assertion is in the module, because it has to stop
 * `next build` rather than only a test run. What is left for a test is the part
 * a build cannot see: that the reading order names every ending exactly once,
 * that the sentences on the page are the runtime's own and not something this
 * directory decided, and that two builds of the same commit produce the same
 * page.
 *
 * Where a line can be reconstructed from the runtime's `describe…` function, it
 * is compared against that rather than against a string typed here. A test
 * holding a copy of the wording would fail the day somebody improved it, which
 * teaches the next person to stop improving it.
 */

const endings = await produceWriteEndings()

const ending = (kind: WriteEndingKind) => {
  const found = endings.find((candidate) => candidate.kind === kind)

  if (found === undefined) throw new Error(`loom: no ${kind} ending was produced`)

  return found
}

describe("the endings the page lists", () => {
  it("produces one for every ending in the reading order", () => {
    expect(endings.map((row) => row.kind)).toEqual(WRITE_ENDING_ORDER)
  })

  it("names each ending exactly once", () => {
    expect(new Set(WRITE_ENDING_ORDER).size).toBe(WRITE_ENDING_ORDER.length)
  })

  it("says something about every one of them", () => {
    for (const row of endings) {
      expect(row.line.length).toBeGreaterThan(0)
      expect(row.title.length).toBeGreaterThan(0)
      expect(row.story.length).toBeGreaterThan(0)
      expect(row.yourMove.length).toBeGreaterThan(0)
    }
  })

  /**
   * The page is built repeatedly — once per deploy, and again in every test run
   * — and a row that moved between two builds of the same commit would be a
   * page nobody could review. The clock is fixed and the ids are sequential
   * precisely so this holds.
   */
  it("produces the same page twice", async () => {
    expect(await produceWriteEndings()).toEqual(endings)
  })
})

describe("what the runtime said, held against the runtime", () => {
  /**
   * The commit is the one row that proves the whole path ran: `commitIntent`
   * read head, composed the change, and appended it. A tree that had not been
   * written would still be at revision 0.
   */
  it("applied the change and moved the page on a revision", () => {
    expect(ending("committed").line).toContain("revision 1")
  })

  /**
   * Derived from the policy rather than typed, because the hold happens for a
   * reason this site chose: `loom.heading` is protected here and nowhere in the
   * runtime. Change the policy and this test changes with it.
   */
  it("held the change for the primitive this site protects", () => {
    const [protectedType] = docsGatePolicy.protectedPrimitiveTypes

    expect(protectedType).toBeDefined()
    expect(ending("held").line).toContain(protectedType)
  })

  it("refused the change that would destroy it", () => {
    const [protectedType] = docsGatePolicy.protectedPrimitiveTypes

    expect(ending("refused").line).toContain("destroys")
    expect(ending("refused").line).toContain(protectedType)
  })

  it("reports an unreachable model in the runtime's words", () => {
    expect(ending("not-interpreted").line).toBe(
      describeInterpretationError({
        code: "interpreter-unavailable",
        detail: "the model did not answer in time",
      })
    )
  })

  it("reports a plan that named a node the page does not have", () => {
    expect(ending("not-applicable").line).toContain("n_gone")
  })

  /**
   * Reconstructed whole: the tree id comes from the example the endings are
   * produced against, and the two revisions from what the recipe did — commit
   * once, then ask again against revision 0.
   */
  it("reports a stale ask exactly as the store describes it", () => {
    const example = docsExamples.get("first-tree")

    if (example === undefined) throw new Error("loom: the first-tree example is not registered")

    expect(ending("not-written").line).toBe(
      describeStoreError({
        code: "revision-conflict",
        treeId: example.build().treeId,
        expected: 0,
        found: 1,
      })
    )
  })

  it("reports a second answer as nothing left to answer", () => {
    expect(ending("not-answerable").line).toContain("may already have been answered")
  })
})
