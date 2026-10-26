import { PGlite } from "@electric-sql/pglite"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/pglite"
import { describe, expect, it, vi } from "vitest"

import { DEFAULT_AUDIENCE_ID } from "../audience/audience.js"
import type { LoomDatabase } from "../store/database.js"
import {
  batchOf,
  describeReaderRegionStoreContract,
  describeReaderSignalJournalContract,
  describeReaderTallyStoreContract,
  nodeId,
  primitiveType,
  region,
  SKIERS,
  TREE,
  viewed,
  viewKey,
} from "../testing/reader-signal-contract.js"
import { rowSecurityOn } from "../testing/row-security.js"

import { describeWindowApplyContract } from "./applied-window.contract.js"
import { ensureReaderSignalsSchema } from "./migrate.js"
import {
  postgresReaderRegionStore,
  postgresReaderSignalJournal,
  postgresReaderTallyStore,
} from "./postgres.js"
import type { ReaderTally } from "./rollup.js"

/**
 * Run against PGlite — Postgres compiled to WebAssembly — so these exercise
 * real Postgres semantics with no external database and no Docker, and
 * `pnpm verify` stays green offline.
 */
vi.setConfig({ testTimeout: 30_000 })

const freshDatabase = async (): Promise<LoomDatabase> => {
  const db = drizzle(new PGlite())
  await ensureReaderSignalsSchema(db)

  return db
}

describeReaderSignalJournalContract("postgresReaderSignalJournal", async () =>
  postgresReaderSignalJournal(await freshDatabase())
)

describeReaderTallyStoreContract("postgresReaderTallyStore", async () =>
  postgresReaderTallyStore(await freshDatabase())
)

describeReaderRegionStoreContract("postgresReaderRegionStore", async () =>
  postgresReaderRegionStore(await freshDatabase())
)

describeWindowApplyContract("postgresReaderTallyStore", async () =>
  postgresReaderTallyStore(await freshDatabase())
)

const tally = (overrides: Partial<ReaderTally> = {}): ReaderTally => ({
  treeId: TREE,
  revision: 1,
  nodeId: nodeId("hero"),
  type: primitiveType("loom.section"),
  views: 1,
  reached: 1,
  engaged: 0,
  dwellMs: 500,
  activations: 0,
  opens: 0,
  closes: 0,
  completions: 0,
  ...overrides,
})

const AT = "2026-09-14T00:00:00.000Z"

describe("the reader signal tables — Postgres specifics", () => {
  it("protects all five with row level security", async () => {
    const db = await freshDatabase()

    expect(await rowSecurityOn(db, "loom_reader_signals")).toBe(true)
    expect(await rowSecurityOn(db, "loom_reader_tallies")).toBe(true)
    expect(await rowSecurityOn(db, "loom_reader_funnels")).toBe(true)
    expect(await rowSecurityOn(db, "loom_reader_regions")).toBe(true)
    expect(await rowSecurityOn(db, "loom_reader_page_views")).toBe(true)
  })

  it("runs its migration twice without complaining", async () => {
    const db = await freshDatabase()

    await expect(ensureReaderSignalsSchema(db)).resolves.toBeUndefined()
  })

  /**
   * The view key is what a funnel is correlated by and the one value in the
   * seam that could become identifying if it outlived its window (0146).
   * Forgetting the raw window is how it expires, so this is the assertion that
   * the mechanism works rather than an assumption that it does.
   */
  it("loses every view key when the raw window is forgotten", async () => {
    const db = await freshDatabase()
    const journal = postgresReaderSignalJournal(db)
    await journal.receive([batchOf([viewed("a")], { view: viewKey(3) })])

    const stored = await journal.read()
    if (!stored.ok) throw new Error("expected a page")
    const last = stored.value.batches.at(-1)?.seq ?? 0

    await journal.forget({ before: last + 1 })

    const after = await journal.read()

    expect(after.ok && after.value.batches).toEqual([])
  })

  /**
   * Two windows applied at once is not hypothetical — a scheduled rollup and a
   * manual one is the ordinary way it happens — and read-add-write would lose
   * one of them. This is the assertion that the upsert adds in one statement.
   */
  it("adds concurrent rollups of the same node rather than losing one", async () => {
    const db = await freshDatabase()
    const store = postgresReaderTallyStore(db)

    await Promise.all([
      store.apply({ tallies: [tally({ dwellMs: 100 })], funnels: [] }, AT),
      store.apply({ tallies: [tally({ dwellMs: 250 })], funnels: [] }, AT),
      store.apply({ tallies: [tally({ dwellMs: 400 })], funnels: [] }, AT),
    ])

    const rows = await store.tallies()

    expect(rows.ok && rows.value).toHaveLength(1)
    expect(rows.ok && rows.value[0]?.dwellMs).toBe(750)
  })

  /**
   * `bigint` comes back as a string from one driver and a number from another.
   * A counter that silently became `"12"` would concatenate on the next window
   * rather than add, and the number it produced would still look like a number.
   */
  it("reads counters back as numbers, not as the strings a driver may hand over", async () => {
    const db = await freshDatabase()
    const store = postgresReaderTallyStore(db)
    await store.apply({ tallies: [tally({ dwellMs: 12 })], funnels: [] }, AT)
    await store.apply({ tallies: [tally({ dwellMs: 3 })], funnels: [] }, AT)

    const rows = await store.tallies()

    expect(rows.ok && rows.value[0]?.dwellMs).toBe(15)
  })

  /**
   * Regions are counted on the request path, so deliveries landing at the same
   * moment is the ordinary case rather than the unlucky one — and this table is
   * the only one in the subsystem written by something a stranger triggers. A
   * lost arrival is a bucket that stays below the floor and a map with a country
   * missing from it.
   */
  it("adds arrivals that land at the same moment rather than losing one", async () => {
    const db = await freshDatabase()
    const store = postgresReaderRegionStore(db)
    const arrival = { treeId: TREE, revision: 1, region: region("GB"), views: 1 }

    await Promise.all([
      store.count([arrival], AT),
      store.count([arrival], AT),
      store.count([arrival], AT),
    ])

    const rows = await store.regions()

    expect(rows.ok && rows.value).toHaveLength(1)
    expect(rows.ok && rows.value[0]?.views).toBe(3)
  })

  it("reads a region count back as a number, not as the string a driver may hand over", async () => {
    const db = await freshDatabase()
    const store = postgresReaderRegionStore(db)
    await store.count([{ treeId: TREE, revision: 1, region: region("FR"), views: 12 }], AT)
    await store.count([{ treeId: TREE, revision: 1, region: region("FR"), views: 3 }], AT)

    const rows = await store.regions()

    expect(rows.ok && rows.value[0]?.views).toBe(15)
  })

  /**
   * The column is fed from a request header, so the one thing worth asserting
   * about it is that a row holding something that is not a region does not come
   * back as one. A deployment whose table was written to by anything else finds
   * out here rather than on a screen.
   */
  it("refuses to hand back a region that is not one", async () => {
    const db = await freshDatabase()
    const store = postgresReaderRegionStore(db)
    await db.execute(
      sql`insert into loom_reader_regions (tree_id, revision, region, views, updated_at)
          values (${TREE}, 1, 'Greater London', 40, now())`
    )

    const rows = await store.regions()

    expect(rows.ok).toBe(false)
    expect(!rows.ok && rows.error.detail).toContain("region")
  })

  /**
   * The one row in this subsystem written by two different things, so the only
   * one where a careless upsert could lose a column rather than a row: the door
   * adds arrivals on the request path while a rollup adds its window, and
   * neither statement may overwrite the other's number with the nought it
   * inserted. The subtraction a reading does is only worth anything if both
   * numbers survived.
   */
  it("keeps an opening and a window that land at the same moment out of each other's column", async () => {
    const db = await freshDatabase()
    const store = postgresReaderTallyStore(db)
    const revision = { treeId: TREE, revision: 1, views: 1 }

    await Promise.all([
      store.opened([revision], AT),
      store.opened([revision], AT),
      store.apply({ tallies: [], funnels: [], appearances: [{ ...revision, views: 3 }] }, AT),
      store.apply({ tallies: [], funnels: [], appearances: [{ ...revision, views: 4 }] }, AT),
    ])

    const rows = await store.pageViews()

    expect(rows.ok && rows.value).toHaveLength(1)
    expect(rows.ok && rows.value[0]).toMatchObject({ opened: 2, appearances: 7, foldedAt: AT })
  })

  /**
   * The migration this subsystem's first live column needs (0274).
   *
   * A deployment counting readers today has a `loom_reader_page_views` with no
   * `folded_at` in it, and there is nothing to backfill it from: `updated_at` is
   * written by the door as well, so reading it as a fold's age is exactly the
   * mistake the column exists to stop. So the column arrives nullable and
   * undefaulted, an existing row reads *nothing attests a fold*, and the first
   * fold after the upgrade fills it in.
   */
  it("adds the fold's timestamp to a page-view table that predates it, without inventing one", async () => {
    const db = drizzle(new PGlite())

    await db.execute(
      sql.raw(`CREATE TABLE loom_reader_page_views (
        tree_id text NOT NULL,
        revision integer NOT NULL,
        opened bigint NOT NULL DEFAULT 0,
        appearances bigint NOT NULL DEFAULT 0,
        updated_at timestamptz NOT NULL,
        PRIMARY KEY (tree_id, revision)
      )`)
    )
    await db.execute(
      sql.raw(`INSERT INTO loom_reader_page_views (tree_id, revision, opened, appearances, updated_at)
        VALUES ('${TREE}', 1, 40, 10, now())`)
    )
    await ensureReaderSignalsSchema(db)

    const store = postgresReaderTallyStore(db)
    const before = await store.pageViews()

    expect(before.ok && before.value[0]).toMatchObject({ opened: 40, appearances: 10 })
    expect(before.ok && before.value[0]?.foldedAt).toBeUndefined()

    await store.apply(
      { tallies: [], funnels: [], appearances: [{ treeId: TREE, revision: 1, views: 5 }] },
      AT
    )

    const after = await store.pageViews()

    expect(after.ok && after.value[0]).toMatchObject({ appearances: 15, foldedAt: AT })
  })

  /**
   * The second of the two migrations 0273 owed, against a database in the state
   * the first one left (0284).
   *
   * A deployment counting readers today has five tables with `application_id`
   * and no `audience_id`, holding rows collected when there was one form of
   * every page. `aud_everyone` is therefore a backfill that states what was
   * true of them rather than a value somebody chose — which is why the column
   * default is the whole of the migration and no `UPDATE` runs.
   *
   * The key widening is the part worth proving rather than reading: the rows
   * have to survive a primary key being dropped and rebuilt around a column
   * they did not have, and then still add to rather than collide with a fold
   * that names the same audience.
   */
  it("adds the audience to tables that predate it, filing their rows under everyone", async () => {
    const db = drizzle(new PGlite())

    await db.execute(
      sql.raw(`CREATE TABLE loom_reader_tallies (
        application_id text NOT NULL DEFAULT 'app_default',
        tree_id text NOT NULL,
        revision integer NOT NULL,
        node_id text NOT NULL,
        type text NOT NULL,
        views bigint NOT NULL,
        reached bigint NOT NULL,
        engaged bigint NOT NULL DEFAULT 0,
        dwell_ms bigint NOT NULL,
        activations bigint NOT NULL,
        opens bigint NOT NULL,
        closes bigint NOT NULL,
        completions bigint NOT NULL DEFAULT 0,
        updated_at timestamptz NOT NULL,
        PRIMARY KEY (application_id, tree_id, revision, node_id)
      )`)
    )
    await db.execute(
      sql.raw(`INSERT INTO loom_reader_tallies
        (tree_id, revision, node_id, type, views, reached, dwell_ms, activations, opens, closes, updated_at)
        VALUES ('${TREE}', 1, 'n_hero', 'loom.section', 40, 40, 9000, 2, 0, 0, now())`)
    )
    await ensureReaderSignalsSchema(db)

    const store = postgresReaderTallyStore(db)
    const before = await store.tallies()

    expect(before.ok && before.value[0]).toMatchObject({
      audienceId: DEFAULT_AUDIENCE_ID,
      views: 40,
      dwellMs: 9000,
    })

    /** The widened key holds: the same node in another audience is another row. */
    await store.apply({ tallies: [tally({ views: 5 })], funnels: [] }, AT, SKIERS)

    const after = await store.tallies()

    expect(after.ok && after.value).toHaveLength(2)
    expect(
      after.ok &&
        Object.fromEntries(after.value.map((row) => [row.audienceId, row.views]))
    ).toEqual({ [DEFAULT_AUDIENCE_ID]: 40, [SKIERS]: 5 })
  })

  /**
   * ## The whole window or none of it (0316)
   *
   * The reason `applyWindow` exists, and the one assertion only a real database
   * can make: a window of two audiences whose second write raises must leave the
   * first audience's counters absent.
   *
   * Written as it is because of what the alternative cost. One call per audience
   * left a state between the calls — the first audience durable, the second not,
   * and the buffer still holding the window, because counting and forgetting are
   * one operation. The next run folded the same batches again and added the
   * first audience a second time, on the five counters of nine that are
   * occurrences: permanently (0158), and looking exactly like a readership twice
   * as interested as it was.
   *
   * The failure is a `revision` past what an `integer` column holds, which
   * Postgres raises on the insert of the second group rather than on anything
   * this code checks — so the rollback under test is the database's and not a
   * guard of ours.
   */
  it("writes neither audience when the second one cannot be written", async () => {
    const db = await freshDatabase()
    const store = postgresReaderTallyStore(db)

    const applied = await store.applyWindow(
      [
        { audience: SKIERS, tallies: [tally({ views: 7 })], funnels: [] },
        { audience: DEFAULT_AUDIENCE_ID, tallies: [tally({ revision: 2 ** 40 })], funnels: [] },
      ],
      AT
    )

    expect(applied.ok).toBe(false)
    expect(applied.ok === false && applied.error.detail).toContain("across 2 audiences")

    const rows = await store.tallies()

    expect(rows.ok && rows.value).toEqual([])
  })

  /**
   * The same window, written the way it is meant to be, so the test above is
   * about the rollback and not about a window of two audiences being refused.
   */
  it("writes both audiences of a window that can be written", async () => {
    const db = await freshDatabase()
    const store = postgresReaderTallyStore(db)

    const applied = await store.applyWindow(
      [
        { audience: SKIERS, tallies: [tally({ views: 7 })], funnels: [] },
        { audience: DEFAULT_AUDIENCE_ID, tallies: [tally({ views: 2 })], funnels: [] },
      ],
      AT
    )

    expect(applied.ok).toBe(true)
    const rows = await store.tallies()

    expect(
      rows.ok && Object.fromEntries(rows.value.map((row) => [row.audienceId, row.views]))
    ).toEqual({ [SKIERS]: 7, [DEFAULT_AUDIENCE_ID]: 2 })
  })

  it("refuses to hand back a batch whose stored signals no longer parse", async () => {
    const db = await freshDatabase()
    const journal = postgresReaderSignalJournal(db)
    await journal.receive([batchOf([viewed("a")])])

    /** Only reachable by writing one: an older parser's row is exactly this shape. */
    await db.execute(sql`UPDATE loom_reader_signals SET signals = '[{"kind":"hovered"}]'::jsonb`)

    const read = await journal.read()

    expect(read.ok).toBe(false)
  })
})
