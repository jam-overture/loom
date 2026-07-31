import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { ensureTreeStoreSchema } from "@loom/runtime/postgres"

/**
 * Creates the store's tables. Run once against a new database.
 *
 * Deliberately a script rather than something the app does on boot: DDL issued by
 * several serverless instances starting at once is a race, and a migration that
 * runs implicitly is a migration nobody decided to run.
 */
const connectionString = process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"]

if (connectionString === undefined) {
  throw new Error("db:push needs DATABASE_URL (or POSTGRES_URL) in the environment")
}

const client = postgres(connectionString, { prepare: false, max: 1 })

await ensureTreeStoreSchema(drizzle(client))
await client.end()
