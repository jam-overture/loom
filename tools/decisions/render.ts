import { err, ok, type Result } from "../../src/result.js"

import { missingNumbers } from "./numbering.js"
import type { DecisionRecord } from "./record.js"

/**
 * The index, rendered.
 *
 * Only the table is generated. Everything above it in the README — when to write
 * a record, the format, the rule about never editing one to change direction —
 * is prose a person wrote and a person should keep writing.
 */

export const INDEX_HEADING = "## Index"

/**
 * Strips the prose after each `§N` and leaves the punctuation between them
 * alone, so `§3 — Adaptive Renderer → §5 — Portal` becomes `§3 → §5` and
 * `§2 — Composition Runtime, binding on §6 — Telemetry` keeps its "binding on".
 *
 * A blunter rule — collect the `§N`s and join them with arrows — would have been
 * shorter and would have turned "binding on" and "," into an arrow, quietly
 * asserting a sequence where the record said a relationship.
 */
export const compressSection = (section: string): string =>
  section
    .replace(/§(\d+)\s*—\s*[^,→(]*/g, "§$1 ")
    .replace(/\s+([,)])/g, "$1")
    .replace(/\s+/g, " ")
    .trim()

const rowOf = (record: DecisionRecord): string =>
  `| [${String(record.number).padStart(4, "0")}](${record.file}) | ${record.title} | ${record.status} | ${compressSection(record.section)} |`

/**
 * A number nothing on this branch claims, stated rather than skipped over.
 *
 * The index is the only place a hole in the sequence is visible once it stops
 * being an exit code, and a reader who counts the rows and finds one short
 * deserves to be told which one and not left to work it out. The row is also
 * what a merge resolves: whichever branch holding this number lands first
 * replaces the line with its own on the next `pnpm decisions:index`.
 */
const missingRowOf = (number: number): string =>
  `| ${String(number).padStart(4, "0")} | *No record on this branch* | — | — |`

export const renderIndex = (records: readonly DecisionRecord[]): string => {
  const rows: readonly (readonly [number, string])[] = [
    ...records.map((record) => [record.number, rowOf(record)] as const),
    ...missingNumbers(records).map((number) => [number, missingRowOf(number)] as const),
  ]

  return [
    "| # | Title | Status | Section |",
    "| --- | --- | --- | --- |",
    ...[...rows].sort(([a], [b]) => a - b).map(([, row]) => row),
  ].join("\n")
}

export type IndexProblem = { readonly code: "no-index-heading" }

/**
 * Replaces the index section of a README, leaving every other section intact.
 *
 * The generated region runs from the `## Index` heading to the next `## ` or the
 * end of the file — not simply to the end — so a section added after the index
 * survives regeneration instead of being silently eaten by it.
 */
export const withGeneratedIndex = (
  readme: string,
  table: string
): Result<string, IndexProblem> => {
  const start = readme.indexOf(`${INDEX_HEADING}\n`)
  if (start === -1) return err({ code: "no-index-heading" })

  const body = start + INDEX_HEADING.length + 1
  const next = readme.indexOf("\n## ", body)
  const tail = next === -1 ? "" : readme.slice(next + 1)

  return ok(`${readme.slice(0, body)}\n${table}\n${tail === "" ? "" : `\n${tail}`}`)
}
