import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { LessonReader, type LessonPart } from "./lesson-reader"

/**
 * Three things the paper version cannot do, asserted as absences.
 *
 * Every test here checks that something is *not* on the screen: the
 * explanation before the predictions are written, the printed answers before
 * the questions are attempted, a grade before there is anything to grade. Those
 * absences are the entire argument for this surface existing — a lesson read in
 * a text editor has all three available at all times, and the reader who uses
 * them feels like they are learning.
 */

const PARTS: readonly LessonPart[] = [
  {
    kind: "predict",
    id: "predict",
    heading: <h2>Predict</h2>,
    slug: "lesson-99-predict",
    intro: <p>In writing, before reading on.</p>,
    outro: <p>Predict 1 asks you to design a loop.</p>,
    questions: [
      { number: 1, body: <p>How many attempts, and where does the count live?</p>, checkIn: [] },
      { number: 2, body: <p>What would you hand the thing doing the revision?</p>, checkIn: [] },
    ],
  },
  { kind: "prose", id: "idea", node: <p>A repair is a fresh proposal, not a patch.</p> },
  {
    kind: "recall",
    id: "self-check",
    heading: <h2>Self-check</h2>,
    slug: "lesson-99-self-check",
    intro: <p>Rate your confidence before you write.</p>,
    outro: <p>Question 3 is the slow one.</p>,
    questions: [{ number: 1, body: <p>What does "structurally" buy?</p>, checkIn: [] }],
  },
  {
    kind: "answers",
    id: "self-check-answers",
    heading: <h2>The Self-check answers</h2>,
    node: <p>Because there is no path back into the function.</p>,
    gate: { kind: "attempted", slug: "lesson-99-self-check", count: 1, of: "Self-check" },
  },
  {
    kind: "reflect",
    id: "reflect",
    heading: <h2>Reflect</h2>,
    node: <p>Which prediction were you most confidently wrong about?</p>,
    slug: "lesson-99-predict",
    questions: [
      { number: 1, body: <p>How many attempts, and where does the count live?</p>, checkIn: [] },
      { number: 2, body: <p>What would you hand the thing doing the revision?</p>, checkIn: [] },
    ],
  },
]

const reader = () => render(<LessonReader lesson={99} parts={PARTS} />)

const predict = (confidence: string, written: string) => {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${confidence} —`) }))
  fireEvent.change(screen.getByRole("textbox"), { target: { value: written } })
  fireEvent.click(screen.getByRole("button", { name: "Commit to this" }))
}

describe("reading a lesson", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("does not show the lesson until every prediction is written down", () => {
    reader()

    expect(screen.getByText(/How many attempts/)).toBeTruthy()
    expect(screen.queryByText(/A repair is a fresh proposal/)).toBeNull()
    expect(screen.getByText(/It unlocks when every prediction above/)).toBeTruthy()
  })

  it("shows one prediction at a time, so question 2 cannot prime question 1", () => {
    reader()

    expect(screen.queryByText(/What would you hand the thing/)).toBeNull()

    predict("2", "A counter, initialised to one.")

    expect(screen.getByText(/What would you hand the thing/)).toBeTruthy()
  })

  it("unlocks the rest of the lesson once the last prediction is committed", () => {
    reader()
    predict("2", "A counter, initialised to one.")
    predict("4", "The reason code, and nothing else.")

    expect(screen.getByText(/A repair is a fresh proposal/)).toBeTruthy()
    expect(screen.queryByText(/It unlocks when every prediction above/)).toBeNull()
  })

  it("keeps the printed answers locked until the questions above them are attempted", () => {
    reader()
    predict("2", "A counter, initialised to one.")
    predict("4", "The reason code, and nothing else.")

    expect(screen.queryByText(/no path back into the function/)).toBeNull()
    expect(screen.getByText(/Locked until you have answered all 1 Self-check/)).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: /^3 —/ }))
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "It removes the dial." } })
    fireEvent.click(screen.getByRole("button", { name: "Submit, then check" }))
    fireEvent.click(screen.getByRole("button", { name: "Got it" }))

    expect(screen.getByText(/no path back into the function/)).toBeTruthy()
  })

  it("brings each prediction back at Reflect, carrying the rating given before the lesson", () => {
    reader()
    predict("2", "A counter, initialised to one.")
    predict("4", "The reason code, and nothing else.")

    expect(screen.getByText("Prediction 1 — rated 2 on", { exact: false })).toBeTruthy()
    expect(screen.getByText(/A counter, initialised to one./)).toBeTruthy()
  })

  it("scores a prediction as confident and wrong, which is the pair worth having", () => {
    reader()
    predict("2", "A counter, initialised to one.")
    predict("4", "The reason code, and nothing else.")

    fireEvent.click(
      screen.getByRole("group", { name: "Grade prediction 2" }).querySelector("button:last-of-type") as Element
    )

    expect(screen.getByText(/Confident and wrong/)).toBeTruthy()
  })

  it("offers the date the whole schedule is a function of, once the gate is open", () => {
    reader()

    expect(screen.queryByRole("button", { name: /worked through this today/ })).toBeNull()

    predict("2", "A counter, initialised to one.")
    predict("4", "The reason code, and nothing else.")

    fireEvent.click(screen.getByRole("button", { name: /worked through this today/ }))

    expect(screen.getByText(/The queue knows what that makes due/)).toBeTruthy()
  })
})
