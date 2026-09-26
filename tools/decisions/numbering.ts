import type { DecisionRecord } from "./record.js"

/**
 * The invariants the numbers have to satisfy, checked across the whole set.
 *
 * This is the part that earns its keep. Two runs of the same scheduled routine
 * each wrote an `0032` on the same day, and nothing noticed until the branches
 * met — by which point both records existed, both were referenced, and one had
 * to be renamed by hand. A duplicate is now a test failure on the second branch
 * to run `pnpm verify`, which is early enough to be a rename and not a merge.
 *
 * Not every problem is that problem, which is what `severity` is for: a clash
 * is unrecoverable without a rename, a hole is not, and treating them alike
 * made the tool manufacture the first in order to forbid the second.
 */

export type NumberingProblem =
  | { readonly code: "duplicate-number"; readonly number: number; readonly files: readonly string[] }
  | { readonly code: "gap"; readonly missing: number }
  | { readonly code: "unknown-reference"; readonly from: number; readonly to: number }
  | { readonly code: "one-way-supersession"; readonly from: number; readonly to: number }

/**
 * `blocking` fails `pnpm verify`. `reported` is printed, written into the index,
 * and passes.
 *
 * Only a gap is `reported`, and the reasoning is in `gapsIn` below.
 */
export type Severity = "blocking" | "reported"

export const severityOf = (problem: NumberingProblem): Severity =>
  problem.code === "gap" ? "reported" : "blocking"

export const describeNumberingProblem = (problem: NumberingProblem): string => {
  switch (problem.code) {
    case "duplicate-number":
      return `${problem.number} is claimed by ${problem.files.join(" and ")}`
    case "gap":
      return `${String(problem.missing).padStart(4, "0")} has no record here — either one was deleted, or the number is claimed on a branch that has not merged`
    case "unknown-reference":
      return `${problem.from} names ${String(problem.to).padStart(4, "0")} in its status, and there is no such record`
    case "one-way-supersession":
      return `${problem.from} names ${String(problem.to).padStart(4, "0")} in its status, and ${String(problem.to).padStart(4, "0")} does not name it back`
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
 * A hole in the sequence, which is reported and does not fail the build.
 *
 * It used to fail it, on the reasoning that a missing number means a deleted
 * record and the process forbids deleting one. The reasoning was right and the
 * remedy was not, because it is not the only way to arrive at a hole: six lanes
 * branch off `main`, every one of them reads the same highest number, and a run
 * that sees its number taken elsewhere and steps over it to `0097` fails its own
 * index build. So the rule left exactly two options — take the number and
 * collide, or do not write the record — and by 30 August nine unmerged branches
 * had each written an `0096`.
 *
 * A clash costs a rename and every citation of the renamed file. A hole costs a
 * row in the index saying it is a hole. Manufacturing the first to forbid the
 * second is the wrong trade, so the hole is now stated rather than fatal:
 * `renderIndex` writes a line for it, which keeps a deletion just as visible as
 * an exit code did and keeps it visible permanently.
 *
 * What is *not* relaxed: a duplicate number and a status naming a record that
 * does not exist both still fail, and a deleted record that anything supersedes
 * still fails as a dangling reference.
 */
const gapsIn = (records: readonly DecisionRecord[]): readonly NumberingProblem[] =>
  missingNumbers(records).map((missing) => ({ code: "gap", missing }))

/** The numbers below the highest record that no record claims, ascending. */
export const missingNumbers = (records: readonly DecisionRecord[]): readonly number[] => {
  const present = new Set(records.map((record) => record.number))
  const highest = Math.max(0, ...present)

  return Array.from({ length: highest }, (_, index) => index + 1).filter(
    (number) => !present.has(number)
  )
}

/**
 * A supersession written at one end only.
 *
 * A status that names another record is the one relationship in `decisions/`
 * that is written down twice — `0027` carries `partially superseded by 0029` and
 * `0029` carries `partially supersedes 0027`, which is one fact in two files and
 * therefore comparable. Nothing compared them. `Loom lessons` measured it on 25
 * September writing the lesson on corroboration: eleven directions written, ten
 * answered at the other end, `0109 -> 0137` not.
 *
 * Nothing was broken and that is the point. The README's *Changing direction*
 * section required the **old** record to be marked and said nothing about the
 * replacement, so the reciprocal form was a habit rather than a rule — and a
 * habit's output is indistinguishable from a rule's right up until somebody is
 * in a hurry. Somebody was, the next day: `0191` was written with `0117` marked
 * `partially superseded by [0191]` and `0191` saying only `Accepted`. A
 * convention that had held ten times out of eleven for two months broke within
 * twenty-four hours of being described. The README now requires both ends
 * ([0193](../../decisions/0193-a-status-line-is-data-and-a-supersession-is-written-at-both-ends.md))
 * and this is what holds it to that.
 *
 * Symmetric on purpose: it does not read `supersedes` against `superseded by`,
 * only whether the record named names this one. Parsing the direction would make
 * the check an opinion about English, and the fault it exists to catch — one end
 * silent — is the same fault whichever end wrote first.
 *
 * A reference to a record that does not exist is `danglingIn`'s and is skipped
 * here, so one missing record is one problem rather than two.
 */
const oneWayIn = (records: readonly DecisionRecord[]): readonly NumberingProblem[] => {
  const byNumber = new Map(records.map((record) => [record.number, record] as const))

  return records.flatMap((record) =>
    referencesIn(record.status).flatMap((to): readonly NumberingProblem[] => {
      const named = byNumber.get(to)
      if (named === undefined) return []

      return referencesIn(named.status).includes(record.number)
        ? []
        : [{ code: "one-way-supersession", from: record.number, to }]
    })
  )
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
  ...oneWayIn(records),
]
