import { and, desc, eq, gte, inArray, isNotNull, sql, type SQL } from "drizzle-orm"
import { bigint, pgTable, primaryKey, text } from "drizzle-orm/pg-core"

import {
  err,
  intentIdSchema,
  ok,
  proposalIdSchema,
  treeIdSchema,
  type IntentId,
  type ProposalId,
} from "@jam-overture/loom"
import type { LoomDatabase } from "@jam-overture/loom/postgres"
import type { ApplicationId } from "@jam-overture/loom/store"

import type {
  TurnedDown,
  TurnedDownChange,
  TurnedDownStore,
  TurnedDownStoreError,
} from "./turned-down"
import { isMissingColumn } from "@/app/_lib/app/missing-column"

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
    /** The intent the change was made from, which names the goal it served; `null` on rows from before it was kept. */
    intentId: text("intent_id"),
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
  /**
   * Added after the table went live, so a deployment that pushed it before
   * gains the column. Rows from before it name no intent, and *Turned down*
   * names no goal for them rather than guess one.
   */
  `ALTER TABLE loom_turned_down ADD COLUMN IF NOT EXISTS intent_id text`,
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

/** One application's rows that match `where`, newest first, at most `limit`. */
const readRows = async (
  db: LoomDatabase,
  where: SQL,
  application: ApplicationId,
  limit: number
): Promise<readonly TurnedDown[]> => {
  /** Named by hand, so the reads keep working on a table pushed before `intent_id`. */
  const rows = await db
    .select({
      proposalId: loomTurnedDown.proposalId,
      pageTreeId: loomTurnedDown.pageTreeId,
      request: loomTurnedDown.request,
      reason: loomTurnedDown.reason,
      turnedDownBy: loomTurnedDown.turnedDownBy,
      turnedDownAt: loomTurnedDown.turnedDownAt,
    })
    .from(loomTurnedDown)
    .where(and(eq(loomTurnedDown.applicationId, application), where))
    .orderBy(desc(loomTurnedDown.turnedDownAt), loomTurnedDown.proposalId)
    .limit(Math.max(0, limit))

  /** A row whose ids do not parse is not one this build wrote, so it is left out. */
  return rows.flatMap((row): TurnedDown[] => {
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
}

const insertWithIntent = (
  db: LoomDatabase,
  application: ApplicationId,
  entry: TurnedDownChange
): Promise<unknown> =>
  db
    .insert(loomTurnedDown)
    .values({
      applicationId: application,
      proposalId: entry.proposalId,
      pageTreeId: entry.pageId,
      request: entry.request,
      reason: entry.reason,
      turnedDownBy: entry.by,
      turnedDownAt: entry.at,
      intentId: entry.intentId,
    })
    .onConflictDoNothing({ target: [loomTurnedDown.applicationId, loomTurnedDown.proposalId] })

const insertBeforeIntent = (
  db: LoomDatabase,
  application: ApplicationId,
  entry: TurnedDownChange
): Promise<unknown> =>
  db.execute(sql`
    INSERT INTO loom_turned_down
      (application_id, proposal_id, page_tree_id, request, reason, turned_down_by, turned_down_at)
    VALUES (${application}, ${entry.proposalId}, ${entry.pageId}, ${entry.request},
      ${entry.reason}, ${entry.by}, ${entry.at})
    ON CONFLICT (application_id, proposal_id) DO NOTHING
  `)

/** A row whose ids do not parse is not one this build wrote, so it is left out. */
const intentOfRow = (row: {
  readonly proposalId: string
  readonly intentId: string | null
}): (readonly [ProposalId, IntentId])[] => {
  const proposalId = proposalIdSchema.safeParse(row.proposalId)
  const intentId = intentIdSchema.safeParse(row.intentId)

  return proposalId.success && intentId.success ? [[proposalId.data, intentId.data]] : []
}

export const postgresTurnedDownStore = (
  db: LoomDatabase,
  scope: { readonly application: ApplicationId }
): TurnedDownStore => ({
  /**
   * On a table pushed before `intent_id`, the change is remembered without its
   * intent, so the AI still weighs it (0341) and only the goal on *Turned down*
   * is lost, until `pnpm db:push` adds the column. (The query builder writes
   * every column it knows, so the fallback names its own.)
   */
  record: async (entry) => {
    try {
      await insertWithIntent(db, scope.application, entry)

      return ok(undefined)
    } catch (cause) {
      if (!isMissingColumn(cause)) {
        return err(failure(cause, `could not remember turning down ${entry.proposalId}`))
      }
    }

    try {
      await insertBeforeIntent(db, scope.application, entry)

      return ok(undefined)
    } catch (cause) {
      return err(failure(cause, `could not remember turning down ${entry.proposalId}`))
    }
  },

  forPage: async (pageId, limit) => {
    try {
      return ok(await readRows(db, eq(loomTurnedDown.pageTreeId, pageId), scope.application, limit))
    } catch (cause) {
      return err(failure(cause, `could not read what was turned down on ${pageId}`))
    }
  },

  since: async (at, limit) => {
    try {
      return ok(await readRows(db, gte(loomTurnedDown.turnedDownAt, at), scope.application, limit))
    } catch (cause) {
      return err(failure(cause, `could not read what was turned down since ${at}`))
    }
  },

  intentsOf: async (proposalIds) => {
    if (proposalIds.length === 0) return ok(new Map())

    try {
      const rows = await db
        .select({ proposalId: loomTurnedDown.proposalId, intentId: loomTurnedDown.intentId })
        .from(loomTurnedDown)
        .where(
          and(
            eq(loomTurnedDown.applicationId, scope.application),
            inArray(loomTurnedDown.proposalId, [...proposalIds]),
            isNotNull(loomTurnedDown.intentId)
          )
        )

      return ok(new Map(rows.flatMap(intentOfRow)))
    } catch (cause) {
      return err(failure(cause, "could not read the intents of the changes turned down"))
    }
  },
})
