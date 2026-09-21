import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { Corrections, CorrectionsPanel, type CorrectionQuestion } from "./corrections"
import { ClockProvider, ProgressProvider, RecordStoreProvider } from "./store"
import type { Correction, Grade, Progress } from "../_lib/progress"
import { RECORD_KEY, type RecordStore } from "../_lib/reading"

/**
 * The sitting made of other sittings' failures.
 *
 * Everything here is about what the reader is *not* shown. They are not shown
 * which set a question came from, because that is half the answer to an
 * interleaved question. They are not shown more than five at once, because a
 * backlog handed over in one afternoon is massed practice. And they are not
 * shown a question they have already answered today, because the gap is the
 * mechanism and a gap of zero is a lookup.
 */

const QUESTIONS: readonly CorrectionQuestion[] = [
  {
    set: "set-d",
    label: "Set D",
    number: 7,
    body: <p>A delta removes a card and then inserts something at the card&rsquo;s id.</p>,
    checkIn: [],
  },
  {
    set: "set-c",
    label: "Set C",
    number: 2,
    body: <p>Why is a half-applied delta worse than a rejected one?</p>,
    checkIn: [],
  },
  {
    set: "set-a",
    label: "Set A",
    number: 1,
    body: <p>Name the four questions a text diff cannot answer.</p>,
    checkIn: [],
  },
  { set: "set-b", label: "Set B", number: 1, body: <p>Why is text a node?</p>, checkIn: [] },
  { set: "set-b", label: "Set B", number: 2, body: <p>Why is there no conditional node?</p>, checkIn: [] },
  { set: "set-g", label: "Set G", number: 1, body: <p>Why does nothing throw?</p>, checkIn: [] },
  { set: "set-g", label: "Set G", number: 2, body: <p>Why is the clock injected?</p>, checkIn: [] },
  {
    set: "lesson-04-self-check",
    label: "Lesson 04 Self-check",
    number: 3,
    body: <p>What does an id promise, and what does it refuse to promise?</p>,
    checkIn: [],
  },
  /**
   * A Predict question, which the sitting renders like any other and the queue
   * admits only when the reader was sure. It is here because the page now has
   * something to say about the ones it declines, and a count of them taken
   * against a course that does not contain them would be a count of nothing.
   */
  {
    set: "lesson-04-predict",
    label: "Lesson 04 Predict",
    number: 1,
    body: <p>What breaks if an id is reused after the node holding it is removed?</p>,
    checkIn: [],
  },
]

const KEYS: readonly string[] = QUESTIONS.map((question) => `${question.set}#${question.number}`)

const KEY = "loom.lessons.progress.v1"

/** Long enough ago that every gap in the schedule has elapsed. */
const LONG_AGO = "2020-01-01"

type Seed = {
  readonly set: string
  readonly question: number
  readonly confidence: number
  readonly grade?: Grade
  readonly on?: string
}

const seed = (misses: readonly Seed[], corrections: readonly Correction[] = []): void => {
  const sets: Record<string, { attempts: unknown[]; completedOn: string }> = {}

  for (const miss of misses) {
    const on = miss.on ?? LONG_AGO
    const record = (sets[miss.set] ??= { attempts: [], completedOn: on })

    record.attempts.push({
      question: miss.question,
      confidence: miss.confidence,
      answer: "",
      grade: miss.grade ?? "missed",
      on,
    })
  }

  window.localStorage.setItem(KEY, JSON.stringify({ lessons: {}, sets, predictions: {}, corrections }))
}

const stored = (): Progress => JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Progress

const answerCurrent = (confidence: string, grade: string) => {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${confidence} —`) }))
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Written from memory." } })
  fireEvent.click(screen.getByRole("button", { name: "Submit, then check" }))
  fireEvent.click(screen.getByRole("button", { name: grade }))
}

/**
 * The day this sitting happens on, said rather than read. `toISOString()` gives a
 * UTC calendar date and the component works out a local one; the two are the same
 * day for most of the day, which is exactly what made the queue's version of this
 * fail west of UTC in the evening and nowhere else.
 */
const TODAY = "2026-09-05"

const sitting = () =>
  render(
    <ClockProvider clock={() => TODAY}>
      <Corrections questions={QUESTIONS} />
    </ClockProvider>
  )

const panel = () =>
  render(
    <ClockProvider clock={() => TODAY}>
      <CorrectionsPanel keys={KEYS} />
    </ClockProvider>
  )

/**
 * The browser misbehaving, arranged — the same three-function fake the notice
 * uses, for the same reason: a store that throws on read is a real Safari with
 * site data off, and it is unreachable from a real `localStorage` in a test.
 */
const fake = (
  held: Readonly<Record<string, string>> = {},
  faults: { readonly read?: boolean; readonly write?: boolean } = {}
): (() => RecordStore) => {
  const written = new Map(Object.entries(held))

  return () => ({
    read: (key) => {
      if (faults.read === true) throw new Error("SecurityError")

      return written.get(key) ?? null
    },
    write: (key, value) => {
      if (faults.write === true) throw new Error("QuotaExceededError")
      written.set(key, value)
    },
    drop: (key) => {
      written.delete(key)
    },
  })
}

const sittingWith = (build: () => RecordStore) =>
  render(
    <RecordStoreProvider store={build}>
      <ClockProvider clock={() => TODAY}>
        <ProgressProvider>
          <Corrections questions={QUESTIONS} />
        </ProgressProvider>
      </ClockProvider>
    </RecordStoreProvider>
  )

describe("a corrections sitting", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("offers a question that was missed and has come round", () => {
    seed([{ set: "set-d", question: 7, confidence: 5 }])
    sitting()

    expect(screen.getByText(/A delta removes a card/)).toBeTruthy()
  })

  /**
   * The one thing this sitting has to withhold that a set does not. In its own
   * set the reader knows the subject from the heading, and that is fine because
   * the set is the unit. Here the questions come from five different sets, and
   * "Set D" is a pointer at identity — which is most of the answer to a question
   * about what an id survives.
   */
  it("does not say which set the question came from until it is answered", () => {
    seed([{ set: "set-d", question: 7, confidence: 5 }])
    const { container } = sitting()

    expect(container.textContent).not.toContain("Set D")

    answerCurrent("3", "Got it")

    expect(container.textContent).toContain("Set D q7")
  })

  it("does not print the answer, only where to go and get it", () => {
    seed([{ set: "set-d", question: 7, confidence: 5 }])
    const { container } = sitting()

    fireEvent.click(screen.getByRole("button", { name: /^3 —/ }))
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Something." } })
    fireEvent.click(screen.getByRole("button", { name: "Submit, then check" }))

    expect(container.textContent).toContain("Where to check")
    expect(container.textContent).toContain("The answer is not printed here")
  })

  it("takes the question away once it is answered, and says when it is back", () => {
    seed([{ set: "set-d", question: 7, confidence: 5 }])
    const { container } = sitting()
    answerCurrent("3", "Got it")

    expect(screen.queryByText(/A delta removes a card/)).toBeNull()
    expect(container.textContent).toContain("back in 7 days")
  })

  it("says a missed one is back tomorrow rather than in a week", () => {
    seed([{ set: "set-d", question: 7, confidence: 5 }])
    const { container } = sitting()
    answerCurrent("4", "Missed it")

    expect(container.textContent).toContain("back in 1 day")
  })

  /**
   * A correction is appended. The attempt that recorded the miss is untouched,
   * so the confident-and-wrong count does not go down when the reader finally
   * gets it — that pair is a thing that happened, not a score.
   */
  it("records the re-answer beside the miss rather than over it", () => {
    seed([{ set: "set-d", question: 7, confidence: 5 }])
    sitting()
    answerCurrent("3", "Got it")

    const record = stored()

    expect(record.corrections).toHaveLength(1)
    expect(record.corrections[0]?.grade).toBe("got-it")
    expect(record.sets["set-d"]?.attempts[0]?.confidence).toBe(5)
    expect(record.sets["set-d"]?.attempts[0]?.grade).toBe("missed")
  })

  it("works through what is due and then stops for the day", () => {
    seed([
      { set: "set-d", question: 7, confidence: 5 },
      { set: "set-c", question: 2, confidence: 2 },
    ])
    const { container } = sitting()

    answerCurrent("3", "Got it")
    answerCurrent("3", "Got it")

    expect(container.textContent).toContain("today’s corrections done")
    expect(screen.queryByRole("textbox")).toBeNull()
  })

  /**
   * The count has to mean the same five all the way through. A question just
   * answered is no longer due — its next gap has started — so recomputing "the
   * top five that are due" after each one would hand out a sixth and a seventh,
   * and the sitting would grow as the reader worked it.
   */
  it("counts the sitting from where it started, not from what is left", () => {
    seed([
      { set: "set-d", question: 7, confidence: 5 },
      { set: "set-c", question: 2, confidence: 5 },
      { set: "set-a", question: 1, confidence: 4 },
      { set: "set-b", question: 1, confidence: 2 },
      { set: "set-b", question: 2, confidence: 2 },
      { set: "set-g", question: 1, confidence: 2 },
      { set: "set-g", question: 2, confidence: 2 },
    ])
    const { container } = sitting()

    expect(container.textContent).toContain("Question 1 of 5")

    answerCurrent("3", "Got it")
    expect(container.textContent).toContain("Question 2 of 5")

    answerCurrent("3", "Got it")
    answerCurrent("3", "Got it")
    answerCurrent("3", "Got it")
    answerCurrent("3", "Got it")

    expect(screen.queryByRole("textbox")).toBeNull()
    expect(container.textContent).toContain("2 more are due and being held back")
  })

  it("puts the confidently wrong one first", () => {
    seed([
      { set: "set-c", question: 2, confidence: 2 },
      { set: "set-d", question: 7, confidence: 5 },
    ])
    sitting()

    expect(screen.getByText(/A delta removes a card/)).toBeTruthy()
    expect(screen.queryByText(/half-applied delta/)).toBeNull()
  })

  it("says nothing is due when a miss has already been answered today", () => {
    seed(
      [{ set: "set-d", question: 7, confidence: 5 }],
      [{ set: "set-d", question: 7, confidence: 3, answer: "x", grade: "got-it", on: TODAY }]
    )
    const { container } = sitting()

    expect(container.textContent).toContain("Nothing is due today")
  })

  it("has nothing to say to a reader who has not missed anything", () => {
    const { container } = sitting()

    expect(container.textContent).toContain("Nothing has come back")
  })

  /**
   * A question the schedule no longer holds. The record in the browser has no
   * way of knowing a set was reworded or renumbered between the sitting and
   * today, and an empty panel with a confidence control under it is worse than
   * nothing at all.
   */
  it("drops a question the schedule no longer contains", () => {
    seed([{ set: "set-z", question: 40, confidence: 5 }])
    const { container } = sitting()

    expect(screen.queryByRole("textbox")).toBeNull()
    expect(container.textContent).toContain("Nothing has come back")
  })
})

/**
 * The index and the sitting, counting the same things.
 *
 * A lesson's own questions were recorded, graded and queued from the day the
 * lesson route existed, and this sitting was the only thing that had never
 * heard of them — so the panel offered work the page then refused to hand over.
 * The filter is one function now and both call it; these are the tests that say
 * the two numbers cannot come apart again.
 */
describe("a lesson's own question, come back", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("is offered by the sitting, not only counted by the index", () => {
    seed([{ set: "lesson-04-self-check", question: 3, confidence: 5 }])
    sitting()

    expect(screen.getByText(/What does an id promise/)).toBeTruthy()
  })

  it("is promised by the index in the same breath", () => {
    seed([{ set: "lesson-04-self-check", question: 3, confidence: 5 }])
    const { container } = panel()

    expect(container.textContent).toContain("1 question to re-answer")
  })

  it("does not say which lesson it is from until it has been answered", () => {
    seed([{ set: "lesson-04-self-check", question: 3, confidence: 5 }])
    const { container } = sitting()

    expect(container.textContent).not.toContain("Lesson 04")

    answerCurrent("4", "Got it")

    expect(container.textContent).toContain("Lesson 04 Self-check q3")
  })

  it("is mixed in with the review sets rather than kept in its own list", () => {
    seed([
      { set: "set-d", question: 7, confidence: 2 },
      { set: "lesson-04-self-check", question: 3, confidence: 5 },
    ])
    const { container } = sitting()

    expect(container.textContent).toContain("Question 1 of 2")
    expect(screen.getByText(/What does an id promise/)).toBeTruthy()
  })

  it("leaves the index promising nothing when the course no longer has the question", () => {
    seed([{ set: "lesson-04-self-check", question: 99, confidence: 5 }])
    const { container } = panel()

    expect(container.textContent ?? "").not.toContain("to re-answer")
  })
})

/**
 * The four sentences that used to be one.
 *
 * *Nothing has come back. Either you have not missed anything yet, or
 * everything you missed has been got three times running.* True of a reader who
 * has done eleven sets and true of a reader who has never opened one, and its
 * own **or** admits that the author did not go and look. Two of the four cases
 * are not about the course at all: a record on another machine and a record
 * nobody could read both arrive here as an empty `Progress`, and both were told
 * they had missed nothing — which is a page reporting a fact about the reader
 * it is in no position to know.
 */
describe("an empty corrections queue, asked why", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("tells a reader who has answered nothing that this queue is downstream of the sets", () => {
    const { container } = sitting()

    expect(container.textContent).toContain("because nothing has been answered here")
    expect(container.textContent).toContain("not saying you are on top of the course")
    expect(container.textContent).not.toContain("three times running")
  })

  it("tells a reader who has missed nothing that the emptiness is a result", () => {
    seed([
      { set: "set-d", question: 7, confidence: 4, grade: "got-it" },
      { set: "set-c", question: 2, confidence: 4, grade: "got-it" },
    ])
    const { container } = sitting()

    expect(container.textContent).toContain("answered 2 questions here and got every one of them")
    expect(container.textContent).not.toContain("nothing has been answered here")
  })

  /**
   * Three misses the reader can see and an empty queue. Being told *you have
   * not missed anything* by a page looking at all three reads as the page being
   * broken; it is not, and saying which rule declined them teaches the rule.
   */
  it("says which misses it is declining, rather than claiming there were none", () => {
    seed([{ set: "lesson-04-predict", question: 1, confidence: 2 }])
    const { container } = sitting()

    expect(container.textContent).toContain("1 miss in your record is being held back on purpose")
    expect(container.textContent).toContain("you said you did not know")
    expect(container.textContent).not.toContain("got every one of them")
  })

  it("tells a reader whose questions have retired what that looks like", () => {
    seed(
      [{ set: "set-d", question: 7, confidence: 5 }],
      [
        { set: "set-d", question: 7, confidence: 3, answer: "x", grade: "got-it", on: "2020-01-02" },
        { set: "set-d", question: 7, confidence: 3, answer: "x", grade: "got-it", on: "2020-01-09" },
        { set: "set-d", question: 7, confidence: 3, answer: "x", grade: "got-it", on: "2020-02-09" },
      ]
    )
    const { container } = sitting()

    expect(container.textContent).toContain("has been got three times running")
    expect(container.textContent).toContain("Missing one again puts it back at the beginning")
  })
})

/**
 * The two cases where the page is not measuring anything.
 *
 * A record on another machine and a record that could not be read both produce
 * an empty queue, and an empty queue used to produce a sentence about what the
 * reader had and had not missed. The review queue stopped doing this one floor
 * up on 17 September; this page kept doing it for four more runs.
 */
describe("an empty corrections queue with nothing to compute from", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("does not tell a reader it could not look at that they have missed nothing", () => {
    const { container } = sittingWith(fake({}, { read: true }))

    expect(container.textContent).toContain("that is not a finding")
    expect(container.textContent).toContain("it could not look")
    expect(container.textContent).not.toContain("nothing has been answered here")
    expect(container.textContent).not.toContain("got every one of them")
  })

  it("says a stranded record is stranded rather than absent", () => {
    const { container } = sittingWith(fake({ [RECORD_KEY]: "{oh dear" }))

    expect(container.textContent).toContain("could not be read")
    expect(container.textContent).toContain("nothing is being written over it until you say so")
  })

  it("points a reader with no record here at the one they may have elsewhere", () => {
    const { container } = sittingWith(fake({}, { read: true }))

    expect(container.textContent).toContain("working through the course somewhere else")
  })

  /**
   * The one page where a lost write costs the whole exercise. A set that is not
   * stored still happened — the retrieval is the thing that works. A correction
   * buys a *gap*, and a gap nobody wrote down does not start, so five answered
   * here are five due again tomorrow at the same count.
   */
  it("warns before the sitting, not after, when nothing will be kept", () => {
    const store = fake(
      { [RECORD_KEY]: JSON.stringify({ lessons: {}, sets: { "set-d": { attempts: [{ question: 7, confidence: 5, answer: "", grade: "missed", on: LONG_AGO }], completedOn: LONG_AGO } }, predictions: {}, corrections: [] }) },
      { write: true }
    )
    const { container } = sittingWith(store)

    expect(screen.getByText(/A delta removes a card/)).toBeTruthy()
    expect(container.textContent).toContain("Nothing you answer here is being stored")
    expect(container.textContent).toContain("come back tomorrow at the count they are at now")
  })

  it("says nothing about storage when the record reads and writes", () => {
    seed([{ set: "set-d", question: 7, confidence: 5 }])
    const { container } = sitting()

    expect(container.textContent).not.toContain("Nothing you answer here is being stored")
  })
})
