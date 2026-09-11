import { render } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it } from "vitest"

import { Queue } from "./queue"
import { ClockProvider } from "./store"
import type { ScheduledSet } from "../_lib/queue"

/**
 * The queue as the reader meets it: a stored record, a day, and a list that says
 * what to do now and refuses to offer what is not due yet.
 *
 * The day is *given*, and that is the whole reason this file reads the way it
 * does. It used to build its fixtures from `Date.now()` as a UTC calendar date
 * and assert against labels the queue computed from a local one — the same day
 * for most of the day, and a different one after 17:00 in California, where these
 * two assertions failed on a maintainer's machine while CI stayed green in UTC.
 * A test that says what day it is cannot disagree with the machine it runs on.
 */

const SETS: readonly ScheduledSet[] = [
  { letter: "A", slug: "set-a", timing: "two days after lesson 01", anchor: { kind: "lesson", lesson: 1 }, delayDays: 2 },
  { letter: "B", slug: "set-b", timing: "two days after lesson 02", anchor: { kind: "lesson", lesson: 2 }, delayDays: 2 },
  { letter: "E", slug: "set-e", timing: "one week after Part I", anchor: { kind: "part", part: "I" }, delayDays: 7 },
]

const PARTS = { I: [1, 2] }

const TODAY = "2026-09-05"

/**
 * The questions the course contains, as the index is told about them. A lesson's
 * own Self-check question is in here beside a review set's, because the corrections
 * queue draws from both and this panel has to count what the sitting can render.
 */
const KEYS: readonly string[] = ["set-a#1", "set-a#2", "set-b#1", "lesson-01-self-check#1"]

const stored = (progress: unknown) => {
  window.localStorage.setItem("loom.lessons.progress.v1", JSON.stringify(progress))
}

/** Days before the given day, arrived at without asking the machine anything. */
const daysAgo = (days: number, from = TODAY): string =>
  new Date(Date.parse(`${from}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10)

const on = (day: string, ui: ReactNode) => render(<ClockProvider clock={() => day}>{ui}</ClockProvider>)

describe("the review queue", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("gives a reader who has done nothing three sets and nothing to do", () => {
    const { container } = on(TODAY, <Queue sets={SETS} parts={PARTS} questionKeys={KEYS} />)

    expect(container.textContent).toContain("Waiting on a lesson (3)")
    expect(container.textContent).toContain("No set is due today")
    expect(container.textContent).toContain("when lesson 01 is done")
  })

  it("puts a set in the queue two days after the lesson it follows", () => {
    stored({ lessons: { "1": daysAgo(3) }, sets: {} })

    const { container } = on(TODAY, <Queue sets={SETS} parts={PARTS} questionKeys={KEYS} />)

    expect(container.textContent).toContain("Today\u2019s sitting")
    expect(container.textContent).toContain("Set A — two days after lesson 01")
    expect(container.textContent).toContain("Due 1 day ago")
    expect(container.textContent).not.toContain("Also overdue")
  })

  it("holds a set back while its gap is still doing the work", () => {
    stored({ lessons: { "1": daysAgo(1) }, sets: {} })

    const { container } = on(TODAY, <Queue sets={SETS} parts={PARTS} questionKeys={KEYS} />)

    expect(container.textContent).toContain("Coming up (1)")
    expect(container.textContent).toContain("in 1 day, on")
  })

  /**
   * The bug this seam exists for, asserted rather than described. One stored
   * record, two days, and the labels move by exactly the difference — which is
   * what a queue reading an ambient clock cannot promise, because the day it
   * reads and the day its caller meant were free to disagree.
   */
  it("counts from the day it is given, not the day the machine is having", () => {
    stored({ lessons: { "1": daysAgo(3) }, sets: {} })

    const first = on(TODAY, <Queue sets={SETS} parts={PARTS} questionKeys={KEYS} />)
    expect(first.container.textContent).toContain("Due 1 day ago")

    first.unmount()

    const next = on(daysAgo(-1), <Queue sets={SETS} parts={PARTS} questionKeys={KEYS} />)
    expect(next.container.textContent).toContain("Due 2 days ago")
  })

  it("counts a part from its last lesson, so Part I's set arrives a week after 02", () => {
    stored({ lessons: { "1": daysAgo(30), "2": daysAgo(8) }, sets: {} })

    const { container } = on(TODAY, <Queue sets={SETS} parts={PARTS} questionKeys={KEYS} />)

    /** Three are late, and exactly one of them is offered as today's sitting. */
    expect(container.textContent).toContain("Today\u2019s sitting")
    expect(container.textContent).toContain("Also overdue (2)")
    expect(container.textContent).toContain("massed practice")
  })

  it("reports the pair the schedule asks the reader to keep by hand", () => {
    stored({
      lessons: { "1": daysAgo(9) },
      sets: {
        "set-a": {
          completedOn: daysAgo(1),
          attempts: [
            { question: 1, confidence: 5, grade: "missed", answer: "", on: daysAgo(1) },
            { question: 2, confidence: 2, grade: "missed", answer: "no", on: daysAgo(1) },
            { question: 3, confidence: 4, grade: "got-it", answer: "yes", on: daysAgo(1) },
          ],
        },
      },
    })

    const { container } = on(TODAY, <Queue sets={SETS} parts={PARTS} questionKeys={KEYS} />)

    expect(container.textContent).toContain("Confident and wrong: 1")
    expect(container.textContent).toContain("SET A q1")
    expect(container.textContent).toContain("1 of 3 questions got")
    expect(container.textContent).toContain("Behind you (1)")
  })
})
