import { everyMemberOf } from "../../src/closed-set.js"

import type { DecisionRecord } from "./record.js"

/**
 * What a status line is allowed to begin with, held against the records.
 *
 * `decisions/README.md` has said since the first record that a status is one of
 * `Proposed`, `Accepted`, or `Superseded by NNNN`. The parser reads everything
 * after the colon as an opaque string, so a status of `Bananas` went into the
 * generated index verbatim and nothing anywhere objected. That made the sentence
 * in the README the one claim about `decisions/` that was measurably not true of
 * it — not because the records disobey it, but because nothing was holding them
 * to it and the sentence described a closed set the directory did not have.
 *
 * Filed by `Loom lessons` on 25 September, writing the lesson on which claims in
 * this repository carry a second copy to be compared against.
 *
 * The fix is deliberately the *opener* and not the whole string. The real
 * statuses are more various than three words — several carry a qualifying clause
 * (`Accepted — it changes no schema, no tree and no delta model, and …`), one is
 * accepted for half of itself and proposed for the other — and those are good
 * statuses. A record that is honest about being half-decided is the record doing
 * its job. So the closed set is the first word, the clause after it is free
 * prose, and the README now says exactly that.
 */

export type StatusOpener = "Proposed" | "Accepted" | "Superseded"

/** In the order `decisions/README.md` gives them. */
export const STATUS_OPENERS: readonly StatusOpener[] = everyMemberOf<StatusOpener>()([
  "Proposed",
  "Accepted",
  "Superseded",
])

export type StatusProblem = {
  readonly code: "unknown-status"
  readonly file: string
  readonly opener: string
}

export const describeStatusProblem = (problem: StatusProblem): string =>
  `${problem.file} has a status beginning "${problem.opener}", and a status begins with one of ${STATUS_OPENERS.join(", ")}`

/**
 * The first word of a status, which is the part that has to be one of three.
 *
 * Bare, with no emphasis around it: every status in the directory is written
 * that way, and `**Accepted**` would make the index's own column render two
 * different ways for one state.
 */
export const openerOf = (status: string): string => /^\S+/.exec(status)?.[0] ?? ""

export const checkStatuses = (records: readonly DecisionRecord[]): readonly StatusProblem[] =>
  records.flatMap((record): readonly StatusProblem[] => {
    const opener = openerOf(record.status)

    return STATUS_OPENERS.some((allowed) => allowed === opener)
      ? []
      : [{ code: "unknown-status", file: record.file, opener }]
  })
