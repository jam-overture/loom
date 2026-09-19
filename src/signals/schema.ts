import { sql } from "drizzle-orm"
import {
  bigint,
  bigserial,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

/**
 * Three tables: the buffer batches wait in, and the two counters that outlive
 * them.
 *
 * The split is 0146's — raw signals are short-lived and aggregates are durable
 * — and it is in the schema rather than in a policy because a single table
 * would make the retention rule a `DELETE` somebody has to remember to write
 * correctly forever.
 */

/**
 * The buffer.
 *
 * `signals` is the array as JSON rather than a row per signal. A batch is
 * written once, read once by rollup, and then deleted; nothing ever queries
 * inside it, so a signals table would be ten rows of overhead per batch to
 * support a query that does not exist. If one ever does, rollup is where it
 * goes, because rollup is what reads these.
 *
 * `view` is a column rather than part of the JSON because retention has to be
 * able to see it go: dropping the raw window is the mechanism by which the view
 * key expires, and a value inside a document is one nobody can see leaving.
 */
export const loomReaderSignals = pgTable(
  "loom_reader_signals",
  {
    seq: bigserial("seq", { mode: "number" }).primaryKey(),
    treeId: text("tree_id").notNull(),
    revision: integer("revision").notNull(),
    /** What the page said the time was, which is a number a page said. */
    sentAt: bigint("sent_at", { mode: "number" }).notNull(),
    view: text("view"),
    signals: jsonb("signals").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [index("loom_reader_signals_tree_seq_idx").on(table.treeId, table.seq)]
)

/**
 * One node at one revision, summed.
 *
 * The key is the three columns rather than a surrogate, because the row *is*
 * the key: applying a rollup adds to the row that exists or creates it, and a
 * surrogate id would mean a lookup before every one of those.
 */
export const loomReaderTallies = pgTable(
  "loom_reader_tallies",
  {
    treeId: text("tree_id").notNull(),
    revision: integer("revision").notNull(),
    nodeId: text("node_id").notNull(),
    type: text("type").notNull(),
    views: bigint("views", { mode: "number" }).notNull(),
    reached: bigint("reached", { mode: "number" }).notNull(),
    /**
     * Added after the other counters, so it carries a default the others do not
     * need: a deployment that created this table before the column existed has
     * rows that predate the question, and `0` is the honest answer for them.
     */
    engaged: bigint("engaged", { mode: "number" }).notNull().default(0),
    dwellMs: bigint("dwell_ms", { mode: "number" }).notNull(),
    activations: bigint("activations", { mode: "number" }).notNull(),
    opens: bigint("opens", { mode: "number" }).notNull(),
    closes: bigint("closes", { mode: "number" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.treeId, table.revision, table.nodeId] })]
)

/**
 * One funnel pair at one revision.
 *
 * The two ends are four columns rather than a reference to a configured pair,
 * so a deployment that stops asking a question keeps the answers it already
 * has instead of orphaning them.
 */
export const loomReaderFunnels = pgTable(
  "loom_reader_funnels",
  {
    treeId: text("tree_id").notNull(),
    revision: integer("revision").notNull(),
    fromNodeId: text("from_node_id").notNull(),
    fromKind: text("from_kind").notNull(),
    toNodeId: text("to_node_id").notNull(),
    toKind: text("to_kind").notNull(),
    reached: bigint("reached", { mode: "number" }).notNull(),
    converted: bigint("converted", { mode: "number" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [
        table.treeId,
        table.revision,
        table.fromNodeId,
        table.fromKind,
        table.toNodeId,
        table.toKind,
      ],
    }),
  ]
)
