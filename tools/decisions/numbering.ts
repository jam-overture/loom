import type { DecisionRecord } from "./record.js"

/**
 * The invariants the numbers have to satisfy, checked across the whole set.
 *
 * This is the part that earns its keep. Two runs of the same scheduled routine
 * each wrote an `0032` on the same day, and nothing noticed until the branches
 * met — by which point both records existed, both were referenced, and one had
 * to be renamed by hand. A duplicate is now a test failure on the second branch
 * to run `pnpm verify`, which is early enough to be a rename and not a merge.
 */

export type NumberingProblem =
  | { readonly code: "duplicate-number"; readonly number: number; readonly files: readonly string[] }
  | { readonly code: "gap"; readonly missing: number }
  | { readonly code: "unknown-reference"; readonly from: number; readonly to: number }

export const describeNumberingProblem = (problem: NumberingProblem): string => {
  switch (problem.code) {
    case "duplicate-number":
      return `${problem.number} is claimed by ${problem.files.join(" and ")}`
    case "gap":
      return `${String(problem.missing).padStart(4, "0")} is missing — the numbers must run unbroken from 0001`
    case "unknown-reference":
      return `${problem.from} names ${String(problem.to).padStart(4, "0")} in its status, and there is no such record`
  }
}

/** Every four-digit number a status line names, which is how it points at another record. */
const referencesIn = (status: string): readonly number[] => [
  ...new Set([...status.matchAll(/\b(\d{4})\b/g)].map((match) => Number(match[1]))),
]

const duplicatesIn = (records: readonly DecisionRecord[]): readonly NumberingProblem[] => {
  const byNumber = new Map<number, string[]>()

  for (const record of records) {
    byNumber.set(record.number, [...(byNumber.get(record.number) ?? []), record.file])
  }

  return [...byNumber.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([number, files]) => ({ code: "duplicate-number", number, files }))
}

/**
 * A gap means a record was deleted, which the process forbids — a decision that
 * no longer holds is superseded and left standing (see the README). So a missing
 * number is either a deletion or a record that was never committed, and both are
 * worth stopping for.
 */
const gapsIn = (records: readonly DecisionRecord[]): readonly NumberingProblem[] => {
  const present = new Set(records.map((record) => record.number))
  const highest = Math.max(0, ...present)

  return Array.from({ length: highest }, (_, index) => index + 1)
    .filter((number) => !present.has(number))
    .map((missing) => ({ code: "gap", missing }))
}

const danglingIn = (records: readonly DecisionRecord[]): readonly NumberingProblem[] => {
  const present = new Set(records.map((record) => record.number))

  return records.flatMap((record) =>
    referencesIn(record.status)
      .filter((to) => !present.has(to))
      .map((to) => ({ code: "unknown-reference" as const, from: record.number, to }))
  )
}

export const checkNumbering = (records: readonly DecisionRecord[]): readonly NumberingProblem[] => [
  ...duplicatesIn(records),
  ...gapsIn(records),
  ...danglingIn(records),
]
