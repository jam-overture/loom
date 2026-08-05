import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { sql } from "drizzle-orm"
import { describe, expect, it, vi } from "vitest"

import { describeTreeStoreContract, appendOf, removalOf } from "../testing/store-contract.js"
import { rowSecurityOn } from "../testing/row-security.js"
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

/**
 * Each test builds a fresh WASM Postgres, which costs seconds rather than
 * milliseconds and varies with machine load. Vitest's 5s default is tuned for
 * pure functions and leaves too little headroom here — one suite run failed
 * intermittently before this was raised. The failing test was not captured, so
 * this is a mitigation rather than a diagnosis; a recurrence with a name on it is
 * worth chasing properly.
 */
vi.setConfig({ testTimeout: 30_000 })

const freshDatabase = async (): Promise<LoomDatabase> => {
  const db = drizzle(new PGlite())
  await ensureTreeStoreSchema(db)

  return db
}

describeTreeStoreContract("postgresTreeStore", async () => postgresTreeStore(await freshDatabase()))

/**
 * The shape `loom_revisions` had before 0029, verbatim. A deployed database is
 * already sitting on this, and `CREATE TABLE IF NOT EXISTS` leaves an existing
 * table alone — columns and all — so the migration's only effect on a real
 * deployment is the `ALTER` that follows it. That is the statement worth a test:
 * a fresh database would pass whether or not it existed.
 */
const PRE_0029_REVISIONS = `CREATE TABLE loom_revisions (
  tree_id text NOT NULL,
  revision integer NOT NULL,
  proposal_id text NOT NULL,
  delta jsonb NOT NULL,
  provenance jsonb NOT NULL,
  applied_at text NOT NULL,
  PRIMARY KEY (tree_id, revision)
)`

describe("ensureTreeStoreSchema on a database that predates 0029", () => {
  it("adds answered_by to a table that was created without it", async () => {
    const db = drizzle(new PGlite())
    await db.execute(sql.raw(PRE_0029_REVISIONS))

    await ensureTreeStoreSchema(db)

    const store = postgresTreeStore(db)
    const { tree, ids } = sampleTree()
    await store.create(tree)
    await store.append(tree.treeId, {
      ...appendOf(removalOf(tree, ids.footer)),
      answeredBy: "reviewer:ana",
    })

    const log = await store.revisions(tree.treeId)
    expect(log.ok && log.value.revisions[0]?.answeredBy).toBe("reviewer:ana")
  })

  it("leaves rows written before the column existed unattributed rather than failing to read them", async () => {
    const db = drizzle(new PGlite())
    await db.execute(sql.raw(PRE_0029_REVISIONS))
    await ensureTreeStoreSchema(db)

    const store = postgresTreeStore(db)
    const { tree, ids } = sampleTree()
    await store.create(tree)
    /** Written through the pre-0029 path: the column exists and stays null. */
    await store.append(tree.treeId, appendOf(removalOf(tree, ids.footer)))

    const log = await store.revisions(tree.treeId)
    if (!log.ok) throw new Error("expected a log")

    expect("answeredBy" in (log.value.revisions[0] ?? {})).toBe(false)
  })

  it("is a no-op run twice, so a redeploy does not need to know whether it ran", async () => {
    const db = drizzle(new PGlite())
    await db.execute(sql.raw(PRE_0029_REVISIONS))

    await ensureTreeStoreSchema(db)
    await expect(ensureTreeStoreSchema(db)).resolves.toBeUndefined()
  })
})

/**
 * On the host 0022 chose, a table in the `public` schema is readable through a
 * key that is public by design from the moment it exists. Locking it is part of
 * creating it, so there is no window and nothing for a deployment document to
 * be remembered about.
 */
describe("ensureTreeStoreSchema locks the tables it creates", () => {
  it("enables row level security on both", async () => {
    const db = await freshDatabase()

    expect(await rowSecurityOn(db, "loom_trees")).toBe(true)
    expect(await rowSecurityOn(db, "loom_revisions")).toBe(true)
  })

  /** A database deployed before the statement existed is locked by the next push. */
  it("locks tables that were created without it", async () => {
    const db = drizzle(new PGlite())
    await db.execute(sql.raw(PRE_0029_REVISIONS))
    expect(await rowSecurityOn(db, "loom_revisions")).toBe(false)

    await ensureTreeStoreSchema(db)

    expect(await rowSecurityOn(db, "loom_revisions")).toBe(true)
  })

  /** Enabling it twice is not an error, so the whole DDL stays idempotent. */
  it("stays enabled when the schema is pushed again", async () => {
    const db = await freshDatabase()
    await ensureTreeStoreSchema(db)

    expect(await rowSecurityOn(db, "loom_trees")).toBe(true)
  })

  /**
   * The reason no policies accompany it: Loom connects as the table's owner
   * (0022 put the runtime on plain SQL, never on the REST layer), and RLS does
   * not apply to an owner unless `FORCE ROW LEVEL SECURITY` is set. If that
   * stopped being true, every read in this file would fail — this states the
   * assumption so the failure would have a name.
   */
  it("does not stand between the owner and its own tables", async () => {
    const db = await freshDatabase()
    const store = postgresTreeStore(db)
    const { tree } = sampleTree()

    await store.create(tree)

    expect(await store.head(tree.treeId)).toMatchObject({ ok: true })
  })
})

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
