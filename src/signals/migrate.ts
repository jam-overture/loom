import { sql } from "drizzle-orm"

import type { LoomDatabase } from "../store/database.js"

/**
 * Creating the three reader-signal tables, with row level security switched on.
 *
 * The same shape as the store's and the journal's migrations, and here for the
 * same reason: a DDL statement that lives in a document is a DDL statement a
 * deployment runs a stale copy of.
 *
 * RLS matters here for a reason that is worth stating rather than inheriting.
 * Nothing in these tables identifies a reader — that is 0146's whole argument —
 * but the buffer holds view keys, and a view key plus another deployment's rows
 * is the only combination in Loom that could correlate anything across a
 * tenancy boundary. It expires within hours; the policy does not depend on
 * that.
 */

/**
 * The three tables, as statements a host can run.
 *
 * One statement per entry for the same reason the store's DDL is a list: a
 * driver may refuse several commands in a single prepared statement, and
 * transaction-mode pooling — the configuration 0022 requires on serverless — is
 * exactly where that bites.
 */
export const READER_SIGNALS_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS loom_reader_signals (
    seq bigserial PRIMARY KEY,
    tree_id text NOT NULL,
    revision integer NOT NULL,
    sent_at bigint NOT NULL,
    view text,
    signals jsonb NOT NULL,
    received_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS loom_reader_signals_tree_seq_idx ON loom_reader_signals (tree_id, seq)`,
  `ALTER TABLE loom_reader_signals ENABLE ROW LEVEL SECURITY`,
  `CREATE TABLE IF NOT EXISTS loom_reader_tallies (
    tree_id text NOT NULL,
    revision integer NOT NULL,
    node_id text NOT NULL,
    type text NOT NULL,
    views bigint NOT NULL,
    reached bigint NOT NULL,
    dwell_ms bigint NOT NULL,
    activations bigint NOT NULL,
    opens bigint NOT NULL,
    closes bigint NOT NULL,
    updated_at timestamptz NOT NULL,
    PRIMARY KEY (tree_id, revision, node_id)
  )`,
  `ALTER TABLE loom_reader_tallies ENABLE ROW LEVEL SECURITY`,
  `CREATE TABLE IF NOT EXISTS loom_reader_funnels (
    tree_id text NOT NULL,
    revision integer NOT NULL,
    from_node_id text NOT NULL,
    from_kind text NOT NULL,
    to_node_id text NOT NULL,
    to_kind text NOT NULL,
    reached bigint NOT NULL,
    converted bigint NOT NULL,
    updated_at timestamptz NOT NULL,
    PRIMARY KEY (tree_id, revision, from_node_id, from_kind, to_node_id, to_kind)
  )`,
  `ALTER TABLE loom_reader_funnels ENABLE ROW LEVEL SECURITY`,
]

/** Idempotent, so running it against a populated database is a no-op. */
export const ensureReaderSignalsSchema = async (db: LoomDatabase): Promise<void> => {
  for (const statement of READER_SIGNALS_DDL) {
    await db.execute(sql.raw(statement))
  }
}
