import { describe, expect, it } from "vitest"

import { checkPointers, reviewPointers } from "./links"
import { recordPointer, recordPointers } from "./records"
import { REVIEW_SETS } from "./schedule"
import { referencedRecords } from "./text"

/**
 * A cited record, and whether the reader can get to it.
 *
 * Filed by the documentation lane on 21 August: `/lessons/review/set-k` printed
 * "the contract in 0033" to a reader who has no way of opening 0033. The lesson
 * the question came from cites the same record with a title and a link, because
 * a lesson is written for somebody with this repository open; the question
 * inherited the number and lost everything around it.
 *
 * These tests are about the door rather than about the wording, which is the
 * judgement this lane made and the one worth arguing with: the number stays, and
 * where to check gains somewhere to go.
 */

describe("a record cited in a question", () => {
  it("finds the citations in the prose, and nothing else", () => {
    expect(referencedRecords("…which of those two the contract in 0033 asks a host to do.")).toEqual([
      33,
    ])
    expect(referencedRecords("Name the four facts 0007 required §6 to capture.")).toEqual([7])
    expect(referencedRecords("Both arguments, and 0002 and 0008 disagree.")).toEqual([2, 8])
  })

  /**
   * The two shapes a four-digit number could otherwise be. A lesson reference is
   * two digits inside a marker, and a year is not zero-padded — which is what
   * makes the leading zero enough to tell a citation from everything else in the
   * course without a list of known records to check against.
   */
  it("does not mistake a lesson reference or a year for a record", () => {
    expect(referencedRecords("Why is a half-applied delta worse than a rejected one? *(03)*")).toEqual(
      []
    )
    expect(referencedRecords("Closed on 2026, after 1000 changes.")).toEqual([])
  })

  it("resolves a number to the record's own title and somewhere to open it", () => {
    const pointer = recordPointer(33)

    expect(pointer?.name).toBe("decisions/0033")
    expect(pointer?.title).toBe("The policy is resolved per change, and named on the verdict")
    expect(pointer?.href).toBe(
      "https://github.com/jam-overture/loom/blob/main/decisions/0033-the-policy-is-resolved-per-change-and-named-on-the-verdict.md"
    )
  })

  /** Both spellings are in `decisions/`: the older records use a dash, the newer a period. */
  it("reads a title written either way", () => {
    expect(recordPointer(7)?.title).toBe(
      "Confidence is self-graded, trusted on purpose, and must be calibrated"
    )
    expect(recordPointer(1)?.title).toBe(
      "The tree and the delta are the unit of AI-authored change"
    )
  })

  it("renders no door rather than a broken one for a record that does not exist", () => {
    expect(recordPointer(999)).toBeUndefined()
    expect(recordPointers([33, 999])).toHaveLength(1)
  })
})

/** A question by set and number, resolved the way its page resolves it. */
const pointersFor = (slug: string, number: number) => {
  const set = REVIEW_SETS.find((entry) => entry.slug === slug)
  const question = set?.questions.find((entry) => entry.number === number)

  return set === undefined || question === undefined ? [] : reviewPointers(set.anchor, question)
}

describe("where to check", () => {
  it("sends the reader to the lessons first and the record last", () => {
    const question = REVIEW_SETS.find((set) => set.slug === "set-k")?.questions.find(
      (entry) => entry.number === 8
    )

    expect(question?.text).toContain("0033")

    const pointers = pointersFor("set-k", 8)
    const last = pointers.at(-1)

    expect(pointers.filter((pointer) => pointer.kind === "record")).toHaveLength(1)
    expect(last?.kind).toBe("record")
    expect(last?.name).toBe("decisions/0033")
    expect(pointers[0]?.kind).toBe("lesson")
  })

  /**
   * The finding as a standing check rather than a fix to one page. A question may
   * cite a record — it is the right citation and the lesson makes it — and what
   * it may not do is cite one the reader cannot open.
   */
  it("leaves no review question citing a record it cannot open", () => {
    const stranded = REVIEW_SETS.flatMap((set) =>
      set.questions.flatMap((question) =>
        question.records
          .filter((number) => recordPointer(number) === undefined)
          .map((number) => `${set.slug} q${question.number}: ${number}`)
      )
    )

    expect(stranded).toEqual([])
  })

  it("gives a lesson's own question lesson pointers and no records", () => {
    const pointers = checkPointers([3, 4])

    expect(pointers.map((pointer) => pointer.name)).toEqual(["03", "04"])
    expect(pointers.every((pointer) => pointer.kind === "lesson")).toBe(true)
  })
})
