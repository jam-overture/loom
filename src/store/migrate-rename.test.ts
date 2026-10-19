import { PGlite } from "@electric-sql/pglite"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/pglite"
import { describe, expect, it, vi } from "vitest"

import type { LoomDatabase } from "./database.js"
import {
  ensureApplicationStoreSchema,
  ensureHoldStoreSchema,
  ensureProjectStoreSchema,
  ensureTreeStoreSchema,
  migrateApplicationIds,
} from "./migrate.js"

/**
 * The migration that renames, against a database in the state the maintainer's
 * actually was.
 *
 * This is the test the whole change rests on. `loom_projects` shipped on 12
 * October holding what turned out to be applications, and an hour later the
 * hierarchy was settled as account > project > application — so the table is
 * renamed, its key column with it, a new `loom_projects` takes the old name for
 * the grouping, and every `prj_default` becomes `app_default`. Four things
 * moving at once over rows somebody cares about.
 *
 * Every case below first builds the *old* schema by hand rather than by calling
 * the migration, because a test that set the database up with the code under
 * test could not tell a migration that works from one that never ran.
 */

/** A fresh WASM Postgres per test costs seconds, not milliseconds. */
vi.setConfig({ testTimeout: 30_000 })

/** The schema as it stood after #608, written out rather than imported. */
const asItWas = async (db: LoomDatabase): Promise<void> => {
  await db.execute(
    sql.raw(`CREATE TABLE loom_projects (
      project_id text PRIMARY KEY,
      name text NOT NULL,
      created_at text NOT NULL,
      host text
    )`)
  )
}

const rowsOf = async <Row,>(db: LoomDatabase, query: string): Promise<readonly Row[]> => {
  const result = await db.execute(sql.raw(query))

  return (result as unknown as { readonly rows?: readonly Row[] }).rows ?? []
}

const tableExists = async (db: LoomDatabase, table: string): Promise<boolean> => {
  const rows = await rowsOf<{ readonly tablename: string }>(
    db,
    `SELECT tablename FROM pg_tables WHERE schemaname = current_schema() AND tablename = '${table}'`
  )

  return rows.length === 1
}

describe("the rename, on a database that has the old table", () => {
  it("carries the rows into the new name with nothing lost", async () => {
    const db = drizzle(new PGlite())
    await asItWas(db)
    await db.execute(
      sql.raw(
        `INSERT INTO loom_projects (project_id, name, created_at, host)
         VALUES ('prj_default', 'Your application', '1970-01-01T00:00:00.000Z', 'shop.example.com')`
      )
    )

    await ensureApplicationStoreSchema(db)
    await ensureProjectStoreSchema(db)
    await migrateApplicationIds(db)

    const applications = await rowsOf<{
      readonly application_id: string
      readonly project_id: string
      readonly name: string
      readonly host: string | null
    }>(db, "SELECT * FROM loom_applications")

    expect(applications).toEqual([
      {
        application_id: "app_default",
        project_id: "prj_default",
        name: "Your application",
        created_at: "1970-01-01T00:00:00.000Z",
        host: "shop.example.com",
        /**
         * A row carried across from before closing existed is **open**, which
         * is what it was (0289). The column arrives nullable and undefaulted
         * and there is nothing to backfill from: this store never deleted, so
         * there is no earlier spelling of *gone* for a row to have been in.
         */
        closed_at: null,
      },
    ])
  })

  it("leaves a loom_projects behind that is the grouping, not the old table", async () => {
    const db = drizzle(new PGlite())
    await asItWas(db)

    await ensureApplicationStoreSchema(db)
    await ensureProjectStoreSchema(db)

    expect(await tableExists(db, "loom_applications")).toBe(true)
    expect(await tableExists(db, "loom_projects")).toBe(true)

    const columns = await rowsOf<{ readonly column_name: string }>(
      db,
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'loom_projects' ORDER BY ordinal_position`
    )
    expect(columns.map((column) => column.column_name)).toEqual([
      "project_id",
      "name",
      "created_at",
      /** The repository a project names, at most one each way (0292). */
      "repository",
      /** Closing, which is what this store has instead of a delete (0289). */
      "closed_at",
    ])
  })
})

describe("the ids every scoped table names", () => {
  it("carries prj_default to app_default and leaves other applications alone", async () => {
    const db = drizzle(new PGlite())
    await ensureTreeStoreSchema(db)
    await ensureHoldStoreSchema(db)

    await db.execute(
      sql.raw(
        `INSERT INTO loom_trees (application_id, tree_id, revision, document)
         VALUES ('prj_default', 't_home1', 1, '{}'::jsonb),
                ('app_other', 't_other1', 1, '{}'::jsonb)`
      )
    )

    await migrateApplicationIds(db)

    const trees = await rowsOf<{ readonly application_id: string; readonly tree_id: string }>(
      db,
      "SELECT application_id, tree_id FROM loom_trees ORDER BY tree_id"
    )
    expect(trees).toEqual([
      { application_id: "app_default", tree_id: "t_home1" },
      { application_id: "app_other", tree_id: "t_other1" },
    ])
  })

  it("is safe to run twice", async () => {
    const db = drizzle(new PGlite())
    await ensureTreeStoreSchema(db)
    await db.execute(
      sql.raw(
        `INSERT INTO loom_trees (application_id, tree_id, revision, document)
         VALUES ('prj_default', 't_home1', 1, '{}'::jsonb)`
      )
    )

    await migrateApplicationIds(db)
    await migrateApplicationIds(db)

    const trees = await rowsOf<{ readonly application_id: string }>(
      db,
      "SELECT application_id FROM loom_trees"
    )
    expect(trees).toEqual([{ application_id: "app_default" }])
  })
})

describe("the rename, on a database that never had the old table", () => {
  it("creates both tables and renames nothing", async () => {
    const db = drizzle(new PGlite())

    await ensureApplicationStoreSchema(db)
    await ensureProjectStoreSchema(db)

    expect(await tableExists(db, "loom_applications")).toBe(true)
    expect(await tableExists(db, "loom_projects")).toBe(true)
  })

  it("is a no-op run a second time", async () => {
    const db = drizzle(new PGlite())
    await ensureApplicationStoreSchema(db)
    await ensureProjectStoreSchema(db)
    await db.execute(
      sql.raw(
        `INSERT INTO loom_applications (application_id, project_id, name, created_at)
         VALUES ('app_default', 'prj_default', 'Kept', '1970-01-01T00:00:00.000Z')`
      )
    )

    await ensureApplicationStoreSchema(db)
    await ensureProjectStoreSchema(db)

    const applications = await rowsOf<{ readonly name: string }>(
      db,
      "SELECT name FROM loom_applications"
    )
    expect(applications).toEqual([{ name: "Kept" }])
  })
})
