import { and, eq, inArray, sql } from "drizzle-orm"
import { bigint, pgTable, primaryKey, text } from "drizzle-orm/pg-core"

import { err, intentIdSchema, nodeIdSchema, ok, type IntentId } from "@jam-overture/loom"
import type { LoomDatabase } from "@jam-overture/loom/postgres"
import type { ApplicationId } from "@jam-overture/loom/store"

import { goalIdSchema, goalKindSchema } from "./goal"
import type { ProposalGoal, ProposalGoalStore, ProposalGoalStoreError } from "./serving"

/** One row per proposal raised for a goal (0352), by the intent it was made from. */
export const loomProposalGoals = pgTable(
  "loom_proposal_goals",
  {
    applicationId: text("application_id").notNull(),
    intentId: text("intent_id").notNull(),
    goalId: text("goal_id").notNull(),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    nodeId: text("node_id").notNull(),
    recordedAt: bigint("recorded_at", { mode: "number" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.applicationId, table.intentId] })]
)

export const PROPOSAL_GOALS_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS loom_proposal_goals (
    application_id text NOT NULL,
    intent_id text NOT NULL,
    goal_id text NOT NULL,
    name text NOT NULL,
    kind text NOT NULL,
    node_id text NOT NULL,
    recorded_at bigint NOT NULL,
    PRIMARY KEY (application_id, intent_id)
  )`,
  `ALTER TABLE loom_proposal_goals ENABLE ROW LEVEL SECURITY`,
]

export const ensureProposalGoalsSchema = async (db: LoomDatabase): Promise<void> => {
  for (const statement of PROPOSAL_GOALS_DDL) {
    await db.execute(sql.raw(statement))
  }
}

const failure = (cause: unknown, detail: string): ProposalGoalStoreError => ({
  code: "unavailable",
  detail: `${detail}: ${cause instanceof Error ? cause.message : String(cause)}`,
})

type Row = typeof loomProposalGoals.$inferSelect

/** A row whose values do not parse is not one this build wrote, so it is left out. */
const servedOf = (row: Row): readonly (readonly [IntentId, ProposalGoal])[] => {
  const intentId = intentIdSchema.safeParse(row.intentId)
  const goalId = goalIdSchema.safeParse(row.goalId)
  const kind = goalKindSchema.safeParse(row.kind)
  const nodeId = nodeIdSchema.safeParse(row.nodeId)

  if (!intentId.success || !goalId.success || !kind.success || !nodeId.success) return []

  return [
    [
      intentId.data,
      {
        intentId: intentId.data,
        goalId: goalId.data,
        name: row.name,
        kind: kind.data,
        nodeId: nodeId.data,
        at: row.recordedAt,
      },
    ],
  ]
}

export const postgresProposalGoalStore = (
  db: LoomDatabase,
  scope: { readonly application: ApplicationId }
): ProposalGoalStore => ({
  record: async (served) => {
    try {
      await db
        .insert(loomProposalGoals)
        .values({
          applicationId: scope.application,
          intentId: served.intentId,
          goalId: served.goalId,
          name: served.name,
          kind: served.kind,
          nodeId: served.nodeId,
          recordedAt: served.at,
        })
        .onConflictDoNothing({
          target: [loomProposalGoals.applicationId, loomProposalGoals.intentId],
        })

      return ok(undefined)
    } catch (cause) {
      return err(failure(cause, `could not record the goal of ${served.intentId}`))
    }
  },

  forIntents: async (intentIds) => {
    if (intentIds.length === 0) return ok(new Map())

    try {
      const rows = await db
        .select()
        .from(loomProposalGoals)
        .where(
          and(
            eq(loomProposalGoals.applicationId, scope.application),
            inArray(loomProposalGoals.intentId, [...intentIds])
          )
        )

      return ok(new Map(rows.flatMap(servedOf)))
    } catch (cause) {
      return err(failure(cause, "could not read which goal each change serves"))
    }
  },
})
