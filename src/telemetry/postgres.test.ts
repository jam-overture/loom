import { PGlite } from "@electric-sql/pglite"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/pglite"
import { describe, expect, it, vi } from "vitest"

import { treeIdSchema } from "../ids.js"
import type { LoomDatabase } from "../store/database.js"
import { describeTelemetryJournalContract, sampleEpisode } from "../testing/journal-contract.js"
import { FIXED_INSTANT } from "../testing/doubles.js"

import { ensureTelemetrySchema } from "./migrate.js"
import { postgresTelemetryJournal } from "./postgres.js"
import { loomTelemetry } from "./schema.js"

/**
 * Run against PGlite — Postgres compiled to WebAssembly — so these exercise real
 * Postgres semantics with no external database and no Docker, and `pnpm verify`
 * stays green offline.
 */
vi.setConfig({ testTimeout: 30_000 })

const freshDatabase = async (): Promise<LoomDatabase> => {
  const db = drizzle(new PGlite())
  await ensureTelemetrySchema(db)

  return db
}

describeTelemetryJournalContract("postgresTelemetryJournal", async () =>
  postgresTelemetryJournal(await freshDatabase())
)

describe("postgresTelemetryJournal — Postgres specifics", () => {
  it("writes a batch as one statement, so a reader never sees half a request", async () => {
    const db = await freshDatabase()
    const journal = postgresTelemetryJournal(db)
    const episode = sampleEpisode()

    await journal.record(episode)

    const rows = await db.select().from(loomTelemetry)

    expect(rows).toHaveLength(episode.length)
    expect(rows.map((row) => row.seq)).toEqual([1, 2, 3, 4])
  })

  it("is idempotent about its schema", async () => {
    const db = await freshDatabase()
    await ensureTelemetrySchema(db)
    await postgresTelemetryJournal(db).record(sampleEpisode())

    expect((await db.select().from(loomTelemetry)).length).toBeGreaterThan(0)
  })

  /**
   * The boundary the journal shares with the store: a document written by older
   * code must be reported rather than served. A fold that received a record it
   * could not understand would produce a number nobody could trust.
   */
  it("reports a stored record that no longer parses rather than returning it", async () => {
    const db = await freshDatabase()
    const journal = postgresTelemetryJournal(db)

    await db.insert(loomTelemetry).values({
      treeId: treeIdSchema.parse("t_legacy"),
      occurredAt: FIXED_INSTANT,
      event: { type: "something-we-stopped-emitting" },
    })

    const page = await journal.read()

    expect(page.ok).toBe(false)
    expect(page.ok ? "" : page.error.code).toBe("unavailable")
  })

  it("reports a failed write rather than throwing at the caller", async () => {
    const db = await freshDatabase()
    const journal = postgresTelemetryJournal(db)
    await db.execute(sql.raw("DROP TABLE loom_telemetry"))

    const written = await journal.record(sampleEpisode())

    expect(written.ok).toBe(false)
    expect(written.ok ? "" : written.error.code).toBe("unavailable")
  })
})
