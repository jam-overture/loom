import { and, asc, desc, eq, gte, max, min, sql } from "drizzle-orm"
import { bigint, boolean, pgTable, primaryKey, text } from "drizzle-orm/pg-core"

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
    /** The site has named this answer back as the pages it holds (`304`). */
    kept: boolean("kept").notNull().default(false),
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
  /**
   * Added after the table went live, so a deployment that pushed it before
   * gains the column. Rows from before it say *not kept*, which is never read
   * as a refusal: that takes a site that has kept some answer since.
   */
  `ALTER TABLE loom_site_pulls ADD COLUMN IF NOT EXISTS kept boolean NOT NULL DEFAULT false`,
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
  /**
   * Two statements, and the first names its columns by hand, because the
   * second writes a column added after the table went live: until
   * `pnpm db:push` adds it, the pull is still recorded and only *kept* is
   * lost, and the next pull says it again. (The query builder would write
   * `kept` into the insert as `default`, and fail on a table without it.)
   */
  record: async ({ application, tag, at, kept }) => {
    try {
      await db.execute(sql`
        INSERT INTO loom_site_pulls (application_id, tag, first_pulled_at, last_pulled_at)
        VALUES (${application}, ${tag}, ${at}, ${at})
        ON CONFLICT (application_id, tag) DO UPDATE SET
          first_pulled_at = LEAST(loom_site_pulls.first_pulled_at, excluded.first_pulled_at),
          last_pulled_at = GREATEST(loom_site_pulls.last_pulled_at, excluded.last_pulled_at)
      `)

      if (kept) {
        await db
          .update(loomSitePulls)
          .set({ kept: true })
          .where(and(eq(loomSitePulls.applicationId, application), eq(loomSitePulls.tag, tag)))
      }

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

  firstTakenSince: async (application, since) => {
    try {
      const rows = await db
        .select({ first: loomSitePulls.firstPulledAt })
        .from(loomSitePulls)
        .where(
          and(eq(loomSitePulls.applicationId, application), gte(loomSitePulls.firstPulledAt, since))
        )
        .orderBy(asc(loomSitePulls.firstPulledAt))

      return ok(rows.map((row) => Number(row.first)))
    } catch (cause) {
      return err(failure(cause, `could not read what ${application} took since ${since}`))
    }
  },

  newest: async (application) => {
    try {
      const mine = eq(loomSitePulls.applicationId, application)
      const [[newest], [any]] = await Promise.all([
        db
          .select({
            first: loomSitePulls.firstPulledAt,
            last: loomSitePulls.lastPulledAt,
            kept: loomSitePulls.kept,
          })
          .from(loomSitePulls)
          .where(mine)
          .orderBy(desc(loomSitePulls.firstPulledAt), desc(loomSitePulls.tag))
          .limit(1),
        db
          .select({ tag: loomSitePulls.tag })
          .from(loomSitePulls)
          .where(and(mine, eq(loomSitePulls.kept, true)))
          .limit(1),
      ])

      return newest === undefined
        ? ok(null)
        : ok({
            first: Number(newest.first),
            last: Number(newest.last),
            kept: newest.kept,
            anyKept: any !== undefined,
          })
    } catch (cause) {
      return err(failure(cause, `could not read whether ${application} keeps its newest pages`))
    }
  },
})
