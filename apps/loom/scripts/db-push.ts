/*
 * Every import below comes from `@jam-overture/loom`'s **built** output, not
 * its source, so this script is only ever as current as `dist/`. That is why
 * `db:push` builds the package before running it: the maintainer pulled a
 * branch that renamed a table, ran `db:push`, and got
 * `does not provide an export named 'ensureApplicationStoreSchema'` — which
 * says nothing about the missing build and everything about a module that
 * looked broken. `telemetry:prune` and `signals:collect` import the same way
 * and now build the same way.
 */
import nextEnv from "@next/env"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import {
  ensureApplicationStoreSchema,
  ensureHoldStoreSchema,
  ensureProjectStoreSchema,
  ensureTreeStoreSchema,
  migrateApplicationIds,
} from "@jam-overture/loom/postgres"
import { ensureReaderSignalsSchema } from "@jam-overture/loom/signals/postgres"
import { ensureTelemetrySchema } from "@jam-overture/loom/telemetry/postgres"

import { ensurePortalAccountsSchema } from "../app/(portal)/_lib/auth/accounts-postgres"
import { ensureSignInAttemptsSchema } from "../app/(portal)/_lib/auth/attempts-postgres"
import { ensureIngestKeysSchema } from "../app/_lib/reader-signals/keys-postgres"
import { resolveConnectionString } from "../app/_lib/app/connection"

/**
 * Creates the tables the portal needs — the store's, the telemetry journal's, and
 * its own sign-in attempt log. Run once against a new database.
 *
 * Deliberately a script rather than something the app does on boot: DDL issued by
 * several serverless instances starting at once is a race, and a migration that
 * runs implicitly is a migration nobody decided to run.
 *
 * `loadEnvConfig` is what makes `.env.local` work here. Next loads it for the
 * app, but a bare script does not — so without this the connection string sits in
 * the file the instructions told you to put it in, and the script says it is
 * missing.
 */
/** `@next/env` is CommonJS, so the named export is only reachable off the default. */
const { loadEnvConfig } = nextEnv

loadEnvConfig(process.cwd())

let connectionString: string | undefined

try {
  connectionString = resolveConnectionString()
} catch (cause) {
  console.error(cause instanceof Error ? cause.message : String(cause))
  process.exit(1)
}

if (connectionString === undefined) {
  console.error(
    "db:push needs DATABASE_URL (or POSTGRES_URL).\n" +
      "Put it in apps/loom/.env.local, or pass it inline:\n" +
      "  DATABASE_URL='postgresql://…:6543/postgres' pnpm db:push"
  )
  process.exit(1)
}

/**
 * The seed and its connection, imported **here** rather than at the top of the
 * file, and the position is load-bearing.
 *
 * `app/_lib/app/database.ts` resolves the connection string at module scope —
 * correct in the app, where Next has already loaded the environment. In a
 * script, static imports are evaluated before the first statement runs, so a
 * top-level `import` of it would read `DATABASE_URL` **before**
 * `loadEnvConfig` had put it there, find nothing, and fall back to the memory
 * store. `seedDeployment()` would then write this deployment's pages into a
 * `Map`, and the script would print that it had succeeded.
 *
 * The check below is the belt to this brace: a seed that is about to run
 * against memory says so and stops, because a silent no-op here is a portal
 * that comes up empty with nothing anywhere saying why.
 */
const { seedDeployment } = await import("../app/(portal)/_lib/store")
const { endDatabase, storeIsDurable } = await import("../app/_lib/app/database")

if (!storeIsDurable) {
  console.error(
    "loom: db:push resolved the schema's connection string but the app's store fell back to " +
      "memory, which means seeding would write to a Map and vanish. Nothing has been seeded."
  )
  process.exit(1)
}

const client = postgres(connectionString, { prepare: false, max: 1 })

try {
  const db = drizzle(client)
  await ensureTreeStoreSchema(db)
  /**
   * The custody of what the Gate held back. Created here rather than when the
   * portal first needs it, because a hold that cannot be written is a change a
   * reviewer never sees — a failure with no symptom on the page that caused it.
   */
  await ensureHoldStoreSchema(db)
  await ensureTelemetrySchema(db)
  /**
   * Applications before projects, and the order is load-bearing.
   *
   * `ensureApplicationStoreSchema` renames the `loom_projects` that #608 created
   * — which held applications — into `loom_applications`.
   * `ensureProjectStoreSchema` then creates a fresh `loom_projects` for the
   * grouping. Run the other way round, the `CREATE TABLE IF NOT EXISTS` sees
   * the old table, skips, and the rename then carries it off: the deployment
   * ends with no projects table and no error. A test holds this.
   */
  await ensureApplicationStoreSchema(db)
  await ensureProjectStoreSchema(db)
  /**
   * The buffer and the two counters. Created even on a deployment that never
   * switches signals on, because the alternative is a deployment that does
   * switch them on discovering the tables are missing from a route handler that
   * cannot do anything about it.
   */
  await ensureReaderSignalsSchema(db)
  /** The portal's own table, not the runtime's — see `lib/auth/attempts-postgres.ts`. */
  await ensureSignInAttemptsSchema(db)
  /**
   * The portal's other two, and the ones without which nobody signs in at all
   * (0285). An account is a row now, so a deployment that has not run this has
   * no way to admit anybody — which the sign-in page says in those words rather
   * than as a rejected key.
   */
  await ensurePortalAccountsSchema(db)
  /**
   * The keys a project's pages post their readers' signals with (0298). The
   * door asks this table about every keyed delivery, so a deployment that has
   * not run this refuses every customer's readers as unavailable rather than
   * filing them anywhere.
   */
  await ensureIngestKeysSchema(db)
  /**
   * Last, because it is the only data statement here and every column it writes
   * to has to exist first. It carries rows written before 12 October from
   * `prj_default` to `app_default`, and is a no-op on a database that has
   * already been carried or was never on the old value.
   */
  await migrateApplicationIds(db)
  /**
   * The rows this deployment should contain, after the columns to hold them.
   *
   * **This ran in a request until 13 October** — memoised per process,
   * budgeted, and create-if-absent, which made it look free. It was not. The
   * pool is `max: 1`, so six seeding reads are six round trips one after the
   * other, and on a deployment seeded weeks ago all six answer *already there*
   * before the screen's own reads can start. `/portal` drew *the application
   * store is unavailable* on the back of it.
   *
   * It belongs here for the reason the schema does, and this file already said
   * it: a migration that runs implicitly is a migration nobody decided to run.
   *
   * It goes through the app's own store handles rather than the `db` above, so
   * what is seeded is what the app reads — which means a second connection, and
   * `endDatabase` below is why the script still exits.
   */
  await seedDeployment()
  console.log(
    "loom: loom_trees, loom_revisions, loom_holds, loom_telemetry, loom_projects, " +
      "loom_applications, loom_reader_signals, loom_reader_tallies, loom_reader_funnels, " +
      "loom_signin_attempts, loom_portal_accounts, loom_portal_memberships and loom_ingest_keys " +
      "are present, and this deployment's pages are in them"
  )
} finally {
  await client.end()
  await endDatabase()
}
