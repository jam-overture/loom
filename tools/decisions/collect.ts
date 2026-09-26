import { readdir, readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

import { checkCitations, describeCitationProblem } from "./citations.js"
import {
  checkNumbering,
  describeNumberingProblem,
  severityOf,
  type Severity,
} from "./numbering.js"
import { describeRecordProblem, parseDecisionRecord, RECORD_FILE, type DecisionRecord } from "./record.js"
import { INDEX_HEADING, renderIndex, withGeneratedIndex } from "./render.js"
import { checkShape, describeShapeProblem } from "./shape.js"
import { checkStatuses, describeStatusProblem } from "./status.js"

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

  const bodies = await Promise.all(
    entries.map(async (file) => [file, await readFile(`${directory}${file}`, "utf8")] as const)
  )

  const parsed = bodies.map(([file, content]) => parseDecisionRecord(file, content))

  const records = parsed.flatMap((result) => (result.ok ? [result.value] : []))
  const unparsed = parsed.flatMap((result): readonly Problem[] =>
    result.ok ? [] : [{ severity: "blocking", message: describeRecordProblem(result.error) }]
  )

  const malformed = bodies.flatMap(([file, content]) =>
    checkShape(file, content).map(
      (problem): Problem => ({ severity: "blocking", message: describeShapeProblem(problem) })
    )
  )

  return {
    records,
    problems: [
      ...unparsed,
      ...malformed,
      ...checkStatuses(records).map(
        (problem): Problem => ({ severity: "blocking", message: describeStatusProblem(problem) })
      ),
      ...checkNumbering(records).map(
        (problem): Problem => ({
          severity: severityOf(problem),
          message: describeNumberingProblem(problem),
        })
      ),
    ],
  }
}

/**
 * Where a citation of a record can be written and checked.
 *
 * The records themselves — already gated, since #217 left two of them citing a
 * renumbered record by its old number — plus the runtime and the tools that
 * build it, which is this lane's own prose.
 *
 * The four surfaces under `apps/loom` cite records too, and are deliberately
 * not here: a citation this check refuses turns `pnpm verify` red, and one
 * lane's scheduled run may not put a gate in front of four others without their
 * owners agreeing to it. Offered to them in `FINDINGS.md` rather than imposed.
 */
export const CITED_FROM: readonly string[] = [
  DECISIONS_DIRECTORY,
  fileURLToPath(new URL("../../src/", import.meta.url)),
  fileURLToPath(new URL("../../tools/", import.meta.url)),
]

const CITING_FILE = /\.(ts|tsx|md)$/

const filesUnder = async (directory: string): Promise<readonly string[]> => {
  const entries = await readdir(directory, { withFileTypes: true })

  const found = await Promise.all(
    entries.map(async (entry): Promise<readonly string[]> => {
      const path = `${directory}${entry.name}`

      if (entry.isDirectory()) return filesUnder(`${path}/`)

      return CITING_FILE.test(entry.name) ? [path] : []
    })
  )

  return found.flat()
}

/**
 * Every citation of a record from the code, held against the records that exist.
 *
 * Reported against a path relative to the repository, because the message is
 * read in a test failure and `src/frame/index.ts` is what a reader opens.
 */
export const collectCitations = async (
  roots: readonly string[] = CITED_FROM,
  directory: string = DECISIONS_DIRECTORY
): Promise<readonly Problem[]> => {
  const files = new Set((await readdir(directory)).filter((file) => RECORD_FILE.test(file)))
  const repository = fileURLToPath(new URL("../../", import.meta.url))

  const sources = (await Promise.all(roots.map(filesUnder))).flat()

  const checked = await Promise.all(
    sources.map(async (path) =>
      checkCitations(path.slice(repository.length), await readFile(path, "utf8"), files)
    )
  )

  return checked
    .flat()
    .map((problem): Problem => ({ severity: "blocking", message: describeCitationProblem(problem) }))
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
