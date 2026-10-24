import { eq, sql } from "drizzle-orm"
import { bigint, pgTable, text } from "drizzle-orm/pg-core"

import { err, ok } from "@jam-overture/loom"
import type { LoomDatabase } from "@jam-overture/loom/postgres"
import { applicationIdSchema } from "@jam-overture/loom/store"

import type { PublishKeyStore, PublishKeyStoreError } from "./publish-keys"

/**
 * The publish keys, as digests. The deployment's table rather than the
 * runtime's, for `keys-postgres.ts`'s reason.
 */
export const loomPublishKeys = pgTable("loom_publish_keys", {
  applicationId: text("application_id").primaryKey(),
  digest: text("digest").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
})

export const PUBLISH_KEYS_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS loom_publish_keys (
    application_id text PRIMARY KEY,
    digest text NOT NULL,
    created_at bigint NOT NULL
  )`,
  /** The lookup every publish performs, and one digest can never name two applications. */
  `CREATE UNIQUE INDEX IF NOT EXISTS loom_publish_keys_digest_idx ON loom_publish_keys (digest)`,
  `ALTER TABLE loom_publish_keys ENABLE ROW LEVEL SECURITY`,
]

export const ensurePublishKeysSchema = async (db: LoomDatabase): Promise<void> => {
  for (const statement of PUBLISH_KEYS_DDL) {
    await db.execute(sql.raw(statement))
  }
}

const failure = (cause: unknown, detail: string): PublishKeyStoreError => ({
  code: "unavailable",
  detail: `${detail}: ${cause instanceof Error ? cause.message : String(cause)}`,
})

export const postgresPublishKeyStore = (db: LoomDatabase): PublishKeyStore => ({
  applicationWithDigest: async (digest) => {
    try {
      const [row] = await db
        .select({ applicationId: loomPublishKeys.applicationId })
        .from(loomPublishKeys)
        .where(eq(loomPublishKeys.digest, digest))
        .limit(1)

      if (row === undefined) return ok(null)

      /** Parsed rather than trusted: this id decides whose pages a snapshot replaces. */
      const parsed = applicationIdSchema.safeParse(row.applicationId)

      return parsed.success
        ? ok(parsed.data)
        : err({
            code: "unavailable",
            detail: "a stored publish key names an application id that does not parse",
          })
    } catch (cause) {
      return err(failure(cause, "could not read the application for a publish key"))
    }
  },

  mintedAt: async (application) => {
    try {
      const [row] = await db
        .select({ createdAt: loomPublishKeys.createdAt })
        .from(loomPublishKeys)
        .where(eq(loomPublishKeys.applicationId, application))
        .limit(1)

      return ok(row?.createdAt ?? null)
    } catch (cause) {
      return err(failure(cause, `could not read the publish key for ${application}`))
    }
  },

  put: async (application, digest, at) => {
    try {
      await db
        .insert(loomPublishKeys)
        .values({ applicationId: application, digest, createdAt: at })
        .onConflictDoUpdate({
          target: loomPublishKeys.applicationId,
          set: { digest, createdAt: at },
        })

      return ok(undefined)
    } catch (cause) {
      return err(failure(cause, `could not write the publish key for ${application}`))
    }
  },
})
