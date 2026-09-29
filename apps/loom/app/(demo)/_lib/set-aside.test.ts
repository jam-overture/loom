import { describe, expect, it } from "vitest"

import { movedOn } from "./moved"
import type { ChangeRecord } from "./record"
import { setAside } from "./set-aside"

/**
 * What the panel is told before it offers a visitor four ways to lose the
 * question they are already being asked.
 *
 * Two properties carry the whole of it, and they pull in opposite directions:
 * the caution must appear whenever an answer would still land, and it must
 * **never** appear when it would not — a surface warning about a question that
 * is already dead is a surface making the rail harder to read while claiming to
 * make it easier. Most of this file is about the second.
 */

const ASKED: Omit<ChangeRecord, "outcome"> = {
  recordId: "i_1",
  askedAt: "2026-09-16T09:00:00.000Z",
  utterance: "Take the numbers band off the page.",
  origin: "user-instruction",
  actor: "a demo visitor",
  stakes: { level: "medium", factors: [] },
  reversibility: { reversible: true, retainedNodeCount: 4, reasons: [], inverseOperations: [], inverse: [] },
  repaired: false,
  touched: [],
}

/** Landed on its own. Nothing is waiting on anybody. */
const APPLIED: ChangeRecord = {
  ...ASKED,
  recordId: "i_applied",
  outcome: "applied",
  revision: { produced: 1, replaced: 0 },
}

/** Waiting on the visitor: a proposal in custody, two buttons on the card. */
const HELD: ChangeRecord = {
  ...ASKED,
  recordId: "i_held",
  outcome: "awaiting-you",
  heldProposalId: "p_held",
}

const ALSO_HELD: ChangeRecord = { ...HELD, recordId: "i_held_2", heldProposalId: "p_held_2" }

describe("the question an ask would set aside", () => {
  it("says nothing when the visitor has nothing open", () => {
    expect(setAside([APPLIED], new Set())).toBeUndefined()
  })

  it("says nothing about an empty record", () => {
    expect(setAside([], new Set())).toBeUndefined()
  })

  it("names a question the store still holds", () => {
    const found = setAside([HELD, APPLIED], new Set(["p_held"]))

    expect(found?.questions).toBe(1)
    expect(found?.recordId).toBe("i_held")
  })

  /**
   * The direction that matters, and the reason this is keyed on the store rather
   * than on `heldProposalId`.
   *
   * A record keeps the proposal id it was written with. Whether that proposal is
   * still answerable is a fact about the store and the tree's revision together
   * — `page.tsx` works it out once, for the three readings it computes against
   * the tree, and hands the same list here. A record whose hold is spent,
   * declined or dead is simply not in it, and the worst a mismatch can do is
   * leave the caution off, which is the surface as it stood before this.
   */
  it("says nothing about a hold the page has moved past, which no answer can land", () => {
    expect(movedOn(0, 1)).toBeDefined()
    expect(setAside([HELD, APPLIED], new Set())).toBeUndefined()
  })

  it("never takes a record with no hold for a question", () => {
    expect(APPLIED.heldProposalId).toBeUndefined()
    expect(setAside([APPLIED], new Set(["p_held"]))).toBeUndefined()
  })

  /**
   * Two asks held against one revision is reachable in two presses — neither has
   * moved the page, so neither has killed the other — and it is the case the
   * plural exists for.
   */
  it("counts every open question, and points at the newest", () => {
    const found = setAside([ALSO_HELD, HELD, APPLIED], new Set(["p_held", "p_held_2"]))

    expect(found?.questions).toBe(2)
    expect(found?.recordId).toBe("i_held_2")
  })

  it("counts only the ones still answerable when the visitor has two", () => {
    const found = setAside([ALSO_HELD, HELD, APPLIED], new Set(["p_held"]))

    expect(found?.questions).toBe(1)
    expect(found?.recordId).toBe("i_held")
  })

  it("agrees with itself about how many, in the sentence and on the way out", () => {
    const one = setAside([HELD], new Set(["p_held"]))
    const two = setAside([ALSO_HELD, HELD], new Set(["p_held", "p_held_2"]))

    expect(one?.sentence).toContain("One question")
    expect(one?.answerLabel).toBe("Answer it first")

    expect(two?.sentence).toContain("2 questions")
    expect(two?.answerLabel).toBe("Answer them first")
  })

  /**
   * The caution and `movedOn`'s sentence are one claim said at two moments —
   * before the press and after it — and a surface that explained the cost one way
   * and the consequence another would be two accounts of one rule. Asserted on
   * the clause they share rather than on either wording, so a retune of the copy
   * fails only if the claim moves.
   */
  it("gives the same reason before the press that the dead card gives after it", () => {
    const found = setAside([HELD], new Set(["p_held"]))

    expect(found?.sentence).toContain("a page it hasn’t seen")
    expect(movedOn(0, 1)?.sentence).toContain("a page it hasn’t seen")
  })

  it("says what the press would cost, and not only that the page would move", () => {
    expect(setAside([HELD], new Set(["p_held"]))?.sentence).toContain("set aside")
  })
})
