import { describe, expect, it } from "vitest"

import { REVERT_INTERPRETER } from "@loom/runtime/write"

import type { ChangeRecord, InterpretationView } from "./record"
import { askedLine, UNDO_CAUTION, UNDO_LABEL } from "./undo"

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
