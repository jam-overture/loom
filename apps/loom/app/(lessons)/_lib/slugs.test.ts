import { describe, expect, it } from "vitest"

import { RECALL_PARTS, lessonSlug, lessonSlugParts } from "./slugs"

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
