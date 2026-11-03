import { sql } from "drizzle-orm"
import { describe, expect, it, vi } from "vitest"

import { treeIdSchema } from "@jam-overture/loom"
import { applicationIdSchema } from "@jam-overture/loom/store"

import { pgliteTemplate } from "../../../../../../tools/pglite/template"
import { describePageCopyStoreContract } from "./copies.contract"
import { ensurePageCopiesSchema, postgresPageCopyStore } from "./copies-postgres"
import { describeTurnedDownStoreContract } from "./turned-down.contract"
import { ensureTurnedDownSchema, postgresTurnedDownStore } from "./turned-down-postgres"

/** Against PGlite: the conflict targets and the ordering are what a fake would wave through. */
vi.setConfig({ testTimeout: 30_000 })

const SHOP = applicationIdSchema.parse("app_shop")
const BLOG = applicationIdSchema.parse("app_blog")

const freshDatabase = pgliteTemplate(ensurePageCopiesSchema, ensureTurnedDownSchema)

describePageCopyStoreContract("postgresPageCopyStore", async () =>
  postgresPageCopyStore(await freshDatabase(), { application: SHOP })
)

describeTurnedDownStoreContract("postgresTurnedDownStore", async () =>
  postgresTurnedDownStore(await freshDatabase(), { application: SHOP })
)

const rowSecurity = async (table: string): Promise<unknown> => {
  const db = await freshDatabase()
  const result = await db.execute(sql`SELECT relrowsecurity FROM pg_class WHERE relname = ${table}`)

  return (result as unknown as { readonly rows?: readonly { relrowsecurity?: unknown }[] })
    .rows?.[0]?.relrowsecurity
}

describe("the proposing tables — Postgres specifics", () => {
  it("run their migrations twice without complaining", async () => {
    const db = await freshDatabase()

    await expect(ensurePageCopiesSchema(db)).resolves.toBeUndefined()
    await expect(ensureTurnedDownSchema(db)).resolves.toBeUndefined()
  })

  it.each(["loom_page_copies", "loom_turned_down"])(
    "protects %s with row level security",
    async (table) => {
      expect(await rowSecurity(table)).toBe(true)
    }
  )

  it("keeps one project's rows from another's", async () => {
    const db = await freshDatabase()
    const shop = postgresPageCopyStore(db, { application: SHOP })
    const blog = postgresPageCopyStore(db, { application: BLOG })
    await shop.start({
      pageId: treeIdSchema.parse("t_home"),
      copyId: treeIdSchema.parse("t_again"),
      startedAt: 1,
    })

    expect(await blog.list()).toEqual({ ok: true, value: [] })
  })
})
