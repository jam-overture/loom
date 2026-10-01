import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { buildFragment, prose } from "../_lib/loom"
import { forgetHeld } from "./held"
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
 *
 * **Not on the screen was never the claim worth making**, and these tests were
 * the reason nobody noticed. Every one of them passed while the printed answers
 * and every transcript sat in the flight payload of the page they were rendered
 * from — hidden by a component, and present in the document. So two of the
 * absences below are now absences from the *page*, asserted the only way that
 * can be: nothing is fetched until the gate opens, which means there was nothing
 * to find until then.
 */

const SELF_CHECK_ANSWERS = "/lessons/99/held/self-check-answers"
const EXERCISE_ANSWERS = "/lessons/99/held/exercise-answers"
const TRANSCRIPTS = "/lessons/99/held/transcripts"

/**
 * A held fragment as it actually travels: a tree, serialised, parsed back by
 * the same boundary parse the browser uses. Nothing here is stubbed but the
 * network — a mocked renderer would let a fixture pass that the real one would
 * refuse, and the point of these tests is what the reader is given.
 */
const tree = (text: string): unknown =>
  JSON.parse(JSON.stringify(buildFragment((ids) => [prose(ids, text)], "held")))

const DOCUMENTS: Record<string, Record<string, unknown>> = {
  [SELF_CHECK_ANSWERS]: { only: tree("Because there is no path back into the function.") },
  [EXERCISE_ANSWERS]: { only: tree("Q1 is about what the inverse does not have to say.") },
  [TRANSCRIPTS]: {
    "1": tree("the first transcript"),
    "2": tree("the second transcript"),
    p1: tree("the output the lesson printed for itself"),
  },
}

const served = () => {
  const fetching = vi.fn(async (href: string) => {
    const slots = DOCUMENTS[String(href)]

    return slots === undefined
      ? { ok: false, status: 404 }
      : { ok: true, json: async () => ({ slots }) }
  })

  vi.stubGlobal("fetch", fetching)

  return fetching
}

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
    held: { href: SELF_CHECK_ANSWERS, slot: "only" },
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
    forgetHeld()
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

  it("does not have the printed answers until the questions above them are attempted", async () => {
    const fetching = served()

    reader()
    predict("2", "A counter, initialised to one.")
    predict("4", "The reason code, and nothing else.")

    expect(screen.queryByText(/no path back into the function/)).toBeNull()
    expect(screen.getByText(/Not here until you have answered all 1 Self-check/)).toBeTruthy()

    /**
     * The assertion this file was missing. Not-on-the-screen was true of the
     * old reader too, with the answer sitting in the page underneath it; not
     * having asked for it yet is the thing that cannot be true of content the
     * page is carrying.
     */
    expect(fetching).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: /^3 —/ }))
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "It removes the dial." } })
    fireEvent.click(screen.getByRole("button", { name: "Submit, then check" }))
    fireEvent.click(screen.getByRole("button", { name: "Got it" }))

    expect(await screen.findByText(/no path back into the function/)).toBeTruthy()
    expect(fetching).toHaveBeenCalledWith(SELF_CHECK_ANSWERS)
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
          held: { href: TRANSCRIPTS, slot: "1" },
        },
      },
      {
        kind: "code",
        id: "b",
        node: <pre>console.log(second)</pre>,
        run: {
          number: 2,
          prompt: <p>Exercise 2. Write down what this prints.</p>,
          held: { href: TRANSCRIPTS, slot: "2" },
        },
      },
      { kind: "printed", id: "printed", held: { href: TRANSCRIPTS, slot: "p1" } },
    ],
  },
  {
    kind: "answers",
    id: "try-it-answers",
    heading: <h2>The exercise answers</h2>,
    held: { href: EXERCISE_ANSWERS, slot: "only" },
    gate: { kind: "written", slug: "lesson-99-try-it", count: 2, prompt: undefined },
  },
]

const exercises = () => render(<LessonReader lesson={99} parts={EXERCISES} />)

describe("running a lesson's exercises", () => {
  beforeEach(() => {
    window.localStorage.clear()
    forgetHeld()
  })

  it("shows the code and does not have a transcript in the page at all", () => {
    const fetching = served()

    exercises()

    expect(screen.getByText(/console.log\(inverse\)/)).toBeTruthy()
    expect(screen.getByText(/console.log\(second\)/)).toBeTruthy()
    expect(screen.queryByText("the first transcript")).toBeNull()
    expect(screen.queryByText("the second transcript")).toBeNull()
    expect(fetching).not.toHaveBeenCalled()
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
  it("reveals nothing until the last exercise has been predicted against", async () => {
    const fetching = served()

    exercises()
    predict("3", "A remove, naming the node.")

    expect(screen.queryByText("the first transcript")).toBeNull()
    expect(screen.getByText(/Exercise 2. Write down what this prints/)).toBeTruthy()
    expect(fetching).not.toHaveBeenCalled()

    predict("2", "Two lines, and the second is empty.")

    expect(await screen.findByText("the first transcript")).toBeTruthy()
    expect(await screen.findByText("the second transcript")).toBeTruthy()
  })

  /**
   * Six transcripts are six slots of one document, and a reader who unlocks
   * them should cost one request rather than six of the same file.
   */
  it("fetches the transcripts once, however many fences read from them", async () => {
    const fetching = served()

    exercises()
    predict("3", "A remove, naming the node.")
    predict("2", "Two lines, and the second is empty.")

    await screen.findByText("the second transcript")

    expect(fetching.mock.calls.filter(([href]) => href === TRANSCRIPTS)).toHaveLength(1)
  })

  it("keeps the printed answers behind the same predictions", async () => {
    served()

    exercises()

    expect(screen.queryByText(/what the inverse does not have to say/)).toBeNull()
    expect(screen.getByText(/Not here until every exercise above has a prediction/)).toBeTruthy()

    predict("3", "A remove, naming the node.")
    predict("2", "Two lines, and the second is empty.")

    expect(await screen.findByText(/what the inverse does not have to say/)).toBeTruthy()
  })

  /**
   * A held fragment that does not arrive is the one failure mode this split
   * introduced, and a blank space where an answer was is the worst possible
   * shape for it: the reader cannot tell it from a gate that has not opened.
   */
  /**
   * The lesson prints its own output under the sentence asking the reader to
   * predict it. On the page that is an answer beside its question, and it is
   * the one thing in Try it that was never behind any gate at all.
   */
  it("holds the output the lesson printed for itself, under the same gate", async () => {
    served()

    exercises()

    expect(screen.queryByText(/the output the lesson printed for itself/)).toBeNull()
    expect(screen.getByText(/The lesson prints its output here/)).toBeTruthy()

    predict("3", "A remove, naming the node.")
    predict("2", "Two lines, and the second is empty.")

    expect(await screen.findByText(/the output the lesson printed for itself/)).toBeTruthy()
  })

  it("says so when a held fragment does not arrive", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500 })))

    exercises()
    predict("3", "A remove, naming the node.")
    predict("2", "Two lines, and the second is empty.")

    expect(await screen.findAllByText(/This did not arrive/)).toBeTruthy()
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

/**
 * The elaboration section, which gates nothing and is the only part of this file
 * not asserting an absence from the payload.
 *
 * There is nothing to withhold: an `Explain it back` prompt has no answer
 * anywhere, which is what makes the words worth writing. So what is asserted here
 * is the two things that are actually load-bearing — that no confidence is asked
 * for, because a rating with no outcome measures fluency, and that the reader's
 * own earlier explanation arrives **after** they have written and not before,
 * because arriving before is reading your notes.
 */
describe("explaining it back", () => {
  const ELABORATE: readonly LessonPart[] = [
    {
      kind: "elaborate",
      id: "explain-it-back",
      heading: <h2>Explain it back</h2>,
      slug: "lesson-99-explain-it-back",
      intro: <p>Closed book.</p>,
      outro: <p>Prompt 2 is the one that transfers.</p>,
      questions: [
        {
          number: 1,
          body: <p>Explain the ladder to somebody who wrote the OR-of-predicates version.</p>,
          reaches: [],
        },
        {
          number: 2,
          body: <p>Derive it from lesson 08.</p>,
          reaches: [
            {
              lesson: 8,
              title: "Two axes: stakes and reversibility",
              href: "/lessons/08",
              slug: "lesson-08-explain-it-back",
            },
          ],
        },
      ],
    },
  ]

  const held = (progress: unknown): void => {
    window.localStorage.setItem("loom.lessons.progress.v1", JSON.stringify(progress))
  }

  const explain = (written: string) => {
    fireEvent.change(screen.getByRole("textbox"), { target: { value: written } })
    fireEvent.click(screen.getByRole("button", { name: "That is my explanation" }))
  }

  beforeEach(() => {
    window.localStorage.clear()
    forgetHeld()
  })

  it("asks for no confidence, and says why the control is missing", () => {
    render(<LessonReader lesson={99} parts={ELABORATE} />)

    expect(screen.queryByRole("group", { name: "Confidence" })).toBeNull()
    expect(screen.getByText(/Nothing to rate here/)).toBeTruthy()
  })

  it("takes one prompt at a time and requires something written", () => {
    render(<LessonReader lesson={99} parts={ELABORATE} />)

    expect(screen.queryByText(/Derive it from lesson 08/)).toBeNull()

    explain("Their version cannot say which rule chose the outcome.")

    expect(screen.getByText(/Derive it from lesson 08/)).toBeTruthy()
  })

  it("does not show what you wrote about lesson 08 until you have written this one", () => {
    held({
      explanations: {
        "lesson-08-explain-it-back": [
          { question: 1, answer: "Stakes and reversibility are independent.", on: "2026-09-01" },
        ],
      },
    })

    render(<LessonReader lesson={99} parts={ELABORATE} />)

    expect(screen.queryByText(/Stakes and reversibility are independent/)).toBeNull()

    explain("Their version cannot say which rule chose the outcome.")
    explain("Every combination has to be reachable.")

    expect(screen.getByText(/Stakes and reversibility are independent/)).toBeTruthy()
    expect(screen.getByText(/prompt 1, 2026-09-01/)).toBeTruthy()
  })

  /**
   * Two ways of having nothing to compare against, and they are different facts
   * about the reader: one never wrote anything there, the other wrote that they
   * could not. Only the second is about their understanding, and a blank would
   * have said both.
   */
  it("says which kind of nothing it has, when it has nothing", () => {
    render(<LessonReader lesson={99} parts={ELABORATE} />)

    explain("Their version cannot say which rule chose the outcome.")
    explain("Every combination has to be reachable.")

    expect(screen.getByText(/this is the one thing here that only you can have put there/)).toBeTruthy()
  })

  it("says the other kind when the earlier explanation said it could not be given", () => {
    held({
      explanations: { "lesson-08-explain-it-back": [{ question: 1, answer: "", on: "2026-09-01" }] },
    })

    render(<LessonReader lesson={99} parts={ELABORATE} />)

    explain("Their version cannot say which rule chose the outcome.")
    explain("Every combination has to be reachable.")

    expect(screen.getByText(/beyond saying at the time that you could not explain it yet/)).toBeTruthy()
  })

  it("brings the reader's own words back beside the prompt that asked for them", () => {
    render(<LessonReader lesson={99} parts={ELABORATE} />)

    explain("Their version cannot say which rule chose the outcome.")
    explain("Every combination has to be reachable.")

    expect(screen.getByText(/Their version cannot say which rule chose/)).toBeTruthy()
    expect(screen.getByText(/Prompt 2 is the one that transfers/)).toBeTruthy()
  })

  it("records an explanation that says nothing, rather than refusing to move on", () => {
    render(<LessonReader lesson={99} parts={ELABORATE} />)

    fireEvent.click(screen.getByRole("button", { name: "I can’t explain this yet" }))

    expect(screen.getByText(/Derive it from lesson 08/)).toBeTruthy()
  })
})
