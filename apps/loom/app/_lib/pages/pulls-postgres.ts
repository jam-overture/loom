import { and, asc, desc, eq, gte, max, min, sql } from "drizzle-orm"
import { bigint, boolean, pgTable, primaryKey, text } from "drizzle-orm/pg-core"

import { err, ok } from "@jam-overture/loom"
import type { LoomDatabase } from "@jam-overture/loom/postgres"
import type { ApplicationId } from "@jam-overture/loom/store"

import type { SitePullStore, SitePullStoreError, TakenAnswer, TakenSince } from "./pulls"
import { isMissingColumn } from "@/app/_lib/app/missing-column"

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

const givenSince = (application: ApplicationId, since: number) =>
  and(eq(loomSitePulls.applicationId, application), gte(loomSitePulls.firstPulledAt, since))

const SPAN = { first: loomSitePulls.firstPulledAt, last: loomSitePulls.lastPulledAt } as const

/** `bigint` columns may come back as text. */
const answerOf = (row: {
  readonly first: unknown
  readonly last: unknown
  readonly kept: boolean
}): TakenAnswer => ({ first: Number(row.first), last: Number(row.last), kept: row.kept })

const answersSince = async (
  db: LoomDatabase,
  application: ApplicationId,
  since: number
): Promise<TakenSince> => {
  const [rows, [named]] = await Promise.all([
    db
      .select({ ...SPAN, kept: loomSitePulls.kept })
      .from(loomSitePulls)
      .where(givenSince(application, since))
      .orderBy(asc(loomSitePulls.firstPulledAt)),
    db
      .select({ tag: loomSitePulls.tag })
      .from(loomSitePulls)
      .where(and(eq(loomSitePulls.applicationId, application), eq(loomSitePulls.kept, true)))
      .limit(1),
  ])

  return { answers: rows.map(answerOf), namesBack: named !== undefined }
}

const answersSinceBeforeKept = async (
  db: LoomDatabase,
  application: ApplicationId,
  since: number
): Promise<TakenSince> => {
  const rows = await db
    .select(SPAN)
    .from(loomSitePulls)
    .where(givenSince(application, since))
    .orderBy(asc(loomSitePulls.firstPulledAt))

  return { answers: rows.map((row) => answerOf({ ...row, kept: false })), namesBack: false }
}

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

  /**
   * On a table pushed before `kept`, the answers are read without it, each as
   * never named back by a site that names none back: what the timeline read
   * before the column (an answer given is an answer taken), until
   * `pnpm db:push` adds it.
   */
  takenSince: async (application, since) => {
    try {
      return ok(await answersSince(db, application, since))
    } catch (cause) {
      if (!isMissingColumn(cause)) {
        return err(failure(cause, `could not read what ${application} took since ${since}`))
      }
    }

    try {
      return ok(await answersSinceBeforeKept(db, application, since))
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
