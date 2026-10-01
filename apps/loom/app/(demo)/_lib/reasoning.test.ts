import { describe, expect, it } from "vitest"

import type { ChangeRecord } from "./record"
import { reasoningFor } from "./reasoning"

/**
 * Which card argues its case, and the two ways this could make the demo worse.
 *
 * Folding a repeated argument is a rail that scrolls less, and a payoff card
 * that fits its frame. Folding a *live* one is a stranger being asked to press
 * **Apply this change** with the sentence that makes it safe to press hidden
 * behind a click; folding a *first* one is a change that landed on its own with
 * nothing on screen saying why Loom was allowed to. Both are one condition away
 * in `reasoningFor`, so most of this file is about them.
 */

const ASKED: Omit<ChangeRecord, "outcome"> = {
  recordId: "i_1",
  askedAt: "2026-09-15T09:00:00.000Z",
  utterance: "Take the numbers band off the page.",
  origin: "user-instruction",
  actor: "a demo visitor",
  stakes: { level: "medium", factors: [] },
  reversibility: { reversible: true, retainedNodeCount: 4, reasons: [], inverseOperations: [], inverse: [] },
  repaired: false,
  touched: [],
}

/**
 * Landed on its own, and nothing is waiting on anybody.
 *
 * **No `answeredBy`, and that is the point of this fixture**: the Gate let it
 * through without asking, so this card is the only place its reasoning has ever
 * been shown.
 */
const APPLIED: ChangeRecord = { ...ASKED, outcome: "applied", revision: { produced: 1, replaced: 0 } }

const OLDER: ChangeRecord = { ...APPLIED, recordId: "i_2" }
const OLDEST: ChangeRecord = { ...APPLIED, recordId: "i_3" }

/** Waiting on the visitor: a proposal in custody and two buttons on the card. */
const HELD: ChangeRecord = { ...ASKED, outcome: "awaiting-you", heldProposalId: "p_1", recordId: "i_4" }

/**
 * The same record as `HELD`, one press later — which is what answering does to
 * it (`session.ts` replaces the record rather than adding one, and `record.ts`
 * clears `held` while setting `answeredBy`).
 *
 * This is the demo's payoff card and the reason this file changed.
 */
const ANSWERED: ChangeRecord = {
  ...ASKED,
  recordId: "i_4",
  outcome: "applied",
  answeredBy: "a demo visitor",
  revision: { produced: 1, replaced: 0 },
}

/**
 * Answered with **No thanks**: `answeredBy` is set and nothing landed.
 *
 * `discarded` is what the record calls it — the proposal left custody without
 * producing a revision (`record.ts`).
 */
const DECLINED: ChangeRecord = {
  ...ASKED,
  recordId: "i_5",
  outcome: "discarded",
  answeredBy: "a demo visitor",
}

describe("which cards show the gate's working", () => {
  it("opens the newest card, which is the one the visitor just produced", () => {
    expect(reasoningFor(APPLIED, [APPLIED, OLDER, OLDEST], false)).toBe("open")
  })

  it("folds every card under it, which is where the repetition is", () => {
    const records = [APPLIED, OLDER, OLDEST]

    expect(reasoningFor(OLDER, records, false)).toBe("folded")
    expect(reasoningFor(OLDEST, records, false)).toBe("folded")
  })

  it("opens a lone card, because a lone card is the newest one", () => {
    expect(reasoningFor(APPLIED, [APPLIED], false)).toBe("open")
  })

  /**
   * The assertion this module exists to keep true.
   *
   * `weighed.ts` records that the reversal answer is *the sentence that makes
   * the green button pressable* — the only thing on the card telling a stranger
   * that saying yes to a described loss is safe. A visitor can leave one
   * question open and ask for something else, which pushes the question down
   * the rail; the buttons go with it, and so must the reassurance.
   */
  it("opens a card still waiting on an answer, wherever it has ended up in the rail", () => {
    expect(reasoningFor(HELD, [APPLIED, OLDER, HELD], false)).toBe("open")
  })

  /**
   * A hold the page has moved past has two buttons that cannot succeed and is
   * not waiting on the visitor at all — `PageMovedOn` takes their place. Those
   * are also the tallest cards in the rail, measured at 570–593px against 496px
   * for a card that landed.
   */
  it("folds a hold the page has moved past, which nobody can answer", () => {
    expect(reasoningFor(HELD, [APPLIED, OLDER, HELD], true)).toBe("folded")
  })

  it("still opens a moved hold when it is the newest card", () => {
    expect(reasoningFor(HELD, [HELD, APPLIED], true)).toBe("open")
  })

  /**
   * Answering a hold replaces the record rather than adding one (`session.ts`),
   * so a caller can be holding an object that is no longer the one in the list.
   * Identity is the id, and a reference check here would fold the newest card.
   *
   * The probe is a *moved hold* rather than an applied change because the moved
   * hold reaches "open" through the newest-card clause and nothing else, so a
   * reference check is the only thing that can make this row fail.
   */
  it("knows the newest card by its id and not by reference", () => {
    const sameRecordAgain: ChangeRecord = { ...HELD }

    expect(sameRecordAgain).not.toBe(HELD)
    expect(reasoningFor(sameRecordAgain, [HELD, APPLIED], true)).toBe("open")
  })

  it("folds against an empty list rather than throwing", () => {
    expect(reasoningFor(APPLIED, [], false)).toBe("folded")
  })
})

/**
 * ## The card the visitor answered, which is the demo's payoff
 *
 * Measured at 1280 × 900 against a production build: the applied card is 975px
 * in a rail whose viewport is 857px, and **Put it back** — the inverse the
 * whole demonstration is for — sits 23px below the bottom edge. Roughly 190px
 * of that card is the weighing panel, the rule and the ceiling, which the
 * visitor read on this very card one press earlier in order to press the green
 * button at all.
 */
describe("the card the visitor answered", () => {
  it("folds its reasoning, because the visitor read it to decide", () => {
    expect(reasoningFor(ANSWERED, [ANSWERED], false)).toBe("folded")
  })

  it("folds it even though it is the newest card, which is the exception", () => {
    expect(reasoningFor(ANSWERED, [ANSWERED, OLDER, OLDEST], false)).toBe("folded")
  })

  /**
   * The same record, one press earlier. The pair is the whole rule: the
   * argument is open at the moment it is being acted on, and folded at the
   * moment it is being remembered.
   */
  it("was open on the same card while it was still a question", () => {
    expect(HELD.recordId).toBe(ANSWERED.recordId)
    expect(reasoningFor(HELD, [HELD], false)).toBe("open")
    expect(reasoningFor(ANSWERED, [ANSWERED], false)).toBe("folded")
  })

  /**
   * `answeredBy` is not a proxy for "landed", and this is the row that says so.
   *
   * A change that applied on its own was never held, never argued in front of
   * anybody, and its card is the *first* telling of its reasoning rather than
   * the second — which is the whole claim for a low-risk ask: Loom did this by
   * itself, and here is what it weighed.
   */
  it("does not fold a change that landed on its own, which nobody was asked about", () => {
    expect(APPLIED.answeredBy).toBeUndefined()
    expect(reasoningFor(APPLIED, [APPLIED], false)).toBe("open")
  })

  /**
   * And "landed" is not a proxy for `answeredBy` either. A declined ask sets
   * `answeredBy` and produces no revision: it grows no undo, no *what came
   * off* and no kept band, so folding it would buy no room and hide the only
   * content the card has.
   */
  it("does not fold a declined ask, which has an answer and nothing else", () => {
    expect(DECLINED.answeredBy).toBeDefined()
    expect(DECLINED.revision).toBeUndefined()
    expect(reasoningFor(DECLINED, [DECLINED], false)).toBe("open")
  })

  it("folds an answered card that is no longer the newest, as it always did", () => {
    expect(reasoningFor(ANSWERED, [OLDER, ANSWERED], false)).toBe("folded")
  })
})
