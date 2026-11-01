import { PGlite } from "@electric-sql/pglite"
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite"
import { onTestFinished } from "vitest"

/**
 * A fresh database for every test, without paying for a fresh PGlite every test.
 *
 * PGlite is Postgres compiled to WebAssembly, and the Postgres suites booted and
 * migrated one per test and never closed it: some five hundred boots at one to
 * three seconds each, three quarters of what `pnpm verify` spent in tests on
 * 24 October 2026. Emptying a database that is already up and migrating it
 * again costs tens of milliseconds.
 *
 * So a suite names how its database is prepared, once, and each call hands the
 * test a PGlite on which `public` has just been dropped, recreated and
 * prepared. Every table, row, index, sequence and row-security setting a test
 * can see lives in `public`, so nothing one test wrote is there for the next,
 * which is the isolation the per-test boot was for. Nothing in this repository
 * creates roles, extensions or schemas of its own; one that did would want
 * resetting here too.
 *
 * The PGlite goes back to the template when the test that asked for it
 * finishes, so a test that asks twice gets two separate databases, and the
 * next test reuses both. That makes this callable only from inside a running
 * test, which is where every suite calls it.
 *
 * With no steps the database is empty — for the suites that create an older
 * schema by hand before migrating it.
 */

export type Preparation = (db: PgliteDatabase) => Promise<void>

export const pgliteTemplate = (...steps: readonly Preparation[]): (() => Promise<PgliteDatabase>) => {
  const idle: PGlite[] = []

  return async () => {
    const pg = idle.pop() ?? (await PGlite.create())

    onTestFinished(() => {
      idle.push(pg)
    })

    await pg.exec("DROP SCHEMA public CASCADE; CREATE SCHEMA public")

    const db = drizzle(pg)

    for (const step of steps) await step(db)

    return db
  }
}
