import { and, desc, eq, sql } from "drizzle-orm"
import { bigint, pgTable, primaryKey, text } from "drizzle-orm/pg-core"

import { err, ok, proposalIdSchema, treeIdSchema } from "@jam-overture/loom"
import type { LoomDatabase } from "@jam-overture/loom/postgres"
import type { ApplicationId } from "@jam-overture/loom/store"

import type { TurnedDown, TurnedDownStore, TurnedDownStoreError } from "./turned-down"

/** One row per change a person turned down (0341). */
export const loomTurnedDown = pgTable(
  "loom_turned_down",
  {
    applicationId: text("application_id").notNull(),
    proposalId: text("proposal_id").notNull(),
    pageTreeId: text("page_tree_id").notNull(),
    request: text("request").notNull(),
    reason: text("reason"),
    turnedDownBy: text("turned_down_by"),
    turnedDownAt: bigint("turned_down_at", { mode: "number" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.applicationId, table.proposalId] })]
)

export const TURNED_DOWN_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS loom_turned_down (
    application_id text NOT NULL,
    proposal_id text NOT NULL,
    page_tree_id text NOT NULL,
    request text NOT NULL,
    reason text,
    turned_down_by text,
    turned_down_at bigint NOT NULL,
    PRIMARY KEY (application_id, proposal_id)
  )`,
  `CREATE INDEX IF NOT EXISTS loom_turned_down_page
    ON loom_turned_down (application_id, page_tree_id, turned_down_at DESC)`,
  `ALTER TABLE loom_turned_down ENABLE ROW LEVEL SECURITY`,
]

export const ensureTurnedDownSchema = async (db: LoomDatabase): Promise<void> => {
  for (const statement of TURNED_DOWN_DDL) {
    await db.execute(sql.raw(statement))
  }
}

const failure = (cause: unknown, detail: string): TurnedDownStoreError => ({
  code: "unavailable",
  detail: `${detail}: ${cause instanceof Error ? cause.message : String(cause)}`,
})

export const postgresTurnedDownStore = (
  db: LoomDatabase,
  scope: { readonly application: ApplicationId }
): TurnedDownStore => ({
  record: async (entry) => {
    try {
      await db
        .insert(loomTurnedDown)
        .values({
          applicationId: scope.application,
          proposalId: entry.proposalId,
          pageTreeId: entry.pageId,
          request: entry.request,
          reason: entry.reason,
          turnedDownBy: entry.by,
          turnedDownAt: entry.at,
        })
        .onConflictDoNothing({ target: [loomTurnedDown.applicationId, loomTurnedDown.proposalId] })

      return ok(undefined)
    } catch (cause) {
      return err(failure(cause, `could not remember turning down ${entry.proposalId}`))
    }
  },

  forPage: async (pageId, limit) => {
    try {
      const rows = await db
        .select()
        .from(loomTurnedDown)
        .where(
          and(
            eq(loomTurnedDown.applicationId, scope.application),
            eq(loomTurnedDown.pageTreeId, pageId)
          )
        )
        .orderBy(desc(loomTurnedDown.turnedDownAt), loomTurnedDown.proposalId)
        .limit(Math.max(0, limit))

      /** A row whose ids do not parse is not one this build wrote, so it is left out. */
      return ok(
        rows.flatMap((row): TurnedDown[] => {
          const proposalId = proposalIdSchema.safeParse(row.proposalId)
          const page = treeIdSchema.safeParse(row.pageTreeId)

          return proposalId.success && page.success
            ? [
                {
                  proposalId: proposalId.data,
                  pageId: page.data,
                  request: row.request,
                  reason: row.reason,
                  by: row.turnedDownBy,
                  at: row.turnedDownAt,
                },
              ]
            : []
        })
      )
    } catch (cause) {
      return err(failure(cause, `could not read what was turned down on ${pageId}`))
    }
  },
})
