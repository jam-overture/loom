import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { readFile } from "node:fs/promises"

import { describe, expect, it } from "vitest"

import { blocking, collectCitations, collectDecisions, generatedReadme, README_PATH } from "./collect.js"
import { checkNumbering, missingNumbers, severityOf } from "./numbering.js"
import { parseDecisionRecord, type DecisionRecord } from "./record.js"
import { compressSection, renderIndex, withGeneratedIndex } from "./render.js"
import { checkStatuses, openerOf, STATUS_OPENERS } from "./status.js"

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

  /**
   * The pair the check was written for. 0109 said it was superseded by 0137 and
   * 0137 said `Accepted` and nothing else, for two weeks, compliantly.
   */
  it("catches a supersession the replacement does not answer", () => {
    const problems = checkNumbering([
      recordWith({ number: 1, status: "Superseded by 0002" }),
      recordWith({ number: 2, file: "0002-b.md", status: "Accepted" }),
    ])

    expect(problems).toContainEqual({ code: "one-way-supersession", from: 1, to: 2 })
  })

  /**
   * Symmetric on purpose: the check asks whether the record named names this one
   * back, not which of them used which verb. The fault is silence at one end and
   * it is the same fault whichever end wrote first.
   */
  it("catches it from the replacement's side too, when the old record went quiet", () => {
    const problems = checkNumbering([
      recordWith({ number: 1, status: "Accepted" }),
      recordWith({ number: 2, file: "0002-b.md", status: "Accepted — supersedes 0001" }),
    ])

    expect(problems).toContainEqual({ code: "one-way-supersession", from: 2, to: 1 })
  })

  it("is quiet about a partial supersession whose other end answers it", () => {
    const problems = checkNumbering([
      recordWith({ number: 1, status: "Accepted — partially superseded by 0002" }),
      recordWith({ number: 2, file: "0002-b.md", status: "Accepted — partially supersedes 0001" }),
    ])

    expect(problems).toEqual([])
  })

  /** 0117 writes its reference as a markdown link, and the number in it counts. */
  it("reads a reference written as a link to the file", () => {
    const problems = checkNumbering([
      recordWith({ number: 1, status: "Superseded by [0002](0002-b.md)" }),
      recordWith({ number: 2, file: "0002-b.md", status: "Accepted — supersedes 0001" }),
    ])

    expect(problems).toEqual([])
  })

  it("blocks on a one-way supersession rather than reporting it", () => {
    const problems = checkNumbering([
      recordWith({ number: 1, status: "Superseded by 0002" }),
      recordWith({ number: 2, file: "0002-b.md", status: "Accepted" }),
    ])

    expect(problems.map(severityOf)).toEqual(["blocking"])
  })

  /**
   * One missing record is one problem. Asking the record that is not there
   * whether it answers would turn every deletion into two complaints about the
   * same fault, and the dangling one is the one that says what to do.
   */
  it("leaves a reference to a record that does not exist to the dangling check", () => {
    const problems = checkNumbering([recordWith({ number: 1, status: "Superseded by 0099" })])

    expect(problems).toEqual([{ code: "unknown-reference", from: 1, to: 99 }])
  })

  it("says nothing about an empty set rather than inventing a gap", () => {
    expect(checkNumbering([])).toEqual([])
  })
})

/**
 * The opener, which is the only part of a status that is a state.
 *
 * Everything after the first word is a person writing, and several of the
 * records use it well — 0166 is accepted for one half and proposed for the
 * other. So the closed set is one word long.
 */
describe("checkStatuses", () => {
  it("takes each of the three openers bare", () => {
    const problems = checkStatuses(
      STATUS_OPENERS.map((opener, index) =>
        recordWith({
          number: index + 1,
          file: `${String(index + 1).padStart(4, "0")}-a.md`,
          status: opener,
        })
      )
    )

    expect(problems).toEqual([])
  })

  it("takes a qualifying clause after the opener", () => {
    expect(
      checkStatuses([
        recordWith({ status: "Accepted — it changes no schema, no tree and no delta model" }),
      ])
    ).toEqual([])
  })

  /** 0166, which is the record this check must not make illegal. */
  it("takes a status that is accepted for one half and proposed for the other", () => {
    expect(
      checkStatuses([
        recordWith({
          status:
            "Accepted for the first half (the completeness check), **Proposed for the second**",
        }),
      ])
    ).toEqual([])
  })

  it("takes a status naming what superseded it", () => {
    expect(
      checkStatuses([recordWith({ status: "Superseded by [0014](0014-a-budget.md)" })])
    ).toEqual([])
  })

  /** The status that went into the index verbatim and drew no complaint. */
  it("refuses an opener that is not one of the three", () => {
    expect(checkStatuses([recordWith({ status: "Bananas" })])).toEqual([
      { code: "unknown-status", file: "0001-a-decision.md", opener: "Bananas" },
    ])
  })

  /**
   * Emphasis is refused rather than stripped, because the index renders this
   * column verbatim and two spellings of one state read as two states.
   */
  it("refuses an emphasised opener", () => {
    expect(checkStatuses([recordWith({ status: "**Accepted** — and bold about it" })])).toEqual([
      { code: "unknown-status", file: "0001-a-decision.md", opener: "**Accepted**" },
    ])
  })

  it("refuses a lower-case opener, because the index's column is the word as written", () => {
    expect(checkStatuses([recordWith({ status: "accepted" })]).map((problem) => problem.code)).toEqual(
      ["unknown-status"]
    )
  })

  it("says nothing about an empty set", () => {
    expect(checkStatuses([])).toEqual([])
  })
})

describe("openerOf", () => {
  it("takes the first word and leaves the clause after it alone", () => {
    expect(openerOf("Accepted — partially supersedes 0117")).toBe("Accepted")
  })

  it("is the whole status when the status is one word", () => {
    expect(openerOf("Proposed")).toBe("Proposed")
  })

  it("is empty for an empty status rather than throwing", () => {
    expect(openerOf("")).toBe("")
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
 * That the checks are wired into the thing that fails the build.
 *
 * A check nobody calls is the shape another lane filed on 25 September — a prop
 * built to answer a finding, sitting unwired for three weeks, with a camera as
 * the only instrument that could see it. Both of the checks added by 0193 pass
 * on `decisions/` today, so a guard over the real directory would go on passing
 * if `collectDecisions` stopped asking. This asks it about a directory of two
 * records written for the purpose.
 */
describe("collectDecisions", () => {
  const withRecords = async (files: ReadonlyMap<string, string>): Promise<string> => {
    const directory = `${await mkdtemp(`${tmpdir()}/loom-decisions-`)}/`

    for (const [file, content] of files) await writeFile(`${directory}${file}`, content, "utf8")

    return directory
  }

  const record = (heading: string, status: string) =>
    `${heading}\n\n**Status:** ${status}\n**Date:** 2026-09-26\n**Section:** §1\n\n## Context\n\n## Decision\n\n## Consequences\n\n## Alternatives considered\n`

  it("fails the build for a status that does not begin with one of the three words", async () => {
    const directory = await withRecords(
      new Map([["0001-a.md", record("# 0001 — A", "Bananas")]])
    )

    const { problems } = await collectDecisions(directory)

    expect(blocking(problems).map((problem) => problem.message)).toEqual([
      '0001-a.md has a status beginning "Bananas", and a status begins with one of Proposed, Accepted, Superseded',
    ])
  })

  it("fails the build for a supersession the replacement does not answer", async () => {
    const directory = await withRecords(
      new Map([
        ["0001-a.md", record("# 0001 — A", "Superseded by 0002")],
        ["0002-b.md", record("# 0002 — B", "Accepted")],
      ])
    )

    const { problems } = await collectDecisions(directory)

    expect(blocking(problems).map((problem) => problem.message)).toEqual([
      "1 names 0002 in its status, and 0002 does not name it back",
    ])
  })

  it("is quiet about the same pair written at both ends", async () => {
    const directory = await withRecords(
      new Map([
        ["0001-a.md", record("# 0001 — A", "Superseded by 0002")],
        ["0002-b.md", record("# 0002 — B", "Accepted — supersedes 0001")],
      ])
    )

    expect(blocking((await collectDecisions(directory)).problems)).toEqual([])
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
   * Prose is where the renaming cost lands, so prose is where this looks — in
   * the records, and since 9 September in `src/` and `tools/` too, which is
   * where the same failure was found eight times in one seam.
   */
  it("are cited, from anywhere this lane owns, by a number that resolves", async () => {
    expect(await collectCitations()).toEqual([])
  })

  /**
   * Exercise E of `lessons/28-corroboration.md`, as a check rather than a
   * printout. The lesson measured eleven supersession directions with ten
   * answered at the other end, and the eleventh was joined by a twelfth the
   * next day. Both are now answered and 0193 requires the next one to be.
   *
   * The mutation is what stops this passing vacuously: the guard above asserts
   * no blocking problem, which is also what a check that had stopped looking
   * would report. Blanking one real end has to bring the complaint back.
   */
  it("write every supersession at both ends, and would say so if one went quiet", async () => {
    const { records } = await collectDecisions()

    const quietened = records.map((record) =>
      record.number === 137 ? { ...record, status: "Accepted" } : record
    )

    expect(checkNumbering(records).filter((problem) => problem.code === "one-way-supersession")).toEqual(
      []
    )
    expect(checkNumbering(quietened)).toContainEqual({
      code: "one-way-supersession",
      from: 109,
      to: 137,
    })
  })

  /** The README's sentence about the three words, held against the directory. */
  it("all begin with one of the three openers", async () => {
    const { records } = await collectDecisions()

    expect(checkStatuses(records)).toEqual([])
    expect(records.map((record) => openerOf(record.status)).filter((opener) => opener === "Accepted").length).toBeGreaterThan(0)
  })
})
