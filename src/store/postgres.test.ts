import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { sql } from "drizzle-orm"
import { describe, expect, it } from "vitest"

import { describeTreeStoreContract, appendOf, removalOf } from "../testing/store-contract.js"
import { sampleTree } from "../testing/fixtures.js"

import { ensureTreeStoreSchema } from "./migrate.js"
import { postgresTreeStore, type LoomDatabase } from "./postgres.js"
import { loomRevisions, loomTrees } from "./schema.js"

/**
 * Run against PGlite — Postgres compiled to WebAssembly — so these exercise real
 * Postgres semantics with no external database and no Docker. Real transactions,
 * real constraint violations, and `pnpm verify` stays green offline, which is the
 * same rule the live model test already follows.
 */

const freshDatabase = async (): Promise<LoomDatabase> => {
  const db = drizzle(new PGlite())
  await ensureTreeStoreSchema(db)

  return db
}

describeTreeStoreContract("postgresTreeStore", async () => postgresTreeStore(await freshDatabase()))

describe("postgresTreeStore — Postgres specifics", () => {
  it("writes the log entry and the snapshot in the same transaction", async () => {
    const db = await freshDatabase()
    const store = postgresTreeStore(db)
    const { tree, ids } = sampleTree()
    await store.create(tree)

    await store.append(tree.treeId, appendOf(removalOf(tree, ids.footer)))

    const snapshots = await db.select().from(loomTrees)
    const log = await db.select().from(loomRevisions)

    expect(snapshots[0]?.revision).toBe(1)
    expect(log).toHaveLength(1)
    expect(log[0]?.revision).toBe(1)
  })

  /**
   * The property the composite primary key exists for. A refused append must not
   * leave a log row behind, because a log entry without its snapshot advance is
   * precisely the divergence `auditSnapshot` is built to detect — and a store
   * that manufactured it would be failing its own audit by construction.
   */
  it("rolls the log entry back when the append is refused", async () => {
    const db = await freshDatabase()
    const store = postgresTreeStore(db)
    const { tree } = sampleTree()
    await store.create(tree)

    const refused = await store.append(tree.treeId, appendOf(removalOf(tree, "n_999")))

    expect(refused.ok).toBe(false)
    expect(await db.select().from(loomRevisions)).toEqual([])
    expect((await db.select().from(loomTrees))[0]?.revision).toBe(0)
  })

  /** The database enforces the sequence, not just the code above it. */
  it("refuses a second log entry at a revision that already exists", async () => {
    const db = await freshDatabase()
    const { tree } = sampleTree()
    await postgresTreeStore(db).create(tree)

    const row = {
      treeId: tree.treeId,
      revision: 1,
      proposalId: "p_1",
      delta: {},
      provenance: {},
      appliedAt: "2026-07-31T00:00:00.000Z",
    }

    await db.insert(loomRevisions).values(row)

    await expect(db.insert(loomRevisions).values(row)).rejects.toThrow()
  })

  it("reports a stored document that no longer parses rather than serving it", async () => {
    const db = await freshDatabase()
    const store = postgresTreeStore(db)
    const { tree } = sampleTree()
    await store.create(tree)

    await db
      .update(loomTrees)
      .set({ document: { kind: "not-a-tree" } })
      .where(sql`tree_id = ${tree.treeId}`)

    const head = await store.head(tree.treeId)

    expect(head.ok).toBe(false)
    expect(head.ok ? "" : head.error.code).toBe("unavailable")
  })
})
