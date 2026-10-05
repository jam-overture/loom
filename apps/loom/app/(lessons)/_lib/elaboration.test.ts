import { describe, expect, it } from "vitest"

import { parseLesson, promptSet, readLesson, section } from "./lesson"
import { lessonParts } from "./parts"
import { ELABORATION_PART, lessonSlug, lessonSlugParts } from "./slugs"
import { WRITTEN_LESSONS } from "./syllabus"
import { lessonsNamedInProse } from "./text"

/**
 * The elaboration section, and the guess the surface makes about it.
 *
 * `Explain it back` is one of the seven principles this course names in its own
 * README and was the last one with nothing behind it: a numbered prompt set,
 * rendered as prose, that a reader scrolls past. What the surface adds is not a
 * box — it is the comparison the section's own last line asks for. Almost every
 * lesson has a prompt reading *derive it from lesson 08*, and the thing worth
 * comparing a fresh derivation against is not lesson 08's text, which can be
 * reread at any time, but **what the reader wrote about lesson 08 when they were
 * in it**.
 *
 * Finding that lesson means reading a sentence, which is a guess. So the guess is
 * held to a census here: how many prompts across the course name an earlier
 * lesson, and which. A prose parser that quietly stopped matching would take a
 * feature away in silence and every other test would stay green, which is the
 * failure mode `transcripts.test.ts` and `claims.test.ts` were each written after
 * meeting.
 */

const ELABORATION = "Explain it back"

/**
 * Prompts across the written lessons that name a lesson other than their own.
 *
 * 33 of the course's 34 lessons have one. Lesson 01 does not and cannot — there
 * is nothing behind it — which is the one row in this census that is a fact about
 * the course rather than about the parser, and it is why the total is pinned
 * alongside the per-lesson count rather than instead of it.
 */
const LESSONS_WITH_A_DERIVATION = 33

const promptsOf = (file: string) =>
  promptSet(section(readLesson(file), ELABORATION)?.blocks ?? [])?.prompts ?? []

describe("a lesson named in a sentence", () => {
  it("reads one, several, and a possessive", () => {
    expect(lessonsNamedInProse("Derive it from lesson 08.")).toEqual([8])
    expect(lessonsNamedInProse("Derive this lesson from lesson 01 and lesson 14")).toEqual([1, 14])
    expect(lessonsNamedInProse("what lessons 18 and 19 settled")).toEqual([18, 19])
    expect(lessonsNamedInProse("lessons 01, 14 and 22 agree")).toEqual([1, 14, 22])
    expect(lessonsNamedInProse("Lesson 05's rule")).toEqual([5])
  })

  /**
   * The numbers this course writes that are not lessons. A record is four digits
   * opening with a zero and a section is `§6`, so neither can be reached by a
   * pattern that requires the word and exactly two digits after it.
   */
  it("reads nothing out of a record citation, a section number or a bare year", () => {
    expect(lessonsNamedInProse("0169 settles it, in §6, in 2026")).toEqual([])
    expect(lessonsNamedInProse("the lesson says so")).toEqual([])
    expect(lessonsNamedInProse("lesson 9")).toEqual([])
  })
})

describe("what every lesson's Explain it back reaches back into", () => {
  const reached = new Map<number, readonly number[]>()

  for (const entry of WRITTEN_LESSONS) {
    if (entry.file === undefined) continue

    const file = entry.file

    it(`is read off lesson ${entry.number}'s own prompts`, () => {
      const prompts = promptsOf(file)

      expect(prompts.length, `${file} has no Explain it back prompts`).toBeGreaterThan(0)

      const named = [
        ...new Set(
          prompts.flatMap((prompt) => lessonsNamedInProse(prompt.text)).filter((number) => number !== entry.number)
        ),
      ].sort((a, b) => a - b)

      reached.set(entry.number, named)

      for (const number of named) {
        expect(
          WRITTEN_LESSONS.some((each) => each.number === number),
          `lesson ${entry.number} sends a reader to lesson ${number}, which is not in the syllabus`
        ).toBe(true)
      }
    })
  }

  it("is a prompt in every lesson but the first", () => {
    const withOne = [...reached.entries()].filter(([, named]) => named.length > 0)

    expect(
      withOne.length,
      "a prompt set was reworded, or the parser stopped reading a phrasing it used to read"
    ).toBe(LESSONS_WITH_A_DERIVATION)

    expect(reached.get(1), "lesson 01 has nothing behind it and must name nothing").toEqual([])
  })
})

describe("the section, as the page is given it", () => {
  /**
   * Numbered 09 rather than 99 so that the prompt naming its own lesson names a
   * lesson that **exists**. A fixture numbered outside the syllabus cannot tell a
   * dropped self-reference from a lesson nothing could point at, and the first
   * version of this file could not: it passed with the self-reference filter
   * removed.
   */
  const LESSON = `# 09 — A lesson that exists only in this test

## Predict

> 1. What happens first?

## Explain it back

Closed book.

1. Explain it to somebody who has not read lesson 04, and do not say "identity".
2. Derive it from lesson 08. Lesson 09 is this one, so it is not somewhere to go.

Question 2 is the one that transfers.

## Self-check

1. What does that buy?
`

  const part = () => {
    const { parts } = lessonParts(parseLesson(LESSON), { kind: "ran", outputs: [] })

    return parts.find((each) => each.kind === "elaborate")
  }

  it("is a part of its own rather than prose", () => {
    const found = part()

    expect(found?.kind).toBe("elaborate")
    expect(found?.kind === "elaborate" ? found.questions.length : 0).toBe(2)
  })

  it("files it where nothing grades it", () => {
    const found = part()
    const slug = found?.kind === "elaborate" ? found.slug : ""

    expect(slug).toBe(lessonSlug(9, ELABORATION_PART))
    expect(
      lessonSlugParts(slug),
      "an explanation has no answer to be checked against, so it must not enter the corrections queue"
    ).toBeUndefined()
  })

  it("points each prompt at the lessons it names, and never at its own", () => {
    const found = part()
    const questions = found?.kind === "elaborate" ? found.questions : []

    expect(questions[0]?.reaches.map((each) => each.lesson)).toEqual([4])
    expect(
      questions[1]?.reaches.map((each) => each.lesson),
      "prompt 2 names lesson 08 and its own lesson 09; only the first is somewhere to go"
    ).toEqual([8])
    expect(questions[1]?.reaches[0]?.slug).toBe(lessonSlug(8, ELABORATION_PART))
  })

  /**
   * The prompts are the reader's to answer and the words are the reader's to
   * write, so there is nothing to withhold and nothing withheld — which is worth
   * one assertion, because every other gate on this surface exists to keep
   * something out of the payload and a reader of this file will look for it.
   */
  it("holds nothing back, because there is no answer to hold", () => {
    const { held } = lessonParts(parseLesson(LESSON), { kind: "ran", outputs: [] })
    const found = part()

    expect([...held.keys()]).toEqual([])
    expect(JSON.stringify(found)).toContain("do not say")
  })
})
