import { describe, expect, it } from "vitest"

import type { ChangeRecord } from "./record"
import { reasoningFor } from "./reasoning"

/**
 * Which card argues its case, and the one way this could make the demo worse.
 *
 * Folding a repeated argument is a rail that scrolls less. Folding a *live* one
 * is a stranger being asked to press **Apply this change** with the sentence
 * that makes it safe to press hidden behind a click. The two are one line apart
 * in `reasoningFor`, so most of this file is about the second.
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

/** Landed on its own, and nothing is waiting on anybody. */
const APPLIED: ChangeRecord = { ...ASKED, outcome: "applied", revision: { produced: 1, replaced: 0 } }

const OLDER: ChangeRecord = { ...APPLIED, recordId: "i_2" }
const OLDEST: ChangeRecord = { ...APPLIED, recordId: "i_3" }

/** Waiting on the visitor: a proposal in custody and two buttons on the card. */
const HELD: ChangeRecord = { ...ASKED, outcome: "awaiting-you", heldProposalId: "p_1", recordId: "i_4" }

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
   */
  it("knows the newest card by its id and not by reference", () => {
    const sameRecordAgain: ChangeRecord = { ...APPLIED }

    expect(sameRecordAgain).not.toBe(APPLIED)
    expect(reasoningFor(sameRecordAgain, [APPLIED, OLDER], false)).toBe("open")
  })

  it("folds against an empty list rather than throwing", () => {
    expect(reasoningFor(APPLIED, [], false)).toBe("folded")
  })
})
