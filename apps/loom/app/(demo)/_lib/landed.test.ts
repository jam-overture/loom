import { describe, expect, it } from "vitest"

import { landedOnYourAnswer } from "./landed"
import type { ChangeRecord } from "./record"

/**
 * Which card, if any, is the frame the visitor's second press produced.
 *
 * The defect this exists for was measured with a browser and a ruler rather
 * than argued: the rail keeps the scroll it took for the *question*, the panel
 * above the card loses 91px when the question is answered, and the payoff card
 * ends up 48px above the fold — with the **Applied** badge and the quoted ask
 * off the top of the screen. So what is asserted here is not that a predicate
 * is true, it is the three orderings in which a surface asking a simpler
 * question would name the wrong card or no card at all.
 */

const ANSWERED: ChangeRecord = {
  recordId: "i_answered",
  askedAt: "2026-09-29T09:00:00.000Z",
  utterance: "Take the numbers band off the page.",
  origin: "user-instruction",
  actor: "a demo visitor",
  outcome: "applied",
  revision: { produced: 2, replaced: 1 },
  answeredBy: "a demo visitor",
  repaired: false,
  touched: [],
}

/** A change the Gate allowed on its own — nobody was asked, so nobody answered. */
const ON_ITS_OWN: ChangeRecord = {
  recordId: "i_alone",
  askedAt: "2026-09-29T09:01:00.000Z",
  utterance: "Make the page feel like autumn.",
  origin: "user-instruction",
  actor: "a demo visitor",
  outcome: "applied",
  revision: { produced: 1, replaced: 0 },
  repaired: false,
  touched: [],
}

describe("the card the answer landed", () => {
  it("names the record whose answer produced the revision the page is at", () => {
    expect(landedOnYourAnswer([ANSWERED], 2)?.recordId).toBe("i_answered")
  })

  /**
   * **Newest-first is the wrong question**, and this is the ordering that says
   * so. A visitor can leave one question open, ask for something that lands on
   * its own, and answer the first question afterwards — and answering folds
   * onto the record that was waiting rather than minting a new one, so the card
   * they just answered sits *below* the one they asked for in between.
   */
  it("finds the answered card even when a later ask sits above it in the list", () => {
    const records = [{ ...ON_ITS_OWN, revision: { produced: 1, replaced: 0 } }, ANSWERED]

    expect(landedOnYourAnswer(records, 2)?.recordId).toBe("i_answered")
  })

  /**
   * The other half of the pair, and the reason the revision is read at all:
   * `answeredBy` survives for the life of the record, so on its own it would go
   * on naming a card the visitor answered four presses ago.
   */
  it("goes quiet once anything else has moved the page", () => {
    expect(landedOnYourAnswer([{ ...ON_ITS_OWN, revision: { produced: 3, replaced: 2 } }, ANSWERED], 3)?.recordId).toBe(
      undefined
    )
  })

  it("names nothing for a change nobody was asked about", () => {
    expect(landedOnYourAnswer([ON_ITS_OWN], 1)).toBe(undefined)
  })

  /**
   * A question that is still open produced no revision, so there is no landing
   * to speak of — the card is the question, and `AnswerInView` is already
   * carrying the visitor to it.
   */
  it("names nothing while the question is still waiting on an answer", () => {
    const { revision: _none, answeredBy: _unanswered, ...held } = ANSWERED

    expect(landedOnYourAnswer([{ ...held, outcome: "awaiting-you", heldProposalId: "p_1" }], 1)).toBe(
      undefined
    )
  })

  it("names nothing when there is no record at all", () => {
    expect(landedOnYourAnswer([], 0)).toBe(undefined)
  })
})
