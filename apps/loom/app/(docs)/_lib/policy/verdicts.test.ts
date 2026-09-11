import { defaultGatePolicy } from "@loom/runtime"
import { describe, expect, it } from "vitest"

import { docsGatePolicy } from "../propose/policy"

import { COMPARISON_IDS, comparisonById, produceComparisons } from "./verdicts"

/**
 * That the comparisons compare one thing.
 *
 * A side-by-side is only evidence if the two runs differ in exactly what the
 * page says they differ in — otherwise it is two unrelated verdicts printed next
 * to each other, and a reader who trusted it would draw a conclusion the runs do
 * not support.
 *
 * `produceComparisons` already asserts each column's verdict as it runs, so a
 * policy change that flipped one throws before anything here executes. What is
 * checked below is the shape of the argument: two columns, two different
 * answers, and — the claim the page rests on — the two policies being compared
 * differing in nothing but the vocabulary line the page names.
 */

describe("the policies being compared", () => {
  it("differ in the one line the page says they differ in", () => {
    expect(defaultGatePolicy.protectedPrimitiveTypes).toEqual([])
    expect(docsGatePolicy.protectedPrimitiveTypes).toEqual(["loom.heading"])
  })

  it("share every threshold, so nothing else can be doing the work", () => {
    expect(docsGatePolicy.removalThresholds).toEqual(defaultGatePolicy.removalThresholds)
    expect(docsGatePolicy.breadthThreshold).toBe(defaultGatePolicy.breadthThreshold)
    expect(docsGatePolicy.shallowDepthThreshold).toBe(defaultGatePolicy.shallowDepthThreshold)
    expect(docsGatePolicy.autoApplyCeiling).toEqual(defaultGatePolicy.autoApplyCeiling)
    expect(docsGatePolicy.refusalFloor).toBe(defaultGatePolicy.refusalFloor)
    expect(docsGatePolicy.minimumConfidence).toBe(defaultGatePolicy.minimumConfidence)
  })
})

describe("every comparison on the page", () => {
  it("produces two columns that disagree", async () => {
    for (const comparison of await produceComparisons()) {
      const kinds = comparison.columns.map((column) => column.verdict.kind)

      expect(kinds.length, comparison.id).toBe(2)
      expect(new Set(kinds).size, `${comparison.id} produced the same verdict twice`).toBe(2)
    }
  })

  it("prints the Gate's own sentence under each verdict", async () => {
    for (const comparison of await produceComparisons()) {
      for (const column of comparison.columns) {
        expect(column.verdict.detail.length, `${comparison.id}/${column.label}`).toBeGreaterThan(0)
      }
    }
  })

  it("says which policy judged, on every column", async () => {
    for (const comparison of await produceComparisons()) {
      for (const column of comparison.columns) {
        expect([defaultGatePolicy.policyId, docsGatePolicy.policyId]).toContain(
          column.verdict.policyId
        )
      }
    }
  })

  it("is reachable by the id a page names", async () => {
    for (const id of COMPARISON_IDS) {
      expect((await comparisonById(id)).id).toBe(id)
    }
  })

  it("refuses an id nothing produces", async () => {
    // @ts-expect-error — the point of the check is a caller who got the id wrong.
    await expect(comparisonById("not-a-comparison")).rejects.toThrow(/no policy comparison/)
  })
})

describe("what each comparison shows", () => {
  it("holds one line of vocabulary responsible for the difference", async () => {
    const comparison = await comparisonById("what-you-protect")
    const [free, ours] = comparison.columns

    expect(free?.verdict.kind).toBe("accepted")
    expect(ours?.verdict.kind).toBe("requires-confirmation")
    expect(ours?.verdict.detail).toContain("loom.heading")
  })

  it("holds the origin responsible when the policy is the same on both sides", async () => {
    const comparison = await comparisonById("who-asked")
    const [asked, unasked] = comparison.columns

    expect(asked?.verdict.kind).toBe("accepted")
    expect(unasked?.verdict.kind).toBe("requires-confirmation")
    expect(asked?.verdict.policyId).toBe(unasked?.verdict.policyId)
    expect(unasked?.verdict.reasonCode).toBe("stakes-above-ceiling")
  })

  /**
   * The sentence under that pair says the change is weighed the same on both
   * sides and only the ceiling moved. It is the point of the comparison and the
   * one part a reader cannot check by looking, so it is checked here: equal
   * stakes, two different answers.
   */
  it("weighs the change identically on both sides of the origin", async () => {
    const [asked, unasked] = (await comparisonById("who-asked")).columns

    expect(asked?.verdict.stakes).toBe(unasked?.verdict.stakes)
    expect(asked?.verdict.kind).not.toBe(unasked?.verdict.kind)
  })

  it("reaches the refusal floor rather than another hold", async () => {
    const comparison = await comparisonById("where-it-stops")
    const refused = comparison.columns.at(-1)

    expect(refused?.verdict.kind).toBe("rejected")
    expect(refused?.verdict.reasonCode).toBe("stakes-at-refusal-floor")
    expect(refused?.verdict.stakes).toBe("critical")
  })

  it("asks for the same thing in both columns of a comparison", async () => {
    for (const comparison of await produceComparisons()) {
      expect(comparison.ask.length, comparison.id).toBeGreaterThan(0)
    }
  })

  /**
   * Rendered as text nodes rather than as MDX, so a backtick reaches the reader
   * as a backtick. Same trap as the knob sentences and the example captions.
   */
  it("writes prose rather than markdown, because nothing renders it as markdown", async () => {
    const written = (await produceComparisons()).flatMap((comparison) => [
      comparison.question,
      comparison.moral,
      ...comparison.columns.flatMap((column) => [column.label, column.difference]),
    ])

    for (const sentence of written) {
      expect(sentence, `"${sentence}" has a backtick in it`).not.toContain("`")
    }
  })
})
