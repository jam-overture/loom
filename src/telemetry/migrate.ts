import { sql } from "drizzle-orm"

import type { LoomDatabase } from "../store/database.js"

/**
 * The journal's schema, as statements a host can run.
 *
 * One statement per entry for the same reason the store's DDL is a list: a
 * driver may refuse several commands in a single prepared statement, and
 * transaction-mode pooling — the configuration 0022 requires on serverless — is
 * exactly where that bites.
 */
export const TELEMETRY_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS loom_telemetry (
    seq bigserial PRIMARY KEY,
    tree_id text NOT NULL,
    occurred_at text NOT NULL,
    event jsonb NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS loom_telemetry_tree_seq_idx ON loom_telemetry (tree_id, seq)`,
]

/** Idempotent, so running it against a populated database is a no-op. */
export const ensureTelemetrySchema = async (db: LoomDatabase): Promise<void> => {
  for (const statement of TELEMETRY_DDL) {
    await db.execute(sql.raw(statement))
  }
}
