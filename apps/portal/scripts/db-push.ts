import nextEnv from "@next/env"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { ensureTreeStoreSchema } from "@loom/runtime/postgres"

/**
 * Creates the store's tables. Run once against a new database.
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

const connectionString = process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"]

if (connectionString === undefined) {
  console.error(
    "db:push needs DATABASE_URL (or POSTGRES_URL).\n" +
      "Put it in apps/portal/.env.local, or pass it inline:\n" +
      "  DATABASE_URL='postgresql://…:6543/postgres' pnpm db:push"
  )
  process.exit(1)
}

const client = postgres(connectionString, { prepare: false, max: 1 })

try {
  await ensureTreeStoreSchema(drizzle(client))
  console.log("loom: loom_trees and loom_revisions are present")
} finally {
  await client.end()
}
