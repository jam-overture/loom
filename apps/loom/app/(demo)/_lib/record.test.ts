import { describe, expect, it } from "vitest"

import type { EditIntent, RuntimeEvent, RuntimeEventEnvelope } from "@loom/runtime"

import { recordFromEvents, type ChangeRecord } from "./record"

/**
 * The projection, on the paths that are hard to cause on purpose.
 *
 * The pipeline test covers what a visitor can actually do; this covers what the
 * runtime does when something goes wrong — a model that could not be reached, a
 * page that moved between the click and the write, a refusal that was repaired.
 * Those are the moments a demo is most tempted to hide, and they are the ones
 * worth showing, so they are worth testing.
 */

const INTENT: EditIntent = {
  intentId: "i_1" as EditIntent["intentId"],
  treeId: "t_1" as EditIntent["treeId"],
  baseRevision: 0,
  origin: "user-instruction",
  actor: "a demo visitor",
  utterance: "Make it warmer.",
  observedAt: "2026-08-12T00:00:00.000Z",
}

const envelope = (event: RuntimeEvent, at = "2026-08-12T00:00:00.000Z"): RuntimeEventEnvelope => ({
  treeId: INTENT.treeId,
  occurredAt: at,
  event,
})

describe("a record", () => {
  it("is nothing at all when the runtime narrated nothing about an ask", () => {
    expect(recordFromEvents([])).toBeUndefined()
    expect(
      recordFromEvents([envelope({ type: "proposal-held", proposalId: "p_1" as never })])
    ).toBeUndefined()
  })

  it("names the ask, who made it and when, from the intent alone", () => {
    const record = recordFromEvents([envelope({ type: "intent-received", intent: INTENT })])

    expect(record?.recordId).toBe("i_1")
    expect(record?.utterance).toBe("Make it warmer.")
    expect(record?.actor).toBe("a demo visitor")
    expect(record?.outcome).toBe("in-flight")
  })

  it("says an interpretation failed in the interpreter's own words", () => {
    const record = recordFromEvents([
      envelope({ type: "intent-received", intent: INTENT }),
      envelope({
        type: "interpretation-failed",
        intent: INTENT,
        error: { code: "interpreter-unavailable", detail: "the model did not answer" },
      }),
    ])

    expect(record?.outcome).toBe("not-interpreted")
    expect(record?.failure).toContain("the model did not answer")
  })

  /** The stale-write case: the visitor's page had moved before the ask landed. */
  it("says when the page had already moved on", () => {
    const record = recordFromEvents([
      envelope({ type: "intent-received", intent: INTENT }),
      envelope({
        type: "intent-not-writable",
        intent: INTENT,
        error: { code: "revision-conflict", treeId: INTENT.treeId, expected: 0, found: 2 },
      }),
    ])

    expect(record?.outcome).toBe("did-not-apply")
    expect(record?.failure).toContain("revision-conflict")
  })

  /**
   * 0006: a refusal followed by a smaller second attempt has to leave both
   * halves visible. The record shows the verdict that stands and still says a
   * repair happened.
   */
  it("keeps a repair visible while showing the verdict that stands", () => {
    const record = recordFromEvents([
      envelope({ type: "intent-received", intent: INTENT }),
      envelope({
        type: "repair-requested",
        refusedProposalId: "p_1" as never,
        reason: { code: "stakes-above-ceiling", detail: "too much" },
      }),
      envelope({ type: "change-committed", proposalId: "p_2" as never, revision: 4 }),
    ])

    expect(record?.repaired).toBe(true)
    expect(record?.outcome).toBe("applied")
    expect(record?.revision).toEqual({ produced: 4, replaced: 3 })
  })

  it("takes its timestamp from the first thing that happened, not the last", () => {
    const record = recordFromEvents([
      envelope({ type: "intent-received", intent: INTENT }, "2026-08-12T09:00:00.000Z"),
      envelope({ type: "change-committed", proposalId: "p_1" as never, revision: 1 }, "2026-08-12T09:00:03.000Z"),
    ])

    expect(record?.askedAt).toBe("2026-08-12T09:00:00.000Z")
  })
})

/**
 * The one field on a record that the events do not carry.
 *
 * `undoes` is stamped by the action that asked for the undo, because the log
 * says which revision is being put back only inside two sentences the runtime
 * synthesised — and this surface does not read those (`undo.ts`). Everything
 * else about a record survives a fold by construction; this has to be carried
 * deliberately, and the moment it matters is the moment it would be lost.
 */
/** The bare record an undo starts from, before anything has been decided. */
const askedAsUndo = (): ChangeRecord => {
  const base = recordFromEvents([envelope({ type: "intent-received", intent: INTENT })])
  if (base === undefined) throw new Error("an intent alone should always produce a record")

  return base
}

describe("a record that is an undo", () => {
  /**
   * Answering a held undo folds a second assessment and verdict onto the record
   * that was waiting, exactly as answering any other hold does. If the fold
   * dropped `undoes`, the link would break at the instant the undo *landed* —
   * so the applied card would go on offering an undo of a change that had
   * already been put back, which is the defect this field exists to close.
   */
  it("keeps what it undoes when the answer is folded onto it", () => {
    const asUndo = { ...askedAsUndo(), undoes: 1 }
    const answered = recordFromEvents(
      [
        envelope({ type: "hold-confirmed", proposalId: "p_1" as never, actor: "a demo visitor" }),
        envelope({ type: "change-committed", proposalId: "p_1" as never, revision: 2 }),
      ],
      asUndo
    )

    expect(answered?.outcome).toBe("applied")
    expect(answered?.undoes).toBe(1)
  })

  /** And when the visitor turns their own undo down, which puts the offer back. */
  it("keeps what it undoes when the visitor declines it", () => {
    const declined = recordFromEvents(
      [envelope({ type: "hold-discarded", proposalId: "p_1" as never, actor: "a demo visitor" })],
      { ...askedAsUndo(), undoes: 1 }
    )

    expect(declined?.outcome).toBe("discarded")
    expect(declined?.undoes).toBe(1)
  })

  /** An ordinary ask is not an undo of anything, and must not become one. */
  it("is absent on a change that was not an undo", () => {
    const record = recordFromEvents([
      envelope({ type: "intent-received", intent: INTENT }),
      envelope({ type: "change-committed", proposalId: "p_1" as never, revision: 1 }),
    ])

    expect(record?.undoes).toBeUndefined()
  })
})
