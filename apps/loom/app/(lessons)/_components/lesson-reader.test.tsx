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

const EXERCISES: readonly LessonPart[] = [
  {
    kind: "exercises",
    id: "try-it",
    heading: <h2>Try it</h2>,
    slug: "lesson-99-try-it",
    total: 2,
    failure: undefined,
    units: [
      { kind: "prose", id: "intro", node: <p>The preamble is shared by both exercises.</p> },
      { kind: "code", id: "preamble", node: <pre>const spare = idFactory()</pre>, run: undefined },
      {
        kind: "code",
        id: "a",
        node: <pre>console.log(inverse)</pre>,
        run: {
          number: 1,
          prompt: <p>Exercise 1. Write down what this prints.</p>,
          transcript: <pre>the first transcript</pre>,
        },
      },
      {
        kind: "code",
        id: "b",
        node: <pre>console.log(second)</pre>,
        run: {
          number: 2,
          prompt: <p>Exercise 2. Write down what this prints.</p>,
          transcript: <pre>the second transcript</pre>,
        },
      },
    ],
  },
  {
    kind: "answers",
    id: "try-it-answers",
    heading: <h2>The exercise answers</h2>,
    node: <p>Q1 is about what the inverse does not have to say.</p>,
    gate: { kind: "written", slug: "lesson-99-try-it", count: 2, prompt: undefined },
  },
]

const exercises = () => render(<LessonReader lesson={99} parts={EXERCISES} />)

describe("running a lesson's exercises", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("shows the code and holds every transcript back", () => {
    exercises()

    expect(screen.getByText(/console.log\(inverse\)/)).toBeTruthy()
    expect(screen.getByText(/console.log\(second\)/)).toBeTruthy()
    expect(screen.queryByText("the first transcript")).toBeNull()
    expect(screen.queryByText("the second transcript")).toBeNull()
  })

  it("asks for nothing against a fence that prints nothing", () => {
    exercises()

    expect(screen.getByText(/const spare = idFactory\(\)/)).toBeTruthy()
    expect(screen.getAllByText(/Write down what this prints/)).toHaveLength(1)
  })

  /**
   * The lesson says "predict every output in writing before you run anything",
   * and revealing the first transcript when the first prediction lands would
   * quietly make exercise 2 a different question.
   */
  it("reveals nothing until the last exercise has been predicted against", () => {
    exercises()
    predict("3", "A remove, naming the node.")

    expect(screen.queryByText("the first transcript")).toBeNull()
    expect(screen.getByText(/Exercise 2. Write down what this prints/)).toBeTruthy()

    predict("2", "Two lines, and the second is empty.")

    expect(screen.getByText("the first transcript")).toBeTruthy()
    expect(screen.getByText("the second transcript")).toBeTruthy()
  })

  it("keeps the printed answers behind the same predictions", () => {
    exercises()

    expect(screen.queryByText(/what the inverse does not have to say/)).toBeNull()
    expect(screen.getByText(/Locked until every exercise above has a prediction/)).toBeTruthy()

    predict("3", "A remove, naming the node.")
    predict("2", "Two lines, and the second is empty.")

    expect(screen.getByText(/what the inverse does not have to say/)).toBeTruthy()
  })

  it("says so, rather than showing an empty panel, when the exercises did not run", () => {
    render(
      <LessonReader
        lesson={99}
        parts={[
          {
            ...(EXERCISES[0] as Extract<LessonPart, { kind: "exercises" }>),
            total: 0,
            failure: "ReferenceError: buildElement is not defined",
            units: [{ kind: "code", id: "a", node: <pre>console.log(inverse)</pre>, run: undefined }],
          },
        ]}
      />
    )

    expect(screen.getByText(/These exercises did not run/)).toBeTruthy()
    expect(screen.getByText(/buildElement is not defined/)).toBeTruthy()
    expect(screen.queryByText(/Write down what this prints/)).toBeNull()
  })
})
