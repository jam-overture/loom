import { describe, expect, it } from "vitest"

import type { EditIntent, RuntimeEvent, RuntimeEventEnvelope } from "@loom/runtime"

import { recordFromEvents, ruleSentence } from "./record"

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

describe("every rule the Gate can fire", () => {
  it("has a sentence a reader who has never seen the codebase can follow", () => {
    const codes = [
      "within-policy",
      "confidence-below-floor",
      "stakes-at-refusal-floor",
      "irreversible",
      "discards-later-work",
      "stakes-above-ceiling",
      "confidence-below-minimum",
    ] as const

    for (const code of codes) {
      expect(ruleSentence(code).length, code).toBeGreaterThan(20)
    }
  })
})
