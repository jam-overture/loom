import { eq, sql } from "drizzle-orm"
import { bigint, pgTable, primaryKey, text } from "drizzle-orm/pg-core"

import { err, ok } from "@jam-overture/loom"
import type { LoomDatabase } from "@jam-overture/loom/postgres"
import type { ApplicationId } from "@jam-overture/loom/store"

import {
  inReasonOrder,
  REFUSAL_REASONS,
  type RefusalCounter,
  type RefusalReason,
  type RefusalStoreError,
} from "./refusals"

/**
 * The refusals, on the handle the keys and the buffer already use. The
 * deployment's table rather than the runtime's, for `keys-postgres.ts`'s
 * reason: why a host turned a sender away is the host's business.
 *
 * One row per application and reason, so the table grows with projects and
 * never with traffic: a stranger holding a project's public key (0298) can
 * move a number on its screen and cannot make the table longer.
 */
export const loomReaderRefusals = pgTable(
  "loom_reader_refusals",
  {
    applicationId: text("application_id").notNull(),
    reason: text("reason").notNull(),
    refused: bigint("refused", { mode: "number" }).notNull(),
    lastAt: bigint("last_at", { mode: "number" }).notNull(),
    lastOrigin: text("last_origin"),
  },
  (table) => [primaryKey({ columns: [table.applicationId, table.reason] })]
)

export const READER_REFUSALS_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS loom_reader_refusals (
    application_id text NOT NULL,
    reason text NOT NULL,
    refused bigint NOT NULL,
    last_at bigint NOT NULL,
    last_origin text,
    PRIMARY KEY (application_id, reason)
  )`,
  `ALTER TABLE loom_reader_refusals ENABLE ROW LEVEL SECURITY`,
]

export const ensureReaderRefusalsSchema = async (db: LoomDatabase): Promise<void> => {
  for (const statement of READER_REFUSALS_DDL) {
    await db.execute(sql.raw(statement))
  }
}

const failure = (cause: unknown, detail: string): RefusalStoreError => ({
  code: "unavailable",
  detail: `${detail}: ${cause instanceof Error ? cause.message : String(cause)}`,
})

const isReason = (value: string): value is RefusalReason =>
  (REFUSAL_REASONS as readonly string[]).includes(value)

export const postgresRefusalCounter = (
  db: LoomDatabase,
  scope: { readonly application: ApplicationId }
): RefusalCounter => ({
  record: async (reason, origin, at) => {
    try {
      await db
        .insert(loomReaderRefusals)
        .values({
          applicationId: scope.application,
          reason,
          refused: 1,
          lastAt: at,
          lastOrigin: origin,
        })
        /**
         * One statement, so two refusals landing at once both count. The newest
         * wins the time and the origin, so a delivery that arrives late cannot
         * move either back.
         */
        .onConflictDoUpdate({
          target: [loomReaderRefusals.applicationId, loomReaderRefusals.reason],
          set: {
            refused: sql`${loomReaderRefusals.refused} + 1`,
            lastOrigin: sql`CASE WHEN excluded.last_at >= ${loomReaderRefusals.lastAt} THEN excluded.last_origin ELSE ${loomReaderRefusals.lastOrigin} END`,
            lastAt: sql`GREATEST(${loomReaderRefusals.lastAt}, excluded.last_at)`,
          },
        })

      return ok(undefined)
    } catch (cause) {
      return err(failure(cause, `could not count a refusal for ${scope.application}`))
    }
  },

  read: async () => {
    try {
      const rows = await db
        .select()
        .from(loomReaderRefusals)
        .where(eq(loomReaderRefusals.applicationId, scope.application))

      return ok(
        inReasonOrder(
          rows.flatMap((row) =>
            isReason(row.reason)
              ? [
                  {
                    reason: row.reason,
                    refused: row.refused,
                    lastAt: row.lastAt,
                    lastOrigin: row.lastOrigin,
                  },
                ]
              : []
          )
        )
      )
    } catch (cause) {
      return err(failure(cause, `could not read the refusals for ${scope.application}`))
    }
  },
})
