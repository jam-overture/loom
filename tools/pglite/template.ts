import { PGlite } from "@electric-sql/pglite"
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite"
import { onTestFinished } from "vitest"

/**
 * A fresh PGlite for every test, without paying for a fresh PGlite every test.
 *
 * PGlite is Postgres compiled to WebAssembly, and the Postgres suites booted
 * one per test and migrated it: some five hundred boots, three quarters of what
 * `pnpm verify` spent in tests on 24 October 2026. Starting a database from a
 * data directory that has already been prepared is several times cheaper, and
 * it is still a separate database: nothing one test writes reaches the next,
 * which is the isolation the per-test boot was for.
 *
 * So a suite names how its database is prepared, once. The first call runs
 * those steps on a database of its own and dumps its data directory; every call
 * then starts a new database from that dump. Nothing is booted until a test
 * asks, so a step that fails fails the test that asked.
 *
 * Each database is closed when the test that asked for it finishes. The suites
 * never closed theirs, and every open one is a WebAssembly heap the next boot
 * competes with: boots got steadily slower within a file while they were left
 * open. That makes this callable only from inside a running test, which is
 * where every suite already calls it.
 *
 * With no steps the template is an empty database — for the suites that
 * create an older schema by hand before migrating it.
 */

export type Preparation = (db: PgliteDatabase) => Promise<void>

/** The prepared database, dumped once; the instance that produced it is not kept. */
const prepared = async (steps: readonly Preparation[]): Promise<Blob> => {
  const pg = await PGlite.create()
  const db = drizzle(pg)

  for (const step of steps) await step(db)

  const dump = await pg.dumpDataDir("none")
  await pg.close()

  return dump
}

export const pgliteTemplate = (...steps: readonly Preparation[]): (() => Promise<PgliteDatabase>) => {
  let template: Promise<Blob> | undefined

  return async () => {
    template ??= prepared(steps)

    const pg = await PGlite.create({ loadDataDir: await template })

    onTestFinished(() => pg.close())

    return drizzle(pg)
  }
}
