import { sql } from "drizzle-orm"
import type { PgliteDatabase } from "drizzle-orm/pglite"
import { describe, expect, it, vi } from "vitest"

import { pgliteTemplate } from "./template.js"

vi.setConfig({ testTimeout: 30_000 })

const createNotes = async (db: PgliteDatabase): Promise<void> => {
  await db.execute(sql`CREATE TABLE notes (body text NOT NULL)`)
}

const bodies = async (db: PgliteDatabase): Promise<readonly unknown[]> =>
  (await db.execute(sql`SELECT body FROM notes ORDER BY body`)).rows.map((row) => row["body"])

const tablesIn = async (db: PgliteDatabase): Promise<readonly unknown[]> =>
  (await db.execute(sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`)).rows.map(
    (row) => row["tablename"]
  )

describe("pgliteTemplate", () => {
  it("hands out a database the steps have already run on, in order", async () => {
    const database = pgliteTemplate(createNotes, async (db) => {
      await db.execute(sql`INSERT INTO notes (body) VALUES ('seeded')`)
    })

    expect(await bodies(await database())).toEqual(["seeded"])
  })

  it("starts from an empty database when given no steps", async () => {
    expect(await tablesIn(await pgliteTemplate()())).toEqual([])
  })

  it("runs nothing until a test asks", () => {
    const step = vi.fn(createNotes)

    pgliteTemplate(step)

    expect(step).not.toHaveBeenCalled()
  })

  it("gives a test that asks twice two databases, not one", async () => {
    const database = pgliteTemplate(createNotes)
    const first = await database()
    const second = await database()

    await first.execute(sql`INSERT INTO notes (body) VALUES ('first')`)

    expect(await bodies(first)).toEqual(["first"])
    expect(await bodies(second)).toEqual([])
  })

  describe("across tests that share a template", () => {
    const database = pgliteTemplate(createNotes)

    it("lets one test write rows and tables", async () => {
      const db = await database()

      await db.execute(sql`INSERT INTO notes (body) VALUES ('left behind')`)
      await db.execute(sql`CREATE TABLE stray (id integer)`)

      expect(await tablesIn(db)).toEqual(["notes", "stray"])
    })

    it("hands the next test none of it", async () => {
      const db = await database()

      expect(await tablesIn(db)).toEqual(["notes"])
      expect(await bodies(db)).toEqual([])
    })
  })
})
