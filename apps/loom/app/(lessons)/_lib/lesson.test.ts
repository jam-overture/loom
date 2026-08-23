import { describe, expect, it } from "vitest"

import { parseLesson, promptSet, readLesson, section, splitAnswers } from "./lesson"
import { parseBlocks, type Block } from "./markdown"
import { WRITTEN_LESSONS } from "./syllabus"

/**
 * Two kinds of test, and the second is the one that matters.
 *
 * The fixtures below pin the shapes. The sweep at the bottom parses every
 * lesson the course actually has, because this module's failure mode is not an
 * exception — it is a lesson that renders with its Predict section quietly
 * missing, which looks like a page and is a broken course. A lesson written
 * next week in a shape nobody anticipated should fail here, loudly, rather than
 * on the page.
 */

const LESSON = `# 07 — Measuring a change

**After this lesson you will be able to** say what analysis extracts.

---

## Warm-up

Closed book.

1. Why is text a node rather than a prop? *(02)*
2. Name the two things that make \`applyDelta\` deterministic. *(05, 06)*

Question 2 is this lesson's scaffolding.

---

## Predict

In writing, before reading on.

> You are asked to say how big a change is.
>
> 1. Write the number you would report.
> 2. Say what it cannot tell you.

Predict 1 asks you to guess a fight.

---

## The idea

Measurement is separated from judgment.
`

describe("a lesson, parsed", () => {
  const lesson = parseLesson(LESSON)

  it("takes its number and title from the one heading that has both", () => {
    expect(lesson.number).toBe(7)
    expect(lesson.title).toBe("Measuring a change")
  })

  it("keeps what stands before the first section as front matter", () => {
    expect(lesson.front.map((block) => block.kind)).toEqual(["paragraph"])
  })

  it("cuts at the section headings and nowhere else", () => {
    expect(lesson.sections.map((each) => each.title)).toEqual(["Warm-up", "Predict", "The idea"])
  })

  it("finds a top-level prompt list, with what framed it and what followed it", () => {
    const set = promptSet(section(lesson, "Warm-up")?.blocks ?? [])

    expect(set?.prompts.map((prompt) => prompt.number)).toEqual([1, 2])
    expect(set?.prompts[1]?.refs).toEqual([5, 6])
    expect(set?.intro).toHaveLength(1)
    expect(set?.outro).toHaveLength(1)
  })

  it("finds a prompt list inside a blockquote, and keeps the quote's setup as intro", () => {
    const set = promptSet(section(lesson, "Predict")?.blocks ?? [])

    expect(set?.prompts.map((prompt) => prompt.text)).toEqual([
      "Write the number you would report.",
      "Say what it cannot tell you.",
    ])
    /** The section's own line of setup, and then the quote's. */
    expect(set?.intro).toHaveLength(2)
    expect(set?.outro).toHaveLength(1)
  })

  it("leaves a section with no numbered list alone", () => {
    expect(promptSet(section(lesson, "The idea")?.blocks ?? [])).toBeUndefined()
  })
})

describe("the answers, cut in two", () => {
  it("splits after the last exercise answer, not before the first numbered one", () => {
    const blocks = parseBlocks(
      [
        "**Q1** Seven nodes. A **medium** change under the default policy.",
        "",
        "**Q2** Four.",
        "",
        "**1** Because a slot is not an instance of anything.",
        "",
        "**2** A function is not a JSON value.",
      ].join("\n")
    )

    const { exercises, selfCheck } = splitAnswers(blocks)

    expect(exercises).toHaveLength(2)
    expect(selfCheck).toHaveLength(2)
  })

  it("gives everything to the exercises when a lesson prints no Self-check answers", () => {
    const blocks = parseBlocks("**Q1** One.\n\n**Q2** Two.")

    expect(splitAnswers(blocks).selfCheck).toHaveLength(0)
  })
})

describe("every lesson the course has", () => {
  const lessons = WRITTEN_LESSONS.map((entry) => ({
    number: entry.number,
    document: readLesson(entry.file ?? ""),
  }))

  it("parses, with the number in the file agreeing with the number in the syllabus", () => {
    for (const { number, document } of lessons) expect(document.number).toBe(number)
  })

  it("has a Predict section with prompts, which is what the gate is a gate on", () => {
    for (const { number, document } of lessons) {
      const set = promptSet(section(document, "Predict")?.blocks ?? [])

      expect(set?.prompts.length, `lesson ${number}`).toBeGreaterThan(0)
    }
  })

  it("has Warm-up and Self-check prompts wherever it has those sections", () => {
    for (const { number, document } of lessons) {
      for (const title of ["Warm-up", "Self-check"]) {
        const found = section(document, title)
        if (found === undefined) continue

        expect(promptSet(found.blocks)?.prompts.length, `lesson ${number} ${title}`).toBeGreaterThan(0)
      }
    }
  })

  /**
   * The failure this guards against is silent. A list parser that stops at the
   * first blank line finds Predict question 1, leaves 2 and 3 as a second list,
   * and the page renders a one-question Predict section that looks intentional.
   * One list per prompt section is the invariant that says it did not happen.
   */
  it("has exactly one numbered list in each of its question sections", () => {
    const ordered = (blocks: readonly Block[]): number =>
      blocks.reduce(
        (count, block) =>
          block.kind === "list" && block.ordered
            ? count + 1
            : block.kind === "quote"
              ? count + ordered(block.blocks)
              : count,
        0
      )

    for (const { number, document } of lessons) {
      for (const title of ["Warm-up", "Predict", "Self-check"]) {
        const found = section(document, title)
        if (found === undefined) continue

        expect(ordered(found.blocks), `lesson ${number} ${title}`).toBe(1)
      }
    }
  })

  it("never leaves a printed answer outside one of the two locked halves", () => {
    for (const { number, document } of lessons) {
      const answers = section(document, "Answers")
      if (answers === undefined) continue

      const { exercises, selfCheck } = splitAnswers(answers.blocks)

      expect(exercises.length + selfCheck.length, `lesson ${number}`).toBe(answers.blocks.length)
    }
  })
})
