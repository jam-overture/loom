import { err, ok, type Result } from "../../src/result.js"

/**
 * A decision record, as the index needs it.
 *
 * The record files are the source of truth and this reads them. The index used
 * to be maintained by hand beside them, which made it a second copy of facts
 * that already existed — and a second copy drifts. It drifted twice in two days:
 * two merge conflicts on one table within half an hour, and two concurrent runs
 * that each wrote an `0032`.
 *
 * The same move 0015 made for the primitive registry, applied to prose.
 */

export type DecisionRecord = {
  readonly number: number
  /** The filename, which is also the link the index emits. */
  readonly file: string
  readonly title: string
  readonly status: string
  readonly section: string
}

export type RecordProblem =
  | { readonly code: "filename-not-numbered"; readonly file: string }
  | { readonly code: "missing-heading"; readonly file: string }
  | {
      readonly code: "heading-number-mismatch"
      readonly file: string
      readonly heading: number
    }
  | { readonly code: "missing-field"; readonly file: string; readonly field: "Status" | "Section" }

export const describeRecordProblem = (problem: RecordProblem): string => {
  switch (problem.code) {
    case "filename-not-numbered":
      return `${problem.file} is not named NNNN-some-slug.md`
    case "missing-heading":
      return `${problem.file} has no "# NNNN — Title" heading on its first line`
    case "heading-number-mismatch":
      return `${problem.file} is numbered ${problem.heading} in its heading`
    case "missing-field":
      return `${problem.file} has no **${problem.field}:** line`
  }
}

export const RECORD_FILE = /^(\d{4})-[a-z0-9-]+\.md$/

/**
 * Both separators are accepted because both are in the repo: records 0001–0015
 * and 0025–0026 use an em dash, the rest use a full stop. Normalising them would
 * mean editing sixteen records to satisfy a parser, which is the wrong way round
 * — the records are the artefact and this is the thing that reads them.
 */
const HEADING = /^#\s+(\d{4})\s*(?:—|\.)\s*(.+?)\s*$/

const fieldOf = (content: string, field: "Status" | "Section"): string | undefined =>
  new RegExp(`^\\*\\*${field}:\\*\\*\\s*(.+?)\\s*$`, "m").exec(content)?.[1]

export const parseDecisionRecord = (
  file: string,
  content: string
): Result<DecisionRecord, RecordProblem> => {
  const named = RECORD_FILE.exec(file)
  if (!named?.[1]) return err({ code: "filename-not-numbered", file })

  const number = Number(named[1])

  const heading = HEADING.exec(content.split("\n")[0] ?? "")
  if (!heading?.[1] || !heading[2]) return err({ code: "missing-heading", file })

  /**
   * The filename wins, because it is what the link resolves to. A heading that
   * disagrees is a rename someone did not finish, and reporting it is more
   * useful than silently preferring either one.
   */
  const headingNumber = Number(heading[1])
  if (headingNumber !== number) {
    return err({ code: "heading-number-mismatch", file, heading: headingNumber })
  }

  const status = fieldOf(content, "Status")
  if (status === undefined) return err({ code: "missing-field", file, field: "Status" })

  const section = fieldOf(content, "Section")
  if (section === undefined) return err({ code: "missing-field", file, field: "Section" })

  return ok({ number, file, title: heading[2], status, section })
}
