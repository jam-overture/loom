import { and, asc, desc, eq, gt, lt } from "drizzle-orm"
import { z } from "zod"

import { treeIdSchema } from "../ids.js"
import { err, ok } from "../result.js"
import type { LoomDatabase } from "../store/database.js"

import { telemetryEventSchema } from "./event.js"
import {
  clampTelemetryLimit,
  cursorSeq,
  pageCursors,
  type RecordedTelemetry,
  type TelemetryError,
  type TelemetryJournal,
  type TelemetryPage,
  type TelemetryReadRequest,
} from "./journal.js"
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
  event: telemetryEventSchema,
})

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
    const from = cursorSeq(request?.cursor)
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
        ...pageCursors(page, direction, {
          beyond: rows.length > limit,
          resumed: from !== undefined,
        }),
      })
    } catch (cause) {
      return err(failure(cause, "could not read telemetry"))
    }
  },
})
