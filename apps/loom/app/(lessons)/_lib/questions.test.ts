import { describe, expect, it } from "vitest"

import { keyOf } from "./corrections"
import { COURSE_QUESTIONS, QUESTION_KEYS } from "./questions"
import { REVIEW_SETS } from "./schedule"
import { lessonSlug } from "./slugs"

/**
 * The list against the course it was read out of.
 *
 * This is the join between two things that were written years apart in spirit:
 * the slug the lesson route files an answer under, and the slug this list
 * addresses a question by. They are strings and nothing checks that they agree,
 * so a renamed section would not fail a type — it would quietly stop a
 * question ever coming back, which is a bug the reader can only find by not
 * noticing something.
 */

const keys = new Set(QUESTION_KEYS)

describe("every question in the course", () => {
  it("keeps the review sets it always had", () => {
    for (const set of REVIEW_SETS) {
      for (const question of set.questions) {
        expect(keys.has(keyOf(set.slug, question.number))).toBe(true)
      }
    }
  })

  it("has the lessons' own graded sections in it too", () => {
    expect(keys.has(keyOf(lessonSlug(1, "predict"), 1))).toBe(true)
    expect(keys.has(keyOf(lessonSlug(4, "self-check"), 1))).toBe(true)
    expect(keys.has(keyOf(lessonSlug(4, "warm-up"), 1))).toBe(true)
  })

  it("addresses every question exactly once", () => {
    expect(QUESTION_KEYS).toHaveLength(keys.size)
  })

  it("has a label for each, and never one that is only a slug", () => {
    for (const question of COURSE_QUESTIONS) {
      expect(question.label).not.toContain("#")
      expect(question.label).not.toBe(question.set)
      expect(question.text.length).toBeGreaterThan(0)
    }
  })

  /**
   * Where to check is the one thing a correction adds to a question, and a
   * Warm-up question is the case where the obvious answer is wrong: it is asked
   * *before* its own lesson and is about the ones before that, so pointing at
   * the lesson it appears in would point at a page that does not answer it.
   */
  it("does not send a Warm-up question to the lesson it appears in", () => {
    const warmUps = COURSE_QUESTIONS.filter((question) => question.set.endsWith("-warm-up"))

    expect(warmUps.length).toBeGreaterThan(0)

    for (const question of warmUps) {
      const lesson = Number(question.set.slice("lesson-".length, "lesson-".length + 2))

      expect(question.checkIn.map((pointer) => pointer.name)).not.toContain(String(lesson).padStart(2, "0"))
    }
  })

  it("sends a Self-check question to its own lesson, where the answer is", () => {
    const selfChecks = COURSE_QUESTIONS.filter((question) => question.set.endsWith("-self-check"))

    expect(selfChecks.length).toBeGreaterThan(0)

    for (const question of selfChecks) {
      const lesson = Number(question.set.slice("lesson-".length, "lesson-".length + 2))

      expect(question.checkIn.map((pointer) => pointer.name)).toContain(String(lesson).padStart(2, "0"))
    }
  })

  /**
   * On the lesson page a Predict question has nowhere to check, because the
   * reader is standing above the explanation. A day later they have read it, so
   * it does.
   */
  it("sends a prediction back to its lesson, which it could not do on the day", () => {
    const predictions = COURSE_QUESTIONS.filter((question) => question.set.endsWith("-predict"))

    expect(predictions.length).toBeGreaterThan(0)

    for (const question of predictions) {
      expect(question.checkIn.length).toBeGreaterThan(0)
    }
  })
})

/**
 * The framing, and the rubric that is not framing.
 *
 * A question lifted out of its section loses whatever paragraph set it up, and
 * for five of the seventeen Predict sections that paragraph is the difference
 * between a hard question and an unanswerable one. The rule that keeps it —
 * drop the first paragraph, keep the rest — reads as an off-by-one unless the
 * convention it depends on is checked, so it is checked here.
 */
describe("the framing a question is asked with", () => {
  const contextOf = (set: string, number: number): string =>
    (COURSE_QUESTIONS.find((question) => question.set === set && question.number === number)
      ?.context ?? [])
      .map((block) => (block.kind === "paragraph" ? block.text : ""))
      .join(" ")

  it("keeps the scenario a Predict question cannot be asked without", () => {
    expect(contextOf(lessonSlug(4, "predict"), 1)).toContain("A reviewer flags a node")
    expect(contextOf(lessonSlug(2, "predict"), 1)).toContain("React has dozens of node types")
  })

  it("gives the same scenario to every question in that set, since they share it", () => {
    expect(contextOf(lessonSlug(4, "predict"), 3)).toBe(contextOf(lessonSlug(4, "predict"), 1))
  })

  it("carries nothing for a Predict section that poses no scenario", () => {
    expect(contextOf(lessonSlug(9, "predict"), 1)).toBe("")
  })

  /**
   * The rubric is not merely noise here — it contradicts the sitting. "Mixed
   * across five lessons" describes the Warm-up it was written for, and a
   * question that arrived from one of five different places has left that
   * behind.
   */
  it("never carries a section's own rubric into a sitting that has its own", () => {
    for (const question of COURSE_QUESTIONS) {
      const context = contextOf(question.set, question.number)

      expect(context).not.toContain("before reading on")
      expect(context).not.toContain("Closed book")
      expect(context).not.toContain("rate your confidence")
    }
  })

  it("carries nothing at all for a review set, which stands alone by construction", () => {
    for (const question of COURSE_QUESTIONS.filter((each) => each.set.startsWith("set-"))) {
      expect(question.context).toHaveLength(0)
    }
  })
})
