import { describe, expect, it } from "vitest"

import type { ChangeRecord } from "./record"
import { invalidReport, stateReport } from "./report"
import { undoStillOffered } from "./undo"

/**
 * The one question the payoff card's undo has to answer correctly: is there
 * still something to put back?
 *
 * Every case below is a press of *Put it back* that came back from the server,
 * and the old rule (`!undoReport`) got four of the five wrong — it read any
 * answer at all as "the change has been undone".
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
 * The reports a press of *Put it back* can come back with, built through the
 * same constructor the action uses, so `moved` is derived here exactly as it is
 * in a request rather than being asserted by this file.
 */
const heldUndo = stateReport("waiting", "held for confirmation: restructures at depth 1", true)
const declinedUndo = stateReport("declined", "The proposal was not applied.", true)
const appliedUndo = stateReport("applied", "applied at revision 2", true)

describe("whether the undo is still on offer", () => {
  it("offers it on a change that applied, and not on one that never did", () => {
    expect(undoStillOffered(APPLIED, null)).toBe(true)
    expect(undoStillOffered(HELD, null)).toBe(false)
  })

  /**
   * The defect, as an assertion. Pressing *Put it back* on the demo's primary
   * change produces a **held** undo: a proposal in custody, a card of its own
   * in the rail, and a page that has not moved. The change is still live on the
   * page, so the offer must still stand — the card's own sentence names it.
   */
  it("keeps offering it when Loom held the undo rather than making it", () => {
    expect(heldUndo.recorded).toBe(true)
    expect(heldUndo.moved).toBe(false)
    expect(undoStillOffered(APPLIED, heldUndo)).toBe(true)
  })

  /**
   * The dead end underneath the same line of code: a visitor who pressed *Put
   * it back*, was asked about it, and said *No thanks* had turned down their
   * own undo and lost the only way to ask for it again.
   */
  it("keeps offering it after the visitor turns the undo down", () => {
    expect(undoStillOffered(APPLIED, declinedUndo)).toBe(true)
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
