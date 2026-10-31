import { describe, expect, it, vi } from "vitest"

import { pgliteTemplate } from "../../tools/pglite/template.js"
import { sequentialIdFactory } from "../ids.js"
import { TREE_STORE_DDL } from "../store/migrate.js"
import { ensureTreeStoreSchema } from "../store/migrate.js"
import { postgresTreeStore } from "../store/postgres.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"

import { DEFAULT_APPLICATION_ID, applicationIdSchema, applicationSchema } from "./application.js"
import { DEFAULT_PROJECT_ID } from "../project/project.js"

/**
 * The identifier above the tree, and the one property it exists for.
 *
 * [0220](../../decisions/0220-an-app-is-a-registry-a-policy-and-a-store-and-loom-has-one-of-each.md)
 * priced a second app and named the failure it would cause if done badly: *a
 * hold listing that spanned two apps would put one app's changes in another's
 * queue, which is the one failure a governance surface cannot have.* Every
 * assertion here is a version of **one application's handle cannot see another
 * application's row**.
 */

const treeIn = (prefix: string) => {
  const ids = sequentialIdFactory(prefix)

  return createTree(buildElement(ids, { type: "loom.page", props: {}, children: [] }), ids)
}

describe("an application id", () => {
  it("is spelled, because a person reads it off a screen and pastes it", () => {
    expect(applicationIdSchema.safeParse("app_storefront").success).toBe(true)
    expect(applicationIdSchema.safeParse("p_storefront").success).toBe(false)
    expect(applicationIdSchema.safeParse("storefront").success).toBe(false)
  })

  /**
   * The DDL cannot import a TypeScript constant, so the default is written out
   * in both places. This is the assertion that keeps them the same — without
   * it, a rename here would silently leave every migrated row in an application
   * nothing reads.
   */
  it("is the same default the migration writes", () => {
    const declaring = TREE_STORE_DDL.filter((statement) => statement.includes("application_id text"))

    /* Two tables created, two tables altered. Every one of them sets it. */
    expect(declaring.length).toBe(4)
    for (const statement of declaring) {
      expect(statement, statement).toContain(`DEFAULT '${DEFAULT_APPLICATION_ID}'`)
    }
  })

  it("names an application whose shape is thin on purpose", () => {
    expect(
      applicationSchema.safeParse({
        applicationId: DEFAULT_APPLICATION_ID,
        projectId: DEFAULT_PROJECT_ID,
        name: "Storefront",
        createdAt: "2026-10-12T00:00:00.000Z",
      }).success
    ).toBe(true)

    /* The registry, the policy and the credential are each somebody else's. */
    expect(
      applicationSchema.safeParse({
        applicationId: DEFAULT_APPLICATION_ID,
        projectId: DEFAULT_PROJECT_ID,
        name: "Storefront",
        createdAt: "2026-10-12T00:00:00.000Z",
        registry: {},
      }).success
    ).toBe(false)
  })
})

describe("the migration a database that predates applications gets", () => {
  it("adds the column before it widens either key", () => {
    const at = (needle: string): number =>
      TREE_STORE_DDL.findIndex((statement) => statement.includes(needle))

    const addsColumn = at("ADD COLUMN IF NOT EXISTS application_id")
    const widensKey = at("ADD PRIMARY KEY (application_id, tree_id)")

    expect(addsColumn).toBeGreaterThanOrEqual(0)
    expect(widensKey).toBeGreaterThan(addsColumn)
  })

  /**
   * Dropping by the name Postgres gives a primary key and re-adding is what
   * makes the pair idempotent. A statement that dropped without `IF EXISTS`
   * would fail the second time this is run, which is every deploy.
   */
  it("can be run twice", () => {
    const drops = TREE_STORE_DDL.filter((statement) => statement.includes("DROP CONSTRAINT"))

    expect(drops.length).toBe(2)
    for (const statement of drops) expect(statement).toContain("IF EXISTS")
  })

  it("widens both keys, not only the snapshot's", () => {
    const keys = TREE_STORE_DDL.filter((statement) => statement.includes("ADD PRIMARY KEY"))

    expect(keys).toEqual([
      "ALTER TABLE loom_trees ADD PRIMARY KEY (application_id, tree_id)",
      "ALTER TABLE loom_revisions ADD PRIMARY KEY (application_id, tree_id, revision)",
    ])
  })
})

/**
 * Against a real database, because this is the only place the claim is real.
 *
 * **The memory store proves nothing here and the first draft of this file
 * pretended otherwise.** Every `memoryTreeStore()` call has always built its
 * own `Map`, so two handles are isolated whether or not the key carries a
 * application — three assertions passed, and passed just as happily with the
 * application stripped out of the key. The scoping that matters is the `WHERE`
 * clause, and it only exists in Postgres.
 *
 * PGlite is Postgres compiled to WebAssembly, which is what `postgres.test.ts`
 * already uses: one database, two handles, no Docker.
 */
describe("two applications in one database", () => {
  vi.setConfig({ testTimeout: 30_000 })

  const shared = pgliteTemplate(ensureTreeStoreSchema)

  it("lets the same tree id exist in both, which is what 'unique within an application' means", async () => {
    const db = await shared()
    const tree = treeIn("same")

    const mine = postgresTreeStore(db, { application: applicationIdSchema.parse("app_mine") })
    const yours = postgresTreeStore(db, { application: applicationIdSchema.parse("app_yours") })

    expect((await mine.create(tree)).ok).toBe(true)
    expect((await yours.create(tree)).ok).toBe(true)

    /* And a second time in the same application is still a collision. */
    const again = await mine.create(tree)

    expect(again.ok === false ? again.error.code : "created").toBe("already-exists")
  })

  it("does not show one application's tree to the other", async () => {
    const db = await shared()
    const mine = postgresTreeStore(db, { application: applicationIdSchema.parse("app_mine") })
    const yours = postgresTreeStore(db, { application: applicationIdSchema.parse("app_yours") })

    const tree = treeIn("mine")
    await mine.create(tree)

    const read = await yours.head(tree.treeId)

    expect(read.ok === false ? read.error.code : "found").toBe("not-found")
  })

  it("does not list one application's trees under the other", async () => {
    const db = await shared()
    const mine = postgresTreeStore(db, { application: applicationIdSchema.parse("app_mine") })
    const yours = postgresTreeStore(db, { application: applicationIdSchema.parse("app_yours") })

    await mine.create(treeIn("one"))
    await mine.create(treeIn("two"))
    await yours.create(treeIn("three"))

    const listed = await yours.list({})

    expect(listed.ok === true ? listed.value.trees.map((row) => row.treeId) : ["failed"]).toEqual([
      treeIn("three").treeId,
    ])
  })

  /**
   * The failure 0220 named: *a hold listing that spanned two apps would put
   * one app's changes in another's queue.* The log is the same shape of claim,
   * and it is the one a reviewer reads before answering.
   */
  it("does not show one application's log to the other", async () => {
    const db = await shared()
    const mine = postgresTreeStore(db, { application: applicationIdSchema.parse("app_mine") })
    const yours = postgresTreeStore(db, { application: applicationIdSchema.parse("app_yours") })

    const tree = treeIn("same")
    await mine.create(tree)
    await yours.create(tree)

    const log = await yours.revisions(tree.treeId)

    expect(log.ok === true ? log.value.revisions.length : -1).toBe(0)
  })

  it("is the default application when the caller named none", async () => {
    const db = await shared()
    const silent = postgresTreeStore(db)
    const named = postgresTreeStore(db, { application: DEFAULT_APPLICATION_ID })

    const tree = treeIn("quiet")
    await silent.create(tree)

    const read = await named.head(tree.treeId)

    expect(read.ok).toBe(true)
  })
})
