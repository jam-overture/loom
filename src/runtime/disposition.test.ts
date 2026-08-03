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
