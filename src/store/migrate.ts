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
    application_id text NOT NULL DEFAULT 'app_default',
    tree_id text NOT NULL,
    revision integer NOT NULL,
    document jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (application_id, tree_id)
  )`,
  `CREATE TABLE IF NOT EXISTS loom_revisions (
    application_id text NOT NULL DEFAULT 'app_default',
    tree_id text NOT NULL,
    revision integer NOT NULL,
    proposal_id text NOT NULL,
    delta jsonb NOT NULL,
    provenance jsonb NOT NULL,
    applied_at text NOT NULL,
    answered_by text,
    PRIMARY KEY (application_id, tree_id, revision)
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
  `ALTER TABLE loom_trees ADD COLUMN IF NOT EXISTS application_id text NOT NULL DEFAULT 'app_default'`,
  `ALTER TABLE loom_revisions ADD COLUMN IF NOT EXISTS application_id text NOT NULL DEFAULT 'app_default'`,
  `ALTER TABLE loom_trees DROP CONSTRAINT IF EXISTS loom_trees_pkey`,
  `ALTER TABLE loom_trees ADD PRIMARY KEY (application_id, tree_id)`,
  `ALTER TABLE loom_revisions DROP CONSTRAINT IF EXISTS loom_revisions_pkey`,
  `ALTER TABLE loom_revisions ADD PRIMARY KEY (application_id, tree_id, revision)`,
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
    application_id text NOT NULL DEFAULT 'app_default',
    proposal_id text NOT NULL,
    tree_id text NOT NULL,
    base_revision integer NOT NULL,
    intent jsonb NOT NULL,
    proposal jsonb NOT NULL,
    disposition jsonb NOT NULL,
    held_at text NOT NULL,
    PRIMARY KEY (application_id, proposal_id)
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
  `ALTER TABLE loom_holds ADD COLUMN IF NOT EXISTS application_id text NOT NULL DEFAULT 'app_default'`,
  `ALTER TABLE loom_holds DROP CONSTRAINT IF EXISTS loom_holds_pkey`,
  `ALTER TABLE loom_holds ADD PRIMARY KEY (application_id, proposal_id)`,
  `DROP INDEX IF EXISTS loom_holds_tree_id_held_at_idx`,
  `DROP INDEX IF EXISTS loom_holds_held_at_proposal_id_idx`,
  `CREATE INDEX IF NOT EXISTS loom_holds_tree_id_held_at_idx ON loom_holds (application_id, tree_id, held_at)`,
  `CREATE INDEX IF NOT EXISTS loom_holds_held_at_proposal_id_idx ON loom_holds (application_id, held_at, proposal_id)`,
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
    application_id text NOT NULL DEFAULT 'app_default',
    policy_id text NOT NULL,
    revision integer NOT NULL,
    fingerprint text NOT NULL,
    policy jsonb NOT NULL,
    actor text NOT NULL,
    recorded_at text NOT NULL,
    note text,
    PRIMARY KEY (application_id, policy_id, revision)
  )`,
  /* The project, for a database that predates it — see the hold store's note. */
  `ALTER TABLE loom_policy_revisions ADD COLUMN IF NOT EXISTS application_id text NOT NULL DEFAULT 'app_default'`,
  `ALTER TABLE loom_policy_revisions DROP CONSTRAINT IF EXISTS loom_policy_revisions_pkey`,
  `ALTER TABLE loom_policy_revisions ADD PRIMARY KEY (application_id, policy_id, revision)`,
  `DROP INDEX IF EXISTS loom_policy_revisions_fingerprint_idx`,
  `CREATE INDEX IF NOT EXISTS loom_policy_revisions_fingerprint_idx ON loom_policy_revisions (application_id, policy_id, fingerprint)`,
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
 * Carries no `application_id` default and no backfill, unlike every other statement
 * here: the rows that already exist belong to `app_default` by the default on
 * their own columns, and a row *for* `app_default` is seeded by the deployment
 * rather than conjured by DDL — a migration that invented a project's name
 * would be guessing, which 0260 refuses.
 */
export const APPLICATION_STORE_DDL: readonly string[] = [
  /**
   * The rename, first and guarded.
   *
   * `loom_applications` was created as `loom_projects` on 12 October and lived
   * under that name for about an hour, because *project* was the wrong word for
   * the thing with the pages — the maintainer's hierarchy is **account >
   * project > application**, and this is the third. Postgres has no
   * `RENAME … IF EXISTS`, so the catalogue is asked first; a database that never
   * saw the old name skips it, and one that already renamed skips it too.
   *
   * It runs before the `CREATE TABLE IF NOT EXISTS` below rather than after, so
   * a database holding the old table is renamed into the new one instead of
   * ending up with both and the rows in the wrong one.
   */
  `DO $$
     BEGIN
       IF EXISTS (SELECT FROM pg_tables WHERE schemaname = current_schema() AND tablename = 'loom_projects')
          AND EXISTS (SELECT FROM information_schema.columns
                      WHERE table_name = 'loom_projects' AND column_name = 'host')
          AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = current_schema() AND tablename = 'loom_applications')
       THEN
         ALTER TABLE loom_projects RENAME TO loom_applications;
         ALTER TABLE loom_applications RENAME COLUMN project_id TO application_id;
       END IF;
     END
   $$`,
  `CREATE TABLE IF NOT EXISTS loom_applications (
      application_id text PRIMARY KEY,
      name text NOT NULL,
      created_at text NOT NULL,
      host text,
      closed_at text
    )`,
  /**
   * The grouping an application belongs to. Defaulted so a row written before
   * projects existed keeps answering, which is the device every scoped column
   * in this file uses.
   */
  `ALTER TABLE loom_applications ADD COLUMN IF NOT EXISTS project_id text NOT NULL DEFAULT 'prj_default'`,
  /**
   * As every other table here does. It matters on a managed Postgres whose
   * anon role can reach the schema: without it, the list of a deployment's
   * applications — their names and the hosts they run on — is readable by
   * anyone holding the publishable key.
   */
  /**
   * **Closing, for a database that predates it (0289).** Additive, nullable and
   * undefaulted, which is the only honest value: every row written before this
   * column existed belonged to an application that was open, and still does.
   *
   * This store has no delete, so there is no earlier spelling of *gone* to
   * carry across — nothing was ever removed, which is what makes the backfill
   * no backfill at all.
   */
  `ALTER TABLE loom_applications ADD COLUMN IF NOT EXISTS closed_at text`,
  `ALTER TABLE loom_applications ENABLE ROW LEVEL SECURITY`,
]

/**
 * The projects the applications are grouped under.
 *
 * Its own list rather than a statement in the one above, on the terms this file
 * already sets: a deployment adds a seam by adding its `ensure` call on
 * purpose. They are run together by `db:push` because an application's
 * `project_id` would otherwise point at nothing.
 *
 * **It must run after `ensureApplicationStoreSchema`, not before.** That one
 * renames the `loom_projects` which briefly held applications; this one then
 * creates a fresh table under the freed name. The other order silently loses
 * the grouping table — `CREATE TABLE IF NOT EXISTS` sees the old one, skips,
 * and the rename carries it off — with no error anywhere.
 */
export const PROJECT_STORE_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS loom_projects (
      project_id text PRIMARY KEY,
      name text NOT NULL,
      created_at text NOT NULL,
      repository text,
      closed_at text
    )`,
  /** The repository a project names, for a database that predates it (0292). */
  `ALTER TABLE loom_projects ADD COLUMN IF NOT EXISTS repository text`,
  /**
   * **At most one project per repository**, enforced here rather than checked
   * before the insert.
   *
   * A check and then an insert is a race two people registering the same
   * repository at the same moment would lose quietly — one of them would take
   * ownership of the other's write-back destination, and nothing afterwards
   * could say which. The index makes it the database's answer, the way the
   * primary key already makes *already taken* the database's answer about an
   * id.
   *
   * Partial, because `NULL` is the ordinary state and a plain unique index
   * would admit exactly one project with no repository.
   */
  `CREATE UNIQUE INDEX IF NOT EXISTS loom_projects_repository_idx ON loom_projects (repository) WHERE repository IS NOT NULL`,
  /** Closing, for a database that predates it — see the applications' note above. */
  `ALTER TABLE loom_projects ADD COLUMN IF NOT EXISTS closed_at text`,
  `ALTER TABLE loom_projects ENABLE ROW LEVEL SECURITY`,
]

/**
 * Moving the ids themselves, which the rename above does not.
 *
 * Every row written before 12 October names `prj_default` in a column that now
 * means an application, and `app_default` is what `DEFAULT_APPLICATION_ID`
 * parses to. Six tables carry it, and each update is idempotent because it
 * matches only the old value.
 *
 * **Each one is guarded on its table existing**, which the first draft was not
 * and a test caught: a deployment adds a seam by adding its `ensure` call on
 * purpose, so one that never switched telemetry or the policy log on has no
 * such table, and an unguarded `UPDATE` took the whole migration down with
 * `42P01` rather than skipping what was not there.
 *
 * Separate from the DDL because it is data: a host reading `db:push` can see
 * exactly which rows are touched, rather than finding an `UPDATE` folded into a
 * list called schema.
 */
export const APPLICATION_ID_MIGRATION: readonly string[] = [
  "loom_trees",
  "loom_revisions",
  "loom_holds",
  "loom_policy_revisions",
  "loom_telemetry",
  "loom_applications",
].map(
  (table) => `DO $$
     BEGIN
       IF EXISTS (SELECT FROM pg_tables WHERE schemaname = current_schema() AND tablename = '${table}')
       THEN
         UPDATE ${table} SET application_id = 'app_default' WHERE application_id = 'prj_default';
       END IF;
     END
   $$`
)

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
export const ensureApplicationStoreSchema = async (db: LoomDatabase): Promise<void> => {
  await runStatements(db, APPLICATION_STORE_DDL)
}

/**
 * Creates the projects table if it is absent. Idempotent on the same terms.
 */
export const ensureProjectStoreSchema = async (db: LoomDatabase): Promise<void> => {
  await runStatements(db, PROJECT_STORE_DDL)
}

/**
 * Carries `prj_default` to `app_default` across every table that names an
 * application. Safe to run on a database that has already been carried, and on
 * one that was never on the old value.
 */
export const migrateApplicationIds = async (db: LoomDatabase): Promise<void> => {
  await runStatements(db, APPLICATION_ID_MIGRATION)
}

const runStatements = async (db: LoomDatabase, statements: readonly string[]): Promise<void> => {
  for (const statement of statements) {
    await db.execute(sql.raw(statement))
  }
}
