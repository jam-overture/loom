import { sql } from "drizzle-orm"
import { describe, expect, it, vi } from "vitest"

import { pgliteTemplate } from "../../../../../tools/pglite/template"
import { describeSitePullStoreContract } from "./pulls.contract"
import { ensureSitePullsSchema, postgresSitePullStore } from "./pulls-postgres"

/** Against PGlite: the conflict target, `LEAST`/`GREATEST` and the aggregates are what a fake would wave through. */
vi.setConfig({ testTimeout: 30_000 })

const freshDatabase = pgliteTemplate(ensureSitePullsSchema)

describeSitePullStoreContract("postgresSitePullStore", async () =>
  postgresSitePullStore(await freshDatabase())
)

describe("the site pulls table — Postgres specifics", () => {
  it("runs its migration twice without complaining", async () => {
    await expect(ensureSitePullsSchema(await freshDatabase())).resolves.toBeUndefined()
  })

  it("is protected with row level security", async () => {
    const db = await freshDatabase()
    const result = await db.execute(
      sql`SELECT relrowsecurity FROM pg_class WHERE relname = 'loom_site_pulls'`
    )

    expect(
      (result as unknown as { readonly rows?: readonly { relrowsecurity?: unknown }[] }).rows?.[0]
        ?.relrowsecurity
    ).toBe(true)
  })
})
