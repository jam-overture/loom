import { describe, expect, it, vi } from "vitest"

import { pgliteTemplate } from "../../tools/pglite/template.js"
import { heldProposalFixture } from "../testing/hold-contract.js"
import { sampleEpisode } from "../testing/journal-contract.js"
import { policyNamed, recordingOf } from "../testing/policy-log-contract.js"
import { ensureHoldStoreSchema, ensurePolicyLogSchema } from "../store/migrate.js"
import { postgresHoldStore } from "../store/postgres-holds.js"
import { postgresPolicyLog } from "../store/postgres-policy-log.js"
import { ensureReaderSignalsSchema } from "../signals/migrate.js"
import {
  postgresReaderRegionStore,
  postgresReaderSignalJournal,
  postgresReaderTallyStore,
} from "../signals/postgres.js"
import type { FunnelAnswer, ReaderTally } from "../signals/rollup.js"
import type { ReaderRegionCount } from "../signals/region.js"
import type { RevisionViews } from "../signals/page-views.js"
import {
  batchOf,
  nodeId,
  primitiveType,
  region,
  viewed,
  TREE,
} from "../testing/reader-signal-contract.js"
import { ensureTelemetrySchema } from "../telemetry/migrate.js"
import { postgresTelemetryJournal } from "../telemetry/postgres.js"

import { applicationIdSchema } from "./application.js"

/**
 * Every table outside the tree store, held to the claim the tree store was held
 * to: **one application's handle cannot see another application's row.**
 *
 * The five reader-signal tables were deliberately absent until now, to take the
 * application and the audience dimension
 * ([0263](../../decisions/0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md)
 * clause 5) in one migration rather than being moved twice. They take the
 * application alone instead:
 * [0273](../../decisions/0273-the-reader-tables-take-the-application-now-and-the-audience-when-it-is-ratified.md)
 * holds the argument, which is that 0263 is Proposed and the lane waiting on
 * this one is blocked today.
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
  const shared = pgliteTemplate(ensureHoldStoreSchema)

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
  const shared = pgliteTemplate(ensurePolicyLogSchema)

  const stores = async () => {
    const db = await shared()

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
  const shared = pgliteTemplate(ensureTelemetrySchema)

  const stores = async () => {
    const db = await shared()

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

  /**
   * The assertion this file was missing, and it was failing.
   *
   * `forget` was the one statement in `telemetry/postgres.ts` that did not go
   * through the handle's own filter when the application landed, and `seq` is a
   * `bigserial` counting across every application in the database — so
   * retention run for one was deleting every other's records below the same
   * number. Nothing had reached it because nothing builds a second handle yet,
   * which is the only reason this is a test rather than an incident.
   */
  it("does not forget another application's records", async () => {
    const { mine, yours } = await stores()
    const episode = sampleEpisode()

    expect((await mine.record(episode)).ok).toBe(true)

    const forgotten = await yours.forget({ before: 1_000_000 })
    const ours = await mine.read()

    expect({
      removed: forgotten.ok === true ? forgotten.value.removed : -1,
      mine: ours.ok === true ? ours.value.records.length : -1,
    }).toEqual({ removed: 0, mine: episode.length })
  })
})

/**
 * The five reader tables, which are the measurement rather than the governance.
 *
 * The failure here is quieter than the review queue's and worse to discover:
 * a hold in the wrong queue is visible on a screen, where two applications'
 * readers summed into one tally is a number that looks right and cannot be
 * taken apart again afterwards. 0263 clause 5 says it of audiences and it is
 * the same sentence about applications.
 *
 * **Both sides of every assertion are checked.** The note at the top of this
 * file is about three assertions that passed on *nothing was found* while
 * appearing to test isolation, so each of these reads its own application too
 * and expects the row it wrote — a filter that matched nothing would fail here
 * rather than look like isolation.
 */
describe("the reader tables", () => {
  const AT = "2026-10-12T00:00:00.000Z"

  const shared = pgliteTemplate(ensureReaderSignalsSchema)

  const tally = (overrides: Partial<ReaderTally> = {}): ReaderTally => ({
    treeId: TREE,
    revision: 1,
    nodeId: nodeId("hero"),
    type: primitiveType("loom.section"),
    views: 1,
    reached: 1,
    engaged: 0,
    dwellMs: 500,
    activations: 0,
    opens: 0,
    closes: 0,
    completions: 0,
    ...overrides,
  })

  const answer: FunnelAnswer = {
    treeId: TREE,
    revision: 1,
    pair: {
      from: { nodeId: nodeId("pricing"), kind: "viewed" },
      to: { nodeId: nodeId("buy"), kind: "activated" },
    },
    reached: 40,
    converted: 9,
  }

  const opening: RevisionViews = { treeId: TREE, revision: 1, views: 3 }

  const counted: ReaderRegionCount = {
    treeId: TREE,
    revision: 1,
    region: region("GB"),
    views: 2,
  }

  describe("the buffer", () => {
    const journals = async () => {
      const db = await shared()

      return {
        mine: postgresReaderSignalJournal(db, { application: MINE }),
        yours: postgresReaderSignalJournal(db, { application: YOURS }),
      }
    }

    it("does not read one application's batches as another's", async () => {
      const { mine, yours } = await journals()

      expect((await mine.receive([batchOf([viewed("hero")])])).ok).toBe(true)

      const theirs = await yours.read()
      const ours = await mine.read()

      expect({
        yours: theirs.ok === true ? theirs.value.batches.length : -1,
        mine: ours.ok === true ? ours.value.batches.length : -1,
      }).toEqual({ yours: 0, mine: 1 })
    })

    /**
     * `seq` is a `bigserial`, so it counts across every application in the
     * database. An unfiltered `DELETE` below a sequence number — which is what
     * retention is — would therefore have dropped another application's buffer,
     * and the row this asserts on is one with a *lower* `seq` than the cutoff.
     */
    it("does not forget another application's batches", async () => {
      const { mine, yours } = await journals()

      expect((await mine.receive([batchOf([viewed("hero")])])).ok).toBe(true)

      const forgotten = await yours.forget({ before: 1_000_000 })
      const ours = await mine.read()

      expect({
        removed: forgotten.ok === true ? forgotten.value.removed : -1,
        mine: ours.ok === true ? ours.value.batches.length : -1,
      }).toEqual({ removed: 0, mine: 1 })
    })
  })

  describe("the counters", () => {
    const stores = async () => {
      const db = await shared()

      return {
        mine: postgresReaderTallyStore(db, { application: MINE }),
        yours: postgresReaderTallyStore(db, { application: YOURS }),
      }
    }

    it("does not read one application's tallies as another's", async () => {
      const { mine, yours } = await stores()

      expect((await mine.apply({ tallies: [tally()], funnels: [] }, AT)).ok).toBe(true)

      const theirs = await yours.tallies()
      const ours = await mine.tallies()

      expect({
        yours: theirs.ok === true ? theirs.value.length : -1,
        mine: ours.ok === true ? ours.value.length : -1,
      }).toEqual({ yours: 0, mine: 1 })
    })

    /**
     * The claim the widened key exists for, and the one this whole change is
     * about: the upsert is additive *within* an application, so two
     * applications counting the same node of the same revision keep two rows
     * instead of one row holding the sum. Before the key widened, the second
     * `apply` would have found the first's row on conflict and added to it.
     */
    it("does not add one application's readers to another's count", async () => {
      const { mine, yours } = await stores()

      await mine.apply({ tallies: [tally({ views: 7 })], funnels: [] }, AT)
      await yours.apply({ tallies: [tally({ views: 2 })], funnels: [] }, AT)

      const theirs = await yours.tallies()
      const ours = await mine.tallies()

      expect({
        yours: theirs.ok === true ? theirs.value.map((row) => row.views) : [],
        mine: ours.ok === true ? ours.value.map((row) => row.views) : [],
      }).toEqual({ yours: [2], mine: [7] })
    })

    it("does not read one application's funnels as another's", async () => {
      const { mine, yours } = await stores()

      expect((await mine.apply({ tallies: [], funnels: [answer] }, AT)).ok).toBe(true)

      const theirs = await yours.funnels()
      const ours = await mine.funnels()

      expect({
        yours: theirs.ok === true ? theirs.value.length : -1,
        mine: ours.ok === true ? ours.value.length : -1,
      }).toEqual({ yours: 0, mine: 1 })
    })

    it("does not count one application's page views as another's", async () => {
      const { mine, yours } = await stores()

      expect((await mine.opened([opening], AT)).ok).toBe(true)

      const theirs = await yours.pageViews()
      const ours = await mine.pageViews()

      expect({
        yours: theirs.ok === true ? theirs.value.map((row) => row.opened) : [],
        mine: ours.ok === true ? ours.value.map((row) => row.opened) : [],
      }).toEqual({ yours: [], mine: [3] })
    })
  })

  describe("the regions", () => {
    const stores = async () => {
      const db = await shared()

      return {
        mine: postgresReaderRegionStore(db, { application: MINE }),
        yours: postgresReaderRegionStore(db, { application: YOURS }),
      }
    }

    it("does not read one application's regions as another's", async () => {
      const { mine, yours } = await stores()

      expect((await mine.count([counted], AT)).ok).toBe(true)

      const theirs = await yours.regions()
      const ours = await mine.regions()

      expect({
        yours: theirs.ok === true ? theirs.value.length : -1,
        mine: ours.ok === true ? ours.value.length : -1,
      }).toEqual({ yours: 0, mine: 1 })
    })

    it("does not add one application's region count to another's", async () => {
      const { mine, yours } = await stores()

      await mine.count([counted], AT)
      await yours.count([{ ...counted, views: 5 }], AT)

      const theirs = await yours.regions()
      const ours = await mine.regions()

      expect({
        yours: theirs.ok === true ? theirs.value.map((row) => row.views) : [],
        mine: ours.ok === true ? ours.value.map((row) => row.views) : [],
      }).toEqual({ yours: [5], mine: [2] })
    })
  })
})
