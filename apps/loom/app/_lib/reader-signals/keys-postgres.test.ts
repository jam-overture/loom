import { sql } from "drizzle-orm"
import { describe, expect, it, vi } from "vitest"


import { pgliteTemplate } from "../../../../../tools/pglite/template"
import { mintIngestKey } from "./keys"
import { describeIngestKeyStoreContract } from "./keys.contract"
import { ensureIngestKeysSchema, loomIngestKeys, postgresIngestKeyStore } from "./keys-postgres"

/**
 * Against PGlite, for the accounts suite's reason: the primary key that makes
 * a second key replace the first and the unique index that stops one key
 * naming two applications are both things a fake would wave through.
 */
vi.setConfig({ testTimeout: 30_000 })

const freshDatabase = pgliteTemplate(ensureIngestKeysSchema)

describeIngestKeyStoreContract("postgresIngestKeyStore", async () =>
  postgresIngestKeyStore(await freshDatabase())
)

describe("the ingest keys table — Postgres specifics", () => {
  it("runs its migration twice without complaining", async () => {
    const db = await freshDatabase()

    await expect(ensureIngestKeysSchema(db)).resolves.toBeUndefined()
  })

  it("is protected with row level security", async () => {
    const db = await freshDatabase()
    const result = await db.execute(
      sql`SELECT relrowsecurity FROM pg_class WHERE relname = 'loom_ingest_keys'`
    )
    const rows = (
      result as unknown as {
        readonly rows?: readonly { relrowsecurity?: unknown }[]
      }
    ).rows

    expect(rows?.[0]?.relrowsecurity).toBe(true)
  })

  /** One key naming two applications is the mixing the table exists to prevent. */
  it("refuses one key for two applications", async () => {
    const db = await freshDatabase()
    const key = mintIngestKey()

    await db.insert(loomIngestKeys).values({ applicationId: "app_shop", key, createdAt: 1 })

    await expect(
      db.insert(loomIngestKeys).values({ applicationId: "app_blog", key, createdAt: 1 })
    ).rejects.toThrow()
  })

  /** A row this build cannot read is a store that cannot answer, not an application to file under. */
  it("reports a stored id it cannot parse rather than filing under it", async () => {
    const db = await freshDatabase()
    const key = mintIngestKey()

    await db.insert(loomIngestKeys).values({ applicationId: "not an id", key, createdAt: 1 })

    const found = await postgresIngestKeyStore(db).applicationWithKey(key)

    expect(found.ok).toBe(false)
  })
})
