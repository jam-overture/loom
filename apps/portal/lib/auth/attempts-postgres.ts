import { and, eq, gte, lt, ne, sql } from "drizzle-orm"
import { bigint, integer, pgTable, text } from "drizzle-orm/pg-core"
import { z } from "zod"

import { err, ok } from "@loom/runtime"
import type { LoomDatabase } from "@loom/runtime/postgres"

import type { AttemptLog, AttemptLogError } from "./attempts"

/**
 * The attempt log, backed by the same Postgres the store and the journal use —
 * one handle, one pool (0022, and `database.ts`).
 *
 * This table belongs to the portal rather than to the runtime, and so does its
 * DDL. The runtime knows nothing about sign-in: it takes an actor on an intent
 * and never asks how a host established it. A `loom_signin_attempts` table
 * shipped from `@loom/runtime` would be the framework asserting that its
 * consumers authenticate people, which 0018 spent a record saying it does not
 * get to do.
 *
 * Times are milliseconds since the epoch in `bigint` columns rather than
 * `timestamptz`. The throttle's arithmetic is in milliseconds because
 * `Date.now()` is, and a column that round-trips through a `Date` would put a
 * conversion — and a rounding — between the number a lockout was computed from
 * and the number it is compared against.
 */

export const loomSignInAttempts = pgTable("loom_signin_attempts", {
  subject: text("subject").primaryKey(),
  failures: integer("failures").notNull(),
  firstFailureAt: bigint("first_failure_at", { mode: "number" }).notNull(),
  lastFailureAt: bigint("last_failure_at", { mode: "number" }).notNull(),
})

/** One statement per entry, for the reason the store's and the journal's DDL is a list. */
export const SIGN_IN_ATTEMPTS_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS loom_signin_attempts (
    subject text PRIMARY KEY,
    failures integer NOT NULL,
    first_failure_at bigint NOT NULL,
    last_failure_at bigint NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS loom_signin_attempts_last_idx
     ON loom_signin_attempts (last_failure_at)`,
]

export const ensureSignInAttemptsSchema = async (db: LoomDatabase): Promise<void> => {
  for (const statement of SIGN_IN_ATTEMPTS_DDL) {
    await db.execute(sql.raw(statement))
  }
}

/**
 * Rows are parsed rather than trusted, like every other row this portal reads.
 * A count that is not a count would produce a lockout nobody could explain, and
 * the throttle would rather report that it cannot answer.
 */
const rowSchema = z.object({
  failures: z.number().int().positive(),
  firstFailureAt: z.number().int().nonnegative(),
  lastFailureAt: z.number().int().nonnegative(),
})

const failure = (cause: unknown, detail: string): AttemptLogError => ({
  code: "unavailable",
  detail: `${detail}: ${cause instanceof Error ? cause.message : String(cause)}`,
})

export const postgresAttemptLog = (db: LoomDatabase): AttemptLog => ({
  recall: async (subject, cutoff) => {
    try {
      const [row] = await db
        .select({
          failures: loomSignInAttempts.failures,
          firstFailureAt: loomSignInAttempts.firstFailureAt,
          lastFailureAt: loomSignInAttempts.lastFailureAt,
        })
        .from(loomSignInAttempts)
        .where(
          and(
            eq(loomSignInAttempts.subject, subject),
            /** Staleness is a `WHERE`, so a forgotten row and a missing one are one case. */
            gte(loomSignInAttempts.lastFailureAt, cutoff)
          )
        )
        .limit(1)

      if (row === undefined) return ok(null)

      const parsed = rowSchema.safeParse(row)

      return parsed.success
        ? ok(parsed.data)
        : err<AttemptLogError>({
            code: "unavailable",
            detail: "a stored sign-in attempt did not parse",
          })
    } catch (cause) {
      return err(failure(cause, "could not read sign-in attempts"))
    }
  },

  /**
   * One statement, so a caller sending their guesses in parallel is counted for
   * all of them. A read followed by a write would let concurrent failures
   * collapse into a single increment, which is the cheapest way to defeat a
   * throttle and needs no more than a `for` loop to exploit.
   *
   * The `CASE`s restate `afterFailure` in SQL. That duplication is real and is
   * the price of atomicity — the contract suite runs against both
   * implementations precisely so a disagreement is a failing test rather than a
   * lockout that behaves differently in production than in development.
   */
  penalise: async (subject, now, cutoff) => {
    const stale = sql`${loomSignInAttempts.lastFailureAt} < ${cutoff}`

    try {
      const [row] = await db
        .insert(loomSignInAttempts)
        .values({ subject, failures: 1, firstFailureAt: now, lastFailureAt: now })
        .onConflictDoUpdate({
          target: loomSignInAttempts.subject,
          set: {
            failures: sql`CASE WHEN ${stale} THEN 1 ELSE ${loomSignInAttempts.failures} + 1 END`,
            firstFailureAt: sql`CASE WHEN ${stale} THEN ${now} ELSE ${loomSignInAttempts.firstFailureAt} END`,
            lastFailureAt: sql`${now}`,
          },
        })
        .returning({
          failures: loomSignInAttempts.failures,
          firstFailureAt: loomSignInAttempts.firstFailureAt,
          lastFailureAt: loomSignInAttempts.lastFailureAt,
        })

      const parsed = rowSchema.safeParse(row)
      if (!parsed.success) {
        return err<AttemptLogError>({
          code: "unavailable",
          detail: "the recorded sign-in attempt did not parse",
        })
      }

      /**
       * Swept only when a subject appears for the first time, which is the only
       * case that grows the table — and the case a caller rotating addresses
       * produces on every request, so the sweep runs exactly when it is needed.
       * The subject's own row is excluded so the delete cannot race the upsert
       * that just wrote it.
       */
      if (parsed.data.failures === 1) {
        await db
          .delete(loomSignInAttempts)
          .where(
            and(lt(loomSignInAttempts.lastFailureAt, cutoff), ne(loomSignInAttempts.subject, subject))
          )
      }

      return ok(parsed.data)
    } catch (cause) {
      return err(failure(cause, "could not record a failed sign-in"))
    }
  },

  forgive: async (subject) => {
    try {
      await db.delete(loomSignInAttempts).where(eq(loomSignInAttempts.subject, subject))

      return ok(undefined)
    } catch (cause) {
      return err(failure(cause, "could not clear sign-in attempts"))
    }
  },
})
