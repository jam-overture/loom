import { ceilingFor, isAbove } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { ASK_ORIGINS, STAKES } from "@/app/(portal)/_lib/vocabulary"

import { ceilingNote } from "./ceiling"
import type { ChangeRecord, DispositionView } from "./record"
import { demoPolicy } from "./session"
import { weighedOf } from "./weighed"

/**
 * The comparison the card shows, and the four states it stays quiet on.
 *
 * Almost nothing here asserts a wording. What is asserted is where the words
 * came from — the shared stakes table and the runtime's own `ceilingFor` —
 * because the defect this line replaced was a surface printing a runtime code
 * it had never translated, and the way that returns is a surface writing its
 * own translation beside the one four other screens already use.
 *
 * The **one** override is the person, and it is asserted in both directions:
 * the demo's own origin must not be described in the third person, and every
 * other origin must still read exactly as the portal says it. That pair is what
 * stops the override from spreading into a second vocabulary.
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
  reversibility: { reversible: true, retainedNodeCount: 4, reasons: [], inverseOperations: [], inverse: [] },
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

  /**
   * The override, and the whole of it.
   *
   * `ASK_ORIGINS["user-instruction"]` reads *"Somebody using the site asked for
   * this"*, which is right in a review queue and wrong on the one surface where
   * the somebody is the person reading the card — the same override `answer.ts`
   * makes to `ANSWERS.confirmed`, for the same stated reason. Asserted as a
   * *refusal* of the shared label rather than as a literal, so a rewording of
   * this sentence is free and a quiet return to the third person is not.
   */
  it("speaks to the visitor who asked, rather than about a stranger", () => {
    const sentence = ceilingNote(HELD)?.sentence ?? ""

    expect(sentence).not.toContain(ASK_ORIGINS["user-instruction"].label)
    expect(sentence).toMatch(/\bYou\b/)
  })

  /**
   * And the override stops there. Every origin the demo does not produce
   * describes somebody or something that really is not the reader, so those keep
   * the shared table verbatim — which is what makes this a pronoun override
   * rather than a second vocabulary growing in this lane.
   */
  it("keeps the shared words for every origin that is not the visitor", () => {
    for (const origin of ["developer", "system-signal", "scheduled-adaptation"] as const) {
      const sentence = ceilingNote({ ...HELD, origin })?.sentence ?? ""

      expect(sentence, origin).toContain(ASK_ORIGINS[origin].label)
    }
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
   * The sentence carries **both** levels, in the same words the box three lines
   * above used for one of them, and the comparison it narrates is real.
   *
   * This is the unit. The card printed the stakes in one place and the ceiling
   * in another and never said which was higher — two numbers and no operator —
   * so a visitor held both halves of an inequality and was left to guess the
   * sign. One table for both terms, and a real `isAbove` between them: if a
   * policy retune ever made the demo's headline ask land on its own, this fails
   * rather than leaving the card explaining a hold that no longer happens.
   */
  it("names both levels the Gate compared, in the words the card already used", () => {
    const stakes = HELD.stakes
    if (stakes === undefined) throw new Error("the fixture is the held ask, which was assessed")

    const ceiling = ceilingFor(demoPolicy, HELD.origin)
    const sentence = ceilingNote(HELD)?.sentence ?? ""

    expect(weighedOf(HELD)?.[0]?.verdict).toBe(STAKES[stakes.level].label)
    expect(sentence).toContain(STAKES[ceiling].label)
    expect(sentence).toContain(STAKES[stakes.level].label)
    expect(isAbove(stakes.level, ceiling)).toBe(true)
  })

  /** And says, in a word a reader does not have to be told twice, which way. */
  it("says which of the two is higher", () => {
    expect(ceilingNote(HELD)?.sentence).toContain("higher")
  })

  /**
   * The comparison is gated on the comparison, not on the rule code.
   *
   * `stakes-above-ceiling` guarantees the stakes are above the ceiling, which is
   * exactly why the claim is checked rather than inherited: a card that says
   * *came in higher* because a rule code told it to is narrating arithmetic it
   * did not do. A record with a verdict but no assessment on it still gets the
   * threshold — the half this sentence carried before there was a second term.
   */
  it("claims nothing about stakes on a record that carries none", () => {
    const { stakes: _none, ...unassessed } = HELD
    const sentence = ceilingNote(unassessed)?.sentence ?? ""

    expect(sentence).toContain(STAKES[ceilingFor(demoPolicy, HELD.origin)].label)
    expect(sentence).not.toContain("higher")
  })

  /**
   * The same guard from the other side: stakes that are *not* above the ceiling
   * are a state the rule should never produce, and the sentence must not invent
   * a comparison for it.
   */
  it("claims nothing about stakes that are not above the ceiling", () => {
    const lowStakes = { ...HELD, stakes: { level: "low" as const, factors: [] } }

    expect(ceilingNote(lowStakes)?.sentence).not.toContain("higher")
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
