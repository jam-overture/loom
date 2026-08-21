import { sql } from "drizzle-orm"

import type { LoomDatabase } from "./database.js"

/**
 * Creating the tables the postgres store expects.
 *
 * Not a migration framework: one version of the schema, stated as statements a
 * host runs once, and safe to run again.
 */

/**
 * The schema, as statements a host can run.
 *
 * One statement per entry, because a driver may refuse several commands in a
 * single prepared statement — PGlite does, and so does any connection in
 * transaction-pooling mode, which is exactly the configuration 0022 requires on
 * serverless. Splitting them is not a workaround for the test environment; it is
 * the shape that works everywhere.
 *
 * This is deliberately not a migration framework. There is one version of this
 * schema and no upgrade path yet, so a list of idempotent statements is the
 * honest amount of machinery. When the schema changes in a way that needs data
 * moved, that is when it earns a real migration tool.
 */
export const TREE_STORE_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS loom_trees (
    tree_id text PRIMARY KEY,
    revision integer NOT NULL,
    document jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS loom_revisions (
    tree_id text NOT NULL,
    revision integer NOT NULL,
    proposal_id text NOT NULL,
    delta jsonb NOT NULL,
    provenance jsonb NOT NULL,
    applied_at text NOT NULL,
    answered_by text,
    PRIMARY KEY (tree_id, revision)
  )`,
  /**
   * For a database that already has the table: `CREATE TABLE IF NOT EXISTS`
   * silently leaves an existing table alone, columns and all, so a column added
   * after the first deployment needs its own statement or it only ever appears
   * on new databases. `IF NOT EXISTS` keeps it a no-op everywhere else.
   */
  `ALTER TABLE loom_revisions ADD COLUMN IF NOT EXISTS answered_by text`,
  /**
   * Locking the tables is part of creating them, not a step in a document.
   *
   * On a managed Postgres that fronts the `public` schema with a REST API — the
   * kind of host Loom targets (0022) — a new table is world-readable through a public key the
   * moment it exists. That has been a manual step in `docs/deployment.md` since
   * the first table, and it has been carried as an open item in every report
   * since the second one, which is the evidence that a manual step is the wrong
   * shape for it. A table Loom creates should not have a window in which it is
   * exposed.
   *
   * No policies accompany this, deliberately. RLS with no policy denies every
   * role except the table's owner, and the owner is who Loom connects as: the
   * runtime is on plain SQL rather than on the REST layer (0022), so the effect
   * is to close the door Loom never uses. A host that connects as some other role
   * is outside that contract and has to grant itself a policy — stated here and
   * in `docs/deployment.md`, because it fails closed and a closed door is a
   * thing you want to have been told about.
   */
  `ALTER TABLE loom_trees ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE loom_revisions ENABLE ROW LEVEL SECURITY`,
]

/**
 * Creates the tables if they are absent. Every statement is `IF NOT EXISTS`, so
 * running it against a populated database is a no-op rather than a hazard.
 */
export const ensureTreeStoreSchema = async (db: LoomDatabase): Promise<void> => {
  for (const statement of TREE_STORE_DDL) {
    await db.execute(sql.raw(statement))
  }
}
