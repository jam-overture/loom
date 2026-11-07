import { eq, max, min, sql } from "drizzle-orm"
import { bigint, pgTable, primaryKey, text } from "drizzle-orm/pg-core"

import { err, ok } from "@jam-overture/loom"
import type { LoomDatabase } from "@jam-overture/loom/postgres"

import type { SitePullStore, SitePullStoreError } from "./pulls"

/** One row per answer a project's site took from the read door, by its entity tag (0358 clause 3). */
export const loomSitePulls = pgTable(
  "loom_site_pulls",
  {
    applicationId: text("application_id").notNull(),
    tag: text("tag").notNull(),
    firstPulledAt: bigint("first_pulled_at", { mode: "number" }).notNull(),
    lastPulledAt: bigint("last_pulled_at", { mode: "number" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.applicationId, table.tag] })]
)

export const SITE_PULLS_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS loom_site_pulls (
    application_id text NOT NULL,
    tag text NOT NULL,
    first_pulled_at bigint NOT NULL,
    last_pulled_at bigint NOT NULL,
    PRIMARY KEY (application_id, tag)
  )`,
  `ALTER TABLE loom_site_pulls ENABLE ROW LEVEL SECURITY`,
]

export const ensureSitePullsSchema = async (db: LoomDatabase): Promise<void> => {
  for (const statement of SITE_PULLS_DDL) {
    await db.execute(sql.raw(statement))
  }
}

const failure = (cause: unknown, detail: string): SitePullStoreError => ({
  code: "unavailable",
  detail: `${detail}: ${cause instanceof Error ? cause.message : String(cause)}`,
})

export const postgresSitePullStore = (db: LoomDatabase): SitePullStore => ({
  record: async ({ application, tag, at }) => {
    try {
      await db
        .insert(loomSitePulls)
        .values({ applicationId: application, tag, firstPulledAt: at, lastPulledAt: at })
        .onConflictDoUpdate({
          target: [loomSitePulls.applicationId, loomSitePulls.tag],
          set: {
            firstPulledAt: sql`LEAST(${loomSitePulls.firstPulledAt}, excluded.first_pulled_at)`,
            lastPulledAt: sql`GREATEST(${loomSitePulls.lastPulledAt}, excluded.last_pulled_at)`,
          },
        })

      return ok(undefined)
    } catch (cause) {
      return err(failure(cause, `could not record a pull by ${application}`))
    }
  },

  span: async (application) => {
    try {
      const [row] = await db
        .select({
          first: min(loomSitePulls.firstPulledAt),
          last: max(loomSitePulls.lastPulledAt),
        })
        .from(loomSitePulls)
        .where(eq(loomSitePulls.applicationId, application))

      /** An aggregate over no rows is one row of nulls; `bigint` aggregates may come back as text. */
      return row === undefined || row.first === null || row.last === null
        ? ok(null)
        : ok({ first: Number(row.first), last: Number(row.last) })
    } catch (cause) {
      return err(failure(cause, `could not read when ${application} last pulled`))
    }
  },
})
