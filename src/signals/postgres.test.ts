import { PGlite } from "@electric-sql/pglite"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/pglite"
import { describe, expect, it, vi } from "vitest"

import type { LoomDatabase } from "../store/database.js"
import {
  batchOf,
  describeReaderSignalJournalContract,
  describeReaderTallyStoreContract,
  nodeId,
  primitiveType,
  TREE,
  viewed,
  viewKey,
} from "../testing/reader-signal-contract.js"
import { rowSecurityOn } from "../testing/row-security.js"

import { ensureReaderSignalsSchema } from "./migrate.js"
import { postgresReaderSignalJournal, postgresReaderTallyStore } from "./postgres.js"
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

const tally = (overrides: Partial<ReaderTally> = {}): ReaderTally => ({
  treeId: TREE,
  revision: 1,
  nodeId: nodeId("hero"),
  type: primitiveType("loom.section"),
  views: 1,
  reached: 1,
  dwellMs: 500,
  activations: 0,
  opens: 0,
  closes: 0,
  ...overrides,
})

const AT = "2026-09-14T00:00:00.000Z"

describe("the reader signal tables — Postgres specifics", () => {
  it("protects all three with row level security", async () => {
    const db = await freshDatabase()

    expect(await rowSecurityOn(db, "loom_reader_signals")).toBe(true)
    expect(await rowSecurityOn(db, "loom_reader_tallies")).toBe(true)
    expect(await rowSecurityOn(db, "loom_reader_funnels")).toBe(true)
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
