import { PGlite } from "@electric-sql/pglite"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/pglite"
import { describe, expect, it, vi } from "vitest"

import type { LoomDatabase } from "@loom/runtime/postgres"
import { ensureHoldStoreSchema, ensureTreeStoreSchema } from "@loom/runtime/postgres"
import { ensureTelemetrySchema } from "@loom/runtime/telemetry/postgres"

import { storageSeams } from "./schema"

/**
 * The tables this page describes, against a real Postgres that has been handed
 * the statements.
 *
 * `schema.test.ts` proves the parser reads SQL correctly. This proves the thing
 * a reader actually depends on: that the columns printed on the page are the
 * columns their database ends up with. Those are different claims, and only
 * this one would catch a statement the parser reads perfectly and Postgres
 * declines.
 *
 * PGlite is Postgres compiled to WebAssembly, which is how the runtime's own
 * store suites do this — real semantics, no external database, and `pnpm
 * verify` stays green offline.
 */

/** A fresh WASM Postgres per test costs seconds, and the 5s default is tuned for pure functions. */
vi.setConfig({ testTimeout: 60_000 })

/**
 * One database with all three seams in it, because that is the deployment the
 * page describes and because three tables' statements meeting in one schema is
 * itself worth checking — a name collision between them would land here.
 */
const migrated = async (): Promise<LoomDatabase> => {
  const db = drizzle(new PGlite())

  await ensureTreeStoreSchema(db)
  await ensureHoldStoreSchema(db)
  await ensureTelemetrySchema(db)

  return db
}

/**
 * One database for the whole file. Standing up WebAssembly Postgres costs about
 * three seconds and every test here only reads catalogue tables, so a fresh one
 * per test would buy isolation against nothing and spend a quarter of a minute
 * doing it.
 */
let deployed: Promise<LoomDatabase> | undefined

const deployedDatabase = (): Promise<LoomDatabase> => (deployed ??= migrated())

const rowsOf = async <Row,>(db: LoomDatabase, query: ReturnType<typeof sql>): Promise<readonly Row[]> => {
  const result = await db.execute(query)

  return (result as unknown as { readonly rows?: readonly Row[] }).rows ?? []
}

const tables = storageSeams.flatMap((seam) => seam.tables)

describe("the tables this page describes", () => {
  it("all exist once the three migrations have run", async () => {
    const db = await deployedDatabase()
    const present = await rowsOf<{ readonly tablename: string }>(
      db,
      sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
    )

    expect(new Set(present.map((row) => row.tablename))).toEqual(
      new Set(tables.map((table) => table.name))
    )
  })

  /**
   * Names and order rather than types: the page prints `timestamptz` and
   * `bigserial` because those are what a host would type, and Postgres stores
   * them as `timestamp with time zone` and `bigint` with a sequence. Reporting
   * the resolved spelling would be accurate and would answer a question nobody
   * asked.
   */
  it("have exactly the columns the page prints, in the order it prints them", async () => {
    const db = await deployedDatabase()

    for (const table of tables) {
      const columns = await rowsOf<{ readonly column_name: string }>(
        db,
        sql`SELECT column_name FROM information_schema.columns
            WHERE table_name = ${table.name} ORDER BY ordinal_position`
      )

      expect(columns.map((column) => column.column_name)).toEqual(
        table.columns.map((column) => column.name)
      )
    }
  })

  it("require exactly the columns the page marks required", async () => {
    const db = await deployedDatabase()

    for (const table of tables) {
      const columns = await rowsOf<{ readonly column_name: string; readonly is_nullable: string }>(
        db,
        sql`SELECT column_name, is_nullable FROM information_schema.columns
            WHERE table_name = ${table.name}`
      )

      const requiredInPostgres = columns
        .filter((column) => column.is_nullable === "NO")
        .map((column) => column.column_name)

      expect(new Set(requiredInPostgres)).toEqual(
        new Set(table.columns.filter((column) => column.required).map((column) => column.name))
      )
    }
  })

  it("carry every index the page names", async () => {
    const db = await deployedDatabase()

    for (const table of tables.filter((candidate) => candidate.indexes.length > 0)) {
      const indexes = await rowsOf<{ readonly indexname: string }>(
        db,
        sql`SELECT indexname FROM pg_indexes WHERE tablename = ${table.name}`
      )

      for (const index of table.indexes) {
        expect(indexes.map((row) => row.indexname)).toContain(index.name)
      }
    }
  })

  /**
   * The one claim on this page that is about safety rather than shape, checked
   * against `pg_class` rather than against having run the statement. A table
   * the page shows as locked and Postgres does not is a paragraph telling a
   * host their trees are private when they are readable.
   */
  it("are locked exactly where the page says they are locked", async () => {
    const db = await deployedDatabase()
    const locked = await rowsOf<{ readonly relname: string; readonly relrowsecurity: boolean }>(
      db,
      sql`SELECT relname, relrowsecurity FROM pg_class WHERE relname LIKE 'loom\\_%'`
    )

    for (const table of tables) {
      const row = locked.find((candidate) => candidate.relname === table.name)

      expect([table.name, row?.relrowsecurity]).toEqual([table.name, table.rowLevelSecurity])
    }
  })
})
