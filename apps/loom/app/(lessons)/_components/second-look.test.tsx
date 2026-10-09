import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { SecondLookPanel } from "./second-look"
import type { Progress } from "../_lib/progress"

/**
 * The panel that says how the questions that came back went.
 *
 * Three properties are worth holding and none of them is layout. The panel must
 * not appear for a reader who has never come back, because a box saying nothing
 * on a page the reader opens every day is how a surface teaches somebody to stop
 * reading it. It must say, in words rather than in a footnote, that these
 * numbers are a different population from the ones above — a figure assembled
 * from a cold rating and a post-lookup rating, with nothing saying which, is the
 * fault lesson 35 is about and this panel is one `concat` away from being it.
 * And a re-answer the reader rated 2 must not be reported as a relapse, because
 * being unsure, wrong, and unsure again is the schedule working.
 */

const KEY = "loom.lessons.progress.v1"

const sat = (confidence: 1 | 2 | 3 | 4 | 5) => ({
  attempts: [
    { question: 1, confidence, answer: "written down", grade: "missed" as const, on: "2026-03-03" },
  ],
  completedOn: "2026-03-03",
})

const RECORD: Progress = {
  lessons: { "4": "2026-03-01" },
  sets: { "set-a": sat(5), "set-b": sat(2) },
  predictions: {},
  explanations: {},
  corrections: [
    {
      set: "set-a",
      question: 1,
      confidence: 5,
      answer: "sharks-are-fish-and-whales-are-not",
      grade: "missed",
      on: "2026-03-04",
    },
    {
      set: "set-b",
      question: 1,
      confidence: 2,
      answer: "an-id-says-nothing-about-position",
      grade: "missed",
      on: "2026-03-04",
    },
  ],
}

const store = (progress: Progress): void => {
  window.localStorage.setItem(KEY, JSON.stringify(progress))
}

beforeEach(() => {
  window.localStorage.clear()
})

describe("on a second look", () => {
  it("says nothing to a reader who has never come back", () => {
    store({ ...RECORD, corrections: [] })
    render(<SecondLookPanel />)

    expect(screen.queryByLabelText("On a second look")).toBeNull()
  })

  it("counts the re-answers and keeps them apart from the first reading in words", () => {
    store(RECORD)
    render(<SecondLookPanel />)

    expect(screen.getByText(/0 of 2 re-answers got/)).toBeTruthy()
    expect(document.body.textContent).toContain("kept apart from the numbers above")
    expect(document.body.textContent).toContain("look the specific point up")
  })

  it("reports a rating given on the way back, in its own band", () => {
    store(RECORD)
    render(<SecondLookPanel />)

    expect(screen.getByText(/Rated 5 on the way back: 0 of 1 got/)).toBeTruthy()
    expect(screen.getByText(/Rated 2 on the way back: 0 of 1 got/)).toBeTruthy()
  })

  it("counts only the sure ones as relapses, and names which were sure twice", () => {
    store(RECORD)
    render(<SecondLookPanel />)

    expect(screen.getByText(/Sure again and wrong: 1/)).toBeTruthy()
    expect(document.body.textContent).toContain("Set A q1")
    expect(document.body.textContent).not.toContain("Set B q1")
    expect(screen.getByText(/1 of those was rated 4 or 5 the first time too/)).toBeTruthy()
  })

  /**
   * A reader who was unsure, missed, read the answer, came back and was unsure
   * again has done nothing wrong, and the panel has to be able to say so without
   * the paragraph that is about a belief surviving contradiction.
   */
  it("leaves out the belief paragraph when nothing survived contradiction", () => {
    store({ ...RECORD, corrections: [RECORD.corrections[1]!] })
    render(<SecondLookPanel />)

    expect(screen.getByText(/Sure again and wrong: 0/)).toBeTruthy()
    expect(document.body.textContent).not.toContain("the first time too")
  })

  /**
   * The answers in the fixture are nonsense strings on purpose. The first
   * version of this test used *still sure* and *still not sure*, and it failed —
   * on the panel's own closing paragraph, which contains the words *came back to
   * a day later still sure of*. Nothing had leaked. A fixture whose answer is a
   * phrase the surface might plausibly write cannot tell a leak from a sentence.
   */
  /**
   * A lesson's own question is named the way the lesson names it, not the way
   * the record files it. The two existing panels print the slug, which reads as
   * `LESSON-04-SELF-CHECK` once a lesson question reaches one of them.
   */
  it("names a lesson's question as a lesson's question", () => {
    store({
      ...RECORD,
      sets: { "lesson-04-self-check": sat(5) },
      corrections: [
        {
          set: "lesson-04-self-check",
          question: 2,
          confidence: 4,
          answer: "nothing-the-panel-would-ever-write",
          grade: "missed",
          on: "2026-03-04",
        },
      ],
    })
    render(<SecondLookPanel />)

    expect(document.body.textContent).toContain("Lesson 04 Self-check q2")
  })

  /**
   * A list that stops at six must say that it stopped. The panel above this one
   * truncates silently, which is the thing the rest of this surface spends its
   * time refusing to do.
   */
  it("says how many relapses it is not naming", () => {
    store({
      ...RECORD,
      sets: { "set-a": sat(5) },
      corrections: Array.from({ length: 8 }, (_, index) => ({
        set: "set-a",
        question: index + 1,
        confidence: 5 as const,
        answer: `answer-${index}`,
        grade: "missed" as const,
        on: "2026-03-04",
      })),
    })
    render(<SecondLookPanel />)

    expect(screen.getByText(/Sure again and wrong: 8/)).toBeTruthy()
    expect(document.body.textContent).toContain("and 2 more.")
  })

  it("never prints a word the reader wrote", () => {
    store(RECORD)
    render(<SecondLookPanel />)

    expect(document.body.textContent).not.toContain("sharks-are-fish")
    expect(document.body.textContent).not.toContain("an-id-says-nothing")
  })
})
