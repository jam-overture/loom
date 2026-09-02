import { describe, expect, it } from "vitest"

import { REVERT_INTERPRETER } from "@loom/runtime/write"

import type { ChangeRecord, InterpretationView } from "./record"
import { askedLine, undoOf, undoOffer, UNDO_CAUTION, UNDO_LABEL } from "./undo"

/**
 * What the card quotes, and what it must never quote.
 *
 * The substitution is small and the property under it is not: this surface's
 * one reserved position — the line a visitor is meant to recognise as their own
 * — must never be filled by a sentence the runtime synthesised about its own
 * log. `Undo revision 1.` is that sentence, and it arrived there by the third
 * press.
 */

const ASKED: Omit<ChangeRecord, "interpretation"> = {
  recordId: "i_1",
  askedAt: "2026-08-26T09:00:00.000Z",
  utterance: "Take the numbers band off the page.",
  origin: "user-instruction",
  actor: "a demo visitor",
  outcome: "applied",
  repaired: false,
  touched: [],
}

const interpretedBy = (interpreter: string): InterpretationView => ({
  rationale: "the inverse of revision 1, node for node",
  interpreter,
  authoredBy: "runtime",
  confidence: 1,
  interpretedAt: "2026-08-26T09:00:00.000Z",
  operations: ["insert element into n_1 at 3"],
})

const UNDO: ChangeRecord = {
  ...ASKED,
  utterance: "Undo revision 1.",
  interpretation: interpretedBy(REVERT_INTERPRETER),
}

const PRESET: ChangeRecord = { ...ASKED, interpretation: interpretedBy("loom/demo-preset") }

describe("what a card quotes", () => {
  it("quotes an ordinary ask in the words it was asked in, and adds nothing to the record", () => {
    expect(askedLine(PRESET)).toEqual({ plain: "Take the numbers band off the page." })
  })

  /**
   * The one that matters. A visitor pressed a control and is shown a card
   * quoting them; the quotation has to be the control.
   */
  it("quotes an undo as the words on the button the visitor pressed", () => {
    expect(askedLine(UNDO).plain).toBe(`${UNDO_LABEL}.`)
    expect(askedLine(UNDO).plain).not.toContain("revision")
  })

  /** Nothing is removed. The runtime's sentence moves one click down. */
  it("keeps the runtime's own utterance for the undo, as the technical half", () => {
    expect(askedLine(UNDO).technical).toBe("Undo revision 1.")
  })

  /**
   * Asked of the runtime rather than pattern-matched. A preset whose utterance
   * happens to talk about undoing is still a preset, and a revert stamped by
   * `revertRevision` is an undo whatever its utterance says — which is the
   * difference between reading provenance and reading English.
   */
  it("reads the interpreter the runtime stamped, not the sentence", () => {
    const talksAboutUndoing: ChangeRecord = {
      ...PRESET,
      utterance: "Undo the change to the numbers band.",
    }

    expect(askedLine(talksAboutUndoing).technical).toBeUndefined()
    expect(askedLine(talksAboutUndoing).plain).toBe("Undo the change to the numbers band.")
  })

  /** An ask that never reached an interpreter has only its own words. */
  it("falls through to the utterance when nothing was interpreted", () => {
    const refused: ChangeRecord = { ...ASKED, outcome: "refused" }

    expect(askedLine(refused)).toEqual({ plain: "Take the numbers band off the page." })
  })
})

describe("what the undo warns", () => {
  /**
   * The reason this is asserted rather than left to the eye: a caution that
   * predicts the verdict would be wrong the first time the policy or the page
   * moved, and the demo's whole credibility is that it never says what the Gate
   * will decide before the Gate has decided it (`presets.ts`).
   */
  it("says the undo may wait, and never that it will", () => {
    expect(UNDO_CAUTION).toMatch(/may/)
    expect(UNDO_CAUTION).not.toMatch(/\bwill\b/)
  })
})

/**
 * Whether the card still has an undo to offer.
 *
 * The rule these replace was `!undoReport` — withdraw the offer as soon as the
 * server answers anything at all — and on this demo's primary path the first
 * answer is a *hold*. So the button disappeared while the page had not moved,
 * off a card still saying "Put it back" undoes it, and a visitor who then
 * declined their own undo could never ask for it again.
 *
 * Every case below is a state that rule got wrong, or one it got right by
 * accident and this one has to keep getting right.
 */

/** The change whose card carries the undo: applied, and it produced revision 1. */
const APPLIED: ChangeRecord = {
  ...ASKED,
  recordId: "i_applied",
  revision: { produced: 1, replaced: 0 },
}

/** An undo of revision 1, in whichever state the case is about. */
const undoRecord = (outcome: ChangeRecord["outcome"], undoes = 1): ChangeRecord => ({
  ...ASKED,
  recordId: `i_undo_${outcome}_${undoes}`,
  utterance: `Undo revision ${undoes}.`,
  interpretation: interpretedBy(REVERT_INTERPRETER),
  outcome,
  undoes,
})

describe("whether the undo is still on offer", () => {
  it("offers it on an applied change nobody has tried to undo", () => {
    expect(undoOffer(APPLIED, [APPLIED])).toBe("offer")
  })

  /**
   * The defect, in one assertion. The undo is held — an undo is a change of its
   * own (0032) and this one restructures the page as much as the change it
   * reverses — so the page has not moved and the change really is still live.
   * The old rule withdrew the button here.
   */
  it("does not withdraw the offer because the Gate is holding the undo", () => {
    const records = [undoRecord("awaiting-you"), APPLIED]

    expect(undoOffer(APPLIED, records)).not.toBe("spent")
    expect(undoOffer(APPLIED, records)).toBe("waiting")
  })

  /**
   * The half a visitor could reach and never come back from: they pressed
   * "Put it back", the Gate asked, they said no. The change is still live and
   * the offer has to be there again — under the old rule the button was gone
   * for the rest of the visit.
   */
  it("puts the offer back when the visitor declines their own undo", () => {
    expect(undoOffer(APPLIED, [undoRecord("discarded"), APPLIED])).toBe("offer")
  })

  /** And the one state that really does spend it: the undo applied. */
  it("withdraws the offer once an undo of this revision has landed", () => {
    expect(undoOffer(APPLIED, [undoRecord("applied"), APPLIED])).toBe("spent")
  })

  /**
   * A landed undo outranks a second one still waiting. Asking twice is possible
   * — decline, then ask again — so both records can exist at once, and the
   * page has already moved whatever the second one is doing.
   */
  it("reads a landed undo as spent even while another is waiting", () => {
    const records = [undoRecord("awaiting-you"), undoRecord("applied"), APPLIED]

    expect(undoOffer(APPLIED, records)).toBe("spent")
  })

  /**
   * Deliberate: nothing moved, the change is still live, and the refusal has a
   * card of its own saying which rule stopped it. Telling a visitor the change
   * can never be put back would be a claim no record here makes.
   */
  it("leaves the offer standing when the Gate refused the undo", () => {
    expect(undoOffer(APPLIED, [undoRecord("refused"), APPLIED])).toBe("offer")
    expect(undoOffer(APPLIED, [undoRecord("did-not-apply"), APPLIED])).toBe("offer")
  })

  /**
   * The link is by revision, not by "is there an undo anywhere". A visitor can
   * apply two changes and undo the older one, and the newer card must not read
   * its neighbour's undo as its own.
   */
  it("only counts an undo of this card's own revision", () => {
    const second: ChangeRecord = {
      ...ASKED,
      recordId: "i_second",
      revision: { produced: 2, replaced: 1 },
    }
    const records = [undoRecord("applied", 1), second, APPLIED]

    expect(undoOffer(second, records)).toBe("offer")
    expect(undoOffer(APPLIED, records)).toBe("spent")
  })

  /** A card with no revision has no undo to offer and nothing to withdraw. */
  it("offers nothing to withdraw on a change that never produced a revision", () => {
    expect(undoOffer({ ...ASKED, outcome: "awaiting-you" }, [])).toBe("offer")
  })
})

describe("stamping an undo with what it undoes", () => {
  /**
   * The number comes from the caller because the log does not carry it in a
   * form this surface may read: `revertRevision` synthesises the sentence
   * "Undo revision 1." and a rationale saying it again in prose, and reading
   * either would be this file pattern-matching a string it does not own —
   * which is exactly what `askedLine` refuses to do above.
   */
  it("records the revision the caller asked to put back", () => {
    expect(undoOf(PRESET, 3).undoes).toBe(3)
  })

  it("changes nothing else about the record", () => {
    expect({ ...undoOf(PRESET, 3), undoes: undefined }).toEqual({ ...PRESET, undoes: undefined })
  })
})
