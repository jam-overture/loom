import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm"
import type { PgColumn } from "drizzle-orm/pg-core"
import { z } from "zod"

import { nodeIdSchema, treeIdSchema } from "../ids.js"
import { cursorPosition, pageEnds } from "../paging.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import { err, ok } from "../result.js"
import type { LoomDatabase } from "../store/database.js"

import {
  clampReaderSignalLimit,
  type ForgetOutcome,
  type ReaderSignalJournal,
  type ReaderSignalPage,
  type ReaderSignalReadRequest,
  type ReaderSignalStoreError,
  type ReceivedBatch,
} from "./journal.js"
import {
  readerRegionSchema,
  type ReaderRegionStore,
  type StoredRegionCount,
} from "./region.js"
import { readerSignalKindSchema, readerSignalSchema, viewKeySchema } from "./signal.js"
import { loomReaderFunnels, loomReaderRegions, loomReaderSignals, loomReaderTallies } from "./schema.js"
import type { ReaderTallyStore, StoredFunnel, StoredTally, TallyReadRequest } from "./tally.js"

export * from "./migrate.js"

/**
 * The Drizzle tables are **not** re-exported, unlike the journal's.
 *
 * A deployment needs the three factories below and `ensureReaderSignalsSchema`;
 * a `PgTableWithColumns` is how this file talks to the driver. Publishing the
 * three of them put about 7 KB of generated Drizzle type into the API
 * reference a reader downloads — for `loomReaderTallies` alone, a signature
 * naming all eleven columns and fourteen properties of each — and none of it
 * says anything a host can act on.
 */

/**
 * The buffer and the counters, backed by Postgres — the same database the store
 * uses (0022), reached the same way: plain SQL through Drizzle, never PostgREST.
 *
 * Rows are parsed on the way out, never cast, like every other boundary. It
 * matters more here than most: the buffer's `signals` column holds a document a
 * browser composed, and a batch written by an older parser must not reach a
 * rollup unvalidated.
 */

const failure = (cause: unknown, detail: string): ReaderSignalStoreError => ({
  code: "unavailable",
  detail: `${detail}: ${cause instanceof Error ? cause.message : String(cause)}`,
})

/**
 * A driver hands `timestamptz` back as a `Date` and everything above this
 * boundary speaks ISO strings. Accepting a string too means a driver configured
 * to return one is not a parse failure at 3am.
 */
const instantSchema = z
  .union([z.date(), z.string()])
  .transform((value) => (value instanceof Date ? value : new Date(value)))
  .refine((value) => Number.isFinite(value.getTime()), "is not an instant")
  .transform((value) => value.toISOString())

const receivedSchema = z.object({
  seq: z.number().int().nonnegative(),
  treeId: treeIdSchema,
  revision: z.number().int().nonnegative(),
  sentAt: z.number().int().nonnegative(),
  /** `null` in the column, absent on the batch — a buffer row a sender minted no key for. */
  view: viewKeySchema.nullable().transform((value) => value ?? undefined),
  signals: z.array(readerSignalSchema).min(1),
  receivedAt: instantSchema,
})

/**
 * `bigint` columns come back as strings from one driver and numbers from
 * another, and a counter that silently became `"12"` would concatenate on the
 * next read rather than add.
 */
const countSchema = z.coerce.number().int().nonnegative()

const storedTallySchema = z.object({
  treeId: treeIdSchema,
  revision: z.number().int().nonnegative(),
  nodeId: nodeIdSchema,
  type: primitiveTypeSchema,
  views: countSchema,
  reached: countSchema,
  engaged: countSchema,
  dwellMs: countSchema,
  activations: countSchema,
  opens: countSchema,
  closes: countSchema,
  completions: countSchema,
  updatedAt: instantSchema,
})

const storedFunnelSchema = z
  .object({
    treeId: treeIdSchema,
    revision: z.number().int().nonnegative(),
    fromNodeId: nodeIdSchema,
    fromKind: readerSignalKindSchema,
    toNodeId: nodeIdSchema,
    toKind: readerSignalKindSchema,
    reached: countSchema,
    converted: countSchema,
    updatedAt: instantSchema,
  })
  .transform(
    (row): StoredFunnel => ({
      treeId: row.treeId,
      revision: row.revision,
      pair: {
        from: { nodeId: row.fromNodeId, kind: row.fromKind },
        to: { nodeId: row.toNodeId, kind: row.toKind },
      },
      reached: row.reached,
      converted: row.converted,
      updatedAt: row.updatedAt,
    })
  )

export const postgresReaderSignalJournal = (db: LoomDatabase): ReaderSignalJournal => ({
  receive: async (batches) => {
    if (batches.length === 0) return ok(undefined)

    try {
      await db.insert(loomReaderSignals).values(
        batches.map((batch) => ({
          treeId: batch.treeId,
          revision: batch.revision,
          sentAt: batch.sentAt,
          view: batch.view ?? null,
          signals: batch.signals,
        }))
      )

      return ok(undefined)
    } catch (cause) {
      return err(failure(cause, `could not receive ${batches.length} reader signal batches`))
    }
  },

  read: async (request?: ReaderSignalReadRequest) => {
    const limit = clampReaderSignalLimit(request?.limit)
    const from = cursorPosition(request?.cursor)
    const direction = request?.direction ?? "newer"

    try {
      /** `older` scans descending so the newest page is one index seek, then rows go back in arrival order. */
      const rows = await db
        .select({
          seq: loomReaderSignals.seq,
          treeId: loomReaderSignals.treeId,
          revision: loomReaderSignals.revision,
          sentAt: loomReaderSignals.sentAt,
          view: loomReaderSignals.view,
          signals: loomReaderSignals.signals,
          receivedAt: loomReaderSignals.receivedAt,
        })
        .from(loomReaderSignals)
        .where(
          and(
            request?.treeId === undefined ? undefined : eq(loomReaderSignals.treeId, request.treeId),
            from === undefined
              ? undefined
              : direction === "older"
                ? lt(loomReaderSignals.seq, from)
                : gt(loomReaderSignals.seq, from)
          )
        )
        .orderBy(direction === "older" ? desc(loomReaderSignals.seq) : asc(loomReaderSignals.seq))
        /** One extra row answers "is there another page" without a count. */
        .limit(limit + 1)

      const taken = rows.slice(0, limit)
      const parsed = z
        .array(receivedSchema)
        .safeParse(direction === "older" ? taken.slice().reverse() : taken)

      if (!parsed.success) {
        return err<ReaderSignalStoreError>({
          code: "unavailable",
          detail: `a stored reader signal batch did not parse: ${
            parsed.error.issues[0]?.path.join(".") ?? "unknown"
          }`,
        })
      }

      const page = parsed.data as readonly ReceivedBatch[]

      return ok<ReaderSignalPage>({
        batches: page,
        ...pageEnds(page.map((batch) => batch.seq), direction, {
          beyond: rows.length > limit,
          resumed: from !== undefined,
        }),
      })
    } catch (cause) {
      return err(failure(cause, "could not read reader signals"))
    }
  },

  /** The count comes from the returned rows, because the two drivers report `rowCount` differently. */
  forget: async ({ before }) => {
    try {
      const removed = await db
        .delete(loomReaderSignals)
        .where(lt(loomReaderSignals.seq, before))
        .returning({ seq: loomReaderSignals.seq })

      return ok<ForgetOutcome>({ removed: removed.length })
    } catch (cause) {
      return err(failure(cause, `could not forget reader signals below ${before}`))
    }
  },
})

/** Every counter table is filtered the same way, on the two columns they all share. */
const within = (
  columns: { readonly treeId: PgColumn; readonly revision: PgColumn },
  request: TallyReadRequest | undefined
) =>
  and(
    request?.treeId === undefined ? undefined : eq(columns.treeId, request.treeId),
    request?.revision === undefined ? undefined : eq(columns.revision, request.revision)
  )

export const postgresReaderTallyStore = (db: LoomDatabase): ReaderTallyStore => ({
  /**
   * Two upserts in one transaction.
   *
   * `ON CONFLICT … DO UPDATE SET x = table.x + excluded.x` is what makes
   * applying a rollup additive in one statement rather than a read, an add and
   * a write with a race in the middle. Two rollups running at once is not
   * hypothetical — a scheduled one and a manual one is the ordinary way it
   * happens — and this is the version that is correct when they do.
   */
  apply: async ({ tallies, funnels }, at) => {
    if (tallies.length === 0 && funnels.length === 0) return ok(undefined)

    const updatedAt = new Date(at)

    try {
      await db.transaction(async (tx) => {
        if (tallies.length > 0) {
          await tx
            .insert(loomReaderTallies)
            .values(
              tallies.map((tally) => ({
                treeId: tally.treeId,
                revision: tally.revision,
                nodeId: tally.nodeId,
                type: tally.type,
                views: tally.views,
                reached: tally.reached,
                engaged: tally.engaged,
                dwellMs: tally.dwellMs,
                activations: tally.activations,
                opens: tally.opens,
                closes: tally.closes,
                completions: tally.completions,
                updatedAt,
              }))
            )
            .onConflictDoUpdate({
              target: [loomReaderTallies.treeId, loomReaderTallies.revision, loomReaderTallies.nodeId],
              set: {
                type: sql`excluded.type`,
                views: sql`${loomReaderTallies.views} + excluded.views`,
                reached: sql`${loomReaderTallies.reached} + excluded.reached`,
                engaged: sql`${loomReaderTallies.engaged} + excluded.engaged`,
                dwellMs: sql`${loomReaderTallies.dwellMs} + excluded.dwell_ms`,
                activations: sql`${loomReaderTallies.activations} + excluded.activations`,
                opens: sql`${loomReaderTallies.opens} + excluded.opens`,
                closes: sql`${loomReaderTallies.closes} + excluded.closes`,
                completions: sql`${loomReaderTallies.completions} + excluded.completions`,
                updatedAt,
              },
            })
        }

        if (funnels.length > 0) {
          await tx
            .insert(loomReaderFunnels)
            .values(
              funnels.map((answer) => ({
                treeId: answer.treeId,
                revision: answer.revision,
                fromNodeId: answer.pair.from.nodeId,
                fromKind: answer.pair.from.kind,
                toNodeId: answer.pair.to.nodeId,
                toKind: answer.pair.to.kind,
                reached: answer.reached,
                converted: answer.converted,
                updatedAt,
              }))
            )
            .onConflictDoUpdate({
              target: [
                loomReaderFunnels.treeId,
                loomReaderFunnels.revision,
                loomReaderFunnels.fromNodeId,
                loomReaderFunnels.fromKind,
                loomReaderFunnels.toNodeId,
                loomReaderFunnels.toKind,
              ],
              set: {
                reached: sql`${loomReaderFunnels.reached} + excluded.reached`,
                converted: sql`${loomReaderFunnels.converted} + excluded.converted`,
                updatedAt,
              },
            })
        }
      })

      return ok(undefined)
    } catch (cause) {
      return err(failure(cause, `could not apply ${tallies.length} tallies and ${funnels.length} funnels`))
    }
  },

  tallies: async (request?: TallyReadRequest) => {
    try {
      const rows = await db.select().from(loomReaderTallies).where(within(loomReaderTallies, request))
      const parsed = z.array(storedTallySchema).safeParse(rows)

      return parsed.success
        ? ok(parsed.data as readonly StoredTally[])
        : err<ReaderSignalStoreError>({
            code: "unavailable",
            detail: `a stored tally did not parse: ${parsed.error.issues[0]?.path.join(".") ?? "unknown"}`,
          })
    } catch (cause) {
      return err(failure(cause, "could not read reader tallies"))
    }
  },

  funnels: async (request?: TallyReadRequest) => {
    try {
      const rows = await db.select().from(loomReaderFunnels).where(within(loomReaderFunnels, request))
      const parsed = z.array(storedFunnelSchema).safeParse(rows)

      return parsed.success
        ? ok(parsed.data as readonly StoredFunnel[])
        : err<ReaderSignalStoreError>({
            code: "unavailable",
            detail: `a stored funnel did not parse: ${parsed.error.issues[0]?.path.join(".") ?? "unknown"}`,
          })
    } catch (cause) {
      return err(failure(cause, "could not read reader funnels"))
    }
  },
})

const storedRegionSchema = z.object({
  treeId: treeIdSchema,
  revision: z.number().int().nonnegative(),
  /**
   * Parsed on the way out like every other column, which here is a closed set
   * of two-letter codes and one word. A row holding anything else was not
   * written by this runtime, and reading it as a region would put it on a screen.
   */
  region: readerRegionSchema,
  views: countSchema,
  updatedAt: instantSchema,
})

export const postgresReaderRegionStore = (db: LoomDatabase): ReaderRegionStore => ({
  /**
   * One upsert, additive in the statement, for the reason the tallies are: this
   * runs on the request path and two deliveries arriving together is the
   * ordinary case rather than the unlucky one.
   */
  count: async (counts, at) => {
    if (counts.length === 0) return ok(undefined)

    const updatedAt = new Date(at)

    try {
      await db
        .insert(loomReaderRegions)
        .values(
          counts.map((count) => ({
            treeId: count.treeId,
            revision: count.revision,
            region: count.region,
            views: count.views,
            updatedAt,
          }))
        )
        .onConflictDoUpdate({
          target: [loomReaderRegions.treeId, loomReaderRegions.revision, loomReaderRegions.region],
          set: {
            views: sql`${loomReaderRegions.views} + excluded.views`,
            updatedAt,
          },
        })

      return ok(undefined)
    } catch (cause) {
      return err(failure(cause, `could not count ${counts.length} reader regions`))
    }
  },

  regions: async (request?: TallyReadRequest) => {
    try {
      const rows = await db.select().from(loomReaderRegions).where(within(loomReaderRegions, request))
      const parsed = z.array(storedRegionSchema).safeParse(rows)

      return parsed.success
        ? ok(parsed.data as readonly StoredRegionCount[])
        : err<ReaderSignalStoreError>({
            code: "unavailable",
            detail: `a stored region did not parse: ${parsed.error.issues[0]?.path.join(".") ?? "unknown"}`,
          })
    } catch (cause) {
      return err(failure(cause, "could not read reader regions"))
    }
  },
})
