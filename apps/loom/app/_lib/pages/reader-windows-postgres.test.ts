import { sql } from "drizzle-orm"
import { describe, expect, it, vi } from "vitest"

import { applicationIdSchema } from "@jam-overture/loom/store"

import { pgliteTemplate } from "../../../../../tools/pglite/template"
import { describeReaderWindowStoreContract } from "./reader-windows.contract"
import { ensureReaderWindowsSchema, postgresReaderWindowStore } from "./reader-windows-postgres"

/** Against PGlite: the upsert and the check constraint are what a fake would wave through. */
vi.setConfig({ testTimeout: 30_000 })

const freshDatabase = pgliteTemplate(ensureReaderWindowsSchema)

describeReaderWindowStoreContract("postgresReaderWindowStore", async () =>
  postgresReaderWindowStore(await freshDatabase())
)

const rowsOf = (result: unknown): readonly Record<string, unknown>[] =>
  (result as { readonly rows?: readonly Record<string, unknown>[] }).rows ?? []

describe("the reader windows table — Postgres specifics", () => {
  it("runs its migration twice without complaining", async () => {
    const db = await freshDatabase()

    await expect(ensureReaderWindowsSchema(db)).resolves.toBeUndefined()
  })

  it("is protected with row level security", async () => {
    const db = await freshDatabase()
    const result = await db.execute(
      sql`SELECT relrowsecurity FROM pg_class WHERE relname = 'loom_reader_windows'`
    )

    expect(rowsOf(result)[0]?.relrowsecurity).toBe(true)
  })

  it("refuses a window that is not one of the four", async () => {
    const db = await freshDatabase()

    await expect(
      db.execute(
        sql`INSERT INTO loom_reader_windows (application_id, reader_window, set_at) VALUES ('app_shop', '30d', 1)`
      )
    ).rejects.toThrow()
  })

  it("reads as unavailable, not as Off, where the table is not there yet", async () => {
    const db = await freshDatabase()

    await db.execute(sql`DROP TABLE loom_reader_windows`)

    const kept = await postgresReaderWindowStore(db).kept(applicationIdSchema.parse("app_shop"))

    expect(kept.ok).toBe(false)
  })
})
