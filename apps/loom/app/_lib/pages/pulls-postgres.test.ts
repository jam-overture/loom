import { sql } from "drizzle-orm"
import { describe, expect, it, vi } from "vitest"

import { pgliteTemplate } from "../../../../../tools/pglite/template"
import { describeSitePullStoreContract } from "./pulls.contract"
import { applicationIdSchema } from "@jam-overture/loom/store"

import { ensureSitePullsSchema, postgresSitePullStore, SITE_PULLS_DDL } from "./pulls-postgres"

/** Against PGlite: the conflict target, `LEAST`/`GREATEST` and the aggregates are what a fake would wave through. */
vi.setConfig({ testTimeout: 30_000 })

const freshDatabase = pgliteTemplate(ensureSitePullsSchema)
const emptyDatabase = pgliteTemplate()

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

  it("goes on recording pulls on a table pushed before it could say what was kept", async () => {
    const db = await emptyDatabase()

    for (const statement of SITE_PULLS_DDL.slice(0, 2)) await db.execute(sql.raw(statement))

    const store = postgresSitePullStore(db)
    const application = applicationIdSchema.parse("app_shop")

    expect((await store.record({ application, tag: '"a"', at: 1, kept: false })).ok).toBe(true)
    expect((await store.record({ application, tag: '"a"', at: 2, kept: true })).ok).toBe(false)
    expect(await store.span(application)).toEqual({ ok: true, value: { first: 1, last: 2 } })
    expect((await store.newest(application)).ok).toBe(false)
  })
})
