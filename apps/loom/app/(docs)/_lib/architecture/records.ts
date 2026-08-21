import { plainText, readDecisionsFile, repositoryHref } from "./source"

/**
 * The decision records, read off the index they already keep.
 *
 * `decisions/README.md` ends in a generated table — one row per record, rebuilt
 * from the files themselves by `pnpm decisions:index` and checked by `pnpm
 * verify`, so a record that exists and is missing from it is already a failing
 * build. Parsing that table means this section inherits every guarantee the
 * table has, and adds no new place for a record to hide.
 *
 * What a reader is shown is the **title**, never the number. The number is the
 * record's filename and it is a footnote to a document the reader has not
 * opened; a link that says what the ruling was is a link they can decide about.
 * The one page where numbers appear as numbers is the index itself, which is
 * about the records, and says in its first paragraph what they are.
 */

/** `| [0001](0001-slug.md) | Title | Status | Section |` */
const ROW = /^\|\s*\[(\d{4})\]\(([^)]+)\)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/

/**
 * How much of a record is still in force, in a word.
 *
 * Four states rather than two, because "Accepted — partially superseded by
 * 0029" is neither in force nor retired, and flattening it to either one would
 * mislead a reader in a way the trail exists to prevent.
 */
export type RecordStanding = "in force" | "partly superseded" | "superseded" | "proposed"

export type DecisionRecord = {
  /** The four digits that name the file — `"0001"`. Its number is not its ordering. */
  readonly id: string
  readonly number: number
  readonly title: string
  /** The status line, verbatim except for markdown — `"Accepted — supersedes 0004"`. */
  readonly status: string
  readonly standing: RecordStanding
  readonly file: string
  readonly href: string
}

const standingOf = (status: string): RecordStanding => {
  if (status.startsWith("Superseded by")) return "superseded"
  if (status.startsWith("Proposed")) return "proposed"
  if (status.includes("partially superseded")) return "partly superseded"

  return "in force"
}

export const parseDecisionIndex = (markdown: string): readonly DecisionRecord[] => {
  const records: DecisionRecord[] = []

  for (const line of markdown.split("\n")) {
    const row = ROW.exec(line)

    if (row?.[1] === undefined || row[2] === undefined || row[3] === undefined) continue
    if (row[4] === undefined) continue

    const status = plainText(row[4])

    records.push({
      id: row[1],
      number: Number(row[1]),
      title: plainText(row[3]),
      status,
      standing: standingOf(status),
      file: row[2],
      href: repositoryHref("decisions", row[2]),
    })
  }

  return records
}

export const DECISION_RECORDS: readonly DecisionRecord[] = parseDecisionIndex(
  readDecisionsFile("README.md")
)

export const decisionRecord = (number: number): DecisionRecord | undefined =>
  DECISION_RECORDS.find((record) => record.number === number)

/**
 * How many records are in each state, for the sentence above the table.
 *
 * Counted rather than written, because a written count is wrong the first time
 * somebody supersedes something and nobody notices for a month.
 */
export const recordTally = (
  records: readonly DecisionRecord[] = DECISION_RECORDS
): Record<RecordStanding | "total", number> => ({
  total: records.length,
  "in force": records.filter((record) => record.standing === "in force").length,
  "partly superseded": records.filter((record) => record.standing === "partly superseded").length,
  superseded: records.filter((record) => record.standing === "superseded").length,
  proposed: records.filter((record) => record.standing === "proposed").length,
})
