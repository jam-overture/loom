import { sql } from "drizzle-orm"
import { bigserial, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"

/**
 * The table the telemetry journal is stored in, as Drizzle sees it.
 *
 * The column choices here are the ones the journal's promises rest on — arrival
 * order, and one copy of every fact.
 */

/**
 * One table, because a journal is one thing: an append-only list of what the
 * runtime narrated.
 *
 * `seq` is a `bigserial` rather than a timestamp because arrival order is the
 * only order that pages correctly — two serverless instances disagree about the
 * clock by more than the gap between two events in one request.
 *
 * `event` is the whole narrowed event as JSON, and its type and its proposal id
 * are *not* also columns. They would be a second copy of a fact that already
 * lives in the document, and two copies of a fact are two things that can
 * disagree. An index on a JSON path is available the day a query needs one; a
 * duplicated column is a migration away from being wrong.
 */
export const loomTelemetry = pgTable(
  "loom_telemetry",
  {
    seq: bigserial("seq", { mode: "number" }).primaryKey(),
    treeId: text("tree_id").notNull(),
    /** When the runtime said it happened, which is not when the row was written. */
    occurredAt: text("occurred_at").notNull(),
    event: jsonb("event").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index("loom_telemetry_tree_seq_idx").on(table.treeId, table.seq),
    /**
     * The JSON-path index the comment above promised, partial on the one event
     * type that carries an assessment. `assessments` on the journal looks a set
     * of proposals up by this path; without it that is a sequential scan of
     * every record the deployment has ever narrated.
     *
     * Partial rather than whole because the predicate is the discriminant: only
     * `change-assessed` records have the path at all, and an index over the rest
     * would be an entry per row holding nothing.
     */
    index("loom_telemetry_assessed_proposal_idx")
      .on(sql`(${table.event} -> 'assessment' ->> 'proposalId')`)
      .where(sql`${table.event} ->> 'type' = 'change-assessed'`),
  ]
)
