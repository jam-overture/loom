import nextEnv from "@next/env"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { ensureHoldStoreSchema, ensureTreeStoreSchema } from "@jam-overture/loom/postgres"
import { ensureReaderSignalsSchema } from "@jam-overture/loom/signals/postgres"
import { ensureTelemetrySchema } from "@jam-overture/loom/telemetry/postgres"

import { ensureSignInAttemptsSchema } from "../app/(portal)/_lib/auth/attempts-postgres"
import { resolveConnectionString } from "../app/(portal)/_lib/connection"

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
   * The buffer and the two counters. Created even on a deployment that never
   * switches signals on, because the alternative is a deployment that does
   * switch them on discovering the tables are missing from a route handler that
   * cannot do anything about it.
   */
  await ensureReaderSignalsSchema(db)
  /** The portal's own table, not the runtime's — see `lib/auth/attempts-postgres.ts`. */
  await ensureSignInAttemptsSchema(db)
  console.log(
    "loom: loom_trees, loom_revisions, loom_holds, loom_telemetry, loom_reader_signals, " +
      "loom_reader_tallies, loom_reader_funnels and loom_signin_attempts are present"
  )
} finally {
  await client.end()
}
