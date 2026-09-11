import { readFile } from "node:fs/promises"

import { describe, expect, it } from "vitest"

import {
  blocking,
  collectDecisions,
  DECISIONS_DIRECTORY,
  generatedReadme,
  README_PATH,
} from "./collect.js"
import { checkNumbering, missingNumbers, severityOf } from "./numbering.js"
import { parseDecisionRecord, type DecisionRecord } from "./record.js"
import { compressSection, renderIndex, withGeneratedIndex } from "./render.js"

const recordWith = (overrides: Partial<DecisionRecord> = {}): DecisionRecord => ({
  number: 1,
  file: "0001-a-decision.md",
  title: "A decision",
  status: "Accepted",
  section: "§1 — Tree schema",
  ...overrides,
})

const body = (heading: string, status = "Accepted", section = "§5") =>
  `${heading}\n\n**Status:** ${status}\n**Date:** 2026-08-03\n**Section:** ${section}\n\n## Context\n`

describe("parseDecisionRecord", () => {
  it("reads a record whose heading uses an em dash", () => {
    const parsed = parseDecisionRecord("0001-a-decision.md", body("# 0001 — A decision"))

    expect(parsed.ok && parsed.value).toEqual({
      number: 1,
      file: "0001-a-decision.md",
      title: "A decision",
      status: "Accepted",
      section: "§5",
    })
  })

  /** Both separators are in the repo, and a parser is not a reason to edit sixteen records. */
  it("reads a record whose heading uses a full stop", () => {
    const parsed = parseDecisionRecord("0016-a-decision.md", body("# 0016. A decision"))

    expect(parsed.ok && parsed.value.title).toBe("A decision")
  })

  it("keeps a title that contains a comma or a dash of its own", () => {
    const parsed = parseDecisionRecord(
      "0029-a.md",
      body("# 0029. The approval belongs on the revision, not only in the journal")
    )

    expect(parsed.ok && parsed.value.title).toBe(
      "The approval belongs on the revision, not only in the journal"
    )
  })

  it("keeps a status that names what superseded it", () => {
    const parsed = parseDecisionRecord(
      "0027-a.md",
      body("# 0027. A decision", "Accepted — partially superseded by 0029")
    )

    expect(parsed.ok && parsed.value.status).toBe("Accepted — partially superseded by 0029")
  })

  /**
   * The filename wins because it is what the link resolves to. A heading that
   * disagrees is a rename somebody did not finish — which is exactly what the
   * 0032 clash produced — and reporting it beats silently preferring either.
   */
  it("reports a heading whose number disagrees with the filename", () => {
    const parsed = parseDecisionRecord("0032-a.md", body("# 0031. A decision"))

    expect(parsed.ok).toBe(false)
    expect(parsed.ok ? "" : parsed.error.code).toBe("heading-number-mismatch")
  })

  it("reports a record with no status or no section", () => {
    const noStatus = parseDecisionRecord("0001-a.md", "# 0001 — A\n\n**Section:** §5\n")
    const noSection = parseDecisionRecord("0001-a.md", "# 0001 — A\n\n**Status:** Accepted\n")

    expect(noStatus.ok ? "" : noStatus.error.code).toBe("missing-field")
    expect(noSection.ok ? "" : noSection.error.code).toBe("missing-field")
  })

  it("reports a file that is not numbered at all", () => {
    expect(parseDecisionRecord("notes.md", body("# 0001 — A")).ok).toBe(false)
  })
})

describe("checkNumbering", () => {
  /** The clash this whole unit exists for: two concurrent runs, one number. */
  it("catches two records claiming the same number", () => {
    const problems = checkNumbering([
      recordWith({ number: 32, file: "0032-one.md" }),
      recordWith({ number: 32, file: "0032-another.md" }),
      ...Array.from({ length: 31 }, (_, index) =>
        recordWith({ number: index + 1, file: `${String(index + 1).padStart(4, "0")}-x.md` })
      ),
    ])

    expect(problems).toContainEqual({
      code: "duplicate-number",
      number: 32,
      files: ["0032-one.md", "0032-another.md"],
    })
  })

  it("still notices a missing number, because a record is superseded and never deleted", () => {
    const problems = checkNumbering([
      recordWith({ number: 1 }),
      recordWith({ number: 3, file: "0003-c.md" }),
    ])

    expect(problems).toContainEqual({ code: "gap", missing: 2 })
  })

  /**
   * The trade the severities exist for. Six lanes branch off `main`, all read
   * the same highest number, and forbidding the hole left a run that saw its
   * number taken elsewhere no way to step over it — nine branches each wrote an
   * `0096`. A hole costs a row in the index; a clash costs a rename and every
   * citation of the renamed file.
   */
  it("reports a hole and blocks on a clash", () => {
    const hole = checkNumbering([recordWith({ number: 1 }), recordWith({ number: 3, file: "c.md" })])
    const clash = checkNumbering([
      recordWith({ number: 1 }),
      recordWith({ number: 1, file: "0001-b.md" }),
    ])

    expect(hole.map(severityOf)).toEqual(["reported"])
    expect(clash.map(severityOf)).toEqual(["blocking"])
  })

  it("blocks on a status naming a record that a deletion took away", () => {
    const problems = checkNumbering([
      recordWith({ number: 1, status: "Superseded by 0002" }),
      recordWith({ number: 3, file: "0003-c.md" }),
    ])

    expect(problems.filter((problem) => severityOf(problem) === "blocking")).toEqual([
      { code: "unknown-reference", from: 1, to: 2 },
    ])
  })

  it("counts every hole below the highest record, and invents none above it", () => {
    expect(
      missingNumbers([recordWith({ number: 1 }), recordWith({ number: 4, file: "0004-d.md" })])
    ).toEqual([2, 3])
  })

  it("catches a status pointing at a record that does not exist", () => {
    const problems = checkNumbering([recordWith({ number: 1, status: "Superseded by 0099" })])

    expect(problems).toContainEqual({ code: "unknown-reference", from: 1, to: 99 })
  })

  it("is quiet about a status pointing at a record that does exist", () => {
    const problems = checkNumbering([
      recordWith({ number: 1, status: "Superseded by 0002" }),
      recordWith({ number: 2, file: "0002-b.md", status: "Accepted — supersedes 0001" }),
    ])

    expect(problems).toEqual([])
  })

  it("says nothing about an empty set rather than inventing a gap", () => {
    expect(checkNumbering([])).toEqual([])
  })
})

describe("compressSection", () => {
  it("drops the prose after a section marker", () => {
    expect(compressSection("§1 — Tree schema")).toBe("§1")
  })

  it("keeps an arrow between two sections", () => {
    expect(compressSection("§3 — Adaptive Renderer → §4 — Framework SDK")).toBe("§3 → §4")
  })

  /** An arrow here would assert a sequence where the record described a relationship. */
  it("keeps the words a record used instead of turning them into an arrow", () => {
    expect(compressSection("§2 — Composition Runtime, binding on §6 — Telemetry")).toBe(
      "§2, binding on §6"
    )
  })

  it("keeps a parenthetical qualifier", () => {
    expect(compressSection("§4 — Framework SDK (CLI)")).toBe("§4 (CLI)")
  })

  it("leaves an already-short section alone", () => {
    expect(compressSection("§5 → §2, §6")).toBe("§5 → §2, §6")
  })
})

describe("renderIndex", () => {
  it("orders by number regardless of the order it was handed", () => {
    const table = renderIndex([
      recordWith({ number: 2, file: "0002-b.md", title: "Second" }),
      recordWith({ number: 1, title: "First" }),
    ])

    expect(table.indexOf("First")).toBeLessThan(table.indexOf("Second"))
  })

  it("links each row to the file it came from", () => {
    expect(renderIndex([recordWith()])).toContain("[0001](0001-a-decision.md)")
  })

  /**
   * The index is where a hole is visible once it stops being an exit code, and
   * a reader who counts the rows and finds one short is told which one.
   */
  it("writes a row for a number no record on this branch claims", () => {
    const table = renderIndex([
      recordWith({ number: 1, title: "First" }),
      recordWith({ number: 3, file: "0003-c.md", title: "Third" }),
    ])

    expect(table).toContain("| 0002 | *No record on this branch* | — | — |")
    expect(table.indexOf("First")).toBeLessThan(table.indexOf("0002"))
    expect(table.indexOf("0002")).toBeLessThan(table.indexOf("Third"))
  })

  it("does not link a row there is no file to link to", () => {
    expect(renderIndex([recordWith({ number: 2, file: "0002-b.md" })])).not.toContain("| [0001]")
  })

  /** A clash is two records, and the index says so rather than hiding one. */
  it("keeps both rows when two records claim one number", () => {
    const table = renderIndex([
      recordWith({ number: 1, file: "0001-one.md", title: "One" }),
      recordWith({ number: 1, file: "0001-another.md", title: "Another" }),
    ])

    expect(table).toContain("One")
    expect(table).toContain("Another")
  })
})

describe("withGeneratedIndex", () => {
  it("replaces the index and leaves the prose above it alone", () => {
    const readme = "# Decision records\n\n## Format\n\nProse.\n\n## Index\n\n| old |\n"
    const rewritten = withGeneratedIndex(readme, "| new |")

    expect(rewritten.ok && rewritten.value).toContain("Prose.")
    expect(rewritten.ok && rewritten.value).toContain("| new |")
    expect(rewritten.ok && rewritten.value).not.toContain("| old |")
  })

  /** A section added after the index must survive regeneration, not be eaten by it. */
  it("leaves a section that follows the index intact", () => {
    const readme = "## Index\n\n| old |\n\n## Afterwards\n\nStill here.\n"
    const rewritten = withGeneratedIndex(readme, "| new |")

    expect(rewritten.ok && rewritten.value).toContain("## Afterwards")
    expect(rewritten.ok && rewritten.value).toContain("Still here.")
  })

  it("is idempotent, so regenerating an already-generated README changes nothing", () => {
    const readme = "## Index\n\n| old |\n"
    const once = withGeneratedIndex(readme, "| new |")
    const twice = once.ok ? withGeneratedIndex(once.value, "| new |") : once

    expect(once.ok && twice.ok && once.value).toBe(twice.ok ? twice.value : "")
  })

  it("reports a README with no index heading rather than appending one", () => {
    expect(withGeneratedIndex("# Decision records\n", "| new |").ok).toBe(false)
  })
})

/**
 * The guard. Everything above tests the generator against fixtures; these two
 * test the repository against the generator, which is the part that turns a
 * numbering clash into a failure somebody sees before a merge conflict does.
 *
 * A hole is deliberately not part of the guard: it is reported, it appears in
 * the index, and it does not fail. `0096` is one on this branch.
 */
describe("the decision records in this repository", () => {
  it("parse, and number without duplicates or dangling references", async () => {
    const { records, problems } = await collectDecisions()

    expect(blocking(problems)).toEqual([])
    expect(records.length).toBeGreaterThan(0)
  })

  it("match the committed index, so `pnpm decisions:index` has been run", async () => {
    const { readme } = await generatedReadme()

    expect(await readFile(README_PATH, "utf8")).toBe(readme)
  })

  /**
   * A cross-reference is written twice — once as the number a reader sees and
   * once as the file a click opens — and a rename only moves the second. #217
   * renumbered a record that had just collided and left two records citing it
   * as `[0096](0099-…)`: the right file, under a number that by then belonged
   * to something else entirely. Nothing could notice, because the numbering
   * check reads statuses rather than prose, and the link worked.
   *
   * Prose is where the renaming cost lands, so prose is where this looks.
   */
  it("cite each other by a number that matches the file the link opens", async () => {
    const { records } = await collectDecisions()
    const present = new Set(records.map((record) => record.file))

    const wrong: string[] = []

    for (const record of records) {
      const text = await readFile(`${DECISIONS_DIRECTORY}${record.file}`, "utf8")

      for (const match of text.matchAll(/\[(\d{4})\]\(((\d{4})-[^)#]+\.md)/g)) {
        const [link, label, file, number] = match as unknown as readonly string[]

        if (label !== number) wrong.push(`${record.file}: ${link} opens ${file}`)
        else if (!present.has(file as string)) {
          wrong.push(`${record.file}: ${link} opens ${file}, which is not a record here`)
        }
      }
    }

    expect(wrong).toEqual([])
  })
})
