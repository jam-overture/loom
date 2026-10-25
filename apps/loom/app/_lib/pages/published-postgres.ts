import { eq, sql } from "drizzle-orm"
import { bigint, integer, jsonb, pgTable, primaryKey, text } from "drizzle-orm/pg-core"

import { err, ok, parseTree } from "@jam-overture/loom"
import type { LoomDatabase } from "@jam-overture/loom/postgres"
import type { ApplicationId } from "@jam-overture/loom/store"

import {
  newestFirst,
  type PublishedPage,
  type PublishedPageStore,
  type PublishedPageStoreError,
} from "./published"

/**
 * One row per application and page: the newest tree a site published for it.
 * `revision` is the tree's own, kept in a column so a listing need not read the
 * tree to say which version it is.
 */
export const loomPublishedPages = pgTable(
  "loom_published_pages",
  {
    applicationId: text("application_id").notNull(),
    treeId: text("tree_id").notNull(),
    revision: integer("revision").notNull(),
    tree: jsonb("tree").notNull(),
    receivedAt: bigint("received_at", { mode: "number" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.applicationId, table.treeId] })]
)

export const PUBLISHED_PAGES_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS loom_published_pages (
    application_id text NOT NULL,
    tree_id text NOT NULL,
    revision integer NOT NULL,
    tree jsonb NOT NULL,
    received_at bigint NOT NULL,
    PRIMARY KEY (application_id, tree_id)
  )`,
  `ALTER TABLE loom_published_pages ENABLE ROW LEVEL SECURITY`,
]

export const ensurePublishedPagesSchema = async (db: LoomDatabase): Promise<void> => {
  for (const statement of PUBLISHED_PAGES_DDL) {
    await db.execute(sql.raw(statement))
  }
}

const failure = (cause: unknown, detail: string): PublishedPageStoreError => ({
  code: "unavailable",
  detail: `${detail}: ${cause instanceof Error ? cause.message : String(cause)}`,
})

export const postgresPublishedPageStore = (
  db: LoomDatabase,
  scope: { readonly application: ApplicationId }
): PublishedPageStore => ({
  publish: async (trees, at) => {
    if (trees.length === 0) return ok(undefined)

    try {
      /** One statement, so a snapshot lands whole or not at all (clause 5). */
      await db
        .insert(loomPublishedPages)
        .values(
          trees.map((tree) => ({
            applicationId: scope.application,
            treeId: tree.treeId,
            revision: tree.revision,
            tree,
            receivedAt: at,
          }))
        )
        .onConflictDoUpdate({
          target: [loomPublishedPages.applicationId, loomPublishedPages.treeId],
          set: {
            revision: sql`excluded.revision`,
            tree: sql`excluded.tree`,
            receivedAt: sql`excluded.received_at`,
          },
        })

      return ok(undefined)
    } catch (cause) {
      return err(failure(cause, `could not keep the pages published for ${scope.application}`))
    }
  },

  list: async () => {
    try {
      const rows = await db
        .select({ tree: loomPublishedPages.tree, receivedAt: loomPublishedPages.receivedAt })
        .from(loomPublishedPages)
        .where(eq(loomPublishedPages.applicationId, scope.application))

      /**
       * Parsed on the way out as well as in: a row written by an older build,
       * or by hand, is read through the same boundary as a snapshot.
       */
      const read = rows.map((row) => ({ tree: parseTree(row.tree), receivedAt: row.receivedAt }))

      if (read.some((row) => !row.tree.ok)) {
        return err({
          code: "unavailable",
          detail: `a published page for ${scope.application} is not a tree this build can read`,
        })
      }

      return ok(
        newestFirst(
          read.flatMap(({ tree, receivedAt }): readonly PublishedPage[] =>
            tree.ok ? [{ tree: tree.value, receivedAt }] : []
          )
        )
      )
    } catch (cause) {
      return err(failure(cause, `could not read the pages published for ${scope.application}`))
    }
  },
})
