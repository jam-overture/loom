import { ceilingFor, isAbove } from "@loom/runtime"
import { describe, expect, it } from "vitest"

import { ASK_ORIGINS, STAKES } from "@/app/(portal)/_lib/vocabulary"

import { ceilingNote } from "./ceiling"
import type { ChangeRecord, DispositionView } from "./record"
import { demoPolicy } from "./session"
import { weighedOf } from "./weighed"

/**
 * The sentence that gives "from here" a referent, and the four states it stays
 * quiet on.
 *
 * Nothing here asserts a wording. What is asserted is where the words came
 * from — the shared origin table, the shared stakes table, and the runtime's own
 * `ceilingFor` — because the defect this replaced was a surface printing a
 * runtime code it had never translated, and the way that returns is a surface
 * writing its own translation beside the one four other screens already use.
 */

const HELD_BY_THE_CEILING: DispositionView = {
  kind: "requires-confirmation",
  ruleCode: "stakes-above-ceiling",
  detail: "removes 4 nodes",
  policyId: "demo",
  confidence: 1,
}

const HELD: ChangeRecord = {
  recordId: "i_1",
  askedAt: "2026-09-04T09:00:00.000Z",
  utterance: "Take the numbers band off the page.",
  origin: "user-instruction",
  actor: "a demo visitor",
  outcome: "awaiting-you",
  stakes: { level: "medium", factors: [] },
  reversibility: { reversible: true, retainedNodeCount: 4, reasons: [], inverseOperations: [] },
  disposition: HELD_BY_THE_CEILING,
  heldProposalId: "p_1",
  repaired: false,
  touched: [],
}

describe("what an ask from here may do", () => {
  it("names the ceiling the demo's own policy sets for this origin", () => {
    /*
     * Against the policy rather than against "low": a retune of
     * `autoApplyCeiling` should rewrite this sentence, and a test holding the
     * literal would keep passing while the card told a visitor the wrong limit.
     */
    const allowed = STAKES[ceilingFor(demoPolicy, "user-instruction")].label

    expect(ceilingNote(HELD)?.sentence).toContain(allowed)
  })

  it("says what kind of ask it was in the words every other surface uses", () => {
    expect(ceilingNote(HELD)?.sentence).toContain(ASK_ORIGINS["user-instruction"].label)
  })

  /**
   * The whole point of moving the code out of the light: a sentence that
   * reintroduced `user-instruction`, or the bare stake level, would have put the
   * jargon back one line further down. Word boundaries rather than substrings,
   * so a future wording containing "allowed" is not read as containing "low".
   */
  it("puts no runtime code in the sentence", () => {
    const sentence = ceilingNote(HELD)?.sentence ?? ""

    expect(sentence).not.toMatch(/\buser-instruction\b/)
    for (const level of Object.values(STAKES)) {
      expect(sentence, level.technical).not.toMatch(new RegExp(`\\b${level.technical}\\b`))
    }
  })

  /**
   * The card now prints both halves of the Gate's comparison in the light —
   * `weighed.ts` says how much risk, this says how much is allowed unasked — and
   * the two have to be the same measure or the visitor is reading a false
   * inequality. One table, and a real `isAbove` between the two levels: if a
   * policy change ever made the demo's headline ask land on its own, this fails
   * rather than leaving the card explaining a hold that no longer happens.
   */
  it("is the other half of a comparison the card has already shown, and the comparison holds", () => {
    const stakes = HELD.stakes
    if (stakes === undefined) throw new Error("the fixture is the held ask, which was assessed")

    const ceiling = ceilingFor(demoPolicy, HELD.origin)
    const damage = weighedOf(HELD)?.[0]

    expect(damage?.verdict).toBe(STAKES[stakes.level].label)
    expect(ceilingNote(HELD)?.sentence).toContain(STAKES[ceiling].label)
    expect(isAbove(stakes.level, ceiling)).toBe(true)
  })

  it("keeps the level and the origin together in the runtime's own words", () => {
    const note = ceilingNote(HELD)

    expect(note?.technical).toContain(ceilingFor(demoPolicy, "user-instruction"))
    expect(note?.technical).toContain("user-instruction")
  })

  /**
   * An origin the policy trusts further gets a different sentence out of the
   * same function. This is the fact the demo is demonstrating — who asked
   * changes what may land alone — so a hardcoded ceiling would make the surface
   * say something untrue the first time a record arrived from anywhere else.
   */
  it("says something different about an origin the policy trusts further", () => {
    const developer = ceilingNote({ ...HELD, origin: "developer" })

    expect(developer?.sentence).toContain(ASK_ORIGINS.developer.label)
    expect(developer?.sentence).toContain(STAKES[ceilingFor(demoPolicy, "developer")].label)
    expect(developer?.sentence).not.toBe(ceilingNote(HELD)?.sentence)
  })

  it("stays quiet where the ceiling is not what decided it", () => {
    const withinPolicy: DispositionView = {
      ...HELD_BY_THE_CEILING,
      kind: "accepted",
      ruleCode: "within-policy",
    }

    expect(ceilingNote({ ...HELD, disposition: withinPolicy })).toBeUndefined()
  })

  it("stays quiet on a record decided under a policy this surface cannot read", () => {
    const elsewhere: DispositionView = { ...HELD_BY_THE_CEILING, policyId: "somebody-elses" }

    expect(ceilingNote({ ...HELD, disposition: elsewhere })).toBeUndefined()
  })

  it("stays quiet on an ask that never reached a verdict", () => {
    const { disposition: _none, ...unjudged } = HELD

    expect(ceilingNote({ ...unjudged, outcome: "not-interpreted" })).toBeUndefined()
  })
})
