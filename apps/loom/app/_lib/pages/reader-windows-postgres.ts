import { eq, sql } from "drizzle-orm"
import { bigint, pgTable, text } from "drizzle-orm/pg-core"

import { err, ok } from "@jam-overture/loom"
import type { LoomDatabase } from "@jam-overture/loom/postgres"

import {
  readerWindowSchema,
  type ReaderWindowStore,
  type ReaderWindowStoreError,
} from "./reader-windows"

/**
 * Each project's reader window (0383 clause 1). The deployment's table rather
 * than the runtime's, for `keys-postgres.ts`'s reason. A project with no row
 * has never chosen, which is *Off*.
 */
export const loomReaderWindows = pgTable("loom_reader_windows", {
  applicationId: text("application_id").primaryKey(),
  readerWindow: text("reader_window").notNull(),
  setAt: bigint("set_at", { mode: "number" }).notNull(),
})

export const READER_WINDOWS_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS loom_reader_windows (
    application_id text PRIMARY KEY,
    reader_window text NOT NULL CHECK (reader_window IN ('off', '1h', '1d', '7d')),
    set_at bigint NOT NULL
  )`,
  `ALTER TABLE loom_reader_windows ENABLE ROW LEVEL SECURITY`,
]

export const ensureReaderWindowsSchema = async (db: LoomDatabase): Promise<void> => {
  for (const statement of READER_WINDOWS_DDL) {
    await db.execute(sql.raw(statement))
  }
}

const failure = (cause: unknown, detail: string): ReaderWindowStoreError => ({
  code: "unavailable",
  detail: `${detail}: ${cause instanceof Error ? cause.message : String(cause)}`,
})

export const postgresReaderWindowStore = (db: LoomDatabase): ReaderWindowStore => ({
  kept: async (application) => {
    try {
      const [row] = await db
        .select({ readerWindow: loomReaderWindows.readerWindow, setAt: loomReaderWindows.setAt })
        .from(loomReaderWindows)
        .where(eq(loomReaderWindows.applicationId, application))
        .limit(1)

      return ok(
        row === undefined
          ? null
          : { window: readerWindowSchema.parse(row.readerWindow), setAt: row.setAt }
      )
    } catch (cause) {
      return err(failure(cause, `could not read the reader window for ${application}`))
    }
  },

  put: async (application, { window, setAt }) => {
    try {
      await db
        .insert(loomReaderWindows)
        .values({ applicationId: application, readerWindow: window, setAt })
        .onConflictDoUpdate({
          target: loomReaderWindows.applicationId,
          set: { readerWindow: window, setAt },
        })

      return ok(undefined)
    } catch (cause) {
      return err(failure(cause, `could not write the reader window for ${application}`))
    }
  },
})
