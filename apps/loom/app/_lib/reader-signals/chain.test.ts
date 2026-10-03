import { describe, expect, it } from "vitest"

import {
  collectReaderSignals,
  createIntakeGate,
  DEFAULT_INTAKE_POLICY,
  DEFAULT_REGION_FLOOR,
  describeCollection,
  memoryReaderRegionStore,
  memoryReaderSignalJournal,
  memoryReaderTallyStore,
  pageViewReadingOf,
  regionReadingOf,
  type ReaderTallyStore,
} from "@jam-overture/loom/signals"

import type { TreeId } from "@jam-overture/loom"

import { receiveReaderSignals, type Intake } from "./receive"

/**
 * The whole chain, from a body a browser posts to a number the portal reads.
 *
 * Every link in it was already tested alone and the chain did not exist: the
 * receiving half was published and called by nothing, so a counter could not be
 * made non-empty by any code path a deployment runs. Three findings from three
 * lanes said so, and "each piece passes its own tests" is exactly the evidence
 * that was true the whole time it was broken.
 *
 * So this asserts the join rather than the pieces. It posts what a page sends,
 * through the endpoint, into the buffer, through the collector, and reads the
 * tally out the far end — and a break anywhere along it fails here even while
 * every unit test beside it stays green.
 */

/**
 * A clock the batches are stamped by, so ripeness is decided rather than raced.
 * It reads ISO, like every clock in this runtime — a number here parses as a
 * year and makes everything ripe, which is a green test that proves nothing.
 */
const at = (ms: number) => ({ now: () => new Date(ms).toISOString() })

const SETTINGS = {
  chosen: { state: "on" },
  hops: 1,
  region: {
    chosen: { state: "on" },
    header: "x-vercel-ip-country",
    floor: { state: "default", floor: DEFAULT_REGION_FLOOR },
  },
} as const

const batch = (nodeId: string, dwellMs: number, over: Record<string, unknown> = {}) => ({
  treeId: "t_landing",
  revision: 4,
  sentAt: 1_000,
  view: "0123456789abcdef0123456789abcdef",
  ...over,
  signals: [
    { kind: "viewed", nodeId, type: "loom.section", at: 1_000 },
    { kind: "dwelled", nodeId, type: "loom.section", ms: dwellMs },
  ],
})

/** The page-view counter as a screen would read it, which is what the portal will do. */
const readingOf = async (store: ReaderTallyStore) => {
  const rows = await store.pageViews()

  return pageViewReadingOf(rows.ok ? rows.value : [])
}

const post = (body: unknown, headers: Record<string, string> = {}): Request =>
  new Request("https://loom.test/api/reader-signals", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })

describe("a batch a browser posts becomes a number the portal can read", () => {
  it("arrives, is counted, and is forgotten", async () => {
    const journal = memoryReaderSignalJournal(at(0))
    const store = memoryReaderTallyStore()

    const intake: Intake = {
      settings: SETTINGS,
      journal,
      regions: memoryReaderRegionStore(),
      openings: store,
      gate: createIntakeGate(DEFAULT_INTAKE_POLICY),
      durable: true,
      subjectOf: () => Promise.resolve("a-reader"),
      now: () => 0,
    }

    expect((await receiveReaderSignals(post(batch("n_hero", 8_200)), intake)).status).toBe(204)
    expect((await receiveReaderSignals(post(batch("n_hero", 3_100)), intake)).status).toBe(204)

    /** Nothing is counted until it has been held for the window (0158). */
    const early = await collectReaderSignals(journal, store, { windowMs: 60_000, clock: at(30_000) })
    expect(early.outcome).toBe("nothing-ripe")

    const beforeTheWindow = await store.tallies()
    expect(beforeTheWindow.ok && beforeTheWindow.value).toHaveLength(0)

    const collected = await collectReaderSignals(journal, store, {
      windowMs: 60_000,
      clock: at(120_000),
    })

    expect(collected.outcome).toBe("collected")
    expect(describeCollection(collected)).toContain("counted 2 batches")

    const counted = await store.tallies({ treeId: "t_landing" as TreeId })

    expect(counted.ok).toBe(true)
    const row = counted.ok ? counted.value.find((tally) => tally.nodeId === "n_hero") : undefined

    expect(row).toBeDefined()
    expect(row?.revision).toBe(4)
    /** One page view, so one `viewed`, and the two dwell stretches summed. */
    expect(row?.views).toBe(1)
    expect(row?.dwellMs).toBe(11_300)

    /** And the buffer let go of exactly what the counters took. */
    const left = await journal.read()
    expect(left.ok && left.value.batches).toHaveLength(0)
  })

  /**
   * The other end of the same chain, and the one that never touches the buffer.
   * A region is counted at the door, so it is a number the portal can read
   * before any rollup has run — and it is still one number per reader however
   * many batches they delivered.
   */
  it("counts where a reader was, once, without the buffer ever holding it", async () => {
    const journal = memoryReaderSignalJournal(at(0))
    const regions = memoryReaderRegionStore()
    const intake: Intake = {
      settings: SETTINGS,
      journal,
      regions,
      openings: memoryReaderTallyStore(),
      gate: createIntakeGate(DEFAULT_INTAKE_POLICY),
      durable: true,
      subjectOf: () => Promise.resolve("a-reader"),
      now: () => 0,
    }
    const headers = { "x-vercel-ip-country": "gb" }

    await receiveReaderSignals(post(batch("n_hero", 1_000, { first: true }), headers), intake)
    await receiveReaderSignals(post(batch("n_hero", 2_000), headers), intake)

    const rows = await regions.regions()
    expect(rows.ok && rows.value.map((row) => `${row.region}:${row.views}`)).toEqual(["GB:1"])

    /** One reader is not a readership, so the bucket is counted and not named. */
    const reading = regionReadingOf(rows.ok ? rows.value : [])
    expect(reading.regions).toEqual([])
    expect(reading.withheld).toEqual({ buckets: 1, views: 1 })
    expect(reading.views).toBe(1)

    /** And nothing in the buffer says where anybody was. */
    const buffered = await journal.read()
    expect(JSON.stringify(buffered.ok && buffered.value.batches)).not.toContain("GB")
  })

  /**
   * The denominator, end to end, and the one number in this subsystem that is
   * exact.
   *
   * A reader arrives and keeps reading: four deliveries, one page view. The door
   * counts the arrival once and the rollup counts the window's appearance of it,
   * so the portal can read *one page view of revision 4* beside *one appearance
   * of it* and know the distinct counts it is about to divide by are not
   * generous. A counter that moved with the deliveries would say four.
   */
  it("counts one reader as one page view however long they stay, and says the counters agree", async () => {
    const journal = memoryReaderSignalJournal(at(0))
    const store = memoryReaderTallyStore()
    const intake: Intake = {
      settings: SETTINGS,
      journal,
      regions: memoryReaderRegionStore(),
      openings: store,
      gate: createIntakeGate(DEFAULT_INTAKE_POLICY),
      durable: true,
      subjectOf: () => Promise.resolve("a-reader"),
      now: () => 0,
    }

    await receiveReaderSignals(post(batch("n_hero", 1_000, { first: true })), intake)
    await receiveReaderSignals(post(batch("n_hero", 2_000)), intake)
    await receiveReaderSignals(post(batch("n_hero", 3_000)), intake)
    await receiveReaderSignals(post(batch("n_pricing", 4_000)), intake)

    /** Before any rollup: the arrival is durable and its window is still in the buffer. */
    expect(await readingOf(store)).toMatchObject({ opened: 1, appearances: 0, drift: 0, pending: 1 })

    await collectReaderSignals(journal, store, { windowMs: 60_000, clock: at(120_000) })

    const reading = await readingOf(store)

    expect(reading).toMatchObject({ opened: 1, appearances: 1, drift: 0, pending: 0, inflation: 0 })
    expect(reading.revisions.map((one) => one.revision)).toEqual([4])
  })

  /** A refused delivery reaches no counter, which is the half that must also hold. */
  it("counts nothing from a delivery the door turned away", async () => {
    const journal = memoryReaderSignalJournal(at(0))
    const store = memoryReaderTallyStore()

    const shut: Intake = {
      settings: { ...SETTINGS, chosen: { state: "off" } },
      journal,
      regions: memoryReaderRegionStore(),
      openings: store,
      gate: createIntakeGate(DEFAULT_INTAKE_POLICY),
      durable: true,
      subjectOf: () => Promise.resolve("a-reader"),
      now: () => 0,
    }

    expect((await receiveReaderSignals(post(batch("n_hero", 8_200)), shut)).status).toBe(404)

    const collected = await collectReaderSignals(journal, store, {
      windowMs: 60_000,
      clock: at(120_000),
    })

    expect(collected.outcome).toBe("nothing-ripe")

    const counted = await store.tallies()
    expect(counted.ok && counted.value).toHaveLength(0)
  })
})
