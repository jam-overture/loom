import { PGlite } from "@electric-sql/pglite"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/pglite"
import { describe, expect, it, vi } from "vitest"

import type { LoomDatabase } from "@loom/runtime/postgres"

import { describeAttemptLogContract } from "./attempts.contract"
import {
  ensureSignInAttemptsSchema,
  loomSignInAttempts,
  postgresAttemptLog,
} from "./attempts-postgres"

/**
 * Against PGlite — Postgres compiled to WebAssembly — for the reason the
 * runtime's Postgres suites use it: real Postgres semantics with no external
 * database, so `pnpm verify` stays green offline. The `ON CONFLICT DO UPDATE`
 * here is doing the work that makes the throttle countable under concurrency,
 * and a fake would prove nothing about it.
 */
vi.setConfig({ testTimeout: 30_000 })

const freshDatabase = async (): Promise<LoomDatabase> => {
  const db = drizzle(new PGlite())
  await ensureSignInAttemptsSchema(db)

  return db
}

describeAttemptLogContract("postgresAttemptLog", async () =>
  postgresAttemptLog(await freshDatabase())
)

const T0 = 1_700_000_000_000

describe("postgresAttemptLog — Postgres specifics", () => {
  it("is idempotent about its schema", async () => {
    const db = await freshDatabase()
    await ensureSignInAttemptsSchema(db)
    await postgresAttemptLog(db).penalise("a", T0, 0)

    expect(await db.select().from(loomSignInAttempts)).toHaveLength(1)
  })

  it("holds one row per subject rather than one per attempt", async () => {
    const db = await freshDatabase()
    const log = postgresAttemptLog(db)

    await log.penalise("a", T0, 0)
    await log.penalise("a", T0 + 1, 0)
    await log.penalise("a", T0 + 2, 0)

    expect(await db.select().from(loomSignInAttempts)).toHaveLength(1)
  })

  /**
   * The sign-in form is reachable without a session, so a caller who rotates
   * their address inserts a row on every request. Without the sweep, an
   * unauthenticated endpoint would be an unbounded write.
   */
  it("sweeps subjects it has forgotten when a new one appears", async () => {
    const db = await freshDatabase()
    const log = postgresAttemptLog(db)

    await log.penalise("old", T0, 0)
    await log.penalise("new", T0 + 10_000, T0 + 5_000)

    const rows = await db.select().from(loomSignInAttempts)

    expect(rows.map((row) => row.subject)).toEqual(["new"])
  })

  it("leaves a subject still inside the window alone", async () => {
    const db = await freshDatabase()
    const log = postgresAttemptLog(db)

    await log.penalise("recent", T0, 0)
    await log.penalise("new", T0 + 1_000, T0 - 5_000)

    const rows = await db.select().from(loomSignInAttempts)

    expect(rows.map((row) => row.subject).sort()).toEqual(["new", "recent"])
  })

  /**
   * A returning subject does not sweep. That is deliberate — the table only
   * grows when a new subject arrives — and it is the kind of optimisation that
   * silently becomes "sweeps on every request" if nobody holds it down.
   */
  it("does not sweep when an existing subject fails again", async () => {
    const db = await freshDatabase()
    const log = postgresAttemptLog(db)

    await log.penalise("old", T0, 0)
    await log.penalise("busy", T0 + 6_000, 0)
    /** `busy` is inside the cutoff, so this is their second failure and not a first. */
    await log.penalise("busy", T0 + 10_000, T0 + 5_000)

    expect(await db.select().from(loomSignInAttempts)).toHaveLength(2)
  })

  it("reports a failed read rather than throwing at the caller", async () => {
    const db = await freshDatabase()
    const log = postgresAttemptLog(db)
    await db.execute(sql.raw("DROP TABLE loom_signin_attempts"))

    const recalled = await log.recall("a", 0)

    expect(recalled.ok).toBe(false)
    expect(recalled.ok ? "" : recalled.error.code).toBe("unavailable")
  })

  /**
   * The failure that matters most: a `penalise` that cannot land must be
   * reported, because the caller's whole reason for asking is to refuse the
   * attempt when it cannot be counted (0034).
   */
  it("reports a failed write rather than pretending the attempt was counted", async () => {
    const db = await freshDatabase()
    const log = postgresAttemptLog(db)
    await db.execute(sql.raw("DROP TABLE loom_signin_attempts"))

    const counted = await log.penalise("a", T0, 0)

    expect(counted.ok).toBe(false)
  })

  it("reports a stored attempt that no longer makes sense rather than acting on it", async () => {
    const db = await freshDatabase()
    await db.execute(
      sql.raw("INSERT INTO loom_signin_attempts VALUES ('a', -3, 1700000000000, 1700000000000)")
    )

    const recalled = await postgresAttemptLog(db).recall("a", 0)

    expect(recalled.ok).toBe(false)
  })
})
