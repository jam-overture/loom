import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { describe, expect, it, vi } from "vitest"

import { policyFingerprintOf } from "../runtime/policy-fingerprint.js"
import { policyHistoryOf } from "../runtime/policy-log.js"
import {
  describePolicyLogContract,
  policyNamed,
  recordingOf,
} from "../testing/policy-log-contract.js"
import { rowSecurityOn } from "../testing/row-security.js"

import type { LoomDatabase } from "./database.js"
import { ensurePolicyLogSchema } from "./migrate.js"
import { postgresPolicyLog } from "./postgres-policy-log.js"
import { loomPolicyRevisions } from "./schema.js"

/**
 * Run against PGlite — Postgres compiled to WebAssembly — so these exercise real
 * Postgres semantics with no external database and no Docker, and `pnpm verify`
 * stays green offline.
 */
vi.setConfig({ testTimeout: 30_000 })

const freshDatabase = async (): Promise<LoomDatabase> => {
  const db = drizzle(new PGlite())
  await ensurePolicyLogSchema(db)

  return db
}

describePolicyLogContract("postgresPolicyLog", async () =>
  postgresPolicyLog(await freshDatabase())
)

describe("postgresPolicyLog — Postgres specifics", () => {
  it("creates its table locked, so a REST layer cannot read it the moment it exists", async () => {
    const db = await freshDatabase()

    expect(await rowSecurityOn(db, "loom_policy_revisions")).toBe(true)
  })

  it("is idempotent, so a deployment that runs the DDL twice is a no-op", async () => {
    const db = await freshDatabase()
    const log = postgresPolicyLog(db)

    await log.record(recordingOf(policyNamed("house")))
    await ensurePolicyLogSchema(db)

    expect(await db.select().from(loomPolicyRevisions)).toHaveLength(1)
  })

  it("writes the actor and the fingerprint as columns, not inside the document", async () => {
    const db = await freshDatabase()
    const policy = policyNamed("house", { minimumConfidence: 0.9 })

    await postgresPolicyLog(db).record(recordingOf(policy, { actor: "sam", note: "incident" }))

    const rows = await db.select().from(loomPolicyRevisions)

    expect(rows[0]?.actor).toBe("sam")
    expect(rows[0]?.fingerprint).toBe(policyFingerprintOf(policy))
    expect(rows[0]?.note).toBe("incident")
  })

  it("stores an absent note as null rather than as the string", async () => {
    const db = await freshDatabase()

    await postgresPolicyLog(db).record(recordingOf(policyNamed("house")))

    expect((await db.select().from(loomPolicyRevisions))[0]?.note).toBeNull()
  })

  /**
   * The property the composite primary key is there for, and the reason this
   * implementation needs no transaction. Both calls read the same head before
   * either writes, so both compute revision 2 — and the database refuses the
   * second rather than letting two policies claim one revision.
   */
  it("refuses the loser when two recorders race at the same head", async () => {
    const db = await freshDatabase()
    const log = postgresPolicyLog(db)

    await log.record(recordingOf(policyNamed("house")))

    const [first, second] = await Promise.all([
      log.record(recordingOf(policyNamed("house", { breadthThreshold: 9 }), { actor: "a" })),
      log.record(recordingOf(policyNamed("house", { breadthThreshold: 20 }), { actor: "b" })),
    ])

    const outcomes = [first, second]

    expect(outcomes.filter((outcome) => outcome.ok)).toHaveLength(1)

    const refused = outcomes.find((outcome) => !outcome.ok)
    expect(refused && !refused.ok && refused.error.code).toBe("out-of-date")

    const rows = await db.select().from(loomPolicyRevisions)
    expect(rows.map((row) => row.revision).sort()).toEqual([1, 2])
  })

  it("tells the loser the revision that is current now", async () => {
    const db = await freshDatabase()
    const log = postgresPolicyLog(db)

    await log.record(recordingOf(policyNamed("house")))

    const [first, second] = await Promise.all([
      log.record(recordingOf(policyNamed("house", { breadthThreshold: 9 }), { actor: "a" })),
      log.record(recordingOf(policyNamed("house", { breadthThreshold: 20 }), { actor: "b" })),
    ])

    const refused = [first, second].find((outcome) => !outcome.ok)

    expect(refused && !refused.ok && refused.error.code === "out-of-date" && refused.error.current).toBe(
      2
    )
  })

  /**
   * A row written by a build that knew a knob this one does not is read as a row
   * this build cannot read, rather than as a policy missing a field. The
   * distinction is `unreadable` against `unavailable`: one is waited out and the
   * other is gone and looked at.
   */
  it("reports a stored policy it cannot read as unreadable, naming the field", async () => {
    const db = await freshDatabase()

    await db.insert(loomPolicyRevisions).values({
      policyId: "house",
      revision: 1,
      fingerprint: "abcdef12:0123456789abcdef",
      policy: { policyId: "house", minimumConfidence: "very" },
      actor: "sam",
      recordedAt: "2026-10-08T09:00:00.000Z",
      note: null,
    })

    const read = await postgresPolicyLog(db).current("house")

    expect(read.ok).toBe(false)
    expect(!read.ok && read.error.code).toBe("unreadable")
    expect(!read.ok && read.error.code === "unreadable" && read.error.detail).toContain(
      "minimumConfidence"
    )
  })

  it("answers a history a reader can fold into the edits between its revisions", async () => {
    const db = await freshDatabase()
    const log = postgresPolicyLog(db)

    await log.record(recordingOf(policyNamed("house"), { actor: "dana" }))
    await log.record(
      recordingOf(policyNamed("house", { minimumConfidence: 0.9 }), { actor: "sam" })
    )
    await log.record(
      recordingOf(policyNamed("house", { minimumConfidence: 0.9, breadthThreshold: 20 }), {
        actor: "ash",
      })
    )

    const page = await log.revisions("house")

    expect(page.ok).toBe(true)
    if (!page.ok) return

    const history = policyHistoryOf(page.value.revisions)

    expect(history).toHaveLength(2)
    expect(history[0]?.to.actor).toBe("sam")
    expect(history[0]?.change.direction).toBe("stricter")
    expect(history[1]?.to.actor).toBe("ash")
    expect(history[1]?.change.direction).toBe("looser")
  })
})
