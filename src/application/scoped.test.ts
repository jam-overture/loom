import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { describe, expect, it, vi } from "vitest"

import { heldProposalFixture } from "../testing/hold-contract.js"
import { sampleEpisode } from "../testing/journal-contract.js"
import { policyNamed, recordingOf } from "../testing/policy-log-contract.js"
import { ensureHoldStoreSchema, ensurePolicyLogSchema } from "../store/migrate.js"
import { postgresHoldStore } from "../store/postgres-holds.js"
import { postgresPolicyLog } from "../store/postgres-policy-log.js"
import { ensureTelemetrySchema } from "../telemetry/migrate.js"
import { postgresTelemetryJournal } from "../telemetry/postgres.js"

import { applicationIdSchema } from "./application.js"

/**
 * The three tables that needed only the application dimension, held to the claim
 * the tree store was held to: **one application's handle cannot see another
 * application's row.**
 *
 * The five reader-signal tables are deliberately absent. They need the audience
 * dimension as well
 * ([0263](../../decisions/0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md)
 * clause 5) and should take both in one migration rather than being moved
 * twice.
 *
 * Against PGlite rather than the memory stores, for the reason
 * `application.test.ts` records: an in-memory store is isolated by having its own
 * map, so it proves nothing about a `WHERE` clause.
 *
 * **Built on the suite's own fixtures.** The first draft invented the shapes
 * and cast them with `as never`, which stored rows the stores would not read
 * back — so three assertions were passing on *nothing was found* while
 * appearing to test isolation.
 */

vi.setConfig({ testTimeout: 30_000 })

const MINE = applicationIdSchema.parse("app_mine")
const YOURS = applicationIdSchema.parse("app_yours")

describe("the review queue, which is the one 0220 named", () => {
  const shared = async () => {
    const db = drizzle(new PGlite())
    await ensureHoldStoreSchema(db)

    return db
  }

  const stores = async () => {
    const db = await shared()

    return {
      mine: postgresHoldStore(db, { application: MINE }),
      yours: postgresHoldStore(db, { application: YOURS }),
    }
  }

  /**
   * 0220, in the words that made this the example: *a hold listing that spanned
   * two apps would put one app's changes in another's queue, which is the one
   * failure a governance surface cannot have.*
   */
  it("does not put one application's held change in another's queue", async () => {
    const { mine, yours } = await stores()
    const held = heldProposalFixture()

    expect((await mine.hold(held)).ok).toBe(true)

    const theirs = await yours.waiting()
    const ours = await mine.waiting()

    expect({
      yours: theirs.ok === true ? theirs.value.held.length : -1,
      mine: ours.ok === true ? ours.value.held.length : -1,
    }).toEqual({ yours: 0, mine: 1 })
  })

  it("does not answer for another application's hold by id", async () => {
    const { mine, yours } = await stores()
    const held = heldProposalFixture()

    await mine.hold(held)

    const theirs = await yours.get(held.proposalId)
    const ours = await mine.get(held.proposalId)

    expect({ yours: theirs.ok, mine: ours.ok }).toEqual({ yours: false, mine: true })
  })

  it("does not list another application's holds against a tree of the same id", async () => {
    const { mine, yours } = await stores()
    const held = heldProposalFixture()

    await mine.hold(held)

    const theirs = await yours.forTree(held.treeId)
    const ours = await mine.forTree(held.treeId)

    expect({
      yours: theirs.ok === true ? theirs.value.held.length : -1,
      mine: ours.ok === true ? ours.value.held.length : -1,
    }).toEqual({ yours: 0, mine: 1 })
  })

  /**
   * The key widened rather than loosened. Two applications may each hold a proposal
   * of the same id — they were never the same proposal — and within one application
   * a second attempt still loses to the database rather than to a check.
   */
  it("keeps 'already held' a fact the database establishes, within an application", async () => {
    const { mine, yours } = await stores()
    const held = heldProposalFixture()

    await mine.hold(held)

    expect((await yours.hold(held)).ok).toBe(true)

    const again = await mine.hold(held)

    expect(again.ok === false ? again.error.code : "held").toBe("already-held")
  })

  it("does not release another application's hold", async () => {
    const { mine, yours } = await stores()
    const held = heldProposalFixture()

    await mine.hold(held)
    await yours.release(held.proposalId)

    const still = await mine.get(held.proposalId)

    expect(still.ok).toBe(true)
  })
})

describe("the policy log", () => {
  const stores = async () => {
    const db = drizzle(new PGlite())
    await ensurePolicyLogSchema(db)

    return {
      mine: postgresPolicyLog(db, { application: MINE }),
      yours: postgresPolicyLog(db, { application: YOURS }),
    }
  }

  it("does not show one application's policy as another's current", async () => {
    const { mine, yours } = await stores()
    const policy = policyNamed("pol_main")

    expect((await mine.record(recordingOf(policy))).ok).toBe(true)

    const theirs = await yours.current("pol_main")
    const ours = await mine.current("pol_main")

    expect({ yours: theirs.ok, mine: ours.ok }).toEqual({ yours: false, mine: true })
  })

  /**
   * The read this scoping exists for. `judgedUnder` resolves the fingerprint on
   * a disposition into the policy text it was judged under — unscoped, it would
   * answer with another application's policy whenever two happened to fingerprint
   * alike, which is a change reported as judged under rules it never met.
   */
  it("does not resolve a fingerprint against another application's policy", async () => {
    const { mine, yours } = await stores()

    expect((await mine.record(recordingOf(policyNamed("pol_main")))).ok).toBe(true)

    /*
     * Read off the log rather than off what `record` handed back, because the
     * fingerprint a disposition carries is the stored one — and asking with
     * any other value proves nothing about scoping, which is how the first
     * draft of this assertion got a false negative.
     */
    const current = await mine.current("pol_main")
    if (!current.ok) throw new Error("the log did not keep the policy it took")

    const fingerprint = current.value.fingerprint

    const theirs = await yours.judgedUnder("pol_main", fingerprint)
    const ours = await mine.judgedUnder("pol_main", fingerprint)

    expect(
      {
        yours: theirs.ok === true ? theirs.value.outcome : "failed",
        mine: ours.ok === true ? ours.value.outcome : "failed",
      },
      JSON.stringify({ theirs, ours })
    ).toEqual({ yours: "unrecorded", mine: "recorded" })
  })
})

describe("the journal", () => {
  const stores = async () => {
    const db = drizzle(new PGlite())
    await ensureTelemetrySchema(db)

    return {
      mine: postgresTelemetryJournal(db, { application: MINE }),
      yours: postgresTelemetryJournal(db, { application: YOURS }),
    }
  }

  it("does not show one application's records to the other", async () => {
    const { mine, yours } = await stores()
    const episode = sampleEpisode()

    expect((await mine.record(episode)).ok).toBe(true)

    const theirs = await yours.read()
    const ours = await mine.read()

    expect({
      yours: theirs.ok === true ? theirs.value.records.length : -1,
      mine: ours.ok === true ? ours.value.records.length : -1,
    }).toEqual({ yours: 0, mine: episode.length })
  })
})
