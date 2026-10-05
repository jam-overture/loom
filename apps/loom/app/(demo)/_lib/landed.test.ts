import { describe, expect, it } from "vitest"

import { landedOnYourPress } from "./landed"
import type { ChangeRecord } from "./record"

/**
 * Which card, if any, is the frame the visitor's last press produced.
 *
 * The defect this exists for was measured with a browser and a ruler rather
 * than argued: the rail keeps the scroll it took for the *question*, the panel
 * above the card loses 91px when the question is answered, and the payoff card
 * ends up 48px above the fold — with the **Applied** badge and the quoted ask
 * off the top of the screen. So what is asserted here is not that a predicate
 * is true, it is the orderings in which a surface asking a simpler question
 * would name the wrong card or no card at all.
 *
 * **And one of those orderings used to be the answer**, which is what this run
 * changed: the reading required `answeredBy`, so the two asks the rail marks
 * **GOES AHEAD** — the only one-press changes this surface offers — got no
 * landing, and their record sat 440px under the rail's fold.
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

describe("the card the press landed", () => {
  it("names the record whose answer produced the revision the page is at", () => {
    expect(landedOnYourPress([ANSWERED], 2)?.recordId).toBe("i_answered")
  })

  /**
   * **The row this run added, and the one the whole change is about.** A change
   * the Gate let through needs no answer, so the visitor's one press is the
   * whole sequence — and the record of it is the only place the Gate's verdict,
   * the reversibility and **Put it back** exist. Measured at 1280 × 900 while
   * this reading said nothing: the card's top was at 848 of a 900px viewport.
   */
  it("names a change that went ahead on its own, which nobody was asked about", () => {
    expect(landedOnYourPress([ON_ITS_OWN], 1)?.recordId).toBe("i_alone")
    expect(ON_ITS_OWN.answeredBy).toBeUndefined()
  })

  /**
   * **Newest-first is the wrong question**, and this is the ordering that says
   * so. A visitor can leave one question open, ask for something that lands on
   * its own, and answer the first question afterwards — and answering folds
   * onto the record that was waiting rather than minting a new one, so the card
   * they just answered sits *below* the one they asked for in between.
   *
   * It is also the ordering that says *newest applied* is not it either: both
   * records here are applied, and the one at the head of the list is the one
   * the page has already moved past.
   */
  it("finds the answered card even when a later ask sits above it in the list", () => {
    const records = [{ ...ON_ITS_OWN, revision: { produced: 1, replaced: 0 } }, ANSWERED]

    expect(landedOnYourPress(records, 2)?.recordId).toBe("i_answered")
  })

  /**
   * The other half of the pair, and the reason the revision is read at all: a
   * record keeps its outcome for life, so on its own it would go on naming a
   * card the visitor landed four presses ago.
   */
  it("goes quiet once anything else has moved the page", () => {
    const records = [{ ...ON_ITS_OWN, revision: { produced: 3, replaced: 2 } }, ANSWERED]

    expect(landedOnYourPress(records, 3)?.recordId).toBe("i_alone")
    expect(landedOnYourPress(records, 2)?.recordId).toBe("i_answered")
    expect(landedOnYourPress(records, 4)).toBe(undefined)
  })

  /**
   * A question that is still open produced no revision, so there is no landing
   * to speak of — the card is the question, and `AnswerInView` is already
   * carrying the visitor to it.
   */
  it("names nothing while the question is still waiting on an answer", () => {
    const { revision: _none, answeredBy: _unanswered, ...held } = ANSWERED

    expect(landedOnYourPress([{ ...held, outcome: "awaiting-you", heldProposalId: "p_1" }], 1)).toBe(
      undefined
    )
  })

  /**
   * And a refusal is not a landing. *No thanks* is an answer and it moves no
   * revision, so the card stays where the visitor left it rather than being
   * carried anywhere — which is the same arithmetic as the open question above,
   * reached by the opposite press.
   */
  it("names nothing for an answer that declined the change", () => {
    const { revision: _none, ...declined } = ANSWERED

    expect(landedOnYourPress([{ ...declined, outcome: "discarded" }], 1)).toBe(undefined)
  })

  it("names nothing when there is no record at all", () => {
    expect(landedOnYourPress([], 0)).toBe(undefined)
  })

})
