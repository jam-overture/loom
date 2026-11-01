import { sql } from "drizzle-orm"
import { describe, expect, it, vi } from "vitest"

import { pgliteTemplate } from "../../../../../tools/pglite/template"
import { describeModelKeyStoreContract } from "./model-keys.contract"
import { ensureModelKeysSchema, postgresModelKeyStore } from "./model-keys-postgres"

/** Against PGlite: the upsert is what a fake would wave through. */
vi.setConfig({ testTimeout: 30_000 })

const freshDatabase = pgliteTemplate(ensureModelKeysSchema)

describeModelKeyStoreContract("postgresModelKeyStore", async () =>
  postgresModelKeyStore(await freshDatabase())
)

describe("the model keys table — Postgres specifics", () => {
  it("runs its migration twice without complaining", async () => {
    const db = await freshDatabase()

    await expect(ensureModelKeysSchema(db)).resolves.toBeUndefined()
  })

  it("is protected with row level security", async () => {
    const db = await freshDatabase()
    const result = await db.execute(
      sql`SELECT relrowsecurity FROM pg_class WHERE relname = 'loom_model_keys'`
    )

    expect(
      (result as unknown as { readonly rows?: readonly { relrowsecurity?: unknown }[] }).rows?.[0]
        ?.relrowsecurity
    ).toBe(true)
  })
})
