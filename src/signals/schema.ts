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
 * Six tables: the buffer batches wait in, and the five counters that outlive
 * them.
 *
 * The split is 0146's — raw signals are short-lived and aggregates are durable
 * — and it is in the schema rather than in a policy because a single table
 * would make the retention rule a `DELETE` somebody has to remember to write
 * correctly forever.
 *
 * All six carry `application_id` (0269), led by it in every key and every
 * index, on the same terms as the store's four: a reader is filed against the
 * application whose page they read, and no reading here spans two.
 *
 * All six then carry `audience_id` immediately after it
 * ([0284](../../decisions/0284-a-signal-names-the-audience-it-was-collected-under-and-the-predicate-stays-in-the-control-plane.md)),
 * which is the second of the two migrations
 * [0273](../../decisions/0273-the-reader-tables-take-the-application-now-and-the-audience-when-it-is-ratified.md)
 * chose to take rather than wait for. The two dimensions differ in kind, and
 * the difference is why one is a handle's scope and the other is a column: no
 * reading spans two applications, where comparing two audiences is the whole
 * point of serving two.
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
    /**
     * The application the reading belongs to (0269). First in the key and in
     * every index, as it is on the store's tables, because every read of this
     * table is already inside one application.
     *
     * Defaulted so a database written before applications existed keeps
     * answering, and so that every rollup, door and screen that names no
     * application goes on meaning what it meant. `DEFAULT_APPLICATION_ID` is
     * the value, spelled out because DDL cannot import it — `scoped.test.ts`
     * holds the two together.
     */
    applicationId: text("application_id").notNull().default("app_default"),
    /**
     * The audience this batch's reader was served under (0284). Second in the
     * key and in every index, immediately after the application.
     *
     * Defaulted for the same reason the application is, and to the same effect:
     * a batch that names no audience, and every row written before the
     * dimension existed, reads as `aud_everyone` — the audience that matches
     * every reader. `DEFAULT_AUDIENCE_ID` is the value, spelled out because DDL
     * cannot import it; `scoped.test.ts` holds the two together.
     *
     * Opaque. What an `aud_` means is the control plane's to say, and no column
     * here holds the predicate that selected it.
     */
    audienceId: text("audience_id").notNull().default("aud_everyone"),
    treeId: text("tree_id").notNull(),
    revision: integer("revision").notNull(),
    /** What the page said the time was, which is a number a page said. */
    sentAt: bigint("sent_at", { mode: "number" }).notNull(),
    view: text("view"),
    signals: jsonb("signals").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    /**
     * When a fold counted this delivery into the counters (0351).
     *
     * Nullable and undefaulted, and null is a state rather than a gap: *not yet
     * counted*. It is the only column on this table a second statement ever
     * writes, and the only writer is the collection run — which is why the
     * `UPDATE` that sets it carries `folded_at IS NULL`, so a repeat of that
     * statement cannot move an instant a reading has been taken against.
     *
     * A row written before the column existed reads as uncounted, which is
     * conservative in the one direction that matters: retention will not delete
     * what nothing says was counted, so the first fold after the migration
     * stamps it and the second sweep takes it.
     */
    foldedAt: timestamp("folded_at", { withTimezone: true }),
  },
  (table) => [
    /**
     * Unchanged by the audience dimension, which is not the shape the
     * application took (0284).
     *
     * The index was widened to lead with the application because every read of
     * the buffer is inside one (0273), so it belongs in the prefix. Nothing reads the
     * buffer by audience: a rollup folds a whole window and groups by the
     * column, so putting the audience second here would displace `tree_id` and
     * `seq` from the prefix and make every read that exists scan wider, to
     * serve a filter no caller expresses.
     */
    index("loom_reader_signals_tree_seq_idx").on(table.applicationId, table.treeId, table.seq),
    /**
     * The oldest end of the whole application, which both sweeps start from
     * (0351).
     *
     * It did not exist while the table held an hour of deliveries, because a
     * scan of an hour is cheap however it is served. The kept window makes it
     * thirty days by default and invites a deployment to lengthen it, so the
     * two reads that run from the oldest end across every tree — the fold's
     * scan and retention's — are the two reads whose cost would have grown with
     * the setting.
     */
    index("loom_reader_signals_seq_idx").on(table.applicationId, table.seq),
  ]
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
    /** See `loomReaderSignals.applicationId`. */
    applicationId: text("application_id").notNull().default("app_default"),
    /** See `loomReaderSignals.audienceId`. In the key here, unlike the buffer's. */
    audienceId: text("audience_id").notNull().default("aud_everyone"),
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
    /**
     * Added with the fifth kind, and defaulted for the same reason `engaged`
     * is: a deployment whose table predates the question has rows for which
     * `0` is the true answer, not a missing one.
     */
    completions: bigint("completions", { mode: "number" }).notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [
        table.applicationId,
        table.audienceId,
        table.treeId,
        table.revision,
        table.nodeId,
      ],
    }),
  ]
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
    /** See `loomReaderSignals.applicationId`. */
    applicationId: text("application_id").notNull().default("app_default"),
    /** See `loomReaderSignals.audienceId`. In the key here, unlike the buffer's. */
    audienceId: text("audience_id").notNull().default("aud_everyone"),
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
        table.applicationId,
        table.audienceId,
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

/**
 * One region at one revision, as page views that began there.
 *
 * The narrowest table in the subsystem, and the narrowness is the point: a tree,
 * a revision, a country and a number. There is no view key, no address, no
 * digest of one and no per-arrival row, so there is nothing here to join against
 * — which is what makes a region safe to keep for as long as the counters it
 * sits beside.
 *
 * Written on the request path rather than by a rollup, because the request is
 * the only place the region was ever knowable, and `views` counts openings so
 * that a long visit is not a large number.
 */
export const loomReaderRegions = pgTable(
  "loom_reader_regions",
  {
    /** See `loomReaderSignals.applicationId`. */
    applicationId: text("application_id").notNull().default("app_default"),
    /** See `loomReaderSignals.audienceId`. In the key here, unlike the buffer's. */
    audienceId: text("audience_id").notNull().default("aud_everyone"),
    treeId: text("tree_id").notNull(),
    revision: integer("revision").notNull(),
    /** A country code, or the word for not knowing. A closed set, so this column cannot be written freely. */
    region: text("region").notNull(),
    views: bigint("views", { mode: "number" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({
      columns: [table.applicationId, table.audienceId, table.treeId, table.revision, table.region],
    })]
)

/**
 * One revision's page views, counted from both ends.
 *
 * Two columns rather than two tables, because they are two counts of the same
 * page views and the only question anybody asks of them is their difference:
 * `opened` is written at the door, once per page view that began, and
 * `appearances` by each rollup that saw that page view in its window. Keeping
 * them in one row makes the subtraction a column expression instead of a join,
 * and makes it impossible for a reading to find one and not the other.
 *
 * Both default to nought because either side may create the row, and nought is
 * the true answer for the column that has not been written yet rather than a
 * missing one.
 *
 * As narrow as the regions table and for the same reason: a tree, a revision
 * and two numbers. No view key, no region, nothing per arrival, nothing to join.
 */
export const loomReaderPageViews = pgTable(
  "loom_reader_page_views",
  {
    /** See `loomReaderSignals.applicationId`. */
    applicationId: text("application_id").notNull().default("app_default"),
    /** See `loomReaderSignals.audienceId`. In the key here, unlike the buffer's. */
    audienceId: text("audience_id").notNull().default("aud_everyone"),
    treeId: text("tree_id").notNull(),
    revision: integer("revision").notNull(),
    /** Page views that began. Counted once, at the door, never recounted. */
    opened: bigint("opened", { mode: "number" }).notNull().default(0),
    /** The same page views, once per rollup window each appeared in (0147). */
    appearances: bigint("appearances", { mode: "number" }).notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    /**
     * When a rollup last folded a window holding page views of this revision.
     *
     * The one column in this subsystem written by exactly one of a row's two
     * writers, and that is its whole purpose: `updated_at` moves on every
     * delivery the door counts *and* on every fold, so a deployment whose
     * rollup has stopped keeps a fresh timestamp on a row whose appearances
     * never move again. This one moves only when something folded.
     *
     * Nullable and undefaulted, which is the honest value for a row nothing
     * has folded yet and for a row written before this column existed — those
     * two are the same state, *nothing attests a fold*, and no fault is raised
     * from it.
     */
    foldedAt: timestamp("folded_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({
      columns: [table.applicationId, table.audienceId, table.treeId, table.revision],
    }),
  ]
)

/**
 * Page views that began, by the hour they began in.
 *
 * **The sixth table, and the first in this subsystem with a clock in its
 * key** — the seventh, what readers did by hour, is the other. Everything else
 * here is either timeless — a tally, a funnel answer, a
 * region bucket and a page-view total say *so far* and nothing about when — or
 * short-lived, which is the buffer. `docs/portal-wireframes.md` asks for a
 * range picker and a chart of page views by hour, and neither is answerable
 * from a counter with no time in it or from a capped scan of the deliveries
 * (`arrivals.ts`, which says why at length).
 *
 * It is written by the door, in the same transaction as the page-view total it
 * slices, from the same openings — so the hours of a revision sum to its
 * `opened` for every arrival counted after this table existed, and the two can
 * never disagree about how many readers arrived.
 *
 * Keyed like every other counter — the application, the audience, the tree and
 * the revision — with the hour last, so a reading for one page is a prefix scan
 * and a reading for the deployment is the second index below.
 */
export const loomReaderArrivals = pgTable(
  "loom_reader_arrivals",
  {
    /** See `loomReaderSignals.applicationId`. */
    applicationId: text("application_id").notNull().default("app_default"),
    /** See `loomReaderSignals.audienceId`. In the key here, as it is on the other counters. */
    audienceId: text("audience_id").notNull().default("aud_everyone"),
    treeId: text("tree_id").notNull(),
    revision: integer("revision").notNull(),
    /**
     * The hour, as the instant it began, in UTC.
     *
     * A `timestamptz` rather than a number of hours since an epoch, so that a
     * range is a `BETWEEN` an operator can read and a bucket is an instant
     * every other column in this schema is comparable with. The truncation is
     * the writer's, not the column's: nothing here constrains it to the hour,
     * and `arrivals.ts` is the one place the unit is decided.
     */
    hour: timestamp("hour", { withTimezone: true }).notNull(),
    /** Page views that began in this hour. Counted once, at the door, never recounted. */
    views: bigint("views", { mode: "number" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.applicationId, table.audienceId, table.treeId, table.revision, table.hour],
    }),
    /**
     * Every tree of one application, by hour, which is the deployment-wide
     * chart and the only read here whose cost grows with the range.
     *
     * The primary key serves a reading of one page, because that read names the
     * tree and the revision; a reading over the whole deployment names neither,
     * and without this it would scan every row of every page to find a month.
     */
    index("loom_reader_arrivals_hour_idx").on(table.applicationId, table.hour),
  ]
)

/**
 * What readers did to a part, by the hour they did it in.
 *
 * **The seventh table, and the second with a clock in its key.** Page views by
 * hour (0356) let the portal draw a range picker and one chart; every other
 * question on that screen — a goal's figure for the range, each goal's trend,
 * the `By page` drawer's bars for what readers did — needs the *parts* counted
 * by hour, and a tally keeps no time (`acted.ts`, which says why at length).
 *
 * **It holds the three delegated kinds and no others**, which is the whole of
 * what keeps it affordable: `activations`, `opens`, `closes` and `completions`
 * are things a reader aimed at something to cause (0167), so a row exists only
 * where a reader did something. The distinct counters are not here because
 * distinctness does not add across hours and the honest hourly denominator is
 * the door's own arrivals; `dwell_ms` is not here because a `dwelled` signal is
 * observed for every part that comes into view, so slicing it by hour would be
 * thousands of rows an hour on one large page, for ever, in a table nothing
 * sweeps.
 *
 * It is written by the fold, in the same transaction as the tallies it slices
 * and from the same pass over the window — so a part's hours sum to the part's
 * own counters for every window folded since this table existed.
 *
 * Keyed like the tallies with the hour last, so a reading of one part over a
 * range is a prefix scan.
 */
export const loomReaderActedHours = pgTable(
  "loom_reader_acted_hours",
  {
    /** See `loomReaderSignals.applicationId`. */
    applicationId: text("application_id").notNull().default("app_default"),
    /** See `loomReaderSignals.audienceId`. In the key here, as it is on the other counters. */
    audienceId: text("audience_id").notNull().default("aud_everyone"),
    treeId: text("tree_id").notNull(),
    revision: integer("revision").notNull(),
    nodeId: text("node_id").notNull(),
    /**
     * The hour, as the instant it began, in UTC — a `timestamptz` for the
     * reasons `loomReaderArrivals.hour` gives, and truncated by the writer
     * rather than by the column, because `arrivals.ts` is the one place the
     * unit is decided.
     */
    hour: timestamp("hour", { withTimezone: true }).notNull(),
    /** What the part is, as the latest signal about it said. Not in the key, as on a tally. */
    type: text("type").notNull(),
    activations: bigint("activations", { mode: "number" }).notNull().default(0),
    opens: bigint("opens", { mode: "number" }).notNull().default(0),
    closes: bigint("closes", { mode: "number" }).notNull().default(0),
    completions: bigint("completions", { mode: "number" }).notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [
        table.applicationId,
        table.audienceId,
        table.treeId,
        table.revision,
        table.nodeId,
        table.hour,
      ],
    }),
    /**
     * **One part of one page over a range**, which is a goal's series and the
     * commonest read here.
     *
     * The primary key cannot serve it: a goal sums every revision a part has
     * had and reads every audience unless it is comparing two, so a read naming
     * the tree and the part names neither of the two columns that sit between
     * them in the key.
     */
    index("loom_reader_acted_part_idx").on(
      table.applicationId,
      table.treeId,
      table.nodeId,
      table.hour
    ),
    /**
     * **Every part of one application, by hour**, which is the deployment-wide
     * reading and the only one here whose cost grows with the range.
     */
    index("loom_reader_acted_hour_idx").on(table.applicationId, table.hour),
  ]
)
