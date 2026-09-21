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

/**
 * A hold the runtime has released, and a record that had gone on describing it.
 *
 * `confirmHeld` releases custody before it narrates a conflict, saying why in
 * its own words: *"A hold names a revision, so a hold whose tree has moved on
 * can never apply again — it is not stale pending a retry, it is dead."* The
 * record kept `held` set through that, so the card read **Waiting on you** and
 * *"Loom will not make this change until you say yes"* about a proposal no yes
 * could reach, with the conflict code in the smallest type on the card as the
 * only correction.
 */
describe("a record whose commit failed", () => {
  const heldThenFailed = (): ChangeRecord | undefined =>
    recordFromEvents([
      envelope({ type: "intent-received", intent: INTENT }),
      envelope({ type: "proposal-held", proposalId: "p_1" as never }),
      envelope({
        type: "commit-failed",
        proposalId: "p_1" as never,
        error: { code: "revision-conflict", treeId: INTENT.treeId, expected: 0, found: 1 },
      }),
    ])

  it("is no longer waiting on anybody, because the hold is gone", () => {
    const record = heldThenFailed()

    expect(record?.heldProposalId).toBeUndefined()
    expect(record?.outcome).toBe("did-not-apply")
  })

  /** Nothing is removed: the conflict is still on the record, in the runtime's words. */
  it("still carries what the runtime said went wrong", () => {
    expect(heldThenFailed()?.failure).toContain("revision-conflict")
  })

  /**
   * The other `commit-failed` — an append that failed after the Gate allowed the
   * change on its own — has no hold to clear, and must not gain one or lose the
   * failure by passing through the same branch.
   */
  it("reads the same on a change that was never held at all", () => {
    const record = recordFromEvents([
      envelope({ type: "intent-received", intent: INTENT }),
      envelope({
        type: "commit-failed",
        proposalId: "p_1" as never,
        error: { code: "unavailable", detail: "the store was not there" },
      }),
    ])

    expect(record?.heldProposalId).toBeUndefined()
    expect(record?.outcome).toBe("did-not-apply")
    expect(record?.failure).toContain("unavailable")
  })
})

/**
 * The other field the events cannot supply.
 *
 * `presetId` is stamped by the action that read the form, because the runtime is
 * handed the preset's *utterance* and nothing that says a button produced it. It
 * has to survive a fold for the same reason `undoes` does: the fold is what
 * happens when a visitor answers, and a dead ask that had lost its preset would
 * have lost the one control it can honestly offer.
 */
describe("a record that came from one of the suggestions", () => {
  it("keeps which suggestion it was when an answer is folded onto it", () => {
    const asked = recordFromEvents([envelope({ type: "intent-received", intent: INTENT })])
    if (asked === undefined) throw new Error("an intent alone should always produce a record")

    const answered = recordFromEvents(
      [envelope({ type: "change-committed", proposalId: "p_1" as never, revision: 1 })],
      { ...asked, presetId: "trim" }
    )

    expect(answered?.presetId).toBe("trim")
  })

  it("is absent on an ask that named no suggestion", () => {
    const record = recordFromEvents([envelope({ type: "intent-received", intent: INTENT })])

    expect(record?.presetId).toBeUndefined()
  })
})

/**
 * What a change moved, and whether that put the last one back, across the fold
 * that answers a hold.
 *
 * The same shape as `undoes` and `did` above and it is carried for the same
 * reason: a held change is assessed when it is asked for and answered later, so
 * the only fold with the tree and the history in hand is the first one. A fold
 * that dropped either of these would empty the reading at the exact press that
 * makes it true — and worse, would leave the *next* ask with nothing to compare
 * itself against, so a toggle pressed twice would go back to printing one
 * sentence twice.
 */
describe("what a change moved", () => {
  const moved = [{ nodeId: "n_1" as never, key: "backdrop", from: "aurora", to: "panel" }]

  it("keeps the settings it moved when the answer is folded onto it", () => {
    const asked: ChangeRecord = { ...askedAsUndo(), settingsMoved: moved, wentBack: true }
    const answered = recordFromEvents(
      [
        envelope({ type: "hold-confirmed", proposalId: "p_1" as never, actor: "a demo visitor" }),
        envelope({ type: "change-committed", proposalId: "p_1" as never, revision: 2 }),
      ],
      asked
    )

    expect(answered?.settingsMoved).toEqual(moved)
    expect(answered?.wentBack).toBe(true)
  })

  /**
   * And a record whose caller could not name the tree carries no answer at all,
   * rather than a confident `false`. The two are read the same way by
   * `putsSomethingBack`; they are different facts, and one of them is "nobody
   * looked".
   */
  it("says nothing about either when there was no tree to read them against", () => {
    const record = recordFromEvents([envelope({ type: "intent-received", intent: INTENT })])

    expect(record?.settingsMoved).toBeUndefined()
    expect(record?.wentBack).toBeUndefined()
  })
})
