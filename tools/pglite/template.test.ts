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

describe("pgliteTemplate", () => {
  it("runs the steps once, however many databases are asked for", async () => {
    const step = vi.fn(createNotes)
    const database = pgliteTemplate(step)

    await database()
    await database()

    expect(step).toHaveBeenCalledOnce()
  })

  it("gives back a database the steps have already run on, in order", async () => {
    const database = pgliteTemplate(createNotes, async (db) => {
      await db.execute(sql`INSERT INTO notes (body) VALUES ('seeded')`)
    })

    expect(await bodies(await database())).toEqual(["seeded"])
  })

  it("keeps what one database is given out of the next", async () => {
    const database = pgliteTemplate(createNotes)
    const first = await database()
    const second = await database()

    await first.execute(sql`INSERT INTO notes (body) VALUES ('first')`)

    expect(await bodies(first)).toEqual(["first"])
    expect(await bodies(second)).toEqual([])
    expect(await bodies(await database())).toEqual([])
  })

  it("boots nothing until a database is asked for", () => {
    const step = vi.fn(createNotes)

    pgliteTemplate(step)

    expect(step).not.toHaveBeenCalled()
  })

  it("starts from an empty database when given no steps", async () => {
    const db = await pgliteTemplate()()

    const tables = await db.execute(
      sql`SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public'`
    )

    expect(tables.rows[0]?.["n"]).toBe(0)
  })
})
