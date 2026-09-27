import { describe, expect, it } from "vitest"

import { dispositionReasonCodeSchema, gatePolicySchema, primitiveTypeSchema } from "@jam-overture/loom"

import { asPercent, rulesOf, WHEN_IT_FIRES, type PlainRule } from "./rules-view"

const policy = (over: Record<string, unknown> = {}) => gatePolicySchema.parse(over)

/**
 * The non-policy half, defaulted to the deployment's own answer.
 *
 * A helper rather than the literal at nine call sites, so the two tests that care
 * which way it is set say so and the seven that do not stay about what they were
 * about.
 */
const checked = { settingsAreChecked: true }

const ruleById = (rules: readonly PlainRule[], id: string): PlainRule => {
  const found = rules.find((rule) => rule.id === id)
  if (found === undefined) throw new Error(`no rule ${id}`)

  return found
}

/**
 * What a reader meets without asking: the title and the sentence under it. Row
 * values are excluded on purpose — a host's own primitive types and prop keys
 * appear there, and those are names, which 22 August settled stay on the
 * surface.
 */
const surfaceOf = (rules: readonly PlainRule[]): string =>
  rules.map((rule) => `${rule.title} ${rule.reading} ${rule.rows.map((row) => row.of).join(" ")}`).join(" ")

describe("rulesOf", () => {
  it("names every reason the Gate can record, exactly once", () => {
    const codes = rulesOf(policy(), checked)
      .map((rule) => rule.code)
      .filter((code) => code !== undefined)

    /**
     * `within-policy` is the absence of a rule rather than one of them — it is
     * what the Gate records when nothing objected — so it is the screen's
     * headline count and not a card.
     *
     * The rest have to be covered, and this is the test that makes the coverage
     * a property rather than a habit. A rule added to the runtime with a new
     * code fails here, which is the moment somebody can still write the sentence
     * for it. Without this, a new rule would refuse changes on a deployment
     * whose own screen said nothing about it and gave no sign anything was
     * missing.
     */
    expect([...codes].sort()).toEqual(
      dispositionReasonCodeSchema.options.filter((code) => code !== "within-policy").sort()
    )
  })

  it("gives every rule a distinct id, and one entry that decides nothing", () => {
    const rules = rulesOf(policy(), checked)
    const ids = rules.map((rule) => rule.id)

    expect(new Set(ids).size).toBe(ids.length)
    expect(rules.filter((rule) => rule.outcome === undefined).map((rule) => rule.id)).toEqual([
      "how-risk-is-measured",
    ])
  })

  /**
   * The property the whole screen rests on. A page that printed the framework's
   * defaults would agree with every deployment that had not changed anything and
   * be confidently wrong about every one that had — and it would look identical
   * either way, which is what makes it worth a test rather than a reading.
   */
  it("reads its numbers out of the policy it is given", () => {
    const strict = rulesOf(policy({ minimumConfidence: 0.95, confidenceFloor: 0.5, refusalFloor: "high" }), checked)

    expect(ruleById(strict, "sure-enough-to-act").reading).toContain("95%")
    expect(ruleById(strict, "sure-enough-to-ask").reading).toContain("50%")
    expect(ruleById(strict, "never").reading).toContain("high risk")
    expect(ruleById(strict, "never").settings).toEqual([{ name: "refusalFloor", value: "high" }])
  })

  it("reads a ceiling for every origin, including one the host never set", () => {
    const partial = rulesOf(policy({ autoApplyCeiling: { "user-instruction": "high" } }), checked)
    const ceiling = ruleById(partial, "ceiling")

    expect(ceiling.rows).toHaveLength(4)
    expect(ceiling.rows[0]?.is).toContain("substantial changes")

    /**
     * An origin absent from the record is still judged, by `ceilingFor`'s `low`.
     * A row that said nothing, or a row this file guessed at, would both be a
     * claim about what is allowed on somebody's pages that the runtime never
     * made.
     */
    const unset = ceiling.settings.find((setting) => setting.name === "autoApplyCeiling.developer")

    expect(unset?.value).toBe("unset, so low")
    expect(ceiling.rows.every((row) => row.is.startsWith("up to"))).toBe(true)
  })

  it("says which pieces reach outside the page, and says so when none do", () => {
    const none = ruleById(rulesOf(policy(), checked), "cannot-undo")

    expect(none.reading).toContain("No kind of piece here is marked")
    expect(none.rows).toEqual([])

    const declared = ruleById(
      rulesOf(
        policy({ outOfTreeEffectTypes: [primitiveTypeSchema.parse("commerce.checkout")] }),
        checked
      ),
      "cannot-undo"
    )

    expect(declared.reading).toContain("1 kind of piece")
    expect(declared.rows[0]?.of).toBe("commerce.checkout")
  })

  it("keeps the two rules that have no setting honest about having none", () => {
    const rules = rulesOf(policy(), checked)

    expect(ruleById(rules, "writes-over-work").settings).toEqual([])
    expect(ruleById(rules, "form-destination").settings).toEqual([])
  })

  /**
   * The guard this lane has applied to every screen it has rewritten. It turns
   * "speak like a person" from taste into a property: a word from this list on
   * the surface is the failure, and every one of them is still required to be
   * reachable in the technical record beside it.
   */
  it("uses none of the runtime's own words on the surface", () => {
    const surface = surfaceOf(rulesOf(policy(), checked)).toLowerCase()

    for (const word of [
      "gate",
      "disposition",
      "delta",
      "node",
      "primitive",
      "revision",
      "proposal",
      "policy",
      "stakes",
      "provenance",
      "telemetry",
      "episode",
      "intent",
      "custody",
    ]) {
      expect(surface).not.toContain(word)
    }
  })

  it("keeps every one of those words one click down", () => {
    const settings = rulesOf(policy(), checked)
      .flatMap((rule) => rule.settings)
      .map((setting) => setting.name)

    expect(settings).toContain("refusalFloor")
    expect(settings).toContain("minimumConfidence")
    expect(settings).toContain("confidenceFloor")
    expect(settings).toContain("autoApplyCeiling.user-instruction")
    expect(settings).toContain("protectedPrimitiveTypes")
    expect(settings).toContain("policyId")
  })
})

/**
 * The two floors, on the screen that claims to name every rule a change here is
 * judged by.
 *
 * They were wired into this deployment's policy on 23 September and this screen
 * did not mention either of them, which made its own claim false. They belong
 * under *how risk is measured* rather than as two more cards, and the reason is
 * arithmetic: `recordFor` attributes a count to a rule by the reason code the
 * Gate recorded, both of these are recorded under `stakes-at-refusal-floor` like
 * anything else that reaches the top of the scale, and a second card carrying that
 * code would print one count twice as though two rules had each fired that often.
 */
describe("the two floors a change cannot be drawn past", () => {
  const measurement = (over: Record<string, unknown> = {}, nonPolicy = checked) =>
    ruleById(rulesOf(policy(over), nonPolicy), "how-risk-is-measured")

  it("names what this site can draw, and says a change adding anything else is turned down", () => {
    const rule = measurement({
      registeredPrimitiveTypes: [
        primitiveTypeSchema.parse("loom.page"),
        primitiveTypeSchema.parse("loom.prose"),
      ],
    })
    const row = rule.rows.find((candidate) => candidate.of === "Pieces this site can draw")

    expect(row?.is).toContain("loom.page")
    expect(row?.is).toContain("loom.prose")
    expect(row?.is).toContain("turns it down")
  })

  /**
   * The unset state, which is what every deployment gets until it opts in and what
   * this one had for a month. The screen must not read as though the rule were on:
   * a row saying "none" where the honest answer is "this check is off and a change
   * may commit a page with a hole in it" is the screen lying by omission.
   */
  it("says plainly that the check is off when nothing is declared", () => {
    const row = measurement().rows.find((candidate) => candidate.of === "Pieces this site can draw")

    expect(row?.is).toContain("not declared")
    expect(row?.is).toContain("hole")
  })

  it("says whether a part's own settings are checked, both ways", () => {
    const on = measurement({}, { settingsAreChecked: true }).rows.find(
      (candidate) => candidate.of === "Settings a piece refuses"
    )
    const off = measurement({}, { settingsAreChecked: false }).rows.find(
      (candidate) => candidate.of === "Settings a piece refuses"
    )

    expect(on?.is).toContain("checked against")
    expect(off?.is).toContain("not checked")
    expect(off?.is).toContain("will not draw")
  })

  /**
   * `propsVocabulary` is the one line on this screen that is not a field on the
   * policy, so it is also the one a reader could not otherwise check. It is in the
   * record with the name it has on the runtime, so somebody comparing this screen
   * against their own wiring is looking for the right thing.
   */
  it("keeps both settings in the record, including the one that is not a policy field", () => {
    const settings = measurement().settings.map((setting) => setting.name)

    expect(settings).toContain("registeredPrimitiveTypes")
    expect(settings).toContain("propsVocabulary")
  })

  it("says in the record which way the one that is not a field is set", () => {
    const value = (nonPolicy: { settingsAreChecked: boolean }) =>
      measurement({}, nonPolicy).settings.find((setting) => setting.name === "propsVocabulary")?.value

    expect(value({ settingsAreChecked: true })).toBe("wired")
    expect(value({ settingsAreChecked: false })).toBe("unset")
  })

  /**
   * The sentence above the rows has to say the two are there, because a reader
   * skimming readings rather than tables is the reader this screen was rewritten
   * for. And it must not promise them when they are off.
   */
  it("mentions them in the rule's own sentence", () => {
    expect(measurement().reading).toContain("would not draw at all")
  })
})

describe("WHEN_IT_FIRES", () => {
  it("says what a rule would do rather than what one did", () => {
    expect(WHEN_IT_FIRES.rejected.label).toBe("Turns the change down")
    expect(WHEN_IT_FIRES["requires-confirmation"].label).toBe("Asks you first")
  })

  it("keeps the runtime's own name for each", () => {
    expect(WHEN_IT_FIRES.rejected.technical).toBe("rejected")
    expect(WHEN_IT_FIRES["requires-confirmation"].technical).toBe("requires-confirmation")
    expect(WHEN_IT_FIRES.accepted.technical).toBe("accepted")
  })
})

describe("asPercent", () => {
  it("reads a fraction of one as a whole number of per cent", () => {
    expect(asPercent(0.7)).toBe("70%")
    expect(asPercent(0.325)).toBe("33%")
    expect(asPercent(1)).toBe("100%")
    expect(asPercent(0)).toBe("0%")
  })
})
