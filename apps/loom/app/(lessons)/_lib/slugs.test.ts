import { describe, expect, it } from "vitest"

import { RECALL_PARTS, lessonSlug, lessonSlugParts, questionLabel } from "./slugs"

/**
 * The keys in the reader's record, read back.
 *
 * Nothing here is interesting on its own, which is the reason it is a file: the
 * corrections queue tells a lesson's Predict section apart from everything else
 * by reading a string, and a string it reads slightly differently from the
 * string the lesson route writes would be a silent, permanent wrong answer.
 */

describe("a slug", () => {
  it("round-trips every section that records an attempt", () => {
    for (const part of RECALL_PARTS) {
      expect(lessonSlugParts(lessonSlug(4, part))).toEqual({ lesson: 4, part })
    }
  })

  it("pads the number, because the record is read back as text", () => {
    expect(lessonSlug(4, "predict")).toBe("lesson-04-predict")
    expect(lessonSlug(17, "predict")).toBe("lesson-17-predict")
  })

  it("does not recognise Try it, which holds predictions nothing ever grades", () => {
    expect(lessonSlugParts(lessonSlug(4, "try-it"))).toBeUndefined()
  })

  it("says nothing about a review set, which is everything else", () => {
    expect(lessonSlugParts("set-d")).toBeUndefined()
  })

  it("returns undefined for a key it has never seen rather than throwing on it", () => {
    expect(lessonSlugParts("lesson-4-predict")).toBeUndefined()
    expect(lessonSlugParts("lesson-04-")).toBeUndefined()
    expect(lessonSlugParts("")).toBeUndefined()
  })
})

describe("what to call a question", () => {
  it("names a review set the way the schedule names it", () => {
    expect(questionLabel("set-d", 7)).toBe("Set D q7")
    expect(questionLabel("set-an", 2)).toBe("Set AN q2")
  })

  /**
   * The case the one-liner this replaced got wrong, in every panel that printed
   * one: `LESSON-04-SELF-CHECK q2`.
   */
  it("names a lesson's own section the way the lesson does", () => {
    for (const [part, expected] of [
      ["warm-up", "Warm-up"],
      ["predict", "Predict"],
      ["self-check", "Self-check"],
    ] as const) {
      expect(questionLabel(lessonSlug(4, part), 2)).toBe(`Lesson 04 ${expected} q2`)
    }
  })

  it("hands back a key it does not recognise rather than guessing at it", () => {
    expect(questionLabel("something-older", 1)).toBe("something-older q1")
  })
})
