import { sql } from "drizzle-orm"
import { describe, expect, it, vi } from "vitest"

import { ok, proposalIdSchema, sequentialIdFactory, treeIdSchema } from "@jam-overture/loom"
import { ensureTreeStoreSchema, postgresTreeStore } from "@jam-overture/loom/postgres"
import { applicationIdSchema } from "@jam-overture/loom/store"
import { memoryHoldStore } from "@jam-overture/loom/write"

import { pageFixture } from "@/app/_lib/pages/fixtures"

import { pgliteTemplate } from "../../../../../../tools/pglite/template"
import { describePageCopyStoreContract } from "./copies.contract"
import { ensurePageCopiesSchema, postgresPageCopyStore } from "./copies-postgres"
import { elementIdsOf } from "./fixtures"
import { followPublished, governedCopyOf } from "./following"
import { describeTurnedDownStoreContract } from "./turned-down.contract"
import { ensureTurnedDownSchema, postgresTurnedDownStore } from "./turned-down-postgres"

/** Against PGlite: the conflict targets and the ordering are what a fake would wave through. */
vi.setConfig({ testTimeout: 30_000 })

const SHOP = applicationIdSchema.parse("app_shop")
const BLOG = applicationIdSchema.parse("app_blog")

const freshDatabase = pgliteTemplate(
  ensurePageCopiesSchema,
  ensureTurnedDownSchema,
  ensureTreeStoreSchema
)

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

describe("following a newer version — Postgres specifics", () => {
  it("writes the accepted change to the new copy's record under the proposal it already had", async () => {
    const db = await freshDatabase()
    const trees = postgresTreeStore(db, { application: SHOP })
    const published = pageFixture("home", "Welcome", 3)
    const newer = { ...pageFixture("home", "Welcome back", 5), treeId: published.treeId }
    const [, heading] = elementIdsOf(published)
    if (heading === undefined) throw new Error("the fixture has a heading")
    const proposalId = proposalIdSchema.parse("p_accepted")

    await governedCopyOf(trees, published, published.treeId)
    await trees.append(published.treeId, {
      proposalId,
      delta: {
        deltaId: sequentialIdFactory("pg").deltaId(),
        treeId: published.treeId,
        baseRevision: published.revision,
        operations: [{ op: "configure", nodeId: heading, set: { level: 2 }, unset: [] }],
      },
      provenance: {
        origin: "system-signal",
        interpreter: "test",
        authoredBy: "model",
        confidence: 0.9,
        interpretedAt: "2026-11-01T00:00:00.000Z",
      },
      appliedAt: "2026-11-01T00:00:00.000Z",
      answeredBy: "owner:ana",
    })

    const followed = await followPublished(
      {
        trees,
        holds: memoryHoldStore(),
        copies: postgresPageCopyStore(db, { application: SHOP }),
        ids: sequentialIdFactory("again"),
        now: () => Date.UTC(2026, 10, 2),
        follows: true,
      },
      newer
    )
    if (!followed.ok || followed.value.kind !== "followed") throw new Error("expected a new copy")

    const record = await trees.revisions(followed.value.copy.treeId)

    expect(followed.value.replayed).toEqual([proposalId])
    expect(record.ok && record.value.revisions).toMatchObject([
      { proposalId, revision: newer.revision + 1, answeredBy: "owner:ana" },
    ])
    expect(await trees.head(followed.value.copy.treeId)).toEqual(ok(followed.value.copy))
  })
})
