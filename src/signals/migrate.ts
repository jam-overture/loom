import { sql } from "drizzle-orm"

import type { LoomDatabase } from "../store/database.js"

/**
 * Creating the five reader-signal tables, with row level security switched on.
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
 *
 * Every table is led by `application_id` (0269). The backfill is the column
 * default rather than an `UPDATE`: these five never carried `project_id`, so
 * there is no earlier spelling to correct the way `APPLICATION_ID_MIGRATION`
 * corrects the store's — rows that predate the column belong to the deployment
 * that wrote them, which is what `app_default` names.
 */

/**
 * The five tables, as statements a host can run.
 *
 * One statement per entry for the same reason the store's DDL is a list: a
 * driver may refuse several commands in a single prepared statement, and
 * transaction-mode pooling — the configuration 0022 requires on serverless — is
 * exactly where that bites.
 */
export const READER_SIGNALS_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS loom_reader_signals (
    application_id text NOT NULL DEFAULT 'app_default',
    seq bigserial PRIMARY KEY,
    tree_id text NOT NULL,
    revision integer NOT NULL,
    sent_at bigint NOT NULL,
    view text,
    signals jsonb NOT NULL,
    received_at timestamptz NOT NULL DEFAULT now()
  )`,
  /**
   * **The application, for a database that predates it (0269).** The same
   * shape the store's tables take: the column is additive and defaulted, and
   * then the index is rebuilt to lead with it.
   *
   * The buffer's key does not widen, unlike the four counters below. It is
   * `seq`, a `bigserial`, which is already unique across every application the
   * database holds — so leading the key with the application would be a wider
   * key for no constraint that was not already enforced. The index is the part
   * that matters here, because the index is what the reads use.
   *
   * Dropped by name rather than created `IF NOT EXISTS`, for the reason the
   * store's note gives: the name does not change, so an existing index on the
   * old columns would be left exactly as it was and every read would go on
   * scanning across applications while appearing to be indexed.
   */
  `ALTER TABLE loom_reader_signals ADD COLUMN IF NOT EXISTS application_id text NOT NULL DEFAULT 'app_default'`,
  `DROP INDEX IF EXISTS loom_reader_signals_tree_seq_idx`,
  `CREATE INDEX IF NOT EXISTS loom_reader_signals_tree_seq_idx ON loom_reader_signals (application_id, tree_id, seq)`,
  `ALTER TABLE loom_reader_signals ENABLE ROW LEVEL SECURITY`,
  `CREATE TABLE IF NOT EXISTS loom_reader_tallies (
    application_id text NOT NULL DEFAULT 'app_default',
    tree_id text NOT NULL,
    revision integer NOT NULL,
    node_id text NOT NULL,
    type text NOT NULL,
    views bigint NOT NULL,
    reached bigint NOT NULL,
    engaged bigint NOT NULL DEFAULT 0,
    dwell_ms bigint NOT NULL,
    activations bigint NOT NULL,
    opens bigint NOT NULL,
    closes bigint NOT NULL,
    completions bigint NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL,
    PRIMARY KEY (application_id, tree_id, revision, node_id)
  )`,
  /**
   * For a deployment whose tallies table predates the counter regions are
   * reported by. Additive and defaulted, so existing rows read as *nobody was
   * measured doing anything in here*, which is what was true of them.
   */
  `ALTER TABLE loom_reader_tallies ADD COLUMN IF NOT EXISTS engaged bigint NOT NULL DEFAULT 0`,
  /**
   * For a deployment whose tallies table predates the fifth kind. Additive and
   * defaulted, so existing rows read as *nothing was submitted here*, which is
   * what nobody was counting.
   */
  `ALTER TABLE loom_reader_tallies ADD COLUMN IF NOT EXISTS completions bigint NOT NULL DEFAULT 0`,
  /** The application, for a database that predates it — see the buffer's note above. */
  `ALTER TABLE loom_reader_tallies ADD COLUMN IF NOT EXISTS application_id text NOT NULL DEFAULT 'app_default'`,
  `ALTER TABLE loom_reader_tallies DROP CONSTRAINT IF EXISTS loom_reader_tallies_pkey`,
  `ALTER TABLE loom_reader_tallies ADD PRIMARY KEY (application_id, tree_id, revision, node_id)`,
  `ALTER TABLE loom_reader_tallies ENABLE ROW LEVEL SECURITY`,
  `CREATE TABLE IF NOT EXISTS loom_reader_funnels (
    application_id text NOT NULL DEFAULT 'app_default',
    tree_id text NOT NULL,
    revision integer NOT NULL,
    from_node_id text NOT NULL,
    from_kind text NOT NULL,
    to_node_id text NOT NULL,
    to_kind text NOT NULL,
    reached bigint NOT NULL,
    converted bigint NOT NULL,
    updated_at timestamptz NOT NULL,
    PRIMARY KEY (application_id, tree_id, revision, from_node_id, from_kind, to_node_id, to_kind)
  )`,
  /** The application, for a database that predates it — see the buffer's note above. */
  `ALTER TABLE loom_reader_funnels ADD COLUMN IF NOT EXISTS application_id text NOT NULL DEFAULT 'app_default'`,
  `ALTER TABLE loom_reader_funnels DROP CONSTRAINT IF EXISTS loom_reader_funnels_pkey`,
  `ALTER TABLE loom_reader_funnels ADD PRIMARY KEY (application_id, tree_id, revision, from_node_id, from_kind, to_node_id, to_kind)`,
  `ALTER TABLE loom_reader_funnels ENABLE ROW LEVEL SECURITY`,
  `CREATE TABLE IF NOT EXISTS loom_reader_regions (
    application_id text NOT NULL DEFAULT 'app_default',
    tree_id text NOT NULL,
    revision integer NOT NULL,
    region text NOT NULL,
    views bigint NOT NULL,
    updated_at timestamptz NOT NULL,
    PRIMARY KEY (application_id, tree_id, revision, region)
  )`,
  /** The application, for a database that predates it — see the buffer's note above. */
  `ALTER TABLE loom_reader_regions ADD COLUMN IF NOT EXISTS application_id text NOT NULL DEFAULT 'app_default'`,
  `ALTER TABLE loom_reader_regions DROP CONSTRAINT IF EXISTS loom_reader_regions_pkey`,
  `ALTER TABLE loom_reader_regions ADD PRIMARY KEY (application_id, tree_id, revision, region)`,
  `ALTER TABLE loom_reader_regions ENABLE ROW LEVEL SECURITY`,
  `CREATE TABLE IF NOT EXISTS loom_reader_page_views (
    application_id text NOT NULL DEFAULT 'app_default',
    tree_id text NOT NULL,
    revision integer NOT NULL,
    opened bigint NOT NULL DEFAULT 0,
    appearances bigint NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL,
    PRIMARY KEY (application_id, tree_id, revision)
  )`,
  /** The application, for a database that predates it — see the buffer's note above. */
  `ALTER TABLE loom_reader_page_views ADD COLUMN IF NOT EXISTS application_id text NOT NULL DEFAULT 'app_default'`,
  `ALTER TABLE loom_reader_page_views DROP CONSTRAINT IF EXISTS loom_reader_page_views_pkey`,
  `ALTER TABLE loom_reader_page_views ADD PRIMARY KEY (application_id, tree_id, revision)`,
  `ALTER TABLE loom_reader_page_views ENABLE ROW LEVEL SECURITY`,
]

/** Idempotent, so running it against a populated database is a no-op. */
export const ensureReaderSignalsSchema = async (db: LoomDatabase): Promise<void> => {
  for (const statement of READER_SIGNALS_DDL) {
    await db.execute(sql.raw(statement))
  }
}
