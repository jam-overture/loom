import { describe, expect, it } from "vitest"

import { assumptionOf, checkupBasis, type ComparedTone } from "./checkup-basis"
import { runtimeWordsIn } from "../_test/plain-language"

const basisOf = (tone: ComparedTone, startingParts: number, changeCount: number) =>
  checkupBasis({ tone, startingParts, changeCount })

const COMPARED: readonly ComparedTone[] = ["agrees", "diverged"]

describe("checkupBasis", () => {
  /**
   * The order is the order the check met them, and it is the order the screen
   * has to read in: where it started, what it replayed, what it compared the
   * result against. Any other order describes a fold nobody performed.
   */
  it("names three inputs, in the order the check met them", () => {
    expect(basisOf("agrees", 10, 3).steps.map((step) => step.key)).toEqual([
      "start",
      "replay",
      "compare",
    ])
  })

  /**
   * The numbers are why this earns the surface rather than a disclosure. A
   * reader told their page adds up has no other way to learn whether the
   * verdict weighed a whole history or an empty one.
   */
  it("prints the size of both things it read", () => {
    const [start, replay] = basisOf("agrees", 10, 3).steps

    expect(start?.plain).toContain("10 parts")
    expect(replay?.plain).toContain("3 changes")
  })

  it("counts one of each in the singular", () => {
    const [start, replay] = basisOf("agrees", 1, 1).steps

    expect(start?.plain).toContain("1 part.")
    expect(replay?.plain).toContain("1 change,")
  })

  /**
   * "Every change accepted since — 0 changes" is a number where a reader is
   * expecting news, and the news is that there is no history here yet. A page
   * created and never touched is a real state, and a fresh deployment's only
   * one.
   */
  it("says a page with nothing accepted has no history yet, rather than printing a zero", () => {
    const [, replay] = basisOf("agrees", 10, 0).steps

    expect(replay?.plain).not.toContain("0")
    expect(replay?.plain).toContain("No change has been accepted")
  })

  it("names the revision it compared against in the technical reading", () => {
    const [, replay, compare] = basisOf("diverged", 10, 7).steps

    expect(replay?.technical).toContain("Revisions 1 to 7")
    expect(compare?.technical).toContain("revision 7")
  })

  /**
   * The whole unit, as one assertion. The audit compares three things and both
   * plain verdicts were written as though there were two, so the basis is only
   * worth rendering if the input the verdicts left out is the one it leads
   * with.
   */
  it("leads with the input neither verdict used to name", () => {
    for (const tone of COMPARED) {
      const basis = basisOf(tone, 10, 3)

      expect(basis.steps[0]?.plain, tone).toContain("shape Loom has on record")
      expect(basis.assumption.plain, tone).toContain("starting shape")
    }
  })

  /**
   * One fact, two consequences, and a reader only ever meets one of them: under
   * green it is *this can be green and still be wrong*; under red it is *there
   * is a third suspect and it is not in the list below*. A single sentence
   * covering both would say neither.
   */
  it("says what the assumption costs differently under each verdict", () => {
    expect(assumptionOf("agrees").plain).toContain("come back green anyway")
    expect(assumptionOf("diverged").plain).toContain("Three things went into this")
    expect(assumptionOf("agrees").plain).not.toBe(assumptionOf("diverged").plain)
  })

  /**
   * The rule the redirection is for, as a property rather than as taste. Every
   * string here is shown before the reader has asked for anything, so the
   * moment one contains `seed`, `fold` or `revision` it has become the thing it
   * was written to replace.
   *
   * The same list `audit-view.test.ts` applies to the three verdict sentences
   * and `effect-view.test.ts` to the review queue's. It was three copies of one
   * regex until 11 September, which is how a rule stops being one: a word added
   * to one and not the others means three screens disagree about what plain
   * language is and nothing fails. `_test/plain-language.ts` is the list.
   */

  it("keeps the runtime's vocabulary out of every sentence it shows unasked", () => {
    for (const tone of COMPARED) {
      const basis = basisOf(tone, 10, 3)

      for (const step of basis.steps) {
        expect(runtimeWordsIn(step.heading), step.heading).toEqual([])
        expect(runtimeWordsIn(step.plain), step.plain).toEqual([])
      }

      expect(runtimeWordsIn(basis.assumption.plain), tone).toEqual([])
    }
  })

  /**
   * Guards the guard, and the half that matters more: nothing is removed. Each
   * plain line has a technical one beside it that does use the runtime's words,
   * so a reader who wants to know why a starting shape cannot be inferred is
   * one click away from the answer.
   */
  it("says all of it again in the runtime's own words", () => {
    for (const tone of COMPARED) {
      const basis = basisOf(tone, 10, 3)

      for (const step of basis.steps) {
        expect(runtimeWordsIn(step.technical), step.key).not.toEqual([])
        expect(step.technical, step.key).not.toBe(step.plain)
      }

      expect(runtimeWordsIn(basis.assumption.technical), tone).not.toEqual([])
      expect(basis.assumption.technical, tone).not.toBe(basis.assumption.plain)
    }
  })

  /**
   * A page with nothing accepted has a different technical reading too — "the
   * fold is the seed itself" rather than a range of revisions — and it must
   * still be the runtime's words rather than the plain ones repeated.
   */
  it("keeps both readings apart on a page with no accepted change", () => {
    const [, replay] = basisOf("agrees", 10, 0).steps

    expect(runtimeWordsIn(replay?.technical ?? "")).not.toEqual([])
    expect(replay?.technical).not.toBe(replay?.plain)
  })
})
