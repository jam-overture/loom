import { PGlite } from "@electric-sql/pglite"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/pglite"
import { describe, expect, it, vi } from "vitest"

import { describeHoldStoreContract, heldProposalFixture } from "../testing/hold-contract.js"
import { rowSecurityOn } from "../testing/row-security.js"
import { treeIdSchema, type ProposalId } from "../ids.js"

import { ensureHoldStoreSchema } from "./migrate.js"
import { postgresHoldStore } from "./postgres-holds.js"
import type { LoomDatabase } from "./database.js"
import { loomHolds } from "./schema.js"

/**
 * Run against PGlite — Postgres compiled to WebAssembly — so these exercise real
 * Postgres semantics with no external database and no Docker, on the same terms
 * the tree store's suite already does.
 */

/** A fresh WASM Postgres per test costs seconds, not milliseconds — see `postgres.test.ts`. */
vi.setConfig({ testTimeout: 30_000 })

const freshDatabase = async (): Promise<LoomDatabase> => {
  const db = drizzle(new PGlite())
  await ensureHoldStoreSchema(db)

  return db
}

describeHoldStoreContract("postgresHoldStore", async () => postgresHoldStore(await freshDatabase()))

describe("postgresHoldStore beyond the contract", () => {
  it("locks the table on creation, so there is no window in which it is exposed", async () => {
    const db = await freshDatabase()

    expect(await rowSecurityOn(db, "loom_holds")).toBe(true)
  })

  it("is a no-op when the schema is already there", async () => {
    const db = await freshDatabase()
    const store = postgresHoldStore(db)
    const held = heldProposalFixture()
    await store.hold(held)

    await ensureHoldStoreSchema(db)

    expect((await store.get(held.proposalId)).ok).toBe(true)
  })

  /**
   * The property the whole implementation turns on, checked against the database
   * rather than through the interface: a select-then-delete would pass the
   * contract's race test on a driver that happens to serialise, and fail on one
   * that does not.
   */
  it("takes the row in the statement that returns it", async () => {
    const db = await freshDatabase()
    const store = postgresHoldStore(db)
    const held = heldProposalFixture()
    await store.hold(held)

    await store.release(held.proposalId)
    const remaining = await db.select().from(loomHolds)

    expect(remaining).toHaveLength(0)
  })

  /**
   * Storage is a boundary, and this is the one boundary where the data outlives
   * the code that wrote it. A hold written by a future version whose shape this
   * one does not recognise must be reported, never handed on unvalidated.
   */
  it("refuses a stored hold that does not parse, rather than returning it", async () => {
    const db = await freshDatabase()
    const store = postgresHoldStore(db)
    const held = heldProposalFixture()
    await store.hold(held)

    await db
      .update(loomHolds)
      .set({ disposition: { kind: "invented-by-a-later-version" } })

    const found = await store.get(held.proposalId)

    expect(found.ok).toBe(false)
    if (found.ok) throw new Error("expected the unparseable hold to be refused")
    expect(found.error.code).toBe("unreadable")
  })

  /**
   * The case 0175 is about, and the reason it replaced failing the listing: the
   * unreadable hold is one row, and the reviewer still has to be able to answer
   * every other change waiting on the same page.
   */
  it("keeps the rest of a listing when one hold cannot be read, and names the one it skipped", async () => {
    const db = await freshDatabase()
    const store = postgresHoldStore(db)
    const readable = heldProposalFixture({ heldAt: "2026-07-30T09:00:00.000Z" })
    const broken = heldProposalFixture({ heldAt: "2026-07-30T12:00:00.000Z" })
    await store.hold(readable)
    await store.hold(broken)

    await db
      .update(loomHolds)
      .set({ intent: { nothing: "recognisable" } })
      .where(sql`proposal_id = ${broken.proposalId}`)

    const listed = await store.forTree(readable.treeId)
    if (!listed.ok) throw new Error("expected the listing to survive one unreadable row")

    expect(listed.value.held.map((entry) => entry.proposalId)).toEqual([readable.proposalId])
    expect(listed.value.unreadable).toEqual([
      { proposalId: broken.proposalId, heldAt: broken.heldAt, detail: expect.any(String) },
    ])
  })

  /**
   * Named is not enough on its own: *which field disagreed* is what separates a
   * reviewer who knows a rollout is mid-flight from one who knows only that
   * something is wrong.
   */
  it("says which part of a skipped hold it could not read", async () => {
    const db = await freshDatabase()
    const store = postgresHoldStore(db)
    const held = heldProposalFixture()
    await store.hold(held)

    await db.update(loomHolds).set({ disposition: { kind: "invented-by-a-later-version" } })

    const listed = await store.forTree(held.treeId)
    if (!listed.ok) throw new Error("expected the listing to survive")

    expect(listed.value.unreadable[0]?.detail).toContain("disposition")
  })

  /**
   * A row the ordering cannot place is the one case skipping cannot handle: the
   * cursor past it would not be a position, so the next request would read it
   * as unreadable, start at the beginning, and page forever. Failing says so
   * once instead.
   */
  it("fails a listing holding a row it cannot place at all", async () => {
    const db = await freshDatabase()
    const store = postgresHoldStore(db)
    const held = heldProposalFixture()
    await store.hold(held)

    await db.update(loomHolds).set({ heldAt: "the day before yesterday" })

    const listed = await store.forTree(held.treeId)

    expect(listed.ok).toBe(false)
    if (listed.ok) throw new Error("expected a listing it cannot place to fail")
    expect(listed.error.code).toBe("unreadable")
  })

  /**
   * The paging half, and the fault that skipping would otherwise have
   * introduced. The cursor comes from the last **row** of the window rather
   * than the last hold that parsed, so a page ending in something unreadable
   * still resumes after it.
   */
  it("pages past a hold it cannot read rather than resuming in front of it", async () => {
    const db = await freshDatabase()
    const store = postgresHoldStore(db)
    const holds = [0, 1, 2].map((minute) =>
      heldProposalFixture({ heldAt: `2026-07-30T09:0${minute}:00.000Z` })
    )
    for (const held of holds) await store.hold(held)

    const [, middle] = holds
    if (middle === undefined) throw new Error("expected three holds")

    await db
      .update(loomHolds)
      .set({ proposal: { rationale: "from a later build" } })
      .where(sql`proposal_id = ${middle.proposalId}`)

    const seen: string[] = []
    const skipped: string[] = []
    let cursor: string | null = null
    let pages = 0

    do {
      const page = await store.waiting({ limit: 1, ...(cursor === null ? {} : { cursor }) })
      if (!page.ok) throw new Error("expected a page")

      seen.push(...page.value.held.map((entry) => entry.proposalId))
      skipped.push(...page.value.unreadable.map((entry) => entry.proposalId))
      cursor = page.value.cursor
      pages += 1
    } while (cursor !== null && pages < 10)

    expect(pages).toBe(3)
    expect(seen).toEqual([holds[0]?.proposalId, holds[2]?.proposalId])
    expect(skipped).toEqual([middle.proposalId])
  })

  /**
   * The worst case the old shape turned into silence: every row in a page
   * unreadable. There is no hold to take a cursor from, so taking it from the
   * last parsed one would end the queue there and drop what follows.
   */
  it("still hands back a cursor when it could read nothing on the page", async () => {
    const db = await freshDatabase()
    const store = postgresHoldStore(db)
    const broken = heldProposalFixture({ heldAt: "2026-07-30T09:00:00.000Z" })
    const readable = heldProposalFixture({ heldAt: "2026-07-30T12:00:00.000Z" })
    await store.hold(broken)
    await store.hold(readable)

    await db
      .update(loomHolds)
      .set({ intent: { nothing: "recognisable" } })
      .where(sql`proposal_id = ${broken.proposalId}`)

    const first = await store.waiting({ limit: 1 })
    if (!first.ok) throw new Error("expected a first page")

    expect(first.value.held).toEqual([])
    expect(first.value.cursor).not.toBeNull()

    const second = await store.waiting({ limit: 1, cursor: first.value.cursor ?? "" })
    if (!second.ok) throw new Error("expected a second page")

    expect(second.value.held.map((entry) => entry.proposalId)).toEqual([readable.proposalId])
  })

  /**
   * The other half of 0175, and the one that gives `unreadable` its meaning: a
   * store that is not there is `unavailable` on every operation, which is the
   * answer a reader waits out rather than investigates.
   */
  it("reports a database that is not there as unavailable rather than throwing", async () => {
    const db = drizzle(new PGlite())
    const store = postgresHoldStore(db)

    const held = await store.hold(heldProposalFixture())
    const read = await store.get("p_1" as ProposalId)
    const listed = await store.forTree(treeIdSchema.parse("t_1"))
    const released = await store.release("p_1" as ProposalId)

    for (const outcome of [held, read, listed, released]) {
      expect(outcome.ok).toBe(false)
      if (outcome.ok) throw new Error("expected every operation to refuse")
      expect(outcome.error.code).toBe("unavailable")
    }
  })
})
