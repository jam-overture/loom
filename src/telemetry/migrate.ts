import { sql } from "drizzle-orm"

import type { LoomDatabase } from "../store/database.js"

/**
 * Creating the table the telemetry journal writes to, with its row level
 * security switched on.
 *
 * The same shape as the store's migration, kept separate because a deployment
 * may keep its journal somewhere its trees are not.
 */

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
    project_id text NOT NULL DEFAULT 'prj_default',
    seq bigserial PRIMARY KEY,
    tree_id text NOT NULL,
    occurred_at text NOT NULL,
    event jsonb NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT now()
  )`,
  /*
   * **The project, for a database that predates it (0260).** No key widens
   * here — `seq` is a surrogate and stays unique across the deployment, for the
   * reason `schema.ts` gives. What changes is that both indexes lead with the
   * project, so a read inside one does not walk another's rows.
   *
   * Dropped by name rather than created `IF NOT EXISTS`, because the names do
   * not change: an existing index on the old columns would be left exactly as
   * it was, and every read would go on scanning while appearing to be indexed.
   */
  `ALTER TABLE loom_telemetry ADD COLUMN IF NOT EXISTS project_id text NOT NULL DEFAULT 'prj_default'`,
  `DROP INDEX IF EXISTS loom_telemetry_tree_seq_idx`,
  `CREATE INDEX IF NOT EXISTS loom_telemetry_tree_seq_idx ON loom_telemetry (project_id, tree_id, seq)`,
  /**
   * Additive, idempotent, and the only statement here that is not about the
   * table's shape: it is what makes `assessments` on the journal a seek rather
   * than a scan of everything ever narrated. A deployment that runs the DDL
   * again gets it; one that never does keeps a correct journal and a slow lookup.
   */
  `DROP INDEX IF EXISTS loom_telemetry_assessed_proposal_idx`,
  `CREATE INDEX IF NOT EXISTS loom_telemetry_assessed_proposal_idx ON loom_telemetry (project_id, (event -> 'assessment' ->> 'proposalId')) WHERE event ->> 'type' = 'change-assessed'`,
  `ALTER TABLE loom_telemetry ENABLE ROW LEVEL SECURITY`,
]

/** Idempotent, so running it against a populated database is a no-op. */
export const ensureTelemetrySchema = async (db: LoomDatabase): Promise<void> => {
  for (const statement of TELEMETRY_DDL) {
    await db.execute(sql.raw(statement))
  }
}
