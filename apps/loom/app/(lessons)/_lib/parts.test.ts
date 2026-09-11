import { describe, expect, it } from "vitest"

import { EXERCISE_ANSWERS, ONLY, SELF_CHECK_ANSWERS, TRANSCRIPTS } from "./held"
import { parseLesson } from "./lesson"
import { lessonParts } from "./parts"
import type { ExerciseRun } from "./exercises"

/**
 * What the page is given, and what it is not.
 *
 * The reader component's tests assert that an answer is not on the screen.
 * These assert something the component cannot: that the answer is not in what
 * the component was handed. That distinction is the whole of this module's
 * reason to exist — a server component that renders an answer and passes it to
 * a client component has put the answer in the page's payload, where a lock
 * that governs painting does not reach it.
 *
 * The strings below are searched for in `JSON.stringify(parts)`, which is the
 * closest thing a test has to the flight payload: a React element serialises
 * with its children, so a string that survives that round trip is a string the
 * browser was sent.
 */

const ANSWER = "the-answer-nobody-has-earned-yet"
const PRINTED = "the-output-nobody-should-see"
const LESSON_PRINTED = "the-output-the-lesson-prints-for-itself"

const LESSON = `# 99 — A lesson that exists only in this test

It exists to be cut up.

## Predict

> 1. What happens first, and why?

## The idea

An explanation, which is not an answer.

## Try it

\`\`\`ts
console.log("something")
\`\`\`

Predict what that prints, before you read on.

The output:

\`\`\`
${LESSON_PRINTED}
\`\`\`

## Self-check

1. What does that buy?

## Answers

**Q1** ${PRINTED} is what it prints, because it says so.

**1** ${ANSWER}
`

const RUN: ExerciseRun = {
  kind: "ran",
  outputs: [{ index: 0, tests: [{ name: "it prints", output: [PRINTED] }] }],
}

const cut = () => lessonParts(parseLesson(LESSON), RUN)

describe("cutting a lesson into what may be sent", () => {
  it("does not put a printed answer in the parts the page carries", () => {
    const { parts } = cut()

    expect(JSON.stringify(parts)).not.toContain(ANSWER)
  })

  it("does not put a transcript in the parts the page carries", () => {
    const { parts } = cut()

    expect(JSON.stringify(parts)).not.toContain(PRINTED)
  })

  /**
   * The leak nothing was holding: the lesson prints its own output a line under
   * the sentence asking the reader to predict it, and rendering the section as
   * written puts that on the screen with no gate in front of it.
   */
  it("does not put the output the lesson printed for itself in the page either", () => {
    const { parts } = cut()

    expect(JSON.stringify(parts)).not.toContain(LESSON_PRINTED)
    expect(JSON.stringify(cut().held.get(TRANSCRIPTS)?.slots["p1"])).toContain(LESSON_PRINTED)
  })

  it("gives the page the address instead, and the address is the lesson's", () => {
    const { parts } = cut()
    const answers = parts.filter((part) => part.kind === "answers")

    expect(answers.map((part) => part.held.href)).toEqual([
      "/lessons/99/held/exercise-answers",
      "/lessons/99/held/self-check-answers",
    ])
  })

  it("numbers a transcript slot by its exercise, not by its fence", () => {
    const { parts } = cut()
    const exercises = parts.find((part) => part.kind === "exercises")
    const runs = exercises?.units.flatMap((unit) => (unit.kind === "code" && unit.run ? [unit.run] : []))

    expect(runs?.map((run) => [run.number, run.held.slot])).toEqual([[1, "1"]])
    expect(runs?.[0]?.held.href).toBe("/lessons/99/held/transcripts")
  })

  it("holds every one of them, so the address it named has something at it", () => {
    const { held } = cut()

    expect(JSON.stringify(held.get(SELF_CHECK_ANSWERS)?.slots[ONLY])).toContain(ANSWER)
    expect(JSON.stringify(held.get(TRANSCRIPTS)?.slots["1"])).toContain(PRINTED)
    expect(held.get(EXERCISE_ANSWERS)?.slots[ONLY]).toBeDefined()
  })

  /**
   * When the exercises do not run there is no transcript to serve — but the
   * output the lesson printed for itself is still held, because it is still an
   * answer to the question a line above it.
   */
  it("still holds the lesson's own printed output when nothing ran", () => {
    const { held } = lessonParts(parseLesson(LESSON), { kind: "failed", message: "nope" })
    const slots = held.get(TRANSCRIPTS)?.slots ?? {}

    expect(Object.keys(slots)).toEqual(["p1"])
  })

  /**
   * A lesson with nothing runnable and nothing printed has nothing to serve
   * there, and an address with an empty document behind it would be a 404 the
   * page linked to.
   */
  it("holds no transcripts for a lesson that neither runs nor prints", () => {
    const bare = LESSON.slice(0, LESSON.indexOf("Predict what that prints")) + LESSON.slice(LESSON.indexOf("## Self-check"))
    const { held } = lessonParts(parseLesson(bare), { kind: "ran", outputs: [] })

    expect(held.has(TRANSCRIPTS)).toBe(false)
  })
})
