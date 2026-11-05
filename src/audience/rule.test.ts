import { describe, expect, it } from "vitest"

import { audienceIdSchema } from "./audience.js"
import {
  audienceClauseSchema,
  audienceRuleSchema,
  audiencesFor,
  ruleMatches,
  type AudienceRule,
} from "./rule.js"

const audience = (name: string) => audienceIdSchema.parse(`aud_${name}`)

const rule = (name: string, clauses: AudienceRule["clauses"]): AudienceRule => ({
  audienceId: audience(name),
  clauses,
})

const eu = rule("eu", [{ key: "region", anyOf: ["eu"] }])
const anglophone = rule("anglo", [{ key: "locale", anyOf: ["en-GB", "en-IE"] }])
const beta = rule("beta", [
  { key: "region", anyOf: ["eu"] },
  { key: "cohort", anyOf: ["beta"] },
])

describe("ruleMatches", () => {
  it("matches when the one clause it has is satisfied", () => {
    expect(ruleMatches(eu, { region: "eu" })).toBe(true)
  })

  it("does not match a different value for the same key", () => {
    expect(ruleMatches(eu, { region: "us" })).toBe(false)
  })

  it("does not match a context missing the key", () => {
    expect(ruleMatches(eu, { cohort: "beta" })).toBe(false)
  })

  it("accepts any of the values a clause lists, which is why a clause has a list", () => {
    expect(ruleMatches(anglophone, { locale: "en-IE" })).toBe(true)
    expect(ruleMatches(anglophone, { locale: "en-GB" })).toBe(true)
    expect(ruleMatches(anglophone, { locale: "fr-FR" })).toBe(false)
  })

  it("requires every clause, because clauses are a conjunction", () => {
    expect(ruleMatches(beta, { region: "eu", cohort: "beta" })).toBe(true)
    expect(ruleMatches(beta, { region: "eu" })).toBe(false)
    expect(ruleMatches(beta, { cohort: "beta" })).toBe(false)
  })

  it("compares numbers, booleans and null, which are the rest of JSON's scalars", () => {
    expect(ruleMatches(rule("n", [{ key: "tier", anyOf: [2] }]), { tier: 2 })).toBe(true)
    expect(ruleMatches(rule("n", [{ key: "tier", anyOf: [2] }]), { tier: 3 })).toBe(false)
    expect(ruleMatches(rule("b", [{ key: "staff", anyOf: [true] }]), { staff: true })).toBe(true)
    expect(ruleMatches(rule("b", [{ key: "staff", anyOf: [true] }]), { staff: false })).toBe(false)
    expect(ruleMatches(rule("z", [{ key: "plan", anyOf: [null] }]), { plan: null })).toBe(true)
  })

  it("does not match a value of one type against the same spelling in another", () => {
    expect(ruleMatches(rule("n", [{ key: "tier", anyOf: [2] }]), { tier: "2" })).toBe(false)
    expect(ruleMatches(rule("b", [{ key: "staff", anyOf: [true] }]), { staff: "true" })).toBe(false)
  })

  /**
   * **Nothing in `rule.ts` produces this answer** — a planted mutation that
   * dropped the scalar narrowing changed nothing, because `includes` compares
   * with `===` and an array is never `===` a scalar. The narrowing is there so
   * the comparison typechecks, and what makes structure unmatchable is that a
   * clause can only *name* a scalar, which the schema below refuses to relax.
   *
   * Asserted anyway, and this comment is why: it is the behaviour a host sees,
   * it is worth knowing it is false rather than an error, and offering
   * structural matching later should be a decision rather than a side effect of
   * loosening `anyOf`.
   */
  it("does not match a context key holding an object or an array", () => {
    const structured = rule("s", [{ key: "flags", anyOf: ["on"] }])

    expect(ruleMatches(structured, { flags: ["on"] })).toBe(false)
    expect(ruleMatches(structured, { flags: { beta: "on" } })).toBe(false)
  })
})

describe("audiencesFor", () => {
  it("answers every audience the reader is in", () => {
    expect(audiencesFor([eu, anglophone, beta], { region: "eu", cohort: "beta" })).toEqual([
      audience("eu"),
      audience("beta"),
    ])
  })

  it("keeps the order the rules were given, because that is the order deltas apply in", () => {
    expect(audiencesFor([beta, eu], { region: "eu", cohort: "beta" })).toEqual([
      audience("beta"),
      audience("eu"),
    ])
  })

  it("answers nothing for a context nothing matches", () => {
    expect(audiencesFor([eu, beta], { region: "us" })).toEqual([])
  })

  it("answers nothing when there is no context at all", () => {
    expect(audiencesFor([eu], undefined)).toEqual([])
  })

  it("answers nothing when a deployment has written no rules", () => {
    expect(audiencesFor([], { region: "eu" })).toEqual([])
  })

  it("names an audience once when two rules reach it, at its first position", () => {
    const byRegion = rule("eu", [{ key: "region", anyOf: ["eu"] }])
    const byLocale = rule("eu", [{ key: "locale", anyOf: ["de-DE"] }])

    expect(audiencesFor([byRegion, byLocale, beta], { region: "eu", locale: "de-DE", cohort: "beta" })).toEqual(
      [audience("eu"), audience("beta")]
    )
  })
})

describe("the schemas", () => {
  it("refuses a clause that accepts nothing, which could never match", () => {
    expect(audienceClauseSchema.safeParse({ key: "region", anyOf: [] }).success).toBe(false)
  })

  it("refuses a clause with no key", () => {
    expect(audienceClauseSchema.safeParse({ key: "", anyOf: ["eu"] }).success).toBe(false)
  })

  it("refuses a rule with no clauses, because that audience is already aud_everyone", () => {
    expect(audienceRuleSchema.safeParse({ audienceId: "aud_eu", clauses: [] }).success).toBe(false)
  })

  it("refuses an audience id that is not one", () => {
    expect(
      audienceRuleSchema.safeParse({ audienceId: "eu", clauses: [{ key: "r", anyOf: ["eu"] }] }).success
    ).toBe(false)
  })

  it("accepts a rule a deployment would write", () => {
    expect(
      audienceRuleSchema.safeParse({
        audienceId: "aud_eu",
        clauses: [{ key: "region", anyOf: ["eu", "uk"] }],
      }).success
    ).toBe(true)
  })

  it("refuses a value no JSON scalar covers", () => {
    expect(audienceClauseSchema.safeParse({ key: "region", anyOf: [["eu"]] }).success).toBe(false)
    expect(audienceClauseSchema.safeParse({ key: "region", anyOf: [{ is: "eu" }] }).success).toBe(false)
  })
})
