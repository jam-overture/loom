import { describe, expect, it } from "vitest"

import {
  alternativeTally,
  CONSIDERED_ALTERNATIVES,
  parseAlternatives,
  unsettledAlternatives,
} from "./alternatives"
import { COURSE, courseLesson, parseSyllabus } from "./course"
import { ARCHITECTURE_COSTS } from "./costs"
import { ARCHITECTURE_IDEAS } from "./ideas"
import {
  DECISION_RECORDS,
  decisionRecord,
  parseDecisionIndex,
  recordTally,
  type DecisionRecord,
} from "./records"
import { plainText, repositoryFileExists } from "./source"
import { docsOrder } from "../nav"

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

  /**
   * Ascending from one and never repeating, which is what the parser guarantees.
   *
   * It asserted contiguity until 0097, when a number no record claims became a
   * reported hole rather than a failed build — so the index can now carry a row
   * with no link in it, this parser skips it (correctly: there is no record to
   * point at), and the sequence this section shows has a number missing from the
   * middle. A repeat still means two records claim one number, which is the
   * failure worth keeping.
   */
  it("numbers them from one and ascending, with no repeats", () => {
    const numbers = DECISION_RECORDS.map((record) => record.number)

    expect(numbers[0]).toBe(1)
    expect([...new Set(numbers)]).toHaveLength(numbers.length)
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b))
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

describe("what each ruling turned down", () => {
  const RECORD: DecisionRecord = {
    id: "0013",
    number: 13,
    title: "The registry is what the model is told it may build",
    status: "Accepted",
    standing: "in force",
    file: "0013-a.md",
    href: "https://github.com/jam-overture/loom/blob/main/decisions/0013-a.md",
  }

  const parse = (markdown: string) => parseAlternatives(markdown, RECORD)

  it("takes the lead of each alternative and none of the argument", () => {
    const parsed = parse(
      [
        "## Alternatives considered",
        "",
        "**Put the catalogue in the system prompt.** Rejected: it is the same",
        "text with none of the validation.",
        "",
        "**Send the Zod schemas as text.** Rejected on token cost alone.",
      ].join("\n")
    )

    expect(parsed.map((alternative) => alternative.lead)).toEqual([
      "Put the catalogue in the system prompt.",
      "Send the Zod schemas as text.",
    ])
    expect(parsed[0]?.recordTitle).toBe(RECORD.title)
    expect(parsed[0]?.href).toBe(RECORD.href)
  })

  it("reads only that section, and none of the record above or below it", () => {
    const parsed = parse(
      [
        "## Decision",
        "",
        "**The registry is the allowlist.** This is the decision.",
        "",
        "## Alternatives considered",
        "",
        "**One real alternative.** Rejected.",
        "",
        "## Consequences",
        "",
        "**A cost.** Paid deliberately.",
      ].join("\n")
    )

    expect(parsed.map((alternative) => alternative.lead)).toEqual(["One real alternative."])
  })

  it("finds nothing in a record that has no such section, rather than failing", () => {
    expect(parse("# 0055 — motion\n\n## Decision\n\nA stylesheet.\n")).toEqual([])
  })

  it("ignores a paragraph that is not an alternative", () => {
    const parsed = parse(
      [
        "## Alternatives considered",
        "",
        "Two of these were close, and one is worth revisiting.",
        "",
        "**The close one.** Rejected.",
      ].join("\n")
    )

    expect(parsed.map((alternative) => alternative.lead)).toEqual(["The close one."])
  })

  /**
   * The mark this page turns on. A ruling that says *deferred*, *for now* or
   * *worth revisiting* has not closed the question, and a reader deciding
   * whether to adopt is owed the difference.
   */
  it("marks what a record declines to close, and quotes the sentence that says so", () => {
    const parsed = parse(
      [
        "## Alternatives considered",
        "",
        "**A weighted risk score.** Rejected: two axes stay separable.",
        "",
        "**Container queries instead.** Correct in principle and the thing to revisit.",
        "Rejected for now on the failure mode.",
      ].join("\n")
    )

    expect(parsed.map((alternative) => alternative.settled)).toEqual([true, false])
    expect(parsed[0]?.note).toBeUndefined()
    expect(parsed[1]?.note).toBe("Correct in principle and the thing to revisit.")
  })

  /**
   * 0038 argues an alternative "the last run recommended **if** the fix were
   * deferred again", and closes it in the next sentence. Reading the word alone
   * marks a closed ruling as open on the one page a reader uses to decide, so a
   * marker sitting after an `if` is a hypothetical rather than a verdict.
   */
  it("does not read a hypothetical as a verdict", () => {
    const parsed = parse(
      [
        "## Alternatives considered",
        "",
        "**Say nothing and fix the comment instead.** The interim the last run",
        "recommended if the fix were deferred again. Rejected now that the fix is here.",
      ].join("\n")
    )

    expect(parsed[0]?.settled).toBe(true)
  })

  it("still reads a condition that says what would reopen it", () => {
    const parsed = parse(
      [
        "## Alternatives considered",
        "",
        "**Neon.** Worth revisiting if preview isolation starts to matter.",
      ].join("\n")
    )

    expect(parsed[0]?.settled).toBe(false)
    expect(parsed[0]?.note).toBe("Worth revisiting if preview isolation starts to matter.")
  })

  it("never repeats the alternative's own name back as its note", () => {
    const parsed = parse(
      [
        "## Alternatives considered",
        "",
        "**Compact rather than delete.** Rejected for now, and the most interesting one.",
      ].join("\n")
    )

    expect(parsed[0]?.note).toBe("Rejected for now, and the most interesting one.")
  })

  it("reads an alternative out of every ruling that has any", () => {
    expect(CONSIDERED_ALTERNATIVES.length).toBeGreaterThan(300)

    const tally = alternativeTally()

    expect(tally.records).toBeGreaterThanOrEqual(DECISION_RECORDS.length - 2)
    expect(tally.alternatives).toBe(CONSIDERED_ALTERNATIVES.length)
    expect(tally.unsettled).toBe(unsettledAlternatives().length)
  })

  it("names a record that exists, for every one of them", () => {
    for (const alternative of CONSIDERED_ALTERNATIVES) {
      expect(decisionRecord(alternative.recordNumber)?.id, alternative.lead).toBe(
        alternative.recordId
      )
      expect(alternative.lead.length, alternative.recordId).toBeGreaterThan(3)
      expect(alternative.lead, alternative.recordId).not.toContain("**")
    }
  })

  it("shows its evidence for every ruling it calls unsettled", () => {
    const open = unsettledAlternatives()

    expect(open.length).toBeGreaterThan(5)
    expect(open.length).toBeLessThan(CONSIDERED_ALTERNATIVES.length / 4)

    for (const alternative of open) {
      expect(alternative.note, alternative.lead).toBeDefined()
      expect(alternative.note?.length ?? 0, alternative.lead).toBeGreaterThan(10)
    }
  })
})

describe("the eight costs", () => {
  it("resolves a ruling for each, and reads what that ruling turned down", () => {
    expect(ARCHITECTURE_COSTS.length).toBe(8)

    for (const cost of ARCHITECTURE_COSTS) {
      expect(cost.record.href, cost.id).toContain("/decisions/")
      expect(cost.turnedDown.length, cost.id).toBeGreaterThan(0)

      for (const alternative of cost.turnedDown) {
        expect(alternative.recordNumber, cost.id).toBe(cost.record.number)
      }
    }
  })

  it("cites each ruling once, and none that has been replaced outright", () => {
    const records = ARCHITECTURE_COSTS.map((cost) => cost.record.number)

    expect(new Set(records).size).toBe(records.length)

    for (const cost of ARCHITECTURE_COSTS) {
      expect(cost.record.standing, cost.id).not.toBe("superseded")
    }
  })

  it("says the cost plainly, with no runtime word and no record number", () => {
    const jargon = /\bTreeDelta\b|\bbaseRevision\b|\bdisposition\b|\bLoomTree\b|\bAST\b/

    for (const cost of ARCHITECTURE_COSTS) {
      expect(cost.plain, cost.id).not.toMatch(jargon)
      expect(cost.plain, cost.id).not.toMatch(/\b\d{4}\b/)
      expect(cost.title, cost.id).not.toMatch(/\b\d{4}\b/)
      expect(cost.plain.length, cost.id).toBeGreaterThan(180)
      expect(cost.plain.length, cost.id).toBeLessThan(500)
    }
  })

  /**
   * The half that stops the page being a complaint. A cost with nothing after
   * it tells a reader to go elsewhere; every one of these has to say what you
   * do about it.
   */
  it("answers every cost with what you do instead", () => {
    for (const cost of ARCHITECTURE_COSTS) {
      expect(cost.instead.length, cost.id).toBeGreaterThan(120)
    }
  })

  it("points only at pages this site actually has", () => {
    const hrefs = new Set(docsOrder.map((entry) => entry.href))

    for (const cost of ARCHITECTURE_COSTS) {
      if (cost.shownAt === undefined) continue

      expect(hrefs.has(cost.shownAt.href), cost.shownAt.href).toBe(true)
    }
  })
})
