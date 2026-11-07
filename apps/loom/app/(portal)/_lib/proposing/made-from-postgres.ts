import { and, eq, inArray, sql } from "drizzle-orm"
import { bigint, pgTable, primaryKey, text } from "drizzle-orm/pg-core"

import {
  err,
  intentIdSchema,
  ok,
  proposalIdSchema,
  stakeLevelSchema,
  type ProposalId,
} from "@jam-overture/loom"
import type { LoomDatabase } from "@jam-overture/loom/postgres"
import type { ApplicationId } from "@jam-overture/loom/store"

import type { MadeFrom, MadeFromStore, MadeFromStoreError } from "./made-from"

/** One row per change made on a page's copy, by its proposal id. */
export const loomMadeChanges = pgTable(
  "loom_made_changes",
  {
    applicationId: text("application_id").notNull(),
    proposalId: text("proposal_id").notNull(),
    intentId: text("intent_id").notNull(),
    stakes: text("stakes").notNull(),
    madeAt: bigint("made_at", { mode: "number" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.applicationId, table.proposalId] })]
)

export const MADE_CHANGES_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS loom_made_changes (
    application_id text NOT NULL,
    proposal_id text NOT NULL,
    intent_id text NOT NULL,
    stakes text NOT NULL,
    made_at bigint NOT NULL,
    PRIMARY KEY (application_id, proposal_id)
  )`,
  `ALTER TABLE loom_made_changes ENABLE ROW LEVEL SECURITY`,
]

export const ensureMadeChangesSchema = async (db: LoomDatabase): Promise<void> => {
  for (const statement of MADE_CHANGES_DDL) {
    await db.execute(sql.raw(statement))
  }
}

const failure = (cause: unknown, detail: string): MadeFromStoreError => ({
  code: "unavailable",
  detail: `${detail}: ${cause instanceof Error ? cause.message : String(cause)}`,
})

type Row = typeof loomMadeChanges.$inferSelect

/** A row whose values do not parse is not one this build wrote, so it is left out. */
const madeOf = (row: Row): readonly (readonly [ProposalId, MadeFrom])[] => {
  const proposalId = proposalIdSchema.safeParse(row.proposalId)
  const intentId = intentIdSchema.safeParse(row.intentId)
  const stakes = stakeLevelSchema.safeParse(row.stakes)

  if (!proposalId.success || !intentId.success || !stakes.success) return []

  return [
    [
      proposalId.data,
      {
        proposalId: proposalId.data,
        intentId: intentId.data,
        stakes: stakes.data,
        at: row.madeAt,
      },
    ],
  ]
}

export const postgresMadeFromStore = (
  db: LoomDatabase,
  scope: { readonly application: ApplicationId }
): MadeFromStore => ({
  record: async (made) => {
    try {
      await db
        .insert(loomMadeChanges)
        .values({
          applicationId: scope.application,
          proposalId: made.proposalId,
          intentId: made.intentId,
          stakes: made.stakes,
          madeAt: made.at,
        })
        .onConflictDoNothing({
          target: [loomMadeChanges.applicationId, loomMadeChanges.proposalId],
        })

      return ok(undefined)
    } catch (cause) {
      return err(failure(cause, `could not record what ${made.proposalId} was made from`))
    }
  },

  forProposals: async (proposalIds) => {
    if (proposalIds.length === 0) return ok(new Map())

    try {
      const rows = await db
        .select()
        .from(loomMadeChanges)
        .where(
          and(
            eq(loomMadeChanges.applicationId, scope.application),
            inArray(loomMadeChanges.proposalId, [...proposalIds])
          )
        )

      return ok(new Map(rows.flatMap(madeOf)))
    } catch (cause) {
      return err(failure(cause, "could not read what each made change was made from"))
    }
  },
})
