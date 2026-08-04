import { ok, type Result } from "@loom/runtime"

import { afterFailure, type AttemptRecord } from "./throttle"

/**
 * Where failed sign-ins are remembered.
 *
 * Three operations and no query language, because there is exactly one caller
 * and it asks exactly three things: what has this subject done, count another
 * one, and forget them. A store that could be asked anything else would be a
 * store somebody eventually asks who has been trying — which is the report this
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
}

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
  }
}
