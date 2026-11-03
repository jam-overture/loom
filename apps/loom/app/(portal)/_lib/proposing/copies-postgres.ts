import { asc, eq, sql } from "drizzle-orm"
import { bigint, pgTable, primaryKey, text } from "drizzle-orm/pg-core"

import { err, ok, treeIdSchema } from "@jam-overture/loom"
import type { LoomDatabase } from "@jam-overture/loom/postgres"
import type { ApplicationId } from "@jam-overture/loom/store"

import type { PageCopy, PageCopyStore, PageCopyStoreError } from "./copies"

/** One row per copy a page started again from a newer published version (0340). */
export const loomPageCopies = pgTable(
  "loom_page_copies",
  {
    applicationId: text("application_id").notNull(),
    copyTreeId: text("copy_tree_id").notNull(),
    pageTreeId: text("page_tree_id").notNull(),
    startedAt: bigint("started_at", { mode: "number" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.applicationId, table.copyTreeId] })]
)

export const PAGE_COPIES_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS loom_page_copies (
    application_id text NOT NULL,
    copy_tree_id text NOT NULL,
    page_tree_id text NOT NULL,
    started_at bigint NOT NULL,
    PRIMARY KEY (application_id, copy_tree_id)
  )`,
  `ALTER TABLE loom_page_copies ENABLE ROW LEVEL SECURITY`,
]

export const ensurePageCopiesSchema = async (db: LoomDatabase): Promise<void> => {
  for (const statement of PAGE_COPIES_DDL) {
    await db.execute(sql.raw(statement))
  }
}

const failure = (cause: unknown, detail: string): PageCopyStoreError => ({
  code: "unavailable",
  detail: `${detail}: ${cause instanceof Error ? cause.message : String(cause)}`,
})

export const postgresPageCopyStore = (
  db: LoomDatabase,
  scope: { readonly application: ApplicationId }
): PageCopyStore => ({
  list: async () => {
    try {
      const rows = await db
        .select({
          pageId: loomPageCopies.pageTreeId,
          copyId: loomPageCopies.copyTreeId,
          startedAt: loomPageCopies.startedAt,
        })
        .from(loomPageCopies)
        .where(eq(loomPageCopies.applicationId, scope.application))
        .orderBy(asc(loomPageCopies.startedAt), asc(loomPageCopies.copyTreeId))

      /** A row whose ids do not parse names no page this build can draw, so it is left out. */
      return ok(
        rows.flatMap((row): PageCopy[] => {
          const pageId = treeIdSchema.safeParse(row.pageId)
          const copyId = treeIdSchema.safeParse(row.copyId)

          return pageId.success && copyId.success
            ? [{ pageId: pageId.data, copyId: copyId.data, startedAt: row.startedAt }]
            : []
        })
      )
    } catch (cause) {
      return err(failure(cause, `could not read the page copies of ${scope.application}`))
    }
  },

  start: async (copy) => {
    try {
      await db
        .insert(loomPageCopies)
        .values({
          applicationId: scope.application,
          copyTreeId: copy.copyId,
          pageTreeId: copy.pageId,
          startedAt: copy.startedAt,
        })
        .onConflictDoNothing({ target: [loomPageCopies.applicationId, loomPageCopies.copyTreeId] })

      return ok(undefined)
    } catch (cause) {
      return err(failure(cause, `could not record a copy of ${copy.pageId}`))
    }
  },
})
