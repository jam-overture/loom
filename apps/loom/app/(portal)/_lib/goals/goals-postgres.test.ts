import { sql } from "drizzle-orm"
import { describe, expect, it, vi } from "vitest"

import { nodeIdSchema } from "@jam-overture/loom"
import { applicationIdSchema } from "@jam-overture/loom/store"

import { pgliteTemplate } from "../../../../../../tools/pglite/template"
import { newGoalId } from "./goal"
import { describeGoalStoreContract } from "./goals.contract"
import { ensureGoalsSchema, postgresGoalStore } from "./goals-postgres"

/** Against PGlite: the one-statement mark and the array column are what a fake would wave through. */
vi.setConfig({ testTimeout: 30_000 })

const SHOP = applicationIdSchema.parse("app_shop")
const BLOG = applicationIdSchema.parse("app_blog")

const freshDatabase = pgliteTemplate(ensureGoalsSchema)

describeGoalStoreContract("postgresGoalStore", async () =>
  postgresGoalStore(await freshDatabase(), { application: SHOP })
)

describe("the goals table — Postgres specifics", () => {
  it("runs its migration twice without complaining", async () => {
    await expect(ensureGoalsSchema(await freshDatabase())).resolves.toBeUndefined()
  })

  it("is protected with row level security", async () => {
    const db = await freshDatabase()
    const result = await db.execute(
      sql`SELECT relrowsecurity FROM pg_class WHERE relname = 'loom_goals'`
    )

    expect(
      (
        result as unknown as {
          readonly rows?: readonly { relrowsecurity?: unknown }[]
        }
      ).rows?.[0]?.relrowsecurity
    ).toBe(true)
  })

  it("keeps one project's goals, and its primary mark, from another's", async () => {
    const db = await freshDatabase()
    const shop = postgresGoalStore(db, { application: SHOP })
    const blog = postgresGoalStore(db, { application: BLOG })
    const goal = {
      name: "Start",
      kind: "activated",
      nodeId: nodeIdSchema.parse("n_start"),
      pages: null,
      createdBy: null,
    } as const

    await shop.add({ ...goal, goalId: newGoalId(), createdAt: 1 }, { primary: false })
    await blog.add({ ...goal, goalId: newGoalId(), createdAt: 2 }, { primary: false })

    expect(await blog.list()).toMatchObject({
      value: [{ createdAt: 2, primarySince: 2 }],
    })
    expect(await shop.list()).toMatchObject({
      value: [{ createdAt: 1, primarySince: 1 }],
    })
  })
})
