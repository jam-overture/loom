import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type ProposalId } from "../ids.js"
import { err, ok, type Result } from "../result.js"
import type { RuntimeEvent, RuntimeEventEnvelope } from "../runtime/events.js"
import { FIXED_INSTANT } from "../testing/doubles.js"

import type { TelemetryRecord } from "./event.js"
import type { TelemetryError, TelemetryJournal } from "./journal.js"
import { memoryTelemetryJournal } from "./memory.js"
import { collectTelemetry, MAX_BUFFERED_RECORDS } from "./sink.js"

const treeId = sequentialIdFactory("s").treeId()

const envelopeOf = (event: RuntimeEvent): RuntimeEventEnvelope => ({
  treeId,
  occurredAt: FIXED_INSTANT,
  event,
})

const confirmed = (name = "p_1"): RuntimeEvent => ({
  type: "hold-confirmed",
  proposalId: name as ProposalId,
})

type FailingJournal = TelemetryJournal & { readonly attempts: () => number }

const failingJournal = (error: TelemetryError): FailingJournal => {
  let attempts = 0

  return {
    record: (): Promise<Result<void, TelemetryError>> => {
      attempts += 1

      return Promise.resolve(err(error))
    },
    read: () => Promise.resolve(ok({ records: [], cursor: null })),
    attempts: () => attempts,
  }
}

describe("collectTelemetry", () => {
  it("does no IO when an event is emitted", async () => {
    const journal = failingJournal({ code: "unavailable", detail: "should not be called" })
    const collector = collectTelemetry(journal)

    collector.sink.emit(envelopeOf(confirmed()))

    expect(journal.attempts()).toBe(0)
    expect(collector.pending()).toHaveLength(1)
    await collector.flush()
    expect(journal.attempts()).toBe(1)
  })

  it("writes everything collected in one batch", async () => {
    const journal = memoryTelemetryJournal()
    const collector = collectTelemetry(journal)

    collector.sink.emit(envelopeOf(confirmed("p_1")))
    collector.sink.emit(envelopeOf(confirmed("p_2")))

    expect(await collector.flush()).toEqual({ ok: true, value: undefined })

    const page = await journal.read()

    expect(page.ok && page.value.records).toHaveLength(2)
    expect(collector.pending()).toHaveLength(0)
  })

  it("spends no round trip when there is nothing to write", async () => {
    const journal = failingJournal({ code: "unavailable", detail: "should not be called" })

    expect(await collectTelemetry(journal).flush()).toEqual({ ok: true, value: undefined })
    expect(journal.attempts()).toBe(0)
  })

  /**
   * The rule 0024 exists for: a failing journal must not become a queue that
   * grows inside the write path.
   */
  it("drops a failed batch rather than retaining it for a retry", async () => {
    const journal = failingJournal({ code: "unavailable", detail: "no database" })
    const collector = collectTelemetry(journal)

    collector.sink.emit(envelopeOf(confirmed()))
    const flushed = await collector.flush()

    expect(flushed.ok).toBe(false)
    expect(collector.pending()).toHaveLength(0)
    expect(collector.dropped()).toBe(1)

    await collector.flush()
    expect(journal.attempts()).toBe(1)
  })

  it("stops buffering rather than growing without limit", () => {
    const collector = collectTelemetry(memoryTelemetryJournal())

    for (let index = 0; index <= MAX_BUFFERED_RECORDS; index++) {
      collector.sink.emit(envelopeOf(confirmed()))
    }

    expect(collector.pending()).toHaveLength(MAX_BUFFERED_RECORDS)
    expect(collector.dropped()).toBe(1)
  })

  /**
   * `EventSink`'s standing promise: a sink can never fail a change the Gate
   * already accepted. An event outside the union is a host bug, and it is
   * counted rather than thrown.
   */
  it("counts an event it cannot narrow instead of throwing", () => {
    const collector = collectTelemetry(memoryTelemetryJournal())
    const rogue = { treeId, occurredAt: FIXED_INSTANT, event: { type: "invented" } }

    expect(() => collector.sink.emit(rogue as unknown as RuntimeEventEnvelope)).not.toThrow()
    expect(collector.dropped()).toBe(1)
    expect(collector.pending()).toHaveLength(0)
  })

  it("hands the journal exactly what was narrowed", async () => {
    const written: TelemetryRecord[] = []
    const journal: TelemetryJournal = {
      record: (batch) => {
        written.push(...batch)

        return Promise.resolve(ok(undefined))
      },
      read: () => Promise.resolve(ok({ records: [], cursor: null })),
    }

    const collector = collectTelemetry(journal)
    collector.sink.emit(envelopeOf(confirmed("p_9")))
    await collector.flush()

    expect(written).toEqual([
      { treeId, occurredAt: FIXED_INSTANT, event: { type: "hold-confirmed", proposalId: "p_9" } },
    ])
  })
})
