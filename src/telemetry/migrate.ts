import { sql } from "drizzle-orm"

import type { LoomDatabase } from "../store/database.js"

/**
 * The journal's schema, as statements a host can run.
 *
 * One statement per entry for the same reason the store's DDL is a list: a
 * driver may refuse several commands in a single prepared statement, and
 * transaction-mode pooling — the configuration 0022 requires on serverless — is
 * exactly where that bites.
 *
 * The journal is the table where RLS matters most and is least likely to be
 * remembered: it holds every utterance a person typed and every rationale a
 * model wrote back, and it arrived after the deployment instructions were
 * written. See `src/store/migrate.ts` for why the statement is here rather than
 * in a document.
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
  `ALTER TABLE loom_telemetry ENABLE ROW LEVEL SECURITY`,
]

/** Idempotent, so running it against a populated database is a no-op. */
export const ensureTelemetrySchema = async (db: LoomDatabase): Promise<void> => {
  for (const statement of TELEMETRY_DDL) {
    await db.execute(sql.raw(statement))
  }
}
