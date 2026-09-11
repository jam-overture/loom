import { describe, expect, it } from "vitest"

import { dispositionReasonCodeSchema, gatePolicySchema, primitiveTypeSchema } from "@loom/runtime"

import { asPercent, rulesOf, WHEN_IT_FIRES, type PlainRule } from "./rules-view"

const policy = (over: Record<string, unknown> = {}) => gatePolicySchema.parse(over)

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
    const codes = rulesOf(policy())
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
    const rules = rulesOf(policy())
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
    const strict = rulesOf(policy({ minimumConfidence: 0.95, confidenceFloor: 0.5, refusalFloor: "high" }))

    expect(ruleById(strict, "sure-enough-to-act").reading).toContain("95%")
    expect(ruleById(strict, "sure-enough-to-ask").reading).toContain("50%")
    expect(ruleById(strict, "never").reading).toContain("high risk")
    expect(ruleById(strict, "never").settings).toEqual([{ name: "refusalFloor", value: "high" }])
  })

  it("reads a ceiling for every origin, including one the host never set", () => {
    const partial = rulesOf(policy({ autoApplyCeiling: { "user-instruction": "high" } }))
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
    const none = ruleById(rulesOf(policy()), "cannot-undo")

    expect(none.reading).toContain("No kind of piece here is marked")
    expect(none.rows).toEqual([])

    const declared = ruleById(
      rulesOf(policy({ outOfTreeEffectTypes: [primitiveTypeSchema.parse("commerce.checkout")] })),
      "cannot-undo"
    )

    expect(declared.reading).toContain("1 kind of piece")
    expect(declared.rows[0]?.of).toBe("commerce.checkout")
  })

  it("keeps the two rules that have no setting honest about having none", () => {
    const rules = rulesOf(policy())

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
    const surface = surfaceOf(rulesOf(policy())).toLowerCase()

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
    const settings = rulesOf(policy())
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
