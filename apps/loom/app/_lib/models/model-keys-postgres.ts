import { eq, sql } from "drizzle-orm"
import { bigint, pgTable, text } from "drizzle-orm/pg-core"

import { err, ok } from "@jam-overture/loom"
import type { LoomDatabase } from "@jam-overture/loom/postgres"

import type { ModelKeyStore, ModelKeyStoreError } from "./model-keys"

/**
 * Each project's model key, sealed (0332). The deployment's table rather than
 * the runtime's, for `keys-postgres.ts`'s reason.
 */
export const loomModelKeys = pgTable("loom_model_keys", {
  applicationId: text("application_id").primaryKey(),
  sealed: text("sealed").notNull(),
  hint: text("hint").notNull(),
  setAt: bigint("set_at", { mode: "number" }).notNull(),
})

export const MODEL_KEYS_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS loom_model_keys (
    application_id text PRIMARY KEY,
    sealed text NOT NULL,
    hint text NOT NULL,
    set_at bigint NOT NULL
  )`,
  `ALTER TABLE loom_model_keys ENABLE ROW LEVEL SECURITY`,
]

export const ensureModelKeysSchema = async (db: LoomDatabase): Promise<void> => {
  for (const statement of MODEL_KEYS_DDL) {
    await db.execute(sql.raw(statement))
  }
}

const failure = (cause: unknown, detail: string): ModelKeyStoreError => ({
  code: "unavailable",
  detail: `${detail}: ${cause instanceof Error ? cause.message : String(cause)}`,
})

export const postgresModelKeyStore = (db: LoomDatabase): ModelKeyStore => ({
  kept: async (application) => {
    try {
      const [row] = await db
        .select({
          sealed: loomModelKeys.sealed,
          hint: loomModelKeys.hint,
          setAt: loomModelKeys.setAt,
        })
        .from(loomModelKeys)
        .where(eq(loomModelKeys.applicationId, application))
        .limit(1)

      return ok(row ?? null)
    } catch (cause) {
      return err(failure(cause, `could not read the model key for ${application}`))
    }
  },

  put: async (application, key) => {
    try {
      await db
        .insert(loomModelKeys)
        .values({ applicationId: application, ...key })
        .onConflictDoUpdate({ target: loomModelKeys.applicationId, set: key })

      return ok(undefined)
    } catch (cause) {
      return err(failure(cause, `could not write the model key for ${application}`))
    }
  },

  remove: async (application) => {
    try {
      await db.delete(loomModelKeys).where(eq(loomModelKeys.applicationId, application))

      return ok(undefined)
    } catch (cause) {
      return err(failure(cause, `could not remove the model key for ${application}`))
    }
  },
})
