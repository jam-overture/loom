import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm"
import { bigint, index, jsonb, pgTable, primaryKey, text } from "drizzle-orm/pg-core"
import { z } from "zod"

import {
  err,
  ok,
  proposalIdSchema,
  treeIdSchema,
  treeOperationSchema,
  type TreeId,
} from "@jam-overture/loom"
import type { LoomDatabase } from "@jam-overture/loom/postgres"
import { audienceIdSchema, type ApplicationId } from "@jam-overture/loom/store"

import {
  SEGMENT_CHANGES_PER_PAGE,
  type SegmentChange,
  type SegmentChangeStore,
  type SegmentChangeStoreError,
} from "./segment-changes"

/** One row per change accepted for one segment only (0386), by its proposal id. */
export const loomSegmentChanges = pgTable(
  "loom_segment_changes",
  {
    applicationId: text("application_id").notNull(),
    proposalId: text("proposal_id").notNull(),
    pageId: text("page_id").notNull(),
    audienceId: text("audience_id").notNull(),
    operations: jsonb("operations").notNull(),
    acceptedBy: text("accepted_by").notNull(),
    acceptedAt: bigint("accepted_at", { mode: "number" }).notNull(),
    droppedAt: bigint("dropped_at", { mode: "number" }),
  },
  (table) => [
    primaryKey({ columns: [table.applicationId, table.proposalId] }),
    index("loom_segment_changes_page").on(table.applicationId, table.pageId, table.acceptedAt),
  ]
)

export const SEGMENT_CHANGES_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS loom_segment_changes (
    application_id text NOT NULL,
    proposal_id text NOT NULL,
    page_id text NOT NULL,
    audience_id text NOT NULL,
    operations jsonb NOT NULL,
    accepted_by text NOT NULL,
    accepted_at bigint NOT NULL,
    dropped_at bigint,
    PRIMARY KEY (application_id, proposal_id)
  )`,
  `CREATE INDEX IF NOT EXISTS loom_segment_changes_page
    ON loom_segment_changes (application_id, page_id, accepted_at)`,
  `ALTER TABLE loom_segment_changes ENABLE ROW LEVEL SECURITY`,
]

export const ensureSegmentChangesSchema = async (db: LoomDatabase): Promise<void> => {
  for (const statement of SEGMENT_CHANGES_DDL) {
    await db.execute(sql.raw(statement))
  }
}

const failure = (cause: unknown, detail: string): SegmentChangeStoreError => ({
  code: "unavailable",
  detail: `${detail}: ${cause instanceof Error ? cause.message : String(cause)}`,
})

const operationsSchema = z.array(treeOperationSchema).min(1)

type Row = typeof loomSegmentChanges.$inferSelect

/** A row whose values do not parse is not one this build wrote, so it is left out. */
const changeOf = (row: Row): readonly SegmentChange[] => {
  const proposalId = proposalIdSchema.safeParse(row.proposalId)
  const pageId = treeIdSchema.safeParse(row.pageId)
  const audienceId = audienceIdSchema.safeParse(row.audienceId)
  const operations = operationsSchema.safeParse(row.operations)

  if (!proposalId.success || !pageId.success || !audienceId.success || !operations.success) {
    return []
  }

  return [
    {
      proposalId: proposalId.data,
      pageId: pageId.data,
      audienceId: audienceId.data,
      operations: operations.data,
      acceptedBy: row.acceptedBy,
      acceptedAt: row.acceptedAt,
      ...(row.droppedAt === null ? {} : { droppedAt: row.droppedAt }),
    },
  ]
}

export const postgresSegmentChangeStore = (
  db: LoomDatabase,
  scope: { readonly application: ApplicationId }
): SegmentChangeStore => {
  const onPage = (pageId: TreeId) =>
    and(
      eq(loomSegmentChanges.applicationId, scope.application),
      eq(loomSegmentChanges.pageId, pageId)
    )

  return {
    record: async (change) => {
      try {
        await db
          .insert(loomSegmentChanges)
          .values({
            applicationId: scope.application,
            proposalId: change.proposalId,
            pageId: change.pageId,
            audienceId: change.audienceId,
            operations: change.operations,
            acceptedBy: change.acceptedBy,
            acceptedAt: change.acceptedAt,
            droppedAt: change.droppedAt ?? null,
          })
          .onConflictDoNothing({
            target: [loomSegmentChanges.applicationId, loomSegmentChanges.proposalId],
          })

        return ok(undefined)
      } catch (cause) {
        return err(failure(cause, `could not record ${change.proposalId} for its segment`))
      }
    },

    forPage: async (pageId) => {
      try {
        const rows = await db
          .select()
          .from(loomSegmentChanges)
          .where(onPage(pageId))
          .orderBy(asc(loomSegmentChanges.acceptedAt), asc(loomSegmentChanges.proposalId))
          .limit(SEGMENT_CHANGES_PER_PAGE)

        return ok(rows.flatMap(changeOf))
      } catch (cause) {
        return err(failure(cause, `could not read the changes for segments on ${pageId}`))
      }
    },

    drop: async (pageId, proposalIds, at) => {
      if (proposalIds.length === 0) return ok(undefined)

      try {
        await db
          .update(loomSegmentChanges)
          .set({ droppedAt: at })
          .where(
            and(
              onPage(pageId),
              inArray(loomSegmentChanges.proposalId, [...proposalIds]),
              isNull(loomSegmentChanges.droppedAt)
            )
          )

        return ok(undefined)
      } catch (cause) {
        return err(failure(cause, `could not mark changes on ${pageId} as no longer fitting`))
      }
    },
  }
}
