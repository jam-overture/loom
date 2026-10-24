import { PGlite } from "@electric-sql/pglite"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/pglite"
import { describe, expect, it, vi } from "vitest"

import type { LoomDatabase } from "@jam-overture/loom/postgres"
import { applicationIdSchema } from "@jam-overture/loom/store"

import { pageFixture } from "./fixtures"
import { describePublishKeyStoreContract } from "./publish-keys.contract"
import { ensurePublishKeysSchema, postgresPublishKeyStore } from "./publish-keys-postgres"
import { describePublishedPageStoreContract } from "./published.contract"
import {
  ensurePublishedPagesSchema,
  loomPublishedPages,
  postgresPublishedPageStore,
} from "./published-postgres"

/** Against PGlite, for the keys suite's reason: the upserts and the unique index are what a fake would wave through. */
vi.setConfig({ testTimeout: 30_000 })

const freshDatabase = async (): Promise<LoomDatabase> => {
  const db = drizzle(new PGlite())
  await ensurePublishKeysSchema(db)
  await ensurePublishedPagesSchema(db)

  return db
}

describePublishKeyStoreContract("postgresPublishKeyStore", async () =>
  postgresPublishKeyStore(await freshDatabase())
)

describePublishedPageStoreContract("postgresPublishedPageStore", async () => {
  const db = await freshDatabase()

  return (application) => postgresPublishedPageStore(db, { application })
})

const SHOP = applicationIdSchema.parse("app_shop")

const rowSecurityOf = async (db: LoomDatabase, table: string): Promise<unknown> => {
  const result = await db.execute(sql`SELECT relrowsecurity FROM pg_class WHERE relname = ${table}`)

  return (result as unknown as { readonly rows?: readonly { relrowsecurity?: unknown }[] })
    .rows?.[0]?.relrowsecurity
}

describe("the pages tables — Postgres specifics", () => {
  it("run their migrations twice without complaining", async () => {
    const db = await freshDatabase()

    await expect(ensurePublishKeysSchema(db)).resolves.toBeUndefined()
    await expect(ensurePublishedPagesSchema(db)).resolves.toBeUndefined()
  })

  it("are protected with row level security", async () => {
    const db = await freshDatabase()

    expect(await rowSecurityOf(db, "loom_publish_keys")).toBe(true)
    expect(await rowSecurityOf(db, "loom_published_pages")).toBe(true)
  })

  it("refuses one digest for two applications", async () => {
    const store = postgresPublishKeyStore(await freshDatabase())
    await store.put(SHOP, "a".repeat(64), 1)

    const second = await store.put(applicationIdSchema.parse("app_blog"), "a".repeat(64), 1)

    expect(second.ok).toBe(false)
  })

  /** Clause 5: a snapshot lands whole or not at all, so one page cannot win over its neighbour. */
  it("keeps none of a snapshot when one of its rows cannot be written", async () => {
    const db = await freshDatabase()
    const store = postgresPublishedPageStore(db, { application: SHOP })
    const good = pageFixture("home", "Welcome")
    const unwritable = { ...pageFixture("pricing", "Pricing"), revision: 2 ** 40 }

    expect((await store.publish([good, unwritable], 1)).ok).toBe(false)
    expect(await db.select().from(loomPublishedPages)).toEqual([])
  })

  it("reports a stored row that is not a tree rather than showing it", async () => {
    const db = await freshDatabase()
    await db.insert(loomPublishedPages).values({
      applicationId: SHOP,
      treeId: "t_broken",
      revision: 0,
      tree: { not: "a tree" },
      receivedAt: 1,
    })

    expect((await postgresPublishedPageStore(db, { application: SHOP }).list()).ok).toBe(false)
  })
})
