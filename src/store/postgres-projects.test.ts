import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { describe, expect, it, vi } from "vitest"

import { projectIdSchema } from "../project/project.js"
import { describeProjectStoreContract, projectFixture } from "../testing/project-contract.js"
import { rowSecurityOn } from "../testing/row-security.js"

import type { LoomDatabase } from "./database.js"
import { ensureProjectStoreSchema } from "./migrate.js"
import { postgresProjectStore } from "./postgres-projects.js"

/**
 * Against PGlite — Postgres compiled to WebAssembly — so these exercise real
 * Postgres semantics with no external database and no Docker, on the same terms
 * the other three stores' suites do.
 *
 * It is the only way the three facts below can be checked at all: a `Map`
 * cannot have a unique violation, cannot have row level security, and cannot
 * disagree with a column about what fits in it.
 */

/** A fresh WASM Postgres per test costs seconds, not milliseconds. */
vi.setConfig({ testTimeout: 30_000 })

const freshDatabase = async (): Promise<LoomDatabase> => {
  const db = drizzle(new PGlite())
  await ensureProjectStoreSchema(db)

  return db
}

describeProjectStoreContract(
  "postgresProjectStore",
  async () => postgresProjectStore(await freshDatabase())
)

describe("postgresProjectStore beyond the contract", () => {
  it("locks the table on creation, so there is no window in which it is exposed", async () => {
    const db = await freshDatabase()

    expect(await rowSecurityOn(db, "loom_projects")).toBe(true)
  })

  it("is a no-op when the schema is already there", async () => {
    const db = await freshDatabase()
    const store = postgresProjectStore(db)
    await store.create(projectFixture())

    await ensureProjectStoreSchema(db)

    const listed = await store.list()
    expect(listed.ok && listed.value).toHaveLength(1)
  })

  /**
   * The race the primary key exists for. Both inserts are in flight before
   * either resolves, so this is the database arbitrating rather than the code
   * checking-then-writing — which is the thing that cannot be tested against a
   * `Map` at all, and the one whose loser would otherwise take ownership of the
   * winner's trees, holds and governance record.
   */
  it("lets exactly one of two simultaneous creations win", async () => {
    const store = postgresProjectStore(await freshDatabase())
    const id = projectIdSchema.parse("prj_contested")

    const [first, second] = await Promise.all([
      store.create(projectFixture({ projectId: id, name: "One" })),
      store.create(projectFixture({ projectId: id, name: "Two" })),
    ])

    expect([first?.ok, second?.ok].filter(Boolean)).toHaveLength(1)
    const loser = first?.ok ? second : first
    expect(loser?.ok === false && loser.error.code).toBe("already-exists")

    const listed = await store.list()
    expect(listed.ok && listed.value).toHaveLength(1)
  })

  it("reports a database that is not there rather than throwing", async () => {
    const pg = new PGlite()
    const store = postgresProjectStore(drizzle(pg))
    await pg.close()

    const listed = await store.list()

    expect(listed.ok === false && listed.error.code).toBe("unavailable")
  })
})
