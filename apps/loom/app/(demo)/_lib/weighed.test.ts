import { describe, expect, it } from "vitest"

import { STAKES } from "@/app/(portal)/_lib/vocabulary"

import type { ChangeRecord, ReversibilityView } from "./record"
import { WEIGHED_QUESTIONS, weighedOf } from "./weighed"

/**
 * The two answers a visitor was promised, and the ways this module could
 * quietly stop giving them.
 *
 * The failure this exists to catch is not a wrong sentence — it is a *missing*
 * one. Both facts were on the record for a fortnight while the card printed
 * neither, and no test in the repository went red, because every file involved
 * was correct. So the assertions below are about presence and about whose words
 * these are: a second stakes table growing in this lane is the same defect
 * arriving from the other direction.
 */

/** An ask that was interpreted, weighed and let through. */
const ASSESSED: ChangeRecord = {
  recordId: "i_1",
  askedAt: "2026-08-30T09:00:00.000Z",
  utterance: "Switch this page to the other palette.",
  origin: "user-instruction",
  actor: "a demo visitor",
  outcome: "applied",
  stakes: { level: "low", factors: [] },
  reversibility: {
    reversible: true,
    retainedNodeCount: 0,
    reasons: [],
    inverseOperations: ["configure n_1: loom.theme"],
  },
  repaired: false,
  touched: [],
}

/** The same ask, removing four nodes and held for an answer. */
const REMOVAL: ChangeRecord = {
  ...ASSESSED,
  utterance: "Take the numbers band off the page.",
  outcome: "awaiting-you",
  stakes: {
    level: "medium",
    factors: [{ code: "large-removal", level: "medium", detail: "removes 4 nodes" }],
  },
  reversibility: {
    reversible: true,
    retainedNodeCount: 4,
    reasons: [],
    inverseOperations: ["insert loom.stat-grid into n_51 at 4"],
  },
}

const answersOf = (record: ChangeRecord): readonly string[] =>
  (weighedOf(record) ?? []).map((answer) => `${answer.verdict}. ${answer.meaning}`)

describe("the two questions", () => {
  it("answers them in the words the rail asked them in", () => {
    expect((weighedOf(REMOVAL) ?? []).map((answer) => answer.question)).toEqual([
      WEIGHED_QUESTIONS.damage,
      WEIGHED_QUESTIONS.reversal,
    ])
  })

  it("puts the damage first, because that is the order the rail promised", () => {
    const weighed = weighedOf(REMOVAL) ?? []

    expect(weighed[0]?.question).toBe(WEIGHED_QUESTIONS.damage)
  })

  /**
   * The point of the pairing. A rule's conclusion is one sentence; this is the
   * two facts it was reached from, and a card carrying only the conclusion is
   * the state this unit was written to end.
   */
  it("gives exactly two answers, never one", () => {
    expect(weighedOf(ASSESSED)).toHaveLength(2)
    expect(weighedOf(REMOVAL)).toHaveLength(2)
  })
})

describe("how much damage", () => {
  /**
   * Whose words these are. If this fails because the demo grew its own table,
   * the demo and the review queue have started calling one level two things.
   */
  it("uses the portal's sentence for the level, not one of its own", () => {
    for (const level of ["low", "medium", "high", "critical"] as const) {
      const weighed = weighedOf({ ...ASSESSED, stakes: { level, factors: [] } }) ?? []

      expect(weighed[0]?.verdict).toBe(STAKES[level].label)
      expect(weighed[0]?.meaning).toBe(STAKES[level].meaning)
    }
  })

  /**
   * The factor codes stay behind the disclosure. They are the evidence for the
   * sentence above and printing them here is what the plain view was built to
   * stop.
   */
  it("keeps the runtime's factor codes out of the plain answer", () => {
    expect(answersOf(REMOVAL).join(" ")).not.toContain("large-removal")
  })
})

describe("can it be taken back", () => {
  /**
   * The most persuasive number on the record, and it read `undo carries: 4
   * nodes`.
   */
  it("says what is kept, and how much of it, when a change removes something", () => {
    const [, reversal] = weighedOf(REMOVAL) ?? []

    expect(reversal?.verdict).toBe("Yes")
    expect(reversal?.meaning).toContain("4 pieces")
  })

  /**
   * The whole clause at one, rather than the noun.
   *
   * This test used to read `toContain("1 piece ")` and `not.toContain("1
   * pieces")` — the noun, inflected, asserted on its own — and it passed for a
   * fortnight against *"The 1 piece it takes off the page **are** kept."* The
   * helper under it pluralised the noun and left the verb behind, so the one
   * assertion that existed was the one assertion the defect could satisfy.
   *
   * A subject-and-verb fault is not visible in a substring of the subject, so
   * the clause is asserted whole. It is reachable on the free-text path — the
   * one a curious visitor types into — whenever the model's delta retains
   * exactly one node, which is how it was found.
   */
  it("agrees with its own number when a change keeps exactly one piece", () => {
    const one: ReversibilityView = {
      reversible: true,
      retainedNodeCount: 1,
      reasons: [],
      inverseOperations: ["insert loom.quote into n_51 at 4"],
    }
    const [, reversal] = weighedOf({ ...REMOVAL, reversibility: one }) ?? []

    expect(reversal?.meaning).toContain("The one piece it takes off the page is kept")
    expect(reversal?.meaning).not.toContain("pieces")
    expect(reversal?.meaning).not.toContain("are kept")
  })

  /** And still agrees at every other count, which is the half that already worked. */
  it("agrees with its own number when a change keeps more than one", () => {
    const [, reversal] = weighedOf(REMOVAL) ?? []

    expect(reversal?.meaning).toContain("The 4 pieces it takes off the page are kept")
    expect(reversal?.meaning).not.toContain("is kept")
  })

  /**
   * A theme swap destroys nothing, so there is nothing retained and the clause
   * about kept pieces would be a sentence about a number that is zero.
   */
  it("does not claim kept pieces for a change that removes nothing", () => {
    const [, reversal] = weighedOf(ASSESSED) ?? []

    expect(reversal?.verdict).toBe("Yes")
    expect(reversal?.meaning).toContain("Nothing is destroyed")
    expect(reversal?.meaning).not.toContain("0 pieces")
  })

  /**
   * It says the opposite *exists*. An undo is a change of its own and is gated
   * like any other (0032), so a sentence here promising the page moves back on
   * one press would be the same defect one control further along.
   */
  it("promises that the opposite exists, never that pressing undo is immediate", () => {
    for (const record of [ASSESSED, REMOVAL]) {
      const [, reversal] = weighedOf(record) ?? []

      expect(reversal?.meaning).toContain("already exists")
      expect(reversal?.meaning).not.toMatch(/immediately|at once|right away/i)
    }
  })

  it("says no, and what no costs, when the inverse would not restore the page", () => {
    const [, reversal] =
      weighedOf({
        ...REMOVAL,
        reversibility: {
          reversible: false,
          retainedNodeCount: 40,
          reasons: ["the inverse would carry 40 nodes, past a budget of 24"],
          inverseOperations: [],
        },
      }) ?? []

    expect(reversal?.verdict).toBe("No")
    expect(reversal?.meaning).toContain("would not put everything back")
    expect(reversal?.meaning).not.toContain("budget")
  })
})

describe("an ask that was never weighed", () => {
  /**
   * An utterance no interpreter could make a delta from has no stakes and no
   * inverse. A card inventing "Low risk" for it would be the surface answering
   * a question the runtime never asked.
   */
  it("has nothing to say, rather than a default", () => {
    const { stakes: _stakes, reversibility: _reversibility, ...rest } = ASSESSED

    expect(weighedOf({ ...rest, outcome: "not-interpreted" })).toBeUndefined()
  })

  it("says nothing when only one half of the pair arrived", () => {
    const { reversibility: _reversibility, ...withoutInverse } = ASSESSED
    const { stakes: _stakes, ...withoutStakes } = ASSESSED

    expect(weighedOf(withoutInverse)).toBeUndefined()
    expect(weighedOf(withoutStakes)).toBeUndefined()
  })
})
