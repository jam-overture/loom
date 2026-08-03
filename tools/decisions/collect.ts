import { readdir, readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

import { describeNumberingProblem, checkNumbering } from "./numbering.js"
import { describeRecordProblem, parseDecisionRecord, RECORD_FILE, type DecisionRecord } from "./record.js"
import { renderIndex, withGeneratedIndex } from "./render.js"

/**
 * The IO half: read the directory, parse each record, check the set, render.
 *
 * Kept apart from the parsing and the checking so that everything with a
 * judgment in it is a pure function of strings, testable without a filesystem.
 * This module has no opinions — it only fetches and reports.
 */

export const DECISIONS_DIRECTORY = fileURLToPath(new URL("../../decisions/", import.meta.url))

export const README_PATH = `${DECISIONS_DIRECTORY}README.md`

export type CollectedDecisions = {
  readonly records: readonly DecisionRecord[]
  /** Everything wrong, as sentences. Empty means the set is coherent. */
  readonly problems: readonly string[]
}

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
  const unparsed = parsed.flatMap((result) =>
    result.ok ? [] : [describeRecordProblem(result.error)]
  )

  return {
    records,
    problems: [...unparsed, ...checkNumbering(records).map(describeNumberingProblem)],
  }
}

/** The README as it should be, given what is on disk. */
export const generatedReadme = async (
  directory?: string
): Promise<{ readonly readme: string; readonly problems: readonly string[] }> => {
  const { records, problems } = await collectDecisions(directory)
  const current = await readFile(README_PATH, "utf8")
  const rewritten = withGeneratedIndex(current, renderIndex(records))

  return rewritten.ok
    ? { readme: rewritten.value, problems }
    : { readme: current, problems: [...problems, `${README_PATH} has no "${"## Index"}" heading`] }
}
