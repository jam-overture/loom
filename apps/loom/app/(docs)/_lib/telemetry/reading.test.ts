import {
  EPISODE_RESOLUTION_KINDS,
  TELEMETRY_EVENT_TYPES,
  type EpisodeFold,
  type RecordedTelemetry,
  type TelemetryEvent,
} from "@jam-overture/loom/telemetry"
import { describe, expect, it } from "vitest"

import { docsTelemetry } from "./corpus"
import {
  countedEventTypes,
  endingRows,
  recordSummary,
  retentionRows,
  traceEpisode,
} from "./reading"

/**
 * The wording, held against records written to exercise it.
 *
 * Six of the eighteen event types never occur in the corpus, so a test that
 * only walked the corpus would leave a third of `recordSummary` unexecuted —
 * and the first time a failure path ran on a real deployment it would be the
 * first time that branch had run at all. The records below are handwritten for
 * that reason, which is `headings.ts`'s pattern: exercise the rule, not
 * whatever the site happens to produce today.
 */

const recorded = (event: TelemetryEvent, seq = 1): RecordedTelemetry => ({
  treeId: "t_fixture1" as RecordedTelemetry["treeId"],
  occurredAt: "2026-07-01T09:00:00.000Z",
  event,
  seq,
  recordedAt: "2026-07-01T09:00:00.000Z",
})

const failure = { code: "unavailable", detail: "the store did not answer" }

describe("the endings table", () => {
  it("has a row for every ending the runtime can reach", async () => {
    const { tally } = await docsTelemetry()

    expect(endingRows(tally).map((row) => row.kind)).toStrictEqual(EPISODE_RESOLUTION_KINDS)
  })

  it("takes its counts from the runtime's tally rather than counting again", async () => {
    const { tally } = await docsTelemetry()

    for (const row of endingRows(tally)) expect(row.count).toBe(tally.byResolution[row.kind])
  })

  it("gives every ending a sentence a reader could repeat", async () => {
    const { tally } = await docsTelemetry()

    for (const row of endingRows(tally)) {
      expect(row.meaning.length).toBeGreaterThan(20)
      expect(row.meaning).not.toContain(row.kind)
    }
  })
})

describe("a record's one-line summary", () => {
  it("says who asked and what revision they were looking at", () => {
    const summary = recordSummary(
      recorded({
        type: "intent-received",
        intent: {
          intentId: "i_fixture1" as never,
          origin: "user-instruction",
          actor: "the reader",
          baseRevision: 4,
          utteranceLength: 12,
          observedAt: "2026-07-01T09:00:00.000Z",
        },
      })
    )

    expect(summary).toContain("user-instruction")
    expect(summary).toContain("the reader")
    expect(summary).toContain("revision 4")
  })

  it("names nobody rather than leaving a blank where an actor would be", () => {
    const summary = recordSummary(recorded({ type: "hold-confirmed", proposalId: "p_a1" as never }))

    expect(summary).toBe("allowed by nobody named")
  })

  /**
   * The four `*-failed` events and `repair-requested` never happen on this
   * site. Their branches are still shipped, so they are still checked.
   */
  it("has something to say about the stages this site never reaches", () => {
    const unreached: readonly TelemetryEvent[] = [
      { type: "assessment-failed", proposalId: "p_a1" as never, failure },
      { type: "application-failed", proposalId: "p_a1" as never, failure },
      { type: "hold-failed", proposalId: "p_a1" as never, failure },
      { type: "commit-failed", proposalId: "p_a1" as never, failure },
      { type: "repair-failed", refusedProposalId: "p_a1" as never, failure },
      {
        type: "repair-requested",
        refusedProposalId: "p_a1" as never,
        reason: { code: "stakes-above-ceiling", detail: "touches protected loom.heading" },
      },
    ]

    for (const event of unreached) {
      const summary = recordSummary(recorded(event))

      expect(summary.length).toBeGreaterThan(0)
      expect(summary).not.toContain("undefined")
    }
  })

  it("summarises every record the corpus produced without saying undefined", async () => {
    const { records } = await docsTelemetry()

    for (const record of records) {
      const summary = recordSummary(record)

      expect(summary.length).toBeGreaterThan(0)
      expect(summary).not.toContain("undefined")
    }
  })
})

describe("the traced episode", () => {
  it("is the one a person answered, and carries every record of it", async () => {
    const { fold, records } = await docsTelemetry()
    const trace = traceEpisode(fold, records)

    expect(trace.episode.resolution.kind).toBe("committed")
    expect(trace.records.length).toBeGreaterThan(trace.episode.proposals.length)
    expect(trace.records.map((record) => record.event.type)).toContain("hold-confirmed")
  })

  /**
   * The point of the trace is that it spans two requests, so the Gate is seen
   * running twice. A trace that stopped covering that would still render.
   */
  it("shows the Gate judging twice, once before the hold and once after", async () => {
    const { fold, records } = await docsTelemetry()
    const trace = traceEpisode(fold, records)
    const judged = trace.records.filter((record) => record.event.type === "disposition-decided")

    expect(judged).toHaveLength(2)
  })

  /**
   * The prose beside it names these positions — *"records 26 to 31 are somebody
   * clicking; record 32 is a different person"* — and a screenshot in the pull
   * request shows them. Prose that points at a number is prose that has to be
   * held to it.
   */
  it("is the twelve records the page walks through, at the positions it names", async () => {
    const { fold, records } = await docsTelemetry()
    const trace = traceEpisode(fold, records)

    expect(trace.records.map((record) => record.seq)).toStrictEqual([
      26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37,
    ])
    expect(trace.records.find((record) => record.event.type === "hold-confirmed")?.seq).toBe(32)
    expect(
      trace.records
        .filter((record) => record.event.type === "disposition-decided")
        .map((record) => record.seq)
    ).toStrictEqual([30, 35])
  })

  it("refuses to walk through something simpler rather than quietly doing so", () => {
    const empty: EpisodeFold = { episodes: [], unattributed: [] }

    expect(() => traceEpisode(empty, [])).toThrow(/held and then confirmed/)
  })
})

describe("the retention rows", () => {
  it("name the position the cut is made at, so the two numbers can be read together", async () => {
    const { retention, horizon } = await docsTelemetry()
    const rows = retentionRows(retention, horizon)
    const forgets = rows.find((row) => row.name === "forgets")

    expect(forgets?.value).toBe(String(retention.forgets))
    expect(forgets?.meaning).toContain(String(retention.before))
  })

  it("print the horizon as a day rather than as an instant", async () => {
    const { retention, horizon } = await docsTelemetry()
    const rows = retentionRows(retention, horizon)

    expect(rows.find((row) => row.name === "horizon")?.value).toBe(horizon.slice(0, 10))
  })
})

describe("the event-type count", () => {
  it("takes its denominator from the list the runtime publishes", async () => {
    const { records } = await docsTelemetry()
    const counted = countedEventTypes(records)

    expect(counted.total).toBe(TELEMETRY_EVENT_TYPES.length)
    expect(counted.seen).toBeLessThan(counted.total)
    expect(counted.seen).toBe(new Set(records.map((record) => record.event.type)).size)
  })
})
