import { sql } from "drizzle-orm"
import { index, integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core"

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
    /**
     * Who allowed it, when a human had to (0029). Nullable, and null on every
     * row written before that record: the log is append-only, so an approver
     * nobody observed stays unrecorded rather than being invented.
     */
    answeredBy: text("answered_by"),
  },
  (table) => [primaryKey({ columns: [table.treeId, table.revision] })]
)

/**
 * The custody of what the Gate held back.
 *
 * A third table rather than a column on either of the two above, because a hold
 * is not a revision: 0016 makes a revision the count of the log's entries, so a
 * row for a change that advanced nothing would break the invariant the snapshot
 * is checked against. `held.ts` says the same thing from the other side.
 *
 * `intent`, `proposal` and `disposition` are stored whole, for the reason
 * `loom_revisions.delta` is: they are Zod-validated shapes owned by §2 and §3,
 * and columns would duplicate those definitions and drift from them. It also
 * keeps the promise the interface makes — a confirmation can be *re-judged*,
 * which needs the proposal as it was, not a reconstruction of it.
 *
 * `held_at` is text rather than a timestamp to match `loom_revisions.applied_at`
 * and, more to the point, to match what the in-memory store sorts on: an
 * ISO-8601 UTC instant orders lexicographically exactly as it orders in time, so
 * both implementations read a queue oldest-first by the same comparison rather
 * than by two that happen to agree.
 */
export const loomHolds = pgTable("loom_holds", {
  proposalId: text("proposal_id").primaryKey(),
  treeId: text("tree_id").notNull(),
  baseRevision: integer("base_revision").notNull(),
  intent: jsonb("intent").notNull(),
  proposal: jsonb("proposal").notNull(),
  disposition: jsonb("disposition").notNull(),
  heldAt: text("held_at").notNull(),
})

/**
 * The policy's own log.
 *
 * A fourth table rather than a column anywhere, because a policy revision is not
 * a tree revision: it is not keyed by a tree, it does not advance one, and the
 * same revision of one policy judges changes to every tree a deployment holds.
 * `policy-log.ts` says the same thing from the other side.
 *
 * `policy` is the whole `GatePolicy` as JSON, for the reason
 * `loom_revisions.delta` is: it is a Zod-validated shape owned by §2, and
 * columns would duplicate that definition and drift from it. A knob added to the
 * policy would otherwise be a migration away from a log that quietly stops
 * recording it.
 *
 * `fingerprint` is the one denormalised value in this schema, and it is a column
 * rather than a JSON path because of the query it exists for: a `Disposition`
 * carries a fingerprint, and finding the revision it names has to be a seek. The
 * runtime computes it from the policy beside it on the way in and never accepts
 * one from a caller, so the two cannot disagree.
 *
 * The composite primary key is load-bearing exactly as `loom_revisions`' is: it
 * makes the database enforce the revision sequence, so two writers racing at the
 * same head cannot both commit even if both read the head before either wrote.
 *
 * `recorded_at` is text rather than a timestamp to match
 * `loom_revisions.applied_at` and `loom_holds.held_at` — an ISO-8601 UTC instant
 * orders lexicographically exactly as it orders in time, and what the runtime
 * holds above this boundary is a string.
 */
export const loomPolicyRevisions = pgTable(
  "loom_policy_revisions",
  {
    policyId: text("policy_id").notNull(),
    revision: integer("revision").notNull(),
    fingerprint: text("fingerprint").notNull(),
    policy: jsonb("policy").notNull(),
    /**
     * Who made this the policy (0200). Never null: a revision nobody can be named
     * for is not a record of a decision.
     */
    actor: text("actor").notNull(),
    recordedAt: text("recorded_at").notNull(),
    note: text("note"),
  },
  (table) => [
    primaryKey({ columns: [table.policyId, table.revision] }),
    /**
     * The join `judgedUnder` is. Without it, resolving the fingerprint on a
     * disposition is a scan of every policy revision the deployment has ever
     * recorded — which is small today and is on the path of a screen that reads
     * it once per record on the page.
     */
    index("loom_policy_revisions_fingerprint_idx").on(table.policyId, table.fingerprint),
  ]
)
