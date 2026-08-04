import { PGlite } from "@electric-sql/pglite"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/pglite"
import { describe, expect, it, vi } from "vitest"

import { treeIdSchema } from "../ids.js"
import type { LoomDatabase } from "../store/database.js"
import { describeTelemetryJournalContract, sampleEpisode } from "../testing/journal-contract.js"
import { rowSecurityOn } from "../testing/row-security.js"
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

  it("reports a failed deletion rather than throwing at the caller", async () => {
    const db = await freshDatabase()
    const journal = postgresTelemetryJournal(db)
    await db.execute(sql.raw("DROP TABLE loom_telemetry"))

    const forgotten = await journal.forget({ before: 10 })

    expect(forgotten.ok).toBe(false)
    expect(forgotten.ok ? "" : forgotten.error.code).toBe("unavailable")
  })

  it("stamps recorded_at itself rather than taking it from the writer", async () => {
    const db = await freshDatabase()
    const journal = postgresTelemetryJournal(db)
    await journal.record(sampleEpisode())

    const page = await journal.read()
    const stamps = page.ok ? page.value.records.map((record) => record.recordedAt) : []

    expect(stamps).toHaveLength(4)
    expect(stamps.every((stamp) => stamp !== FIXED_INSTANT)).toBe(true)
    expect(stamps.every((stamp) => stamp.endsWith("Z"))).toBe(true)
  })
})

/**
 * The table is exposed to a public REST key the moment it exists on the host
 * 0022 chose, so the lock is part of creating it rather than a step someone
 * remembers.
 */
describe("ensureTelemetrySchema", () => {
  it("leaves row level security enabled on the journal", async () => {
    const db = await freshDatabase()

    expect(await rowSecurityOn(db, "loom_telemetry")).toBe(true)
  })

  it("is a no-op run twice, so a redeploy does not need to know whether it ran", async () => {
    const db = await freshDatabase()
    await ensureTelemetrySchema(db)

    expect(await rowSecurityOn(db, "loom_telemetry")).toBe(true)
  })

  /** A table created before the statement existed is locked by the next push. */
  it("locks a journal that was created without it", async () => {
    const db = drizzle(new PGlite())
    await db.execute(
      sql.raw(`CREATE TABLE loom_telemetry (
        seq bigserial PRIMARY KEY,
        tree_id text NOT NULL,
        occurred_at text NOT NULL,
        event jsonb NOT NULL,
        recorded_at timestamptz NOT NULL DEFAULT now()
      )`)
    )
    expect(await rowSecurityOn(db, "loom_telemetry")).toBe(false)

    await ensureTelemetrySchema(db)

    expect(await rowSecurityOn(db, "loom_telemetry")).toBe(true)
  })
})
