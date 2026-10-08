import { describe, expect, it } from "vitest"

import { parseReviewSchedule, REVIEW_SETS, reviewSet } from "./schedule"
import { readCourseFile } from "./source"
import { plainText, referencedLessons } from "./text"

/**
 * These run against the file in `lessons/`, not against a fixture.
 *
 * A fixture would test the parser against a copy of the schedule's shape, which
 * is the shape most likely to drift: the next lesson adds Set R by hand, in
 * markdown, and nothing about the fixture notices. Reading the real file means
 * a set the parser cannot read fails the build of all four surfaces, which is
 * the right amount of alarming.
 */

describe("the review schedule, read as a queue", () => {
  it("finds every set in the file, in order", () => {
    expect(REVIEW_SETS.map((set) => set.letter)).toEqual([
      ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      "AA",
      "AB",
      "AC",
      "AD",
      "AE",
      "AF",
      "AG",
      "AH",
      "AI",
      "AJ",
      "AK",
      "AL",
      "AM",
      "AN",
    ])
  })

  /**
   * The sets past Z, which are the ones the parser could not read. `## Set AA`
   * under a one-letter pattern was not a heading at all — it was a line inside
   * Set Z, and its questions would have been appended there in silence.
   * Asserted by name rather than by position, because the count is what the old
   * parser would still have got right, and because the last set changes every
   * time a lesson lands.
   */
  it("reads a two-letter set, and gives it a slug a record can be filed under", () => {
    expect(reviewSet("set-aa")?.letter).toBe("AA")
    expect(reviewSet("set-ab")?.letter).toBe("AB")
    expect(reviewSet("set-aa")?.questions).toHaveLength(8)
    expect(reviewSet("set-ab")?.questions).toHaveLength(8)
    expect(reviewSet("set-z")?.questions).toHaveLength(8)
  })

  it("stops at the tracking table rather than reading it as a set", () => {
    const last = REVIEW_SETS.at(-1)

    expect(last?.letter).toBe("AN")
    expect(last?.questions).toHaveLength(10)
    expect(last?.closing.join(" ")).not.toContain("Confident-and-wrong")
  })

  it("reads an anchor and a delay out of every heading", () => {
    for (const set of REVIEW_SETS) {
      expect([2, 7, 30]).toContain(set.delayDays)
      expect(set.anchor.kind === "lesson" ? set.anchor.lesson : set.anchor.part).toBeTruthy()
    }
  })

  it("anchors the consolidation sets to a part and the rest to a lesson", () => {
    const parts = REVIEW_SETS.filter((set) => set.anchor.kind === "part").map((set) => set.letter)

    expect(parts).toEqual(["E", "F", "M", "Q", "V"])
    expect(reviewSet("set-m")?.anchor).toEqual({ kind: "part", part: "II" })
    expect(reviewSet("set-m")?.delayDays).toBe(7)
    expect(reviewSet("set-q")?.anchor).toEqual({ kind: "part", part: "III" })
    expect(reviewSet("set-q")?.delayDays).toBe(7)
    expect(reviewSet("set-v")?.anchor).toEqual({ kind: "part", part: "IV" })
    expect(reviewSet("set-v")?.delayDays).toBe(7)
  })

  it("gives every set at least three questions and every question some text", () => {
    for (const set of REVIEW_SETS) {
      expect(set.questions.length).toBeGreaterThanOrEqual(3)

      for (const [index, question] of set.questions.entries()) {
        expect(question.number).toBe(index + 1)
        expect(question.text.length).toBeGreaterThan(20)
      }
    }
  })

  it("keeps a question's wrapped lines as one question", () => {
    const question = reviewSet("set-n")?.questions[0]

    expect(question?.text).toContain("ChangeInterpreter returns a ProposedChange")
    expect(question?.text).toContain("if a model were somehow trustworthy about ids")
  })

  it("separates the prose that introduces a set from the prose that closes it", () => {
    const set = reviewSet("set-n")

    expect(set?.notes.join(" ")).toContain("Interleaved with 01–10")
    expect(set?.closing.join(" ")).toContain("Question 4 is the slow one")
  })

  it("reads the lessons a question reaches into off its markers", () => {
    expect(reviewSet("set-n")?.questions[2]?.refs).toEqual([4, 5])
    expect(reviewSet("set-n")?.questions[4]?.refs).toEqual([7])
    expect(reviewSet("set-a")?.questions[0]?.refs).toEqual([])
  })

  it("loses no question when the whole file is parsed twice the same way", () => {
    const again = parseReviewSchedule(readCourseFile("review-schedule.md"))

    expect(again.flatMap((set) => set.questions)).toHaveLength(
      REVIEW_SETS.flatMap((set) => set.questions).length
    )
  })
})

describe("markdown that has to survive as a text node", () => {
  it("strips the markers a text node cannot carry, and the space they leave", () => {
    expect(plainText("Give the reason without the word \"trust\" *(04)*, then say why.")).toBe(
      'Give the reason without the word "trust", then say why.'
    )
    expect(plainText("The **whole** delta, `applied` or not, in *order*.")).toBe(
      "The whole delta, applied or not, in order."
    )
  })

  it("keeps a reference as data before it removes it as punctuation", () => {
    expect(referencedLessons("... *(07 for why measurement and judgment are kept apart)*")).toEqual([
      7,
    ])
  })
})
