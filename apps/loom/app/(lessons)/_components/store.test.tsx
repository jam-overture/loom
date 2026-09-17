import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { LessonLog } from "./lesson-log"
import { DueSummary } from "./queue"
import { ClockProvider, ProgressProvider } from "./store"
import type { LessonPointer } from "../_lib/links"
import type { ScheduledSet } from "../_lib/queue"

/**
 * One record for a page, which is what `/lessons` always looked like and was
 * not.
 *
 * Every component here called `useProgress`, and `useProgress` was the store:
 * each caller read the same key into its own `useState` and kept its own copy.
 * Read-only that is merely wasteful. The front page of the course is not
 * read-only — it is the page with the syllabus on it — so marking lesson 01
 * moved the syllabus and left the line above it reporting a queue computed from
 * the record as it was before the click, until a reload.
 *
 * Found while building the notice, whose whole job is to tell a reader
 * something a *different* component's write has just discovered.
 */

const SETS: readonly ScheduledSet[] = [
  {
    letter: "A",
    slug: "set-a",
    timing: "two days after lesson 01",
    anchor: { kind: "lesson", lesson: 1 },
    delayDays: 2,
  },
]

const PARTS = { I: [1] }

const LESSONS: readonly LessonPointer[] = [
  { number: 1, title: "Why a runtime", href: "/lessons/01" },
]

const TODAY = "2026-09-17"

beforeEach(() => {
  window.localStorage.clear()
})

describe("the record a page shares", () => {
  it("moves the due line when the syllabus below it is marked", () => {
    render(
      <ClockProvider clock={() => TODAY}>
        <ProgressProvider>
          <DueSummary sets={SETS} parts={PARTS} questionKeys={[]} />
          <LessonLog lessons={LESSONS} />
        </ProgressProvider>
      </ClockProvider>
    )

    expect(screen.getByText(/No review set has a date yet/)).toBeDefined()

    fireEvent.click(screen.getByText("I worked through this today"))

    /**
     * Two days after today, so it is not due — and the summary now knows that,
     * which is the whole assertion. Before the provider it still said no set had
     * a date, because it was reading a copy taken before the click.
     */
    expect(screen.queryByText(/No review set has a date yet/)).toBeNull()
    expect(screen.getByText(/No set is due for review today/)).toBeDefined()
    expect(screen.getByText(/worked through 2026-09-17/)).toBeDefined()
  })

  /**
   * The fallback the hook has always promised, kept: a component rendered on its
   * own still has a working store. Every other test file on this surface renders
   * one component and no provider, and none of them had to change.
   */
  it("still works for a component rendered without a provider", () => {
    render(
      <ClockProvider clock={() => TODAY}>
        <LessonLog lessons={LESSONS} />
      </ClockProvider>
    )

    fireEvent.click(screen.getByText("I worked through this today"))

    expect(screen.getByText(/worked through 2026-09-17/)).toBeDefined()
    expect(window.localStorage.getItem("loom.lessons.progress.v1")).toContain("2026-09-17")
  })
})
