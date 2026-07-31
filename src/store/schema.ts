import { sql } from "drizzle-orm"
import { integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core"

/**
 * Two tables: the log, and the snapshot it produces.
 *
 * 0016 made the log the truth and the snapshot a materialised view of it, so the
 * shapes here are not symmetric. `loom_revisions` is append-only and is never
 * updated or deleted from; `loom_trees` is overwritten on every append and can be
 * rebuilt from the log at any time.
 */

/**
 * The snapshot. `document` is the whole `LoomTree`, stored as JSON rather than
 * decomposed into node rows — the tree is read and written whole, and a schema
 * that shredded it would have to be migrated every time §1 changes the AST.
 */
export const loomTrees = pgTable("loom_trees", {
  treeId: text("tree_id").primaryKey(),
  revision: integer("revision").notNull(),
  document: jsonb("document").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
})

/**
 * The log. The composite primary key is load-bearing rather than incidental: it
 * makes the *database* enforce the revision sequence, so two writers racing at
 * the same base revision cannot both commit even if both passed the
 * base-revision check before either finished. The in-memory store gets that
 * property from being single-threaded; here it has to come from a constraint.
 *
 * `delta` and `provenance` are JSON because they are Zod-validated shapes owned
 * by §1 and §2. Columns would duplicate those definitions and drift from them.
 */
export const loomRevisions = pgTable(
  "loom_revisions",
  {
    treeId: text("tree_id").notNull(),
    revision: integer("revision").notNull(),
    proposalId: text("proposal_id").notNull(),
    delta: jsonb("delta").notNull(),
    provenance: jsonb("provenance").notNull(),
    /** When the runtime applied it, which is not when the row was written. */
    appliedAt: text("applied_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.treeId, table.revision] })]
)
