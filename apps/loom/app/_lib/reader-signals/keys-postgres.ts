import { eq, sql } from "drizzle-orm"
import { bigint, pgTable, text } from "drizzle-orm/pg-core"

import { err, ok } from "@jam-overture/loom"
import type { LoomDatabase } from "@jam-overture/loom/postgres"
import { applicationIdSchema } from "@jam-overture/loom/store"

import { ingestKeySchema, type IngestKeyStore, type IngestKeyStoreError } from "./keys"

/**
 * The keys, on the handle the buffer and the store already use.
 *
 * The deployment's table rather than the runtime's, on the terms the accounts
 * took (0018): the runtime's door, `ingestReaderSignals`, is handed a journal
 * and never asks how a host decided whose it was. A credentials table shipped
 * from `@jam-overture/loom` would be the framework deciding how its consumers
 * authenticate their senders.
 *
 * `created_at` is milliseconds in a `bigint`, for `accounts-postgres.ts`'s
 * reason.
 */
export const loomIngestKeys = pgTable("loom_ingest_keys", {
  applicationId: text("application_id").primaryKey(),
  /** The key itself, not a digest: it is printed in every page that sends one (0298). */
  key: text("key").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
})

/** One statement per entry, for the reason the store's and the journal's DDL is a list. */
export const INGEST_KEYS_DDL: readonly string[] = [
  /** Keyed by the application, which is what makes it one key each (0296 clause 4). */
  `CREATE TABLE IF NOT EXISTS loom_ingest_keys (
    application_id text PRIMARY KEY,
    key text NOT NULL,
    created_at bigint NOT NULL
  )`,
  /**
   * The lookup the door performs on every delivery. Unique rather than merely
   * indexed, because one key naming two applications is the mixing this table
   * exists to prevent — it cannot happen while keys are minted, and would be
   * unresolvable if it ever did.
   */
  `CREATE UNIQUE INDEX IF NOT EXISTS loom_ingest_keys_key_idx ON loom_ingest_keys (key)`,
  `ALTER TABLE loom_ingest_keys ENABLE ROW LEVEL SECURITY`,
]

export const ensureIngestKeysSchema = async (db: LoomDatabase): Promise<void> => {
  for (const statement of INGEST_KEYS_DDL) {
    await db.execute(sql.raw(statement))
  }
}

const failure = (cause: unknown, detail: string): IngestKeyStoreError => ({
  code: "unavailable",
  detail: `${detail}: ${cause instanceof Error ? cause.message : String(cause)}`,
})

export const postgresIngestKeyStore = (db: LoomDatabase): IngestKeyStore => ({
  applicationWithKey: async (key) => {
    try {
      const [row] = await db
        .select({ applicationId: loomIngestKeys.applicationId })
        .from(loomIngestKeys)
        .where(eq(loomIngestKeys.key, key))
        .limit(1)

      if (row === undefined) return ok(null)

      /**
       * Parsed rather than trusted: an id this build cannot read would
       * otherwise reach the reader tables as the application a stranger's
       * batch is filed under.
       */
      const parsed = applicationIdSchema.safeParse(row.applicationId)

      return parsed.success
        ? ok(parsed.data)
        : err({
            code: "unavailable",
            detail: "a stored ingest key names an application id that does not parse",
          })
    } catch (cause) {
      return err(failure(cause, "could not read the application for a key"))
    }
  },

  keyOf: async (applicationId) => {
    try {
      const [row] = await db
        .select({ key: loomIngestKeys.key })
        .from(loomIngestKeys)
        .where(eq(loomIngestKeys.applicationId, applicationId))
        .limit(1)

      if (row === undefined) return ok(null)

      /** Parsed for the reason the other read is: this value goes into a page. */
      const parsed = ingestKeySchema.safeParse(row.key)

      return parsed.success
        ? ok(parsed.data)
        : err({ code: "unavailable", detail: `the stored key for ${applicationId} does not parse` })
    } catch (cause) {
      return err(failure(cause, `could not read the key for ${applicationId}`))
    }
  },

  put: async (applicationId, key, at) => {
    try {
      await db
        .insert(loomIngestKeys)
        .values({ applicationId, key, createdAt: at })
        /** Minting a second key for an application ends the first. */
        .onConflictDoUpdate({
          target: loomIngestKeys.applicationId,
          set: { key, createdAt: at },
        })

      return ok(undefined)
    } catch (cause) {
      return err(failure(cause, `could not write the key for ${applicationId}`))
    }
  },
})
