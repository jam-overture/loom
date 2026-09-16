import { describe, expect, it } from "vitest"

import { err, ok, type Result } from "../result.js"
import {
  activated,
  batchOf,
  dwelled,
  nodeId,
  TREE,
  viewed,
  viewKey,
} from "../testing/reader-signal-contract.js"

import {
  collectionPlanOf,
  collectReaderSignals,
  describeCollection,
  horizonOf,
  MIN_READER_SIGNAL_WINDOW_MS,
  type CollectionOutcome,
} from "./collect.js"
import type {
  ForgetBefore,
  ForgetOutcome,
  ReaderSignalJournal,
  ReaderSignalStoreError,
  ReceivedBatch,
} from "./journal.js"
import { memoryReaderSignalJournal, memoryReaderTallyStore } from "./memory.js"
import type { FunnelPair } from "./rollup.js"
import type { ReaderTallyStore } from "./tally.js"

const HOUR = 60 * 60 * 1000
const NOON = Date.parse("2026-09-14T12:00:00.000Z")

const at = (offsetMs: number): string => new Date(NOON + offsetMs).toISOString()

/** A clock whose reading the test moves, so nothing here races the wall clock. */
const movingClock = (start = 0) => {
  let offset = start

  return {
    clock: { now: () => at(offset) },
    moveTo: (next: number): void => {
      offset = next
    },
  }
}

const received = (seq: number, offsetMs: number): ReceivedBatch => ({
  ...batchOf([viewed("hero")], { view: viewKey(seq) }),
  seq,
  receivedAt: at(offsetMs),
})

const unwrap = <TValue>(result: Result<TValue, ReaderSignalStoreError>): TValue => {
  if (!result.ok) throw new Error(result.error.detail)

  return result.value
}

const BROKEN: ReaderSignalStoreError = { code: "unavailable", detail: "the connection went away" }

/** A journal that works until `forget`, which is the one failure with a state of its own. */
const forgetFails = (journal: ReaderSignalJournal): ReaderSignalJournal => ({
  ...journal,
  forget: (_request: ForgetBefore): Promise<Result<ForgetOutcome, ReaderSignalStoreError>> =>
    Promise.resolve(err(BROKEN)),
})

const applyFails = (store: ReaderTallyStore): ReaderTallyStore => ({
  ...store,
  apply: () => Promise.resolve(err(BROKEN)),
})

/** A journal that counts its reads, to show a refusal never reached one. */
const counting = (journal: ReaderSignalJournal) => {
  let reads = 0

  return {
    journal: {
      ...journal,
      read: (request?: Parameters<ReaderSignalJournal["read"]>[0]) => {
        reads += 1

        return journal.read(request)
      },
    },
    reads: () => reads,
  }
}

describe("collectionPlanOf", () => {
  it("takes nothing from an empty buffer", () => {
    expect(collectionPlanOf([], at(0))).toEqual({ ripe: [], before: null, waiting: 0 })
  })

  it("takes everything older than the horizon, and names the position below it", () => {
    const plan = collectionPlanOf([received(4, -2 * HOUR), received(5, -90 * 60 * 1000)], at(0))

    expect(plan.ripe.map((batch) => batch.seq)).toEqual([4, 5])
    expect(plan.before).toBe(6)
  })

  it("takes nothing when everything is still young, and says how much is waiting", () => {
    const plan = collectionPlanOf([received(1, -10), received(2, -5)], at(-HOUR))

    expect(plan).toMatchObject({ before: null, waiting: 2 })
  })

  /**
   * A batch whose `receivedAt` equals the horizon is young. The horizon is
   * *now minus the window*, so a batch exactly on it has been held for exactly
   * the window and not longer — and the boundary has to fall somewhere that a
   * test can state rather than somewhere each caller guesses.
   */
  it("keeps a batch sitting exactly on the horizon", () => {
    expect(collectionPlanOf([received(1, -HOUR)], at(-HOUR)).before).toBeNull()
  })

  /**
   * The prefix rule, and the reason the cut is the *first* young batch rather
   * than every old one. A buffer forgets its oldest rows or none: a hole would
   * make `seq` — an opaque increasing position — start meaning something a
   * reader could misread, and it would leave a batch behind that nothing will
   * ever come back for, because every later run reads from the oldest end.
   */
  it("stops at the first young batch and keeps the old ones behind it", () => {
    const plan = collectionPlanOf(
      [received(1, -2 * HOUR), received(2, -10), received(3, -3 * HOUR)],
      at(-HOUR)
    )

    expect(plan.ripe.map((batch) => batch.seq)).toEqual([1])
    expect(plan.before).toBe(2)
    expect(plan.waiting).toBe(2)
  })
})

describe("horizonOf", () => {
  it("is the instant one window before now", () => {
    expect(horizonOf({ windowMs: HOUR }, at(0))).toBe(at(-HOUR))
  })

  it("has no answer for a clock that does not read as an instant", () => {
    expect(horizonOf({ windowMs: HOUR }, "half past four")).toBeNull()
  })
})

describe("collectReaderSignals", () => {
  const ripeBuffer = async () => {
    const time = movingClock(-2 * HOUR)
    const journal = memoryReaderSignalJournal(time.clock)
    const store = memoryReaderTallyStore()

    await journal.receive([
      batchOf([viewed("pricing"), dwelled("pricing", 400), activated("buy")], { view: viewKey(1) }),
      batchOf([viewed("pricing"), dwelled("pricing", 600)], { view: viewKey(2) }),
    ])
    time.moveTo(0)

    return { journal, store, time }
  }

  it("counts a ripe window into the counters and empties the buffer", async () => {
    const { journal, store, time } = await ripeBuffer()

    const outcome = await collectReaderSignals(journal, store, { clock: time.clock })

    expect(outcome).toMatchObject({
      outcome: "collected",
      removed: 2,
      more: false,
      summary: { counted: 2, views: 2, uncorrelated: 0 },
    })
    expect(unwrap(await store.tallies({ treeId: TREE }))).toContainEqual(
      expect.objectContaining({ nodeId: nodeId("pricing"), dwellMs: 1_000, views: 2, reached: 2 })
    )
    expect(unwrap(await journal.read()).batches).toEqual([])
  })

  /**
   * The property the whole design rests on, and the reason counting and
   * forgetting are one call. A rollup reports what one window *added*, so a
   * batch counted twice is counted twice forever — there is no idempotence to
   * fall back on, and the wrong number looks exactly like a busy afternoon.
   */
  it("does not count the same batch twice when it runs again", async () => {
    const { journal, store, time } = await ripeBuffer()
    await collectReaderSignals(journal, store, { clock: time.clock })

    const second = await collectReaderSignals(journal, store, { clock: time.clock })

    expect(second).toMatchObject({ outcome: "nothing-ripe", waiting: 0 })
    expect(unwrap(await store.tallies())[0]).toMatchObject({ dwellMs: 1_000, views: 2 })
  })

  it("leaves a batch that has not aged into the window alone", async () => {
    const time = movingClock()
    const journal = memoryReaderSignalJournal(time.clock)
    const store = memoryReaderTallyStore()
    await journal.receive([batchOf([viewed("hero")])])

    const outcome = await collectReaderSignals(journal, store, { clock: time.clock })

    expect(outcome).toEqual({ outcome: "nothing-ripe", waiting: 1 })
    expect(unwrap(await journal.read()).batches).toHaveLength(1)
    expect(unwrap(await store.tallies())).toEqual([])
  })

  it("answers the funnel pairs a deployment asked about", async () => {
    const time = movingClock(-2 * HOUR)
    const journal = memoryReaderSignalJournal(time.clock)
    const store = memoryReaderTallyStore()
    const pair: FunnelPair = {
      from: { nodeId: nodeId("pricing"), kind: "viewed" },
      to: { nodeId: nodeId("buy"), kind: "activated" },
    }
    await journal.receive([
      batchOf([viewed("pricing"), activated("buy")], { view: viewKey(1) }),
      batchOf([viewed("pricing")], { view: viewKey(2) }),
    ])
    time.moveTo(0)

    await collectReaderSignals(journal, store, { clock: time.clock, pairs: [pair] })

    expect(unwrap(await store.funnels())[0]).toMatchObject({ reached: 2, converted: 1 })
  })

  /**
   * A batch with no view key counts its occurrences and not its views, and the
   * number travels with the run rather than being worked out later — a rate
   * shown without saying which denominator it used is the failure here.
   */
  it("reports the batches that carried no view key", async () => {
    const time = movingClock(-2 * HOUR)
    const journal = memoryReaderSignalJournal(time.clock)
    await journal.receive([batchOf([dwelled("hero", 40)]), batchOf([dwelled("hero", 60)])])
    time.moveTo(0)

    const outcome = await collectReaderSignals(journal, memoryReaderTallyStore(), {
      clock: time.clock,
    })

    expect(outcome).toMatchObject({ summary: { counted: 2, views: 0, uncorrelated: 2 } })
  })

  it("says there is more when the scan fills before the horizon does", async () => {
    const time = movingClock(-2 * HOUR)
    const journal = memoryReaderSignalJournal(time.clock)
    await journal.receive([batchOf([viewed("hero")]), batchOf([viewed("hero")])])
    time.moveTo(0)

    const outcome = await collectReaderSignals(journal, memoryReaderTallyStore(), {
      clock: time.clock,
      scanLimit: 1,
    })

    expect(outcome).toMatchObject({ outcome: "collected", removed: 1, more: true })
  })

  it("refuses a window under the floor without reading anything", async () => {
    const { journal, store, time } = await ripeBuffer()
    const watched = counting(journal)

    const outcome = await collectReaderSignals(watched.journal, store, {
      clock: time.clock,
      windowMs: MIN_READER_SIGNAL_WINDOW_MS - 1,
    })

    expect(outcome.outcome).toBe("refused")
    expect(watched.reads()).toBe(0)
    expect(unwrap(await journal.read()).batches).toHaveLength(2)
  })

  it("refuses a clock it cannot read as an instant", async () => {
    const { journal, store } = await ripeBuffer()

    const outcome = await collectReaderSignals(journal, store, { clock: { now: () => "soon" } })

    expect(outcome).toEqual({ outcome: "refused", reason: 'the clock read "soon"' })
    expect(unwrap(await journal.read()).batches).toHaveLength(2)
  })

  /**
   * Aggregates first, the buffer second. A store that could not take the window
   * must leave the window where it is, because the reverse order loses the
   * batches outright and looks from the outside like a run that worked.
   */
  it("forgets nothing when the counters would not take the window", async () => {
    const { journal, store, time } = await ripeBuffer()

    const outcome = await collectReaderSignals(journal, applyFails(store), { clock: time.clock })

    expect(outcome).toEqual({ outcome: "unavailable", error: BROKEN })
    expect(unwrap(await journal.read()).batches).toHaveLength(2)
  })

  /**
   * The one state that gets worse when it is ignored: durable in the counters
   * and still in the buffer, so the next run counts it again. It has its own
   * outcome, and it names the position an operator prunes below by hand.
   */
  it("says so when the counters took the window and the buffer would not drop it", async () => {
    const { journal, store, time } = await ripeBuffer()

    const outcome = await collectReaderSignals(forgetFails(journal), store, { clock: time.clock })

    expect(outcome).toMatchObject({
      outcome: "counted-not-forgotten",
      before: 3,
      error: BROKEN,
      summary: { counted: 2 },
    })
    expect(unwrap(await store.tallies())).not.toEqual([])
  })

  it("reports a buffer it could not read as a non-event, having changed nothing", async () => {
    const { store, time } = await ripeBuffer()
    const unreadable: ReaderSignalJournal = {
      receive: () => Promise.resolve(ok(undefined)),
      read: () => Promise.resolve(err(BROKEN)),
      forget: () => Promise.resolve(err(BROKEN)),
    }

    expect(await collectReaderSignals(unreadable, store, { clock: time.clock })).toEqual({
      outcome: "unavailable",
      error: BROKEN,
    })
    expect(unwrap(await store.tallies())).toEqual([])
  })
})

describe("describeCollection", () => {
  const line = (outcome: CollectionOutcome): string => describeCollection(outcome)

  const summary = { counted: 2, tallies: 1, funnels: 0, views: 2, uncorrelated: 0 }

  it("says what a run counted and what it dropped", () => {
    expect(line({ outcome: "collected", summary, removed: 2, more: false })).toBe(
      "counted 2 batches into 1 tally over 2 views, and forgot 2"
    )
  })

  it("says when another run has work now", () => {
    expect(line({ outcome: "collected", summary, removed: 2, more: true })).toContain(
      "more is waiting"
    )
  })

  it("names the uncorrelated batches, because the denominator depends on them", () => {
    expect(
      line({ outcome: "collected", summary: { ...summary, uncorrelated: 1 }, removed: 2, more: false })
    ).toContain("1 with no view key")
  })

  it("inflects a single batch", () => {
    expect(
      line({
        outcome: "collected",
        summary: { ...summary, counted: 1, views: 1 },
        removed: 1,
        more: false,
      })
    ).toBe("counted 1 batch into 1 tally over 1 view, and forgot 1")
  })

  it("says a quiet run is quiet", () => {
    expect(line({ outcome: "nothing-ripe", waiting: 0 })).toBe("nothing old enough to count")
    expect(line({ outcome: "nothing-ripe", waiting: 3 })).toBe(
      "nothing old enough to count, 3 batches waiting"
    )
  })

  it("tells an operator what a half-finished run left behind, and where", () => {
    expect(line({ outcome: "counted-not-forgotten", summary, before: 41, error: BROKEN })).toBe(
      "counted 2 batches and could not forget them, so the next run counts them again unless the buffer is pruned below 41: the connection went away"
    )
  })

  it("reads a refusal and a failure apart", () => {
    expect(line({ outcome: "refused", reason: "too small" })).toBe("collection refused: too small")
    expect(line({ outcome: "unavailable", error: BROKEN })).toBe(
      "collection could not run: the connection went away"
    )
  })
})
