import { readdir, readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

import {
  checkNumbering,
  describeNumberingProblem,
  severityOf,
  type Severity,
} from "./numbering.js"
import { describeRecordProblem, parseDecisionRecord, RECORD_FILE, type DecisionRecord } from "./record.js"
import { INDEX_HEADING, renderIndex, withGeneratedIndex } from "./render.js"

/**
 * The IO half: read the directory, parse each record, check the set, render.
 *
 * Kept apart from the parsing and the checking so that everything with a
 * judgment in it is a pure function of strings, testable without a filesystem.
 * This module has no opinions — it only fetches and reports.
 */

export const DECISIONS_DIRECTORY = fileURLToPath(new URL("../../decisions/", import.meta.url))

export const README_PATH = `${DECISIONS_DIRECTORY}README.md`

/**
 * Something wrong, as a sentence, with what it should cost attached.
 *
 * A sentence alone was enough while every problem failed the build. Once a hole
 * in the numbering became something to state rather than something to stop for,
 * the caller had to be able to tell the two apart without reading the wording.
 */
export type Problem = {
  readonly severity: Severity
  readonly message: string
}

export type CollectedDecisions = {
  readonly records: readonly DecisionRecord[]
  /** Everything wrong. Empty means the set is coherent. */
  readonly problems: readonly Problem[]
}

/** The problems that should fail `pnpm verify`, which is not all of them. */
export const blocking = (problems: readonly Problem[]): readonly Problem[] =>
  problems.filter((problem) => problem.severity === "blocking")

export const collectDecisions = async (
  directory: string = DECISIONS_DIRECTORY
): Promise<CollectedDecisions> => {
  const entries = (await readdir(directory)).filter((file) => RECORD_FILE.test(file)).sort()

  const parsed = await Promise.all(
    entries.map(async (file) =>
      parseDecisionRecord(file, await readFile(`${directory}${file}`, "utf8"))
    )
  )

  const records = parsed.flatMap((result) => (result.ok ? [result.value] : []))
  const unparsed = parsed.flatMap((result): readonly Problem[] =>
    result.ok ? [] : [{ severity: "blocking", message: describeRecordProblem(result.error) }]
  )

  return {
    records,
    problems: [
      ...unparsed,
      ...checkNumbering(records).map(
        (problem): Problem => ({
          severity: severityOf(problem),
          message: describeNumberingProblem(problem),
        })
      ),
    ],
  }
}

/** The README as it should be, given what is on disk. */
export const generatedReadme = async (
  directory?: string
): Promise<{ readonly readme: string; readonly problems: readonly Problem[] }> => {
  const { records, problems } = await collectDecisions(directory)
  const current = await readFile(README_PATH, "utf8")
  const rewritten = withGeneratedIndex(current, renderIndex(records))

  return rewritten.ok
    ? { readme: rewritten.value, problems }
    : {
        readme: current,
        problems: [
          ...problems,
          {
            severity: "blocking",
            message: `${README_PATH} has no "${INDEX_HEADING}" heading`,
          },
        ],
      }
}
