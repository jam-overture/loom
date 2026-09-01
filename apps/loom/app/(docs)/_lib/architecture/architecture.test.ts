import { describe, expect, it } from "vitest"

import { COURSE, courseLesson, parseSyllabus } from "./course"
import { ARCHITECTURE_IDEAS } from "./ideas"
import { DECISION_RECORDS, parseDecisionIndex, recordTally } from "./records"
import { plainText, repositoryFileExists } from "./source"

/**
 * The Architecture section is an index of two things it does not contain, so
 * every check here is the same check in a different place: **does the thing it
 * points at exist, and did we read it rather than remember it?**
 *
 * A docs site's characteristic failure is a link that was true when it was
 * written. Here a lesson that is renamed, a record that is withdrawn, or a
 * README table whose shape changes under the parsers all fail the suite instead
 * of shipping as a page that looks complete and goes nowhere.
 */

describe("the decision records, read off the index", () => {
  it("finds every record the repository has", () => {
    expect(DECISION_RECORDS.length).toBeGreaterThanOrEqual(80)
  })

  it("numbers them from one, with no gaps and no repeats", () => {
    const numbers = DECISION_RECORDS.map((record) => record.number)

    expect(numbers).toEqual(numbers.map((_, index) => index + 1))
  })

  it("points at a file that is really there", () => {
    for (const record of DECISION_RECORDS) {
      expect(repositoryFileExists("decisions", record.file), record.file).toBe(true)
    }
  })

  it("links each record by its title and never by its number", () => {
    for (const record of DECISION_RECORDS) {
      expect(record.title, record.id).not.toMatch(/\d{4}/)
      expect(record.title.length, record.id).toBeGreaterThan(10)
    }
  })

  it("reads the four states off the status rather than assuming acceptance", () => {
    const parsed = parseDecisionIndex(
      [
        "| [0001](0001-a.md) | A thing decided | Accepted | §1 |",
        "| [0002](0002-b.md) | Another thing | Superseded by [0014](0014-c.md) | §2 |",
        "| [0003](0003-c.md) | A third thing | Accepted — partially superseded by 0029 | §5 |",
        "| [0004](0004-d.md) | A fourth thing | Proposed — **ARCHITECTURAL, needs review.** | §4 |",
        "| [0005](0005-e.md) | A fifth thing | Accepted — partially supersedes 0054 | §4 |",
      ].join("\n")
    )

    expect(parsed.map((record) => record.standing)).toEqual([
      "in force",
      "superseded",
      "partly superseded",
      "proposed",
      "in force",
    ])
  })

  it("tallies the states rather than being told the total", () => {
    const tally = recordTally()
    const { total, ...states } = tally

    expect(Object.values(states).reduce((sum, count) => sum + count, 0)).toBe(total)
    expect(total).toBe(DECISION_RECORDS.length)
  })

  it("ignores the prose above the table", () => {
    const parsed = parseDecisionIndex(
      ["# Decision records", "", "Write a record when:", "", "- it is expensive to reverse", ""].join("\n")
    )

    expect(parsed).toEqual([])
  })
})

describe("the course, read off its syllabus", () => {
  it("finds every lesson the syllabus lists", () => {
    expect(COURSE.length).toBeGreaterThanOrEqual(17)
  })

  it("numbers them from one, with no gaps and no repeats", () => {
    const numbers = COURSE.map((lesson) => lesson.number)

    expect(numbers).toEqual(numbers.map((_, index) => index + 1))
  })

  it("points at a file that is really there, where there is one", () => {
    for (const lesson of COURSE) {
      if (lesson.file === undefined) continue

      expect(repositoryFileExists("lessons", lesson.file), lesson.file).toBe(true)
    }
  })

  /**
   * Lesson 17 completed the syllabus, so the unwritten half of this is empty
   * against the live file and would pass vacuously on its own. Both halves are
   * asserted instead: a lesson with a file gets a link, one without gets a
   * title and no link. Whichever way the README moves, one of the two branches
   * is doing work. The unwritten shape is also pinned against a fixture in
   * "takes the third column", below.
   */
  it("links a written lesson and gives an unwritten one a title, never a link that 404s", () => {
    for (const lesson of COURSE) {
      if (lesson.file === undefined) {
        expect(lesson.href, `lesson ${lesson.number}`).toBeUndefined()
        expect(lesson.title.length, `lesson ${lesson.number}`).toBeGreaterThan(3)
        continue
      }

      expect(lesson.href, `lesson ${lesson.number}`).toBeDefined()
    }
  })

  it("takes the third column, which is what a reader is choosing on", () => {
    const parsed = parseSyllabus(
      [
        "| # | Lesson | What it covers |",
        "| [01](01-why-a-runtime.md) | Why a runtime | The thesis, and what Loom trades away. |",
        "| 13 | Refusal and repair | One attempt, both halves recorded. |",
      ].join("\n")
    )

    expect(parsed).toEqual([
      {
        number: 1,
        title: "Why a runtime",
        about: "The thesis, and what Loom trades away.",
        file: "01-why-a-runtime.md",
        href: "https://github.com/jam-overture/loom/blob/main/lessons/01-why-a-runtime.md",
      },
      { number: 13, title: "Refusal and repair", about: "One attempt, both halves recorded." },
    ])
  })
})

describe("the eight ideas", () => {
  it("resolves every lesson and record it names", () => {
    expect(ARCHITECTURE_IDEAS.length).toBe(8)

    for (const idea of ARCHITECTURE_IDEAS) {
      expect(idea.lesson.number, idea.id).toBeGreaterThan(0)
      expect(idea.record.href, idea.id).toContain("/decisions/")
    }
  })

  it("names each lesson and each record at most once", () => {
    const lessons = ARCHITECTURE_IDEAS.map((idea) => idea.lesson.number)
    const records = ARCHITECTURE_IDEAS.map((idea) => idea.record.number)

    expect(new Set(lessons).size).toBe(lessons.length)
    expect(new Set(records).size).toBe(records.length)
  })

  it("puts no decision number in front of a reader", () => {
    for (const idea of ARCHITECTURE_IDEAS) {
      expect(idea.plain, idea.id).not.toMatch(/\b\d{4}\b/)
      expect(idea.title, idea.id).not.toMatch(/\b\d{4}\b/)
    }
  })

  it("says the idea plainly before it is looked up anywhere", () => {
    for (const idea of ARCHITECTURE_IDEAS) {
      expect(idea.plain.length, idea.id).toBeGreaterThan(180)
      expect(idea.plain.length, idea.id).toBeLessThan(500)
    }
  })

  it("introduces no runtime term the paragraph does not explain", () => {
    const jargon = /\bTreeDelta\b|\bbaseRevision\b|\bdisposition\b|\bLoomTree\b|\bAST\b/

    for (const idea of ARCHITECTURE_IDEAS) {
      expect(idea.plain, idea.id).not.toMatch(jargon)
    }
  })

  it("keeps the ruling it points at in force, or says which are not", () => {
    const replaced = ARCHITECTURE_IDEAS.filter((idea) => idea.record.standing === "superseded")

    expect(replaced.map((idea) => idea.id)).toEqual([])
  })
})

describe("markdown that reaches a reader as text", () => {
  it("takes the words out of a link, the emphasis and the ticks", () => {
    expect(plainText("[0014](0014-a.md)")).toBe("0014")
    expect(plainText("**ARCHITECTURAL**, needs review")).toBe("ARCHITECTURAL, needs review")
    expect(plainText("The `registry` is the allowlist")).toBe("The registry is the allowlist")
  })

  it("leaves an em dash spaced, because this repository writes it that way", () => {
    expect(plainText("Accepted — supersedes 0004")).toBe("Accepted — supersedes 0004")
  })
})

describe("a lesson looked up by number", () => {
  it("finds one that exists and nothing for one that does not", () => {
    expect(courseLesson(2)?.title.length).toBeGreaterThan(0)
    expect(courseLesson(99)).toBeUndefined()
  })
})
