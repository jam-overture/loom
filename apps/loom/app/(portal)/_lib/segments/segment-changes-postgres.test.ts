import { sql } from "drizzle-orm"
import { describe, expect, it, vi } from "vitest"

import { nodeIdSchema, proposalIdSchema, treeIdSchema } from "@jam-overture/loom"
import { applicationIdSchema, audienceIdSchema } from "@jam-overture/loom/store"

import { pgliteTemplate } from "../../../../../../tools/pglite/template"
import { describeSegmentChangeStoreContract } from "./segment-changes.contract"
import { ensureSegmentChangesSchema, postgresSegmentChangeStore } from "./segment-changes-postgres"

/** Against PGlite: the conflict target, the ordering and the `IS NULL` guard are what a fake would wave through. */
vi.setConfig({ testTimeout: 60_000 })

const SHOP = applicationIdSchema.parse("app_shop")
const BLOG = applicationIdSchema.parse("app_blog")
const HOME = treeIdSchema.parse("t_home")

const freshDatabase = pgliteTemplate(ensureSegmentChangesSchema)

describeSegmentChangeStoreContract("postgresSegmentChangeStore", async () =>
  postgresSegmentChangeStore(await freshDatabase(), { application: SHOP })
)

describe("the segment changes table — Postgres specifics", () => {
  it("runs its migration twice without complaining", async () => {
    await expect(ensureSegmentChangesSchema(await freshDatabase())).resolves.toBeUndefined()
  })

  it("is protected with row level security", async () => {
    const db = await freshDatabase()
    const result = await db.execute(
      sql`SELECT relrowsecurity FROM pg_class WHERE relname = 'loom_segment_changes'`
    )

    expect(
      (result as unknown as { readonly rows?: readonly { relrowsecurity?: unknown }[] }).rows?.[0]
        ?.relrowsecurity
    ).toBe(true)
  })

  it("keeps one project's changes from another's", async () => {
    const db = await freshDatabase()

    await postgresSegmentChangeStore(db, { application: SHOP }).record({
      proposalId: proposalIdSchema.parse("p_1"),
      pageId: HOME,
      audienceId: audienceIdSchema.parse("aud_phone"),
      operations: [{ op: "remove", nodeId: nodeIdSchema.parse("n_heading") }],
      acceptedBy: "ada@example.com",
      acceptedAt: 1,
    })

    expect(await postgresSegmentChangeStore(db, { application: BLOG }).forPage(HOME)).toEqual({
      ok: true,
      value: [],
    })
  })

  it("leaves out a row this build did not write", async () => {
    const db = await freshDatabase()

    await db.execute(
      sql`INSERT INTO loom_segment_changes VALUES
        ('app_shop', 'p_1', 't_home', 'aud_phone', '[]'::jsonb, 'ada', 1, NULL)`
    )

    expect(await postgresSegmentChangeStore(db, { application: SHOP }).forPage(HOME)).toEqual({
      ok: true,
      value: [],
    })
  })
})
