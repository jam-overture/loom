import { and, asc, desc, eq, gt, inArray, lt, sql } from "drizzle-orm"
import { z } from "zod"

import { treeIdSchema } from "../ids.js"
import { cursorPosition, pageEnds } from "../paging.js"
import { err, ok } from "../result.js"
import type { LoomDatabase } from "../store/database.js"

import { assessmentSummarySchema, telemetryEventSchema, type AssessmentSummary } from "./event.js"
import {
  clampTelemetryLimit,
  type AssessmentLookup,
  type AssessmentLookupResult,
  type ForgetOutcome,
  type RecordedTelemetry,
  type TelemetryError,
  type TelemetryJournal,
  type TelemetryPage,
  type TelemetryReadRequest,
} from "./journal.js"
import { splitLookup } from "./lookup.js"
import { loomTelemetry } from "./schema.js"

export * from "./migrate.js"
export * from "./schema.js"

/**
 * The journal, backed by Postgres — the same database the store uses (0022),
 * and the same rule about how it is reached: plain SQL through Drizzle, never
 * PostgREST.
 *
 * The write is one multi-row insert rather than a transaction. A batch that
 * lands partially would be worse than one that fails, and a single statement is
 * already atomic in Postgres, so the guarantee comes free — there is no second
 * table to keep in step, which is the whole reason the store needed a
 * transaction and this does not.
 */

/**
 * Rows are parsed on the way out, never cast. A record written months ago by an
 * older narrowing must not reach a fold unvalidated; the journal is a boundary
 * like any other, and the one where data most reliably outlives its code.
 */
const recordedSchema = z.object({
  seq: z.number().int().nonnegative(),
  treeId: treeIdSchema,
  occurredAt: z.string().datetime(),
  /**
   * A driver hands back `timestamptz` as a `Date`, and everything above this
   * boundary speaks ISO strings. Normalising here rather than at each reader
   * keeps "an instant is a string" true for the whole codebase; accepting a
   * string as well means a driver configured to return one is not a parse
   * failure at 3am.
   */
  recordedAt: z
    .union([z.date(), z.string()])
    .transform((value) => (value instanceof Date ? value : new Date(value)))
    .refine((value) => Number.isFinite(value.getTime()), "recorded_at is not an instant")
    .transform((value) => value.toISOString()),
  event: telemetryEventSchema,
})

/**
 * The three JSON paths the assessment lookup reads, named once.
 *
 * `event` is one document and its type is not also a column, which 0022's table
 * comment argued for and this is the first query to pay for: the discriminant
 * has to be read out of the JSON rather than compared against a column. That is
 * the trade the comment described — an index on a path, available the day a
 * query needs one — and not a duplicated column that can disagree.
 */
const ASSESSED_TYPE = sql<string>`${loomTelemetry.event} ->> 'type'`
const ASSESSED_PROPOSAL_ID = sql<string>`${loomTelemetry.event} -> 'assessment' ->> 'proposalId'`
const ASSESSMENT = sql<unknown>`${loomTelemetry.event} -> 'assessment'`

const failure = (cause: unknown, detail: string): TelemetryError => ({
  code: "unavailable",
  detail: `${detail}: ${cause instanceof Error ? cause.message : String(cause)}`,
})

export const postgresTelemetryJournal = (db: LoomDatabase): TelemetryJournal => ({
  record: async (batch) => {
    if (batch.length === 0) return ok(undefined)

    try {
      await db.insert(loomTelemetry).values(
        batch.map((entry) => ({
          treeId: entry.treeId,
          occurredAt: entry.occurredAt,
          event: entry.event,
        }))
      )

      return ok(undefined)
    } catch (cause) {
      return err(failure(cause, `could not record ${batch.length} telemetry events`))
    }
  },

  read: async (request?: TelemetryReadRequest) => {
    const limit = clampTelemetryLimit(request?.limit)
    const from = cursorPosition(request?.cursor)
    const direction = request?.direction ?? "newer"

    try {
      /**
       * `older` scans descending so the newest page costs one index seek rather
       * than a walk from the start of the journal, then the rows are put back in
       * arrival order — the contract's promise that a page's order never depends
       * on which end it came from.
       */
      const rows = await db
        .select({
          seq: loomTelemetry.seq,
          treeId: loomTelemetry.treeId,
          occurredAt: loomTelemetry.occurredAt,
          recordedAt: loomTelemetry.recordedAt,
          event: loomTelemetry.event,
        })
        .from(loomTelemetry)
        .where(
          and(
            request?.treeId === undefined ? undefined : eq(loomTelemetry.treeId, request.treeId),
            from === undefined
              ? undefined
              : direction === "older"
                ? lt(loomTelemetry.seq, from)
                : gt(loomTelemetry.seq, from)
          )
        )
        .orderBy(direction === "older" ? desc(loomTelemetry.seq) : asc(loomTelemetry.seq))
        /** One extra row answers "is there another page" without a count. */
        .limit(limit + 1)

      const taken = rows.slice(0, limit)
      const parsed = z
        .array(recordedSchema)
        .safeParse(direction === "older" ? taken.slice().reverse() : taken)

      if (!parsed.success) {
        return err<TelemetryError>({
          code: "unavailable",
          detail: `a stored telemetry record did not parse: ${
            parsed.error.issues[0]?.path.join(".") ?? "unknown"
          }`,
        })
      }

      const page = parsed.data as readonly RecordedTelemetry[]

      return ok<TelemetryPage>({
        records: page,
        ...pageEnds(page.map((record) => record.seq), direction, {
          beyond: rows.length > limit,
          resumed: from !== undefined,
        }),
      })
    } catch (cause) {
      return err(failure(cause, "could not read telemetry"))
    }
  },

  /**
   * One statement, one row per proposal, and the index the table's own comment
   * said would arrive the day a query needed it.
   *
   * `DISTINCT ON` is what makes this bounded by construction rather than by a
   * limit: the row count *is* the number of ids asked about, whatever the
   * journal holds, so a proposal narrated twice cannot widen the read. Ordering
   * by `seq DESC` within each id picks the latest assessment, which is the same
   * answer the in-memory journal folds its way to.
   *
   * The two JSON paths are the shape of a `change-assessed` record and nothing
   * else, which is why the index below them is partial: the predicate is the
   * discriminant, so the index holds one entry per assessed proposal rather than
   * one per row of a journal that is mostly other event types.
   */
  assessments: async ({ proposalIds, treeId }: AssessmentLookup) => {
    const { asked, unasked } = splitLookup(proposalIds)

    if (asked.length === 0) {
      return ok<AssessmentLookupResult>({ assessments: new Map(), unasked })
    }

    try {
      const rows = await db
        .selectDistinctOn([ASSESSED_PROPOSAL_ID], { assessment: ASSESSMENT })
        .from(loomTelemetry)
        .where(
          and(
            eq(ASSESSED_TYPE, "change-assessed"),
            inArray(ASSESSED_PROPOSAL_ID, asked),
            treeId === undefined ? undefined : eq(loomTelemetry.treeId, treeId)
          )
        )
        .orderBy(ASSESSED_PROPOSAL_ID, desc(loomTelemetry.seq))

      const parsed = z.array(assessmentSummarySchema).safeParse(rows.map((row) => row.assessment))

      if (!parsed.success) {
        return err<TelemetryError>({
          code: "unavailable",
          detail: `a stored assessment did not parse: ${
            parsed.error.issues[0]?.path.join(".") ?? "unknown"
          }`,
        })
      }

      const assessments = parsed.data as readonly AssessmentSummary[]

      return ok<AssessmentLookupResult>({
        assessments: new Map(assessments.map((assessment) => [assessment.proposalId, assessment])),
        unasked,
      })
    } catch (cause) {
      return err(failure(cause, `could not look up ${asked.length} assessments`))
    }
  },

  /**
   * One statement, and the count comes from the rows it returns rather than
   * from a driver-specific `rowCount` field — the two drivers this runs on
   * report that differently, and a number that means something else under
   * PGlite than under postgres.js is worse than no number.
   *
   * Returning only `seq` keeps the payload to one integer per row, and the
   * caller has already bounded how many rows there can be: `applyRetention`
   * derives `before` from a scan it capped itself.
   */
  forget: async ({ before }) => {
    try {
      const removed = await db
        .delete(loomTelemetry)
        .where(lt(loomTelemetry.seq, before))
        .returning({ seq: loomTelemetry.seq })

      return ok<ForgetOutcome>({ removed: removed.length })
    } catch (cause) {
      return err(failure(cause, `could not forget telemetry below ${before}`))
    }
  },
})
