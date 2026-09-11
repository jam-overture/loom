import { defaultGatePolicy, gatePolicySchema } from "@loom/runtime"
import { describe, expect, it } from "vitest"

import { KNOB_GROUPS, KNOB_ORDER, knobsInGroup, policyKnobs } from "./knobs"

/**
 * That the page describes the policy the runtime actually has.
 *
 * The compiler already refuses a `Record<keyof GatePolicy, Knob>` that is
 * missing a field, which is the strongest half of this and needs no test. What a
 * type cannot say is that the **order** list stayed in step with the record, that
 * every knob was placed in a group somebody wrote a heading for, and — the one
 * worth having — that the defaults on the page are the runtime's rather than a
 * copy of them.
 *
 * The schema is read here as well as the parsed object, because they can
 * disagree in one direction that matters: a field added to `gatePolicySchema`
 * and left off the `GatePolicy` type would compile everywhere and be invisible
 * to a reader.
 */

/** The fields `gatePolicySchema` itself declares, which is the list of record. */
const schemaFields = (): readonly string[] => Object.keys(gatePolicySchema.shape)

describe("the knobs the page describes", () => {
  it("names every field the policy schema declares, and no other", () => {
    expect([...KNOB_ORDER].sort()).toEqual([...schemaFields()].sort())
  })

  it("lists each field exactly once", () => {
    expect(new Set(KNOB_ORDER).size).toBe(KNOB_ORDER.length)
  })

  it("puts every knob in a group the page has a heading for", () => {
    const groups = new Set(KNOB_GROUPS.map((group) => group.id))

    for (const knob of policyKnobs()) {
      expect(groups.has(knob.group), `${knob.field} is in group ${knob.group}`).toBe(true)
    }
  })

  it("leaves no group empty", () => {
    for (const group of KNOB_GROUPS) {
      expect(knobsInGroup(group.id).length, `${group.id} has no knobs`).toBeGreaterThan(0)
    }
  })

  it("accounts for every knob across the groups exactly once", () => {
    const grouped = KNOB_GROUPS.flatMap((group) => knobsInGroup(group.id).map((knob) => knob.field))

    expect([...grouped].sort()).toEqual([...KNOB_ORDER].sort())
  })
})

describe("the defaults beside each knob", () => {
  /**
   * Asked of the **schema**, not of `defaultGatePolicy`.
   *
   * The module derives its values from the parsed object, so comparing against
   * that object again would be the page agreeing with itself — a hard-coded
   * number that happened to be right today would pass. Every field of
   * `gatePolicySchema` carries its own default, and `parse(undefined)` is the
   * public way to ask a field what it is, so this arrives at the same value by a
   * route the module does not use.
   */
  it("prints the default the schema declares, not a number somebody typed", () => {
    for (const knob of policyKnobs()) {
      const declared: unknown = gatePolicySchema.shape[knob.field].parse(undefined)

      expect(knob.shipped, knob.field).toBe(JSON.stringify(declared))
    }
  })

  it("shows an empty vocabulary as a shape rather than as a blank", () => {
    const vocabulary = knobsInGroup("vocabulary")

    for (const knob of vocabulary) {
      expect(knob.shipped.length, `${knob.field} printed nothing`).toBeGreaterThan(0)
    }

    expect(vocabulary.map((knob) => knob.shipped)).toContain("[]")
  })

  it("leaves nothing undefined, so no row can print a blank", () => {
    for (const knob of policyKnobs()) {
      expect(defaultGatePolicy[knob.field], `${knob.field} has no shipped value`).toBeDefined()
      expect(knob.shipped, knob.field).not.toBe("undefined")
    }
  })
})

describe("what each knob says", () => {
  it("gives every one a plain sentence and something to do about it", () => {
    for (const knob of policyKnobs()) {
      expect(knob.plain.length, `${knob.field} has no plain sentence`).toBeGreaterThan(20)
      expect(knob.yourMove.length, `${knob.field} says nothing to do`).toBeGreaterThan(20)
    }
  })

  /**
   * These strings are rendered as text nodes rather than as MDX, so a backtick
   * in one reaches the reader as a backtick — the trap `catalogue.ts` already
   * records for an example's caption. It is invisible in the source and obvious
   * on the page, which is the shape of defect worth a test.
   */
  it("writes prose rather than markdown, because nothing renders it as markdown", () => {
    for (const knob of policyKnobs()) {
      expect(knob.plain, `${knob.field} has a backtick in its sentence`).not.toContain("`")
      expect(knob.yourMove, `${knob.field} has a backtick in its advice`).not.toContain("`")
    }

    for (const group of KNOB_GROUPS) {
      expect(group.summary, `${group.id} has a backtick in its summary`).not.toContain("`")
    }
  })

  it("tells a reader not to write the one list that is derived", () => {
    const interactive = policyKnobs().find((knob) => knob.field === "interactiveTypes")

    expect(interactive?.yourMove).toContain("interactiveTypesFor")
  })
})
