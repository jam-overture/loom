import { sql } from "drizzle-orm"
import { bigserial, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core"

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
  (table) => [index("loom_telemetry_tree_seq_idx").on(table.treeId, table.seq)]
)
