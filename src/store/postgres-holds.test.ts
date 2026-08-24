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
    expect(found.error.code).toBe("unavailable")
  })

  /** A listing must not quietly drop the row it could not read — see `forTree`. */
  it("fails a listing that contains an unreadable hold rather than omitting it", async () => {
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

    expect((await store.forTree(readable.treeId)).ok).toBe(false)
  })

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
