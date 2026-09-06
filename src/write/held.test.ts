import { describe, expect, it } from "vitest"

import type { ProposalId } from "../ids.js"
import { heldProposalFixture } from "../testing/hold-contract.js"

import {
  clampHoldLimit,
  compareHolds,
  DEFAULT_HOLD_LIMIT,
  describeHoldError,
  holdCursor,
  holdCursorPosition,
  MAX_HOLD_LIMIT,
  parseHeldProposal,
  type HoldError,
} from "./held.js"

/**
 * What `memoryHoldStore` does is checked by the contract suite in
 * `held.contract.test.ts`, alongside every other implementation. What is left
 * here is the things that are not a store: how a refusal reads, what happens
 * when a stored hold does not parse, and the paging vocabulary both
 * implementations are built out of.
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

describe("compareHolds", () => {
  const at = (heldAt: string, proposalId: string) => ({
    heldAt,
    proposalId: proposalId as ProposalId,
  })

  it("orders by instant before it looks at the id", () => {
    const early = at("2026-07-30T09:00:00.000Z", "p_z")
    const late = at("2026-07-30T12:00:00.000Z", "p_a")

    expect(compareHolds(early, late)).toBeLessThan(0)
    expect(compareHolds(late, early)).toBeGreaterThan(0)
  })

  it("falls back to the id when the instant is the same", () => {
    const first = at("2026-07-30T09:00:00.000Z", "p_a")
    const second = at("2026-07-30T09:00:00.000Z", "p_b")

    expect(compareHolds(first, second)).toBeLessThan(0)
    expect(compareHolds(second, first)).toBeGreaterThan(0)
  })

  /** A total order has to say that a position equals itself, or paging repeats it. */
  it("calls a position equal to itself", () => {
    const position = at("2026-07-30T09:00:00.000Z", "p_a")

    expect(compareHolds(position, position)).toBe(0)
  })
})

describe("holdCursorPosition", () => {
  const position = {
    heldAt: "2026-07-30T09:00:00.000Z",
    proposalId: "p_abc" as ProposalId,
  }

  it("reads back a cursor it wrote", () => {
    expect(holdCursorPosition(holdCursor(position))).toEqual(position)
  })

  /**
   * Each of these is a cursor that has been through something — a truncated
   * URL, a caller inventing one, a page number from a different listing. None
   * of them is an error; all of them start at the beginning.
   */
  it("reads an unusable cursor as no position at all", () => {
    for (const cursor of [
      undefined,
      "",
      "2026-07-30T09:00:00.000Z",
      "2026-07-30T09:00:00.000Z p_",
      "yesterday p_abc",
      "50",
      " p_abc",
    ]) {
      expect(holdCursorPosition(cursor)).toBeUndefined()
    }
  })
})

describe("clampHoldLimit", () => {
  it("falls back when the caller named nothing", () => {
    expect(clampHoldLimit(undefined)).toBe(DEFAULT_HOLD_LIMIT)
  })

  /** The whole point: a caller cannot ask for everything held by naming a big number. */
  it("refuses to hand back more than the maximum, however it is asked", () => {
    expect(clampHoldLimit(10_000)).toBe(MAX_HOLD_LIMIT)
    expect(clampHoldLimit(Number.POSITIVE_INFINITY)).toBe(DEFAULT_HOLD_LIMIT)
  })

  it("never returns an empty page on purpose", () => {
    expect(clampHoldLimit(0)).toBe(1)
    expect(clampHoldLimit(-5)).toBe(1)
  })
})
