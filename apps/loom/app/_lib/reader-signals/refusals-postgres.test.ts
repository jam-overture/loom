import { PGlite } from "@electric-sql/pglite"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/pglite"
import { describe, expect, it, vi } from "vitest"

import type { LoomDatabase } from "@jam-overture/loom/postgres"
import { applicationIdSchema } from "@jam-overture/loom/store"

import { describeRefusalCounterContract } from "./refusals.contract"
import { ensureReaderRefusalsSchema, postgresRefusalCounter } from "./refusals-postgres"

/**
 * Against PGlite, because the upsert that makes two refusals at once both
 * count is the part a fake would wave through.
 */
vi.setConfig({ testTimeout: 30_000 })

const freshDatabase = async (): Promise<LoomDatabase> => {
  const db = drizzle(new PGlite())
  await ensureReaderRefusalsSchema(db)

  return db
}

describeRefusalCounterContract("postgresRefusalCounter", async () => {
  const db = await freshDatabase()

  return (application) => postgresRefusalCounter(db, { application })
})

const SHOP = applicationIdSchema.parse("app_shop")

describe("the refusals table — Postgres specifics", () => {
  it("runs its migration twice without complaining", async () => {
    const db = await freshDatabase()

    await expect(ensureReaderRefusalsSchema(db)).resolves.toBeUndefined()
  })

  it("is protected with row level security", async () => {
    const db = await freshDatabase()
    const result = await db.execute(
      sql`SELECT relrowsecurity FROM pg_class WHERE relname = 'loom_reader_refusals'`
    )

    const rows = (
      result as unknown as {
        readonly rows?: readonly { relrowsecurity?: unknown }[]
      }
    ).rows

    expect(rows?.[0]?.relrowsecurity).toBe(true)
  })

  it("counts refusals recorded at the same moment, one row per reason", async () => {
    const counter = postgresRefusalCounter(await freshDatabase(), { application: SHOP })

    await Promise.all(Array.from({ length: 20 }, () => counter.record("closed", null, 1)))

    const read = await counter.read()
    expect(read.ok && read.value).toEqual([
      { reason: "closed", refused: 20, lastAt: 1, lastOrigin: null },
    ])
  })

  it("reports a table that is not there as unavailable rather than throwing", async () => {
    const counter = postgresRefusalCounter(drizzle(new PGlite()), { application: SHOP })

    expect((await counter.read()).ok).toBe(false)
    expect((await counter.record("closed", null, 1)).ok).toBe(false)
  })
})
