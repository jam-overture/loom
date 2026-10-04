import { describe, expect, it } from "vitest"

import { dispositionSchema, UNATTRIBUTED_POLICY_ID } from "./disposition.js"

const decided = {
  kind: "accepted",
  reason: { code: "within-policy", detail: "low stakes, reversible" },
  stakes: "low",
  reversible: true,
  confidence: 0.9,
} as const

describe("dispositionSchema", () => {
  it("keeps the policy a stored judgment names", () => {
    const parsed = dispositionSchema.parse({ ...decided, policyId: "storefront" })

    expect(parsed.policyId).toBe("storefront")
  })

  /**
   * A judgment written before the Gate recorded its policy is not a judgment
   * made under today's default one. Reading it as `unattributed` is the only
   * answer that does not invent a fact about a record nobody can go back to.
   */
  it("reads a judgment written before the field as unattributed, not as the default", () => {
    const parsed = dispositionSchema.parse(decided)

    expect(parsed.policyId).toBe(UNATTRIBUTED_POLICY_ID)
    expect(parsed.policyId).not.toBe("default")
  })

  it("refuses an empty name rather than storing an attribution to nothing", () => {
    expect(dispositionSchema.safeParse({ ...decided, policyId: "" }).success).toBe(false)
  })
})

const heldIrreversible = {
  kind: "requires-confirmation",
  reason: { code: "irreversible", detail: "cannot be undone cleanly: out-of-tree-effect" },
  stakes: "high",
  reversible: false,
  confidence: 0.9,
  policyId: "storefront",
} as const

describe("dispositionSchema irreversibility reasons", () => {
  it("keeps the structured reason a held judgment was decided on", () => {
    const parsed = dispositionSchema.parse({
      ...heldIrreversible,
      irreversibilityReasons: [{ code: "out-of-tree-effect", primitiveTypes: ["loom.form"] }],
    })

    expect(parsed.irreversibilityReasons).toEqual([
      { code: "out-of-tree-effect", primitiveTypes: ["loom.form"] },
    ])
  })

  /**
   * Both members, because they ask opposite things of the person reading them
   * and a reader that could only recover one would be the prose problem again.
   */
  it("keeps both members of the union, with the numbers the second one carries", () => {
    const parsed = dispositionSchema.parse({
      ...heldIrreversible,
      irreversibilityReasons: [
        { code: "out-of-tree-effect", primitiveTypes: ["loom.form"] },
        { code: "retention-budget-exceeded", retainedNodeCount: 9, budget: 4 },
      ],
    })

    expect(parsed.irreversibilityReasons?.[1]).toEqual({
      code: "retention-budget-exceeded",
      retainedNodeCount: 9,
      budget: 4,
    })
  })

  /**
   * The absence is the compatibility contract (0045). A judgment written before
   * the field existed parses, and reads as the unknown it is rather than as a
   * change with nothing wrong with it.
   */
  it("reads a judgment written before the field as absent, not as no reasons", () => {
    const parsed = dispositionSchema.parse(heldIrreversible)

    expect(parsed.irreversibilityReasons).toBeUndefined()
    expect(parsed.reversible).toBe(false)
  })

  it("does not default the field on a reversible judgment either", () => {
    expect("irreversibilityReasons" in dispositionSchema.parse(decided)).toBe(false)
  })

  it("refuses a reason whose code is neither of the two", () => {
    const refused = dispositionSchema.safeParse({
      ...heldIrreversible,
      irreversibilityReasons: [{ code: "sounds-bad", primitiveTypes: ["loom.form"] }],
    })

    expect(refused.success).toBe(false)
  })

  /**
   * The grammar bound is what makes the field publishable: every member is an
   * identifier a deployment registered, so a value that is not one is refused
   * at the boundary rather than stored and rendered.
   */
  it("refuses a primitive type that is not a registrable identifier", () => {
    const refused = dispositionSchema.safeParse({
      ...heldIrreversible,
      irreversibilityReasons: [
        { code: "out-of-tree-effect", primitiveTypes: ["the checkout form"] },
      ],
    })

    expect(refused.success).toBe(false)
  })

  it("refuses a retention reason missing the budget it was measured against", () => {
    const refused = dispositionSchema.safeParse({
      ...heldIrreversible,
      irreversibilityReasons: [{ code: "retention-budget-exceeded", retainedNodeCount: 9 }],
    })

    expect(refused.success).toBe(false)
  })
})
