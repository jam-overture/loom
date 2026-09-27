import { ok, type Result } from "@jam-overture/loom"

import { afterFailure, type AttemptRecord } from "./throttle"

/**
 * Where failed sign-ins are remembered.
 *
 * Four operations and no query language. Three of them belong to the throttle
 * and ask about one subject: what has this one done, count another failure, and
 * forget them. The fourth belongs to an operator and may not ask about a subject
 * at all — `survey` reads the table in aggregate and returns records stripped of
 * whose they are (0039). That is the line this seam draws: the log can be
 * counted, never enumerated, so no caller can ever assemble the report this
 * table is deliberately unable to produce (see `subject.ts`).
 *
 * `penalise` returns the record it wrote rather than leaving the caller to read
 * it back. The read-then-write it replaces is the race that matters here: two
 * concurrent failures that both read the old count both write the same new one,
 * and an attacker who sends their guesses in parallel never accumulates a count
 * at all. The whole increment has to happen in one operation the backing store
 * can make atomic, so it returns its own result.
 *
 * Every operation is fallible and says so. 0027 fails closed on absent
 * configuration; the same reasoning applies to a log that cannot answer, and the
 * caller cannot fail closed on an error it was never handed.
 */

export type AttemptLogError = {
  readonly code: "unavailable"
  readonly detail: string
}

/**
 * The whole log, counted — what an operator is allowed to learn about the
 * pressure on their sign-in form.
 *
 * The four totals are exact over every live record. `records` is a capped sample
 * of the same rows, most recent first, and exists because the arithmetic that
 * turns failure counts into lockouts lives in `throttle.ts` and must not be
 * restated in SQL. `afterFailure` is already written twice for atomicity's sake
 * and that duplication needs a contract suite to police it; `lockoutFor` has no
 * such excuse, so the rows come back and the pure function reads them.
 *
 * They come back without their subjects. A row's identity is a keyed digest that
 * says nothing about who, and the totals are the answer either way — but a
 * caller holding digests can count how often each one returns, which is a
 * visitor log assembled one read at a time. So the seam does not hand them over.
 */
export type AttemptSurvey = {
  /** Subjects carrying at least one failure the throttle has not forgotten. */
  readonly subjects: number
  readonly failures: number
  readonly earliestFailureAt: number | null
  readonly latestFailureAt: number | null
  /** Newest first, capped by the caller's limit. Anonymous by construction. */
  readonly records: readonly AttemptRecord[]
}

export type AttemptLog = {
  /**
   * What is remembered about this subject, or `null` — including when the only
   * record is older than `cutoff`, which is indistinguishable from none by
   * design.
   */
  readonly recall: (
    subject: string,
    cutoff: number
  ) => Promise<Result<AttemptRecord | null, AttemptLogError>>

  /** Counts one failure and answers with the resulting record. */
  readonly penalise: (
    subject: string,
    now: number,
    cutoff: number
  ) => Promise<Result<AttemptRecord, AttemptLogError>>

  /** Forgets a subject entirely. Called when a key is accepted. */
  readonly forgive: (subject: string) => Promise<Result<void, AttemptLogError>>

  /**
   * Every live record, counted. `limit` bounds the sample the totals are
   * accompanied by, never the totals themselves.
   */
  readonly survey: (
    cutoff: number,
    limit: number
  ) => Promise<Result<AttemptSurvey, AttemptLogError>>
}

/**
 * The totals a survey reports, over records the caller has already narrowed to
 * the live ones. Separate from the sample it is handed alongside, because the
 * totals are exact and the sample is capped — computing one from the other would
 * make an operator's numbers depend on their page size.
 */
const totalsOf = (
  live: readonly AttemptRecord[],
  sample: readonly AttemptRecord[]
): AttemptSurvey => ({
  subjects: live.length,
  failures: live.reduce((total, record) => total + record.failures, 0),
  earliestFailureAt: live.reduce<number | null>(
    (earliest, record) =>
      earliest === null ? record.firstFailureAt : Math.min(earliest, record.firstFailureAt),
    null
  ),
  latestFailureAt: live.reduce<number | null>(
    (latest, record) =>
      latest === null ? record.lastFailureAt : Math.max(latest, record.lastFailureAt),
    null
  ),
  records: sample,
})

/**
 * Memory, for a deployment with no database and for `pnpm dev`.
 *
 * Honest about what it is: on one process this is a real throttle, and on a
 * serverless host it is per-instance, so a caller spread across instances is
 * counted several times over and each count grows more slowly than their actual
 * rate. That is the same limitation the memory tree store has, for the same
 * reason (0022), and it is why `attempts-postgres.ts` exists.
 *
 * Stale entries are dropped on read rather than swept, which is enough here:
 * the map lives as long as the process, and a process that has been running long
 * enough to accumulate them has been asked about them.
 */
export const memoryAttemptLog = (): AttemptLog => {
  const records = new Map<string, AttemptRecord>()

  const remembered = (subject: string, cutoff: number): AttemptRecord | null => {
    const record = records.get(subject)

    if (record === undefined) return null
    if (record.lastFailureAt < cutoff) {
      records.delete(subject)

      return null
    }

    return record
  }

  return {
    recall: async (subject, cutoff) => ok(remembered(subject, cutoff)),

    penalise: async (subject, now, cutoff) => {
      const next = afterFailure(remembered(subject, cutoff), now, cutoff)
      records.set(subject, next)

      return ok(next)
    },

    forgive: async (subject) => {
      records.delete(subject)

      return ok(undefined)
    },

    /**
     * Reads without dropping what it skips, unlike `recall` above. A report is
     * not a reason to forget anything, and a survey that swept would make the
     * table's contents depend on how often an operator looked at it.
     */
    survey: async (cutoff, limit) => {
      const live = [...records.values()]
        .filter((record) => record.lastFailureAt >= cutoff)
        .sort((left, right) => right.lastFailureAt - left.lastFailureAt)

      return ok(totalsOf(live, live.slice(0, Math.max(0, limit))))
    },
  }
}
