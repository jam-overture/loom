import { describe, expect, it } from "vitest"

import type { ChangeRecord } from "./record"
import { invalidReport, stateReport } from "./report"
import { UNDO_IS_A_CHANGE, undoStillOffered } from "./undo"

/**
 * The two things the payoff card's one control has to get right: what it says
 * about itself before it is pressed, and whether it is still there afterwards.
 */

const APPLIED: ChangeRecord = {
  recordId: "i_1",
  askedAt: "2026-08-29T09:00:00.000Z",
  utterance: "Take the numbers band off the page.",
  origin: "user-instruction",
  actor: "a demo visitor",
  outcome: "applied",
  revision: { produced: 1, replaced: 0 },
  repaired: false,
  touched: [],
}

/** The same ask before it was answered: nothing to put back yet. */
const HELD: ChangeRecord = (({ revision: _unapplied, ...rest }) => ({
  ...rest,
  outcome: "awaiting-you" as const,
  heldProposalId: "p_9",
}))(APPLIED)

/**
 * The two reports a press of *Put it back* can come back with on this demo,
 * built through the same constructor the actions use so that `moved` is derived
 * here exactly as it is in a request.
 */
const heldUndo = stateReport("waiting", "held for confirmation: restructures at depth 1", true)
const appliedUndo = stateReport("applied", "applied at revision 2", true)

describe("whether the undo is still on offer", () => {
  it("offers it on a change that applied, and not on one that never did", () => {
    expect(undoStillOffered(APPLIED, null)).toBe(true)
    expect(undoStillOffered(HELD, null)).toBe(false)
  })

  /**
   * The defect this function was extracted to fix, as an assertion.
   *
   * Pressing *Put it back* on the demo's primary change produces a **held**
   * undo: a proposal in custody, a card of its own in the rail, and a page that
   * has not moved. The card used to withdraw the button on any answer at all,
   * so what a visitor was left holding was a payoff card reading *"This change
   * is live on the page beside you. “Put it back” undoes it."* with no such
   * button on it. The change is still live; the offer must still stand.
   */
  it("keeps offering it when Loom held the undo rather than making it", () => {
    expect(heldUndo.recorded).toBe(true)
    expect(heldUndo.moved).toBe(false)
    expect(undoStillOffered(APPLIED, heldUndo)).toBe(true)
  })

  /**
   * The dead end underneath the same line of code. A visitor who pressed *Put
   * it back*, was asked about it, and said *No thanks* had turned down their
   * own undo and lost the only way to ask for it again.
   */
  it("keeps offering it after the visitor turns the undo down", () => {
    const declined = stateReport("declined", "The proposal was not applied.", true)

    expect(undoStillOffered(APPLIED, declined)).toBe(true)
  })

  it("keeps offering it when the form never reached the runtime", () => {
    expect(undoStillOffered(APPLIED, invalidReport("revision: expected number"))).toBe(true)
  })

  /** The one outcome that empties the offer: the page is back where it started. */
  it("withdraws it once the undo has actually moved the page", () => {
    expect(appliedUndo.moved).toBe(true)
    expect(undoStillOffered(APPLIED, appliedUndo)).toBe(false)
  })
})

describe("what the button says about itself", () => {
  /**
   * `presets.ts` states the rule for every promise on this surface and it binds
   * this one: a control may describe the movement it asks for and may never
   * predict the verdict, which is computed against the tree at assessment time.
   * Two of the five undos here do land unasked, so anything stronger than *may*
   * would be a surface guessing a decision it does not make.
   */
  it("says Loom may ask, and never that it will", () => {
    expect(UNDO_IS_A_CHANGE).toMatch(/may ask you/)
    expect(UNDO_IS_A_CHANGE).not.toMatch(/\bwill ask\b/)
  })

  /**
   * The claim worth the line. "This might not work straight away" would cover
   * the surprise and teach nothing; what a stranger cannot infer, and what 0028
   * is, is that the undo is itself a change Loom weighs.
   */
  it("says why, which is that undoing is a change of its own", () => {
    expect(UNDO_IS_A_CHANGE).toMatch(/change of its own/)
  })
})
