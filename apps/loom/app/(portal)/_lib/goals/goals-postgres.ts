import { and, count, eq, sql } from "drizzle-orm"
import { bigint, pgTable, primaryKey, text } from "drizzle-orm/pg-core"

import { err, nodeIdSchema, ok, treeIdSchema } from "@jam-overture/loom"
import type { LoomDatabase } from "@jam-overture/loom/postgres"
import type { ApplicationId } from "@jam-overture/loom/store"

import {
  goalIdSchema,
  goalKindSchema,
  MAX_GOALS,
  primaryFirst,
  type Goal,
  type GoalId,
  type GoalStore,
  type GoalStoreError,
} from "./goal"

/** One row per goal a project set (0350). */
export const loomGoals = pgTable(
  "loom_goals",
  {
    applicationId: text("application_id").notNull(),
    goalId: text("goal_id").notNull(),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    nodeId: text("node_id").notNull(),
    /** `NULL` counts it on every page that has the part. */
    pages: text("pages").array(),
    primarySince: bigint("primary_since", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    createdBy: text("created_by"),
  },
  (table) => [primaryKey({ columns: [table.applicationId, table.goalId] })]
)

export const GOALS_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS loom_goals (
    application_id text NOT NULL,
    goal_id text NOT NULL,
    name text NOT NULL,
    kind text NOT NULL,
    node_id text NOT NULL,
    pages text[],
    primary_since bigint,
    created_at bigint NOT NULL,
    created_by text,
    PRIMARY KEY (application_id, goal_id)
  )`,
  `ALTER TABLE loom_goals ENABLE ROW LEVEL SECURITY`,
]

export const ensureGoalsSchema = async (db: LoomDatabase): Promise<void> => {
  for (const statement of GOALS_DDL) {
    await db.execute(sql.raw(statement))
  }
}

const failure = (cause: unknown, detail: string): GoalStoreError => ({
  code: "unavailable",
  detail: `${detail}: ${cause instanceof Error ? cause.message : String(cause)}`,
})

type Row = typeof loomGoals.$inferSelect

/** A row whose values do not parse is not one this build wrote, so it is left out. */
const goalOf = (row: Row): readonly Goal[] => {
  const goalId = goalIdSchema.safeParse(row.goalId)
  const kind = goalKindSchema.safeParse(row.kind)
  const nodeId = nodeIdSchema.safeParse(row.nodeId)
  const pages = row.pages === null ? null : treeIdSchema.array().safeParse(row.pages)

  if (!goalId.success || !kind.success || !nodeId.success || pages?.success === false) return []

  return [
    {
      goalId: goalId.data,
      name: row.name,
      kind: kind.data,
      nodeId: nodeId.data,
      pages: pages === null ? null : pages.data,
      primarySince: row.primarySince,
      createdAt: row.createdAt,
      createdBy: row.createdBy,
    },
  ]
}

export const postgresGoalStore = (
  db: LoomDatabase,
  scope: { readonly application: ApplicationId }
): GoalStore => {
  const mine = eq(loomGoals.applicationId, scope.application)

  /**
   * The mark on one goal and off every other, in one statement so no reader
   * ever sees two or none; a goal that already holds it keeps its date.
   *
   * One statement rather than a unique index on the mark: Postgres checks a
   * unique index row by row, so a statement that moves the mark could trip
   * over the row it is about to clear.
   */
  const markOnly = (goalId: GoalId, at: number) =>
    db.execute(sql`
      UPDATE loom_goals
         SET primary_since = CASE WHEN goal_id = ${goalId} THEN COALESCE(primary_since, ${at}) END
       WHERE application_id = ${scope.application}
         AND (primary_since IS NOT NULL OR goal_id = ${goalId})`)

  /** The mark on the oldest goal, only where no goal holds it. */
  const markHeirIfNone = (at: number) =>
    db.execute(sql`
      UPDATE loom_goals
         SET primary_since = ${at}
       WHERE application_id = ${scope.application}
         AND goal_id = (SELECT goal_id FROM loom_goals
                         WHERE application_id = ${scope.application}
                         ORDER BY created_at, goal_id LIMIT 1)
         AND NOT EXISTS (SELECT 1 FROM loom_goals
                          WHERE application_id = ${scope.application}
                            AND primary_since IS NOT NULL)`)

  const exists = async (goalId: GoalId): Promise<boolean> =>
    (
      await db
        .select({ goalId: loomGoals.goalId })
        .from(loomGoals)
        .where(and(mine, eq(loomGoals.goalId, goalId)))
        .limit(1)
    ).length > 0

  return {
    list: async () => {
      try {
        const rows = await db.select().from(loomGoals).where(mine)

        return ok(primaryFirst(rows.flatMap(goalOf)))
      } catch (cause) {
        return err(failure(cause, "could not read this project's goals"))
      }
    },

    add: async (draft, { primary }) => {
      try {
        /**
         * The limit is read before the write rather than in it: it is a ceiling
         * on what a person can weigh, not an invariant, and the one race that
         * passes it is an owner saving two goals at once.
         */
        const [held] = await db.select({ count: count() }).from(loomGoals).where(mine)

        if ((held?.count ?? 0) >= MAX_GOALS) {
          return err({
            code: "full",
            detail: `${MAX_GOALS} goals are kept already`,
          } as const)
        }

        await db.insert(loomGoals).values({
          applicationId: scope.application,
          goalId: draft.goalId,
          name: draft.name,
          kind: draft.kind,
          nodeId: draft.nodeId,
          pages: draft.pages === null ? null : [...draft.pages],
          createdAt: draft.createdAt,
          createdBy: draft.createdBy,
        })

        await (primary ? markOnly(draft.goalId, draft.createdAt) : markHeirIfNone(draft.createdAt))

        return ok(undefined)
      } catch (cause) {
        return err(failure(cause, `could not keep the goal ${draft.name}`))
      }
    },

    makePrimary: async (goalId, at) => {
      try {
        if (!(await exists(goalId))) return err({ code: "not_found", detail: `no goal ${goalId}` })

        await markOnly(goalId, at)

        return ok(undefined)
      } catch (cause) {
        return err(failure(cause, `could not make ${goalId} the primary goal`))
      }
    },

    remove: async (goalId, at) => {
      try {
        /** The count comes from the returned rows, because the two drivers report `rowCount` differently. */
        const removed = await db
          .delete(loomGoals)
          .where(and(mine, eq(loomGoals.goalId, goalId)))
          .returning({ goalId: loomGoals.goalId })

        if (removed.length === 0) return err({ code: "not_found", detail: `no goal ${goalId}` })

        await markHeirIfNone(at)

        return ok(undefined)
      } catch (cause) {
        return err(failure(cause, `could not remove ${goalId}`))
      }
    },
  }
}
