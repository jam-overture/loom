import { readFile } from "node:fs/promises"

import { describe, expect, it } from "vitest"

import { describeFault, entriesIn, faultsIn, faultsInLedger, type Entry } from "./entries.js"

const entry = (body: string): Entry => ({ title: "a finding", line: 1, body })

const WELL_FORMED = [
  "**Filed by:** `Loom docs` · **Owned by:** `Loom daily build` · **Status:** open",
  "",
  "The body.",
].join("\n")

describe("entriesIn", () => {
  it("takes each heading with the text under it, and skips the preamble", () => {
    const found = entriesIn(["# FINDINGS", "", "Append; do not rewrite.", "", "## one", "body", "## two", "more"].join("\n"))

    expect(found.map((found_) => found_.title)).toEqual(["one", "two"])
    expect(found[0]?.body.trim()).toBe("body")
  })

  it("numbers a heading by the line it is on", () => {
    const found = entriesIn(["# FINDINGS", "", "## one", "body"].join("\n"))

    expect(found[0]?.line).toBe(3)
  })

  /**
   * Findings quote command output constantly, and a quoted `## ` is not an
   * entry. Getting this wrong would split one finding into two, and the second
   * half would have no `**Status:**` — a fault reported against a file that is
   * fine.
   */
  it("does not read a heading inside a fenced block as an entry", () => {
    const found = entriesIn(["## real", "```md", "## quoted", "```", "after"].join("\n"))

    expect(found.map((found_) => found_.title)).toEqual(["real"])
    expect(found[0]?.body).toContain("## quoted")
  })

  it("answers nothing for a file with no entries", () => {
    expect(entriesIn("# FINDINGS\n\nnothing yet\n")).toEqual([])
  })
})

describe("faultsIn", () => {
  it("passes an entry that names a filer, an owner and one status", () => {
    expect(faultsIn(entry(WELL_FORMED))).toEqual([])
  })

  it("catches the heading a merge kept twice, which has no body at all", () => {
    expect(faultsIn(entry("")).map((fault) => fault.code)).toEqual(["no-filer", "no-owner", "no-status"])
  })

  /**
   * The convention twelve closed findings already follow: the closing status
   * goes on top, the original stays underneath, and the entry says so. Allowed,
   * because losing the original would make the file worse.
   */
  it("allows a second status when the entry says the original is below", () => {
    const closed = [
      "**Filed by:** `Loom docs` · **Owned by:** `Loom daily build` · **Status:** closed",
      "by #81. Original status below.",
      "",
      "**Status:** open",
    ].join("\n")

    expect(faultsIn(entry(closed))).toEqual([])
  })

  /**
   * Both of these follow the convention and the first draft of the check
   * accused them: one wraps the marker across a line break, the other says
   * *"text"* where twelve others say *"status"*.
   */
  it("reads the marker across a line break, and in either of its two wordings", () => {
    const wrapped = [
      "**Filed by:** `a` · **Owned by:** `b` · **Status:** closed. Original status",
      "below.",
      "",
      "**Status:** open",
    ].join("\n")

    const worded = wrapped.replace("Original status\nbelow.", "Original text below.")

    expect(faultsIn(entry(wrapped))).toEqual([])
    expect(faultsIn(entry(worded))).toEqual([])
  })

  it("catches two statuses with nothing saying which is current", () => {
    const damaged = `${WELL_FORMED}\n\n**Status:** open — something else`

    expect(faultsIn(entry(damaged)).map((fault) => fault.code)).toEqual(["two-statuses"])
  })

  it("catches a third status even when the entry uses the convention", () => {
    const damaged = [
      "**Filed by:** `a` · **Owned by:** `b` · **Status:** closed. Original status below.",
      "**Status:** open",
      "**Status:** open",
    ].join("\n")

    expect(faultsIn(entry(damaged)).map((fault) => fault.code)).toEqual(["two-statuses"])
  })

  /**
   * The entry that reported the doubled-status defect quotes the field name to
   * describe it, and the first run of this check accused it.
   */
  it("does not count a status the entry is quoting rather than declaring", () => {
    const quoting = `${WELL_FORMED}\n\nOne entry carries two \`**Status:**\` lines.`

    expect(faultsIn(entry(quoting))).toEqual([])
  })

  it("catches an entry that names no owner", () => {
    const orphan = "**Filed by:** `Loom docs` · **Status:** open"

    expect(faultsIn(entry(orphan)).map((fault) => fault.code)).toEqual(["no-owner"])
  })
})

describe("describeFault", () => {
  it("points at a line and says what to look for", () => {
    expect(describeFault({ code: "two-statuses", title: "a finding", line: 42 })).toBe(
      'FINDINGS.md:42: a finding — two **Status:** lines and no "Original status below". Which one is current?'
    )
  })

  it("names the likely cause of an entry with no status", () => {
    expect(describeFault({ code: "no-status", title: "x", line: 7 })).toContain("kept twice")
  })
})

/**
 * The ledger itself, held to the rule. This is the assertion that matters: the
 * four faults this check was written for were found by running it, and a fifth
 * arriving is a merge somebody needs to look at.
 */
describe("FINDINGS.md", () => {
  it("is well formed", async () => {
    const faults = faultsInLedger(await readFile("FINDINGS.md", "utf8"))

    expect(faults.map(describeFault)).toEqual([])
  })
})
