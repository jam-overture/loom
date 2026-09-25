import { describe, expect, it } from "vitest"

import {
  dispositionReasonCodeSchema,
  stakeLevelSchema,
  type DispositionKind,
  type StakeFactor,
  type StakeFactorCode,
  type StakeLevel,
} from "@loom/runtime"

import { runtimeWordsIn } from "../_test/plain-language"

import {
  cannotBeDrawn,
  inWorstFirstOrder,
  objectionsIn,
  reasoningOf,
  refusalState,
  UNDRAWABLE,
  type Objection,
} from "./refusal"
import { CANNOT_BE_DRAWN, CHANGE_STATES, STAKE_FACTORS } from "./vocabulary"

const factor = (code: StakeFactorCode, level: StakeLevel, detail = "the runtime's own words"): StakeFactor => ({
  code,
  level,
  detail,
})

/** Every code the runtime can raise, taken off the table rather than typed out again. */
const EVERY_CODE = Object.keys(STAKE_FACTORS) as StakeFactorCode[]

describe("objectionsIn", () => {
  it("gives every factor a clause a person can read", () => {
    const objections = objectionsIn(EVERY_CODE.map((code) => factor(code, "medium")))

    expect(objections).toHaveLength(EVERY_CODE.length)

    for (const objection of objections) {
      expect(objection.clause).toBe(STAKE_FACTORS[objection.code])
      expect(objection.clause.length).toBeGreaterThan(0)
    }
  })

  /**
   * The property the whole unit rests on, asserted over the whole union rather
   * than over the two clauses this run happened to write. A fourteenth factor
   * arriving with a clause that says `node` or `props` fails here.
   */
  it("says none of them in the runtime's vocabulary", () => {
    for (const objection of objectionsIn(EVERY_CODE.map((code) => factor(code, "low")))) {
      expect(runtimeWordsIn(objection.clause)).toEqual([])
    }
  })

  /**
   * And the other half of the same rule: the record is kept rather than
   * replaced. A clause that reads plainly beside a detail that has been tidied
   * up is a screen that has lost its evidence.
   */
  it("carries each factor's own account through untouched, one per clause", () => {
    const objections = objectionsIn([
      factor("unknown-primitive", "critical", "adds a node no primitive is registered for: app.gallery at n_7"),
      factor("large-removal", "high", "removes 12 nodes"),
    ])

    expect(objections.map((objection) => objection.detail)).toEqual([
      "adds a node no primitive is registered for: app.gallery at n_7",
      "removes 12 nodes",
    ])
  })

  it("has nothing to say about a change nothing was weighed against", () => {
    expect(objectionsIn([])).toEqual([])
  })
})

describe("inWorstFirstOrder", () => {
  it("puts the most serious first, whatever order the Gate reached them in", () => {
    const ordered = objectionsIn([
      factor("broad-change", "medium"),
      factor("unknown-primitive", "critical"),
      factor("nested-target", "low"),
      factor("large-removal", "high"),
    ])

    expect(ordered.map((objection) => objection.level)).toEqual([
      "critical",
      "high",
      "medium",
      "low",
    ])
  })

  /**
   * Stable within a level, which is what stops the order being a second opinion
   * about severity. Two `critical` factors arrive in the Gate's order and stay
   * in it — an alphabetical tiebreak would reorder them for no reason a reader
   * could infer.
   */
  it("keeps the order it was given among factors of one level", () => {
    const ordered = inWorstFirstOrder(
      objectionsIn([
        factor("invalid-props", "critical"),
        factor("unknown-primitive", "critical"),
      ])
    )

    expect(ordered.map((objection) => objection.code)).toEqual([
      "invalid-props",
      "unknown-primitive",
    ])
  })

  it("does not mutate what it was handed", () => {
    const objections: Objection[] = [
      ...objectionsIn([factor("nested-target", "low"), factor("unknown-primitive", "critical")]),
    ]
    const before = objections.map((objection) => objection.code)

    inWorstFirstOrder(objections)

    expect(objections.map((objection) => objection.code)).toEqual(before)
  })

  it("covers every level the runtime has, so a fifth would fail rather than sort as zero", () => {
    expect(
      inWorstFirstOrder(
        objectionsIn(
          stakeLevelSchema.options.map((level) => factor("broad-change", level))
        )
      ).map((objection) => objection.level)
    ).toEqual(["critical", "high", "medium", "low"])
  })
})

describe("cannotBeDrawn", () => {
  it.each(UNDRAWABLE)("is true of %s on its own", (code) => {
    expect(cannotBeDrawn(objectionsIn([factor(code, "critical")]))).toBe(true)
  })

  /**
   * The case that matters most, and the one an early draft got wrong by reading
   * only the first factor: a model adding a part it invented adds it at the top
   * of the page, so `shallow-structural-change` is weighed too, and a reader
   * being told the page is being rearranged rather than that the part does not
   * exist is the worse of the two answers.
   */
  it("is true when the undrawable part is not the only thing wrong", () => {
    expect(
      cannotBeDrawn(
        objectionsIn([
          factor("shallow-structural-change", "high"),
          factor("unknown-primitive", "critical"),
        ])
      )
    ).toBe(true)
  })

  it("is false of every other factor, including the other critical one", () => {
    for (const code of EVERY_CODE.filter((candidate) => !UNDRAWABLE.includes(candidate))) {
      expect({ code, undrawable: cannotBeDrawn(objectionsIn([factor(code, "critical")])) }).toEqual({
        code,
        undrawable: false,
      })
    }
  })

  it("is false when nothing was weighed at all", () => {
    expect(cannotBeDrawn([])).toBe(false)
  })
})

describe("refusalState", () => {
  /**
   * The distinction this module exists for. Both are refusals, both are red, and
   * they must not say the same thing: one sends somebody to their settings, and
   * the other tells them their settings are not the problem.
   */
  it("says the change could not be built, rather than that a rule blocked it", () => {
    expect(refusalState(objectionsIn([factor("unknown-primitive", "critical")]))).toEqual(
      CANNOT_BE_DRAWN
    )
  })

  it("keeps the ordinary refusal for everything else", () => {
    expect(refusalState(objectionsIn([factor("large-removal", "critical")]))).toEqual(
      CHANGE_STATES.refused
    )
    expect(refusalState([])).toEqual(CHANGE_STATES.refused)
  })

  /**
   * Asserted as a pair, because the two readings drifting into each other is the
   * only way this can fail quietly: a future edit that makes `CANNOT_BE_DRAWN`
   * read like the ordinary refusal passes every other test in this file.
   */
  it("gives the two refusals different words, and the same colour", () => {
    expect(CANNOT_BE_DRAWN.label).not.toBe(CHANGE_STATES.refused.label)
    expect(CANNOT_BE_DRAWN.meaning).not.toBe(CHANGE_STATES.refused.meaning)
    expect(CANNOT_BE_DRAWN.tone).toBe(CHANGE_STATES.refused.tone)
  })

  /**
   * The sentence a reader acts on, asserted whole rather than by a phrase inside
   * it — the 24 August rule. What it has to do is tell somebody the two things
   * they would otherwise get wrong: that loosening a rule is not the move, and
   * what the move is.
   */
  it("tells a reader what to do instead of pointing them at a setting", () => {
    expect(CANNOT_BE_DRAWN.meaning).toBe(
      "This change needs a kind of part this site has no way to draw, so nothing was changed. Loosening a rule would not help — there would still be nothing to draw it with. Either ask for something built from the parts your site already has, or add the missing one to your site's code."
    )
    expect(runtimeWordsIn(CANNOT_BE_DRAWN.meaning)).toEqual([])
    expect(runtimeWordsIn(CANNOT_BE_DRAWN.label)).toEqual([])
  })

  /**
   * Found in the first photograph of a refusal this lane ever managed to take,
   * and invisible to every test that existed when it shipped.
   *
   * This state is reached from two paths and only one of them involves a model.
   * An undo's delta is computed from the record (0007, 0031) — which is why
   * `NO_CONFIDENCE_TO_JUDGE` exists — so a sentence saying *the AI asked for
   * this* over a refused undo attributes a request to something that never made
   * one, on the screen where a reader is least able to check.
   */
  it("credits nobody with the change, because an undo has no author to credit", () => {
    expect(CANNOT_BE_DRAWN.label).not.toMatch(/\bAI\b/u)
    expect(CANNOT_BE_DRAWN.meaning).not.toMatch(/\b(AI|model|asked for)\b/u)
  })
})

describe("reasoningOf", () => {
  it("carries the rule in a person's words and the code for the record", () => {
    const reasoning = reasoningOf("rejected", "stakes-at-refusal-floor", [
      factor("unknown-primitive", "critical"),
    ])

    expect(reasoning.ruleCode).toBe("stakes-at-refusal-floor")
    expect(runtimeWordsIn(reasoning.rule)).toEqual([])
    expect(reasoning.objections.map((objection) => objection.code)).toEqual(["unknown-primitive"])
  })

  it("answers for every reason code the Gate can record", () => {
    for (const code of dispositionReasonCodeSchema.options) {
      const reasoning = reasoningOf("rejected", code, [])

      expect(reasoning.rule.length).toBeGreaterThan(0)
      expect(runtimeWordsIn(reasoning.rule)).toEqual([])
    }
  })

  /**
   * The kind travels, so one list of clauses can be introduced three ways. The
   * assertion is that the three are actually different: a component reading a
   * table where two entries had drifted into one sentence would say *why Loom
   * wouldn't* over a change it had just applied.
   */
  it("keeps the three verdicts distinguishable", () => {
    const kinds: readonly DispositionKind[] = ["accepted", "requires-confirmation", "rejected"]

    expect(
      new Set(kinds.map((kind) => reasoningOf(kind, "within-policy", []).kind)).size
    ).toBe(3)
  })
})

/**
 * The list is the module's one hand-kept fact, and everything else is derived
 * from a `Record` the compiler checks. So it gets the assertion the compiler
 * cannot make: that both entries are real codes, and that the set is exactly the
 * two floors rather than having quietly grown to include a factor a person *can*
 * do something about.
 */
describe("UNDRAWABLE", () => {
  it("names real factors and only the two floors", () => {
    expect([...UNDRAWABLE].sort()).toEqual(["invalid-props", "unknown-primitive"])

    for (const code of UNDRAWABLE) {
      expect(EVERY_CODE).toContain(code)
    }
  })
})
