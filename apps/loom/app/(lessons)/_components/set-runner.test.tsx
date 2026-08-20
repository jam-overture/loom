import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { SetRunner, type RunnableQuestion } from "./set-runner"

/**
 * What a sitting is, and what it refuses to be.
 *
 * The markdown shows a set's eight questions at once. That is convenient and it
 * quietly destroys the interleaving: question 5 mentions the thing question 2
 * asked about, so by the time the reader arrives they have been reminded rather
 * than tested. One question at a time is the version that works, and there is
 * deliberately no way to look ahead.
 */

const QUESTIONS: readonly RunnableQuestion[] = [
  { number: 1, body: <p>The four operations, with arguments, from memory.</p>, checkIn: [] },
  { number: 2, body: <p>Why is a half-applied delta worse than a rejected one?</p>, checkIn: [] },
]

const answerCurrent = (confidence: string, grade: string) => {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${confidence} —`) }))
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Written from memory." } })
  fireEvent.click(screen.getByRole("button", { name: "Submit, then check" }))
  fireEvent.click(screen.getByRole("button", { name: grade }))
}

const runner = () =>
  render(<SetRunner slug="set-c" letter="C" questions={QUESTIONS} closing={<p>Question 5 is the slow one.</p>} />)

describe("working through a set", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("shows one question, and not the one after it", () => {
    runner()

    expect(screen.getByText(/The four operations/)).toBeTruthy()
    expect(screen.queryByText(/half-applied delta/)).toBeNull()
  })

  it("advances only on a recorded attempt", () => {
    runner()
    answerCurrent("4", "Got it")

    expect(screen.getByText(/half-applied delta/)).toBeTruthy()
    expect(screen.getByText(/rated 4/).textContent).toContain("got it")
  })

  it("names the confident-and-wrong questions when the set runs out", () => {
    const { container } = runner()
    answerCurrent("5", "Missed it")
    answerCurrent("2", "Missed it")

    expect(container.textContent).toContain("Confident and wrong")
    expect(container.textContent).toContain("question 1")
    /** Rated 2 and missed is ordinary forgetting, and stays off this list. */
    expect(container.textContent).not.toContain("questions 1, 2")
    expect(screen.getByText(/Question 5 is the slow one/)).toBeTruthy()
  })

  it("says so plainly when nothing was confident and wrong", () => {
    runner()
    answerCurrent("5", "Got it")
    answerCurrent("1", "Missed it")

    expect(screen.getByText(/Nothing you were confident and wrong about/)).toBeTruthy()
  })

  it("remembers the sitting, so a set reopened resumes where it stopped", () => {
    const { unmount } = runner()
    answerCurrent("3", "Partly")
    unmount()

    runner()

    expect(screen.getByText(/half-applied delta/)).toBeTruthy()
    expect(screen.queryByText(/The four operations/)).toBeNull()
  })

  it("marks the set done only when the reader says so", () => {
    runner()
    answerCurrent("3", "Got it")
    answerCurrent("3", "Got it")

    expect(screen.getByRole("button", { name: "Mark this set done" })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Mark this set done" }))

    expect(screen.getByText(/^Done on /)).toBeTruthy()
  })
})
