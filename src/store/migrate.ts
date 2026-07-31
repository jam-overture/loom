import { sql } from "drizzle-orm"

import type { LoomDatabase } from "./database.js"

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
    PRIMARY KEY (tree_id, revision)
  )`,
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
