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
    project_id text NOT NULL DEFAULT 'prj_default',
    tree_id text NOT NULL,
    revision integer NOT NULL,
    document jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, tree_id)
  )`,
  `CREATE TABLE IF NOT EXISTS loom_revisions (
    project_id text NOT NULL DEFAULT 'prj_default',
    tree_id text NOT NULL,
    revision integer NOT NULL,
    proposal_id text NOT NULL,
    delta jsonb NOT NULL,
    provenance jsonb NOT NULL,
    applied_at text NOT NULL,
    answered_by text,
    PRIMARY KEY (project_id, tree_id, revision)
  )`,
  /*
   * **The migration, for a database that predates projects (0260).**
   *
   * Two statements per table and both are needed. The column is additive and
   * defaulted, so every row already written becomes the default project's —
   * 0260 clause 5, *nothing is migrated by guessing*: those rows belong to the
   * deployment that wrote them, and one project named for it is the honest
   * answer rather than a distribution somebody invented.
   *
   * The key then has to widen, because a tree id is only unique **within** a
   * project now and the old key says it is unique everywhere. Dropping by the
   * name Postgres gives a primary key and re-adding is idempotent: after the
   * first run the constraint exists again under the same name, so a second run
   * drops and rebuilds an identical key. On a table created by the statements
   * above it is already right and the pair is a no-op.
   *
   * Ordering matters and is why these are not beside their tables: the column
   * must exist on both before either key can name it.
   */
  `ALTER TABLE loom_trees ADD COLUMN IF NOT EXISTS project_id text NOT NULL DEFAULT 'prj_default'`,
  `ALTER TABLE loom_revisions ADD COLUMN IF NOT EXISTS project_id text NOT NULL DEFAULT 'prj_default'`,
  `ALTER TABLE loom_trees DROP CONSTRAINT IF EXISTS loom_trees_pkey`,
  `ALTER TABLE loom_trees ADD PRIMARY KEY (project_id, tree_id)`,
  `ALTER TABLE loom_revisions DROP CONSTRAINT IF EXISTS loom_revisions_pkey`,
  `ALTER TABLE loom_revisions ADD PRIMARY KEY (project_id, tree_id, revision)`,
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
 * The hold store's schema, as statements a host can run.
 *
 * Its own list rather than three more entries on the one above, because the two
 * stores are separately useful: a host that never lets the Gate hold anything
 * has no reason to carry the table, and a host that only reviews has no reason
 * to be told about the log. Each store owns its schema and a deployment says
 * which it wants.
 *
 * Neither index is decoration, and they answer different questions. `forTree`
 * reads one tree's queue, so without the first it scans every hold in the
 * database including every other tree's. `waiting` reads the whole deployment's
 * queue a page at a time, in `(held_at, proposal_id)` order — the second index
 * is what makes that one seek rather than a sort over everything held, which is
 * the entire reason the read exists.
 */
export const HOLD_STORE_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS loom_holds (
    project_id text NOT NULL DEFAULT 'prj_default',
    proposal_id text NOT NULL,
    tree_id text NOT NULL,
    base_revision integer NOT NULL,
    intent jsonb NOT NULL,
    proposal jsonb NOT NULL,
    disposition jsonb NOT NULL,
    held_at text NOT NULL,
    PRIMARY KEY (project_id, proposal_id)
  )`,
  /*
   * **The project, for a database that predates it (0260).** Same shape as the
   * tree store's above: the column is additive and defaulted, then the key
   * widens, then the indexes are rebuilt to lead with it.
   *
   * The indexes are dropped by name rather than created `IF NOT EXISTS`,
   * because the names do not change — an existing index on the old columns
   * would be left exactly as it was, and every read of this table would go on
   * scanning across projects while appearing to be indexed.
   */
  `ALTER TABLE loom_holds ADD COLUMN IF NOT EXISTS project_id text NOT NULL DEFAULT 'prj_default'`,
  `ALTER TABLE loom_holds DROP CONSTRAINT IF EXISTS loom_holds_pkey`,
  `ALTER TABLE loom_holds ADD PRIMARY KEY (project_id, proposal_id)`,
  `DROP INDEX IF EXISTS loom_holds_tree_id_held_at_idx`,
  `DROP INDEX IF EXISTS loom_holds_held_at_proposal_id_idx`,
  `CREATE INDEX IF NOT EXISTS loom_holds_tree_id_held_at_idx ON loom_holds (project_id, tree_id, held_at)`,
  `CREATE INDEX IF NOT EXISTS loom_holds_held_at_proposal_id_idx ON loom_holds (project_id, held_at, proposal_id)`,
  /** Locked on creation for the reason the tree store's tables are — see above. */
  `ALTER TABLE loom_holds ENABLE ROW LEVEL SECURITY`,
]


/**
 * The policy log's schema, as statements a host can run.
 *
 * Its own list for the reason the hold store's is: the three are separately
 * useful. A deployment that judges with one policy it has never edited has no
 * reason to carry this table, and one that records policy changes may well keep
 * them beside its trees or somewhere else entirely.
 *
 * The index is not decoration. `judgedUnder` resolves the fingerprint on a
 * disposition into the policy text it was judged under, and a screen showing a
 * page of records asks it once per record; without the index each of those is a
 * scan of every policy revision the deployment has recorded.
 */
export const POLICY_LOG_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS loom_policy_revisions (
    project_id text NOT NULL DEFAULT 'prj_default',
    policy_id text NOT NULL,
    revision integer NOT NULL,
    fingerprint text NOT NULL,
    policy jsonb NOT NULL,
    actor text NOT NULL,
    recorded_at text NOT NULL,
    note text,
    PRIMARY KEY (project_id, policy_id, revision)
  )`,
  /* The project, for a database that predates it — see the hold store's note. */
  `ALTER TABLE loom_policy_revisions ADD COLUMN IF NOT EXISTS project_id text NOT NULL DEFAULT 'prj_default'`,
  `ALTER TABLE loom_policy_revisions DROP CONSTRAINT IF EXISTS loom_policy_revisions_pkey`,
  `ALTER TABLE loom_policy_revisions ADD PRIMARY KEY (project_id, policy_id, revision)`,
  `DROP INDEX IF EXISTS loom_policy_revisions_fingerprint_idx`,
  `CREATE INDEX IF NOT EXISTS loom_policy_revisions_fingerprint_idx ON loom_policy_revisions (project_id, policy_id, fingerprint)`,
  /** Locked on creation for the reason the tree store's tables are — see above. */
  `ALTER TABLE loom_policy_revisions ENABLE ROW LEVEL SECURITY`,
]

/**
 * Creates the tables if they are absent. Every statement is `IF NOT EXISTS`, so
 * running it against a populated database is a no-op rather than a hazard.
 */
/**
 * The projects table.
 *
 * Carries no `project_id` default and no backfill, unlike every other statement
 * here: the rows that already exist belong to `prj_default` by the default on
 * their own columns, and a row *for* `prj_default` is seeded by the deployment
 * rather than conjured by DDL — a migration that invented a project's name
 * would be guessing, which 0260 refuses.
 */
export const PROJECT_STORE_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS loom_projects (
      project_id text PRIMARY KEY,
      name text NOT NULL,
      created_at text NOT NULL,
      host text
    )`,
  /**
   * As every other table here does. It matters on a managed Postgres whose
   * anon role can reach the schema: without it, the list of a deployment's
   * projects — their names and the hosts they run on — is readable by anyone
   * holding the publishable key.
   */
  `ALTER TABLE loom_projects ENABLE ROW LEVEL SECURITY`,
]

export const ensureTreeStoreSchema = async (db: LoomDatabase): Promise<void> => {
  await runStatements(db, TREE_STORE_DDL)
}

/**
 * Creates the hold table if it is absent. Idempotent on the same terms.
 *
 * Separate from `ensureTreeStoreSchema` rather than folded into it: a deployment
 * that upgrades gets the table by adding this call, which is a change it made on
 * purpose, instead of by a function whose name promises trees quietly creating
 * something else.
 */
export const ensureHoldStoreSchema = async (db: LoomDatabase): Promise<void> => {
  await runStatements(db, HOLD_STORE_DDL)
}

/**
 * Creates the policy log's table if it is absent. Idempotent on the same terms,
 * and separate for the same reason: a deployment that wants a record of who
 * changed its acceptance policy gets it by adding this call on purpose.
 */
export const ensurePolicyLogSchema = async (db: LoomDatabase): Promise<void> => {
  await runStatements(db, POLICY_LOG_DDL)
}

/**
 * Creates the projects table if it is absent. Idempotent, and separate for the
 * same reason the other three are: a deployment that wants more than one
 * project gets the table by adding this call on purpose.
 */
export const ensureProjectStoreSchema = async (db: LoomDatabase): Promise<void> => {
  await runStatements(db, PROJECT_STORE_DDL)
}

const runStatements = async (db: LoomDatabase, statements: readonly string[]): Promise<void> => {
  for (const statement of statements) {
    await db.execute(sql.raw(statement))
  }
}
