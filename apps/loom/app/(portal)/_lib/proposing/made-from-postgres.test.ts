import { sql } from "drizzle-orm"
import { describe, expect, it, vi } from "vitest"

import { intentIdSchema, proposalIdSchema } from "@jam-overture/loom"
import { applicationIdSchema } from "@jam-overture/loom/store"

import { pgliteTemplate } from "../../../../../../tools/pglite/template"
import { describeMadeFromStoreContract } from "./made-from.contract"
import { ensureMadeChangesSchema, postgresMadeFromStore } from "./made-from-postgres"

/** Against PGlite: the conflict target and the `IN` list are what a fake would wave through. */
vi.setConfig({ testTimeout: 30_000 })

const SHOP = applicationIdSchema.parse("app_shop")
const BLOG = applicationIdSchema.parse("app_blog")

const freshDatabase = pgliteTemplate(ensureMadeChangesSchema)

describeMadeFromStoreContract("postgresMadeFromStore", async () =>
  postgresMadeFromStore(await freshDatabase(), { application: SHOP })
)

describe("the made changes table — Postgres specifics", () => {
  it("runs its migration twice without complaining", async () => {
    await expect(ensureMadeChangesSchema(await freshDatabase())).resolves.toBeUndefined()
  })

  it("is protected with row level security", async () => {
    const db = await freshDatabase()
    const result = await db.execute(
      sql`SELECT relrowsecurity FROM pg_class WHERE relname = 'loom_made_changes'`
    )

    expect(
      (
        result as unknown as {
          readonly rows?: readonly { relrowsecurity?: unknown }[]
        }
      ).rows?.[0]?.relrowsecurity
    ).toBe(true)
  })

  it("keeps one project's record from another's", async () => {
    const db = await freshDatabase()
    const shop = postgresMadeFromStore(db, { application: SHOP })
    const blog = postgresMadeFromStore(db, { application: BLOG })
    const proposalId = proposalIdSchema.parse("p_1")

    await shop.record({ proposalId, intentId: intentIdSchema.parse("i_1"), stakes: "low", at: 1 })

    expect(await blog.forProposals([proposalId])).toEqual({ ok: true, value: new Map() })
  })

  it("leaves out a row this build did not write", async () => {
    const db = await freshDatabase()
    const proposalId = proposalIdSchema.parse("p_1")

    await db.execute(
      sql`INSERT INTO loom_made_changes VALUES ('app_shop', 'p_1', 'i_1', 'enormous', 1)`
    )

    expect(
      await postgresMadeFromStore(db, { application: SHOP }).forProposals([proposalId])
    ).toEqual({ ok: true, value: new Map() })
  })
})
