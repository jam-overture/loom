import { describe, expect, it } from "vitest"

import {
  collectReaderSignals,
  createIntakeGate,
  DEFAULT_INTAKE_POLICY,
  describeCollection,
  memoryReaderSignalJournal,
  memoryReaderTallyStore,
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

const batch = (nodeId: string, dwellMs: number) => ({
  treeId: "t_landing",
  revision: 4,
  sentAt: 1_000,
  view: "0123456789abcdef0123456789abcdef",
  signals: [
    { kind: "viewed", nodeId, type: "loom.section", at: 1_000 },
    { kind: "dwelled", nodeId, type: "loom.section", ms: dwellMs },
  ],
})

const post = (body: unknown): Request =>
  new Request("https://loom.test/api/reader-signals", {
    method: "POST",
    body: JSON.stringify(body),
  })

describe("a batch a browser posts becomes a number the portal can read", () => {
  it("arrives, is counted, and is forgotten", async () => {
    const journal = memoryReaderSignalJournal(at(0))
    const store = memoryReaderTallyStore()

    const intake: Intake = {
      settings: { chosen: { state: "on" }, hops: 1 },
      journal,
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

  /** A refused delivery reaches no counter, which is the half that must also hold. */
  it("counts nothing from a delivery the door turned away", async () => {
    const journal = memoryReaderSignalJournal(at(0))
    const store = memoryReaderTallyStore()

    const shut: Intake = {
      settings: { chosen: { state: "off" }, hops: 1 },
      journal,
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
