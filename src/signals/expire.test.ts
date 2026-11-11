import { describe, expect, it } from "vitest"

import { DEFAULT_AUDIENCE_ID } from "../audience/audience.js"
import { err, ok, type Result } from "../result.js"
import { batchOf, nodeId, TREE, viewed, viewKey } from "../testing/reader-signal-contract.js"

import { collectReaderSignals } from "./collect.js"
import {
  describeExpiry,
  expireReaderEvents,
  expiryPlanOf,
  keptHorizonOf,
  MIN_READER_EVENT_RETENTION_MS,
  type ExpiryOutcome,
} from "./expire.js"
import type {
  ForgetBefore,
  ForgetOutcome,
  ReaderSignalJournal,
  ReaderSignalStoreError,
  ReceivedBatch,
} from "./journal.js"
import { memoryReaderSignalJournal, memoryReaderTallyStore } from "./memory.js"

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const NOON = Date.parse("2026-11-05T12:00:00.000Z")

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

const unwrap = <TValue>(result: Result<TValue, ReaderSignalStoreError>): TValue => {
  if (!result.ok) throw new Error(result.error.detail)

  return result.value
}

const BROKEN: ReaderSignalStoreError = { code: "unavailable", detail: "the connection went away" }

/** A journal that works until `forget`, which is this operation's one write. */
const forgetFails = (journal: ReaderSignalJournal): ReaderSignalJournal => ({
  ...journal,
  forget: (_request: ForgetBefore): Promise<Result<ForgetOutcome, ReaderSignalStoreError>> =>
    Promise.resolve(err(BROKEN)),
})

const row = (
  seq: number,
  offsetMs: number,
  foldedAtMs?: number
): ReceivedBatch => ({
  ...batchOf([viewed("hero")], { view: viewKey(seq) }),
  seq,
  receivedAt: at(offsetMs),
  audienceId: DEFAULT_AUDIENCE_ID,
  ...(foldedAtMs === undefined ? {} : { foldedAt: at(foldedAtMs) }),
})

describe("expiryPlanOf", () => {
  const HORIZON = at(-30 * DAY)

  /**
   * Both conditions, which is the rule the whole module is for: past the window
   * **and** counted. The four combinations are tested as four rows in one scan
   * rather than four cases, because what the plan has to get right is where it
   * stops, and that is a property of the sequence.
   */
  it("takes the prefix that is both past the window and counted", () => {
    const plan = expiryPlanOf(
      [
        row(1, -40 * DAY, -39 * DAY),
        row(2, -35 * DAY, -34 * DAY),
        row(3, -31 * DAY),
        row(4, -1 * DAY, -1 * DAY),
      ],
      HORIZON
    )

    expect(plan).toEqual({ before: 3, waiting: 2, stopped: "uncounted" })
  })

  /**
   * The ordinary answer on a deployment inside its window: everything is young,
   * nothing goes, and the scan stopped at the first row rather than reading the
   * rest.
   */
  it("takes nothing where the oldest delivery is inside the window", () => {
    expect(expiryPlanOf([row(1, -1 * HOUR, -1 * HOUR), row(2, 0, 0)], HORIZON)).toEqual({
      before: null,
      waiting: 2,
      stopped: "young",
    })
  })

  it("takes everything where the scan read nothing it may not delete", () => {
    expect(
      expiryPlanOf([row(1, -40 * DAY, -39 * DAY), row(2, -35 * DAY, -34 * DAY)], HORIZON)
    ).toEqual({ before: 3, waiting: 0, stopped: "end" })
  })

  it("has nothing to do with an empty scan", () => {
    expect(expiryPlanOf([], HORIZON)).toEqual({ before: null, waiting: 0, stopped: "end" })
  })

  /**
   * **The rule, in the case that makes it matter.** A deployment whose
   * collection cron has stopped has old uncounted deliveries at the oldest end.
   * Deleting them would take them out of the counters too — the counters are
   * the durable record, so the loss would be permanent and unnoticeable.
   */
  it("stops at an old delivery no fold has counted, and names why", () => {
    expect(expiryPlanOf([row(1, -40 * DAY), row(2, -39 * DAY, -38 * DAY)], HORIZON)).toEqual({
      before: null,
      waiting: 2,
      stopped: "uncounted",
    })
  })

  /**
   * `received_at` is a transaction's instant and `seq` is its position, so two
   * overlapping inserts can land with the pair inverted. Stopping at the first
   * row it may not delete costs one interval and cannot take a young delivery;
   * a rule that deleted every old row below the newest old row could.
   */
  it("leaves a young delivery that landed out of order, and the prefix behind it", () => {
    expect(
      expiryPlanOf(
        [row(1, -40 * DAY, -39 * DAY), row(2, 0, 0), row(3, -39 * DAY, -38 * DAY)],
        HORIZON
      )
    ).toEqual({ before: 2, waiting: 2, stopped: "young" })
  })
})

describe("keptHorizonOf", () => {
  it("is the instant one kept window before now", () => {
    expect(keptHorizonOf({ keptMs: 30 * DAY }, at(0))).toBe(at(-30 * DAY))
  })

  it("has no answer for a clock that does not read as an instant", () => {
    expect(keptHorizonOf({ keptMs: 30 * DAY }, "half past four")).toBeNull()
  })
})

describe("expireReaderEvents", () => {
  /**
   * A table holding one counted delivery from well before the window and one
   * from inside it, which is what a healthy deployment past its first month
   * looks like.
   */
  const keptTable = async () => {
    const time = movingClock(-40 * DAY)
    const journal = memoryReaderSignalJournal(time.clock)
    const store = memoryReaderTallyStore()

    await journal.receive([batchOf([viewed("pricing")], { view: viewKey(1) })])
    time.moveTo(-39 * DAY)
    await collectReaderSignals(journal, store, { clock: time.clock })

    time.moveTo(-1 * HOUR)
    await journal.receive([batchOf([viewed("hero")], { view: viewKey(2) })])
    time.moveTo(0)
    await collectReaderSignals(journal, store, { clock: time.clock })

    return { journal, store, time }
  }

  it("deletes what is past the window and keeps what is not", async () => {
    const { journal, time } = await keptTable()

    const outcome = await expireReaderEvents(journal, { clock: time.clock })

    expect(outcome).toMatchObject({ outcome: "expired", removed: 1, stopped: "young" })
    expect(unwrap(await journal.read()).batches.map((batch) => batch.signals[0]?.nodeId)).toEqual([
      nodeId("hero"),
    ])
  })

  /**
   * The ages a delivery is deleted at are a deployment's, which is rule 5: a
   * deployment that keeps a week deletes the fortnight-old delivery the default
   * would have kept.
   */
  it("deletes on the window the deployment stated rather than the default", async () => {
    const { journal, time } = await keptTable()

    expect(
      await expireReaderEvents(journal, { clock: time.clock, keptMs: 50 * DAY })
    ).toMatchObject({ outcome: "nothing-expired", waiting: 2 })
    expect(
      await expireReaderEvents(journal, { clock: time.clock, keptMs: 7 * DAY })
    ).toMatchObject({ outcome: "expired", removed: 1 })
  })

  /**
   * **The rule, end to end.** The fold has not run, so the oldest delivery is
   * forty days old and uncounted — and deleting it would lose a day of readers
   * from the counters, permanently, with the counters looking exactly as they
   * would on a quiet day.
   */
  it("deletes nothing where the oldest delivery is past the window and uncounted", async () => {
    const time = movingClock(-40 * DAY)
    const journal = memoryReaderSignalJournal(time.clock)
    await journal.receive([batchOf([viewed("pricing")], { view: viewKey(1) })])
    time.moveTo(0)

    const outcome = await expireReaderEvents(journal, { clock: time.clock })

    expect(outcome).toMatchObject({
      outcome: "nothing-expired",
      waiting: 1,
      stopped: "uncounted",
    })
    expect(unwrap(await journal.read()).batches).toHaveLength(1)
  })

  /**
   * **The case this would double-delete.** Running twice over one prefix must
   * remove it once and then find nothing, rather than reporting the same rows
   * again — a figure an operator would read as traffic.
   */
  it("deletes a prefix once across two runs", async () => {
    const { journal, time } = await keptTable()

    const first = await expireReaderEvents(journal, { clock: time.clock })
    const second = await expireReaderEvents(journal, { clock: time.clock })

    expect(first).toMatchObject({ outcome: "expired", removed: 1 })
    expect(second).toMatchObject({ outcome: "nothing-expired", waiting: 1 })
  })

  /**
   * It counts nothing and writes no counter, which is what makes deleting safe:
   * everything these rows said is already in the tallies (0349).
   */
  it("leaves every counter exactly as it found it", async () => {
    const { journal, store, time } = await keptTable()
    const before = unwrap(await store.tallies())

    await expireReaderEvents(journal, { clock: time.clock })

    expect(unwrap(await store.tallies())).toEqual(before)
  })

  it("reports the age of the oldest delivery it read, which is the oldest there is", async () => {
    const { journal, time } = await keptTable()

    expect(await expireReaderEvents(journal, { clock: time.clock })).toMatchObject({
      outcome: "expired",
      oldestMs: 40 * DAY,
    })
  })

  it("has no age for a table with nothing in it", async () => {
    const time = movingClock()

    expect(
      await expireReaderEvents(memoryReaderSignalJournal(time.clock), { clock: time.clock })
    ).toEqual({ outcome: "nothing-expired", waiting: 0, oldestMs: null, stopped: "end" })
  })

  it("says there is more when the scan fills before the horizon does", async () => {
    const time = movingClock(-40 * DAY)
    const journal = memoryReaderSignalJournal(time.clock)
    const store = memoryReaderTallyStore()
    await journal.receive([
      batchOf([viewed("a")], { view: viewKey(1) }),
      batchOf([viewed("b")], { view: viewKey(2) }),
    ])
    time.moveTo(-39 * DAY)
    await collectReaderSignals(journal, store, { clock: time.clock })
    time.moveTo(0)

    expect(
      await expireReaderEvents(journal, { clock: time.clock, scanLimit: 1 })
    ).toMatchObject({ outcome: "expired", removed: 1, more: true })
  })

  it("refuses a window below the floor and a clock it cannot read", async () => {
    const { journal, time } = await keptTable()

    expect(
      await expireReaderEvents(journal, {
        clock: time.clock,
        keptMs: MIN_READER_EVENT_RETENTION_MS - 1,
      })
    ).toMatchObject({ outcome: "refused" })
    expect(await expireReaderEvents(journal, { clock: { now: () => "soon" } })).toEqual({
      outcome: "refused",
      reason: 'the clock read "soon"',
    })
    expect(unwrap(await journal.read()).batches).toHaveLength(2)
  })

  it("reports a table it could not read, having deleted nothing", async () => {
    const unreadable: ReaderSignalJournal = {
      receive: () => Promise.resolve(ok(undefined)),
      read: () => Promise.resolve(err(BROKEN)),
      counted: () => Promise.resolve(err(BROKEN)),
      forget: () => Promise.resolve(err(BROKEN)),
    }

    expect(await expireReaderEvents(unreadable)).toEqual({ outcome: "unavailable", error: BROKEN })
  })

  /**
   * A delete that failed leaves the prefix exactly where it was, so the next
   * run takes it. There is no half-finished state to report, which is the one
   * way this operation is easier than collection.
   */
  it("reports a delete it could not make, leaving the prefix for the next run", async () => {
    const { journal, time } = await keptTable()

    expect(await expireReaderEvents(forgetFails(journal), { clock: time.clock })).toEqual({
      outcome: "unavailable",
      error: BROKEN,
    })
    expect(unwrap(await journal.read()).batches).toHaveLength(2)
  })

  /**
   * The window the deployment keeps is measured from arrival, and the tree is
   * not part of it: a delete scoped by tree would leave holes in `seq`, which
   * is the position both sweeps and every cursor are taken against.
   */
  it("deletes across every tree the handle can see", async () => {
    const time = movingClock(-40 * DAY)
    const journal = memoryReaderSignalJournal(time.clock)
    const store = memoryReaderTallyStore()
    await journal.receive([
      batchOf([viewed("a")], { view: viewKey(1) }),
      batchOf([viewed("b")], { view: viewKey(2), treeId: TREE }),
    ])
    time.moveTo(-39 * DAY)
    await collectReaderSignals(journal, store, { clock: time.clock })
    time.moveTo(0)

    expect(await expireReaderEvents(journal, { clock: time.clock })).toMatchObject({
      outcome: "expired",
      removed: 2,
    })
  })
})

describe("describeExpiry", () => {
  const line = (outcome: ExpiryOutcome): string => describeExpiry(outcome)

  it("says what a run deleted", () => {
    expect(line({ outcome: "expired", removed: 2, oldestMs: 40 * DAY, stopped: "young", more: false })).toBe(
      "deleted 2 deliveries"
    )
    expect(line({ outcome: "expired", removed: 1, oldestMs: 40 * DAY, stopped: "end", more: false })).toBe(
      "deleted 1 delivery"
    )
  })

  it("says when another run has work now", () => {
    expect(
      line({ outcome: "expired", removed: 2, oldestMs: 40 * DAY, stopped: "young", more: true })
    ).toContain("more is waiting")
  })

  /**
   * The one state whose remedy is somebody else's: the fold's. An operator told
   * only *deleted nothing* would look at the expiry cron, which is working.
   */
  it("names the fold where an uncounted delivery is what stopped the cut", () => {
    expect(
      line({ outcome: "nothing-expired", waiting: 9, oldestMs: 40 * DAY, stopped: "uncounted" })
    ).toContain("collection has stopped")
    expect(
      line({ outcome: "nothing-expired", waiting: 9, oldestMs: 40 * DAY, stopped: "young" })
    ).not.toContain("collection has stopped")
  })

  it("reads a quiet run and an empty table apart", () => {
    expect(line({ outcome: "nothing-expired", waiting: 3, oldestMs: 5_000, stopped: "young" })).toBe(
      "nothing is old enough to delete, 3 deliveries kept and the oldest 5000ms old"
    )
    expect(line({ outcome: "nothing-expired", waiting: 0, oldestMs: null, stopped: "end" })).toBe(
      "nothing is kept, so nothing is old enough to delete"
    )
  })

  it("reads a refusal and a failure apart", () => {
    expect(line({ outcome: "refused", reason: "too small" })).toBe("expiry refused: too small")
    expect(line({ outcome: "unavailable", error: BROKEN })).toBe(
      "expiry could not run: the connection went away"
    )
  })
})
