import { sql } from "drizzle-orm"
import { describe, expect, it, vi } from "vitest"

import { intentIdSchema, nodeIdSchema } from "@jam-overture/loom"
import { applicationIdSchema } from "@jam-overture/loom/store"

import { pgliteTemplate } from "../../../../../../tools/pglite/template"
import { newGoalId } from "./goal"
import { describeProposalGoalStoreContract } from "./proposal-goals.contract"
import { ensureProposalGoalsSchema, postgresProposalGoalStore } from "./proposal-goals-postgres"

/** Against PGlite: the conflict target and the `IN` list are what a fake would wave through. */
vi.setConfig({ testTimeout: 30_000 })

const SHOP = applicationIdSchema.parse("app_shop")
const BLOG = applicationIdSchema.parse("app_blog")

const freshDatabase = pgliteTemplate(ensureProposalGoalsSchema)

describeProposalGoalStoreContract("postgresProposalGoalStore", async () =>
  postgresProposalGoalStore(await freshDatabase(), { application: SHOP })
)

describe("the proposal goals table — Postgres specifics", () => {
  it("runs its migration twice without complaining", async () => {
    await expect(ensureProposalGoalsSchema(await freshDatabase())).resolves.toBeUndefined()
  })

  it("is protected with row level security", async () => {
    const db = await freshDatabase()
    const result = await db.execute(
      sql`SELECT relrowsecurity FROM pg_class WHERE relname = 'loom_proposal_goals'`
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
    const shop = postgresProposalGoalStore(db, { application: SHOP })
    const blog = postgresProposalGoalStore(db, { application: BLOG })
    const intentId = intentIdSchema.parse("i_1")

    await shop.record({
      intentId,
      goalId: newGoalId(),
      name: "Start",
      kind: "activated",
      nodeId: nodeIdSchema.parse("n_start"),
      at: 1,
    })

    expect(await blog.forIntents([intentId])).toEqual({
      ok: true,
      value: new Map(),
    })
  })
})
