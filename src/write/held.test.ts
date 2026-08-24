import { describe, expect, it } from "vitest"

import type { ProposalId } from "../ids.js"
import { heldProposalFixture } from "../testing/hold-contract.js"

import { describeHoldError, parseHeldProposal, type HoldError } from "./held.js"

/**
 * What `memoryHoldStore` does is checked by the contract suite in
 * `held.contract.test.ts`, alongside every other implementation. What is left
 * here is the two things that are not a store: how a refusal reads, and what
 * happens when a stored hold does not parse.
 */

describe("parseHeldProposal", () => {
  /**
   * The round trip storage actually performs. `JSON.parse(JSON.stringify(…))` is
   * what a jsonb column does to a value, and it is where an absent optional
   * field and one explicitly set to nothing stop being distinguishable — so it
   * is the shape the parse has to be checked against, rather than the object.
   */
  it("reads back a hold that went through JSON unchanged", () => {
    const held = heldProposalFixture({ actor: "alex", policyFingerprint: "sha256:abc" })

    expect(parseHeldProposal(JSON.parse(JSON.stringify(held)))).toEqual({ ok: true, value: held })
  })

  it("leaves an optional field absent rather than filling it in", () => {
    const held = heldProposalFixture()

    const parsed = parseHeldProposal(JSON.parse(JSON.stringify(held)))
    if (!parsed.ok) throw new Error("expected the hold to parse")

    expect("actor" in parsed.value.intent).toBe(false)
    expect("policyFingerprint" in parsed.value.disposition).toBe(false)
  })

  /**
   * A judgment recorded before the Gate named its policies still parses, and
   * reads as the unknown it is rather than claiming this host's current one.
   */
  it("restores a disposition written before policies were named", () => {
    const held = heldProposalFixture()
    const { policyId, ...withoutPolicy } = held.disposition

    const parsed = parseHeldProposal({ ...held, disposition: withoutPolicy })
    if (!parsed.ok) throw new Error("expected the hold to parse")

    expect(parsed.value.disposition.policyId).toBe("unattributed")
  })

  it("refuses a hold whose proposal is not one, and says where it looked", () => {
    const held = heldProposalFixture()

    const parsed = parseHeldProposal({ ...held, proposal: { rationale: "nothing else" } })
    if (parsed.ok) throw new Error("expected the hold to be refused")

    expect(parsed.error.code).toBe("unavailable")
    if (parsed.error.code !== "unavailable") throw new Error("expected an unavailable")
    expect(parsed.error.detail).toContain("proposal")
  })

  it("refuses something that is not a hold at all", () => {
    expect(parseHeldProposal(null).ok).toBe(false)
    expect(parseHeldProposal("a hold").ok).toBe(false)
  })
})

describe("describeHoldError", () => {
  const everyError: readonly HoldError[] = [
    { code: "not-held", proposalId: "p_1" as ProposalId },
    { code: "already-held", proposalId: "p_1" as ProposalId },
    { code: "unavailable", detail: "connection reset" },
  ]

  it("produces a non-empty message for every code", () => {
    for (const error of everyError) {
      expect(describeHoldError(error).length).toBeGreaterThan(0)
    }
  })

  it("covers the whole union", () => {
    expect(new Set(everyError.map((error) => error.code)).size).toBe(everyError.length)
  })
})
