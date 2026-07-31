import { describe, expect, it } from "vitest"

import { sequentialIdFactory, treeIdSchema, type ProposalId, type TreeId } from "../ids.js"
import { buildIntent, buildProposal, FIXED_INSTANT } from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"
import type { TreeDelta } from "../tree/delta.js"

import { describeHoldError, memoryHoldStore, type HeldProposal, type HoldError } from "./held.js"

const ids = sequentialIdFactory("hold")

/**
 * `sampleTree` mints the same ids every time, so a test that needs two trees to
 * be different has to say which is which.
 */
const heldProposal = (options?: {
  readonly heldAt?: string
  readonly treeId?: TreeId
}): HeldProposal => {
  const { tree } = sampleTree()
  const treeId = options?.treeId ?? tree.treeId

  const delta: TreeDelta = {
    deltaId: ids.deltaId(),
    treeId,
    baseRevision: tree.revision,
    operations: [],
  }

  const intent = buildIntent(ids, { treeId, baseRevision: tree.revision })
  const proposal = buildProposal(ids, { intentId: intent.intentId, delta })

  return {
    proposalId: proposal.proposalId,
    treeId,
    baseRevision: tree.revision,
    intent,
    proposal,
    disposition: {
      kind: "requires-confirmation",
      reason: { code: "confidence-below-minimum", detail: "0.5 is under the floor" },
      stakes: "medium",
      reversible: true,
      confidence: 0.5,
    },
    heldAt: options?.heldAt ?? FIXED_INSTANT,
  }
}

describe("memoryHoldStore", () => {
  it("returns what it was given", async () => {
    const store = memoryHoldStore()
    const held = heldProposal()

    expect(await store.hold(held)).toEqual({ ok: true, value: held })

    const found = await store.get(held.proposalId)
    if (!found.ok) throw new Error("expected the proposal to be held")

    expect(found.value.proposal.rationale).toBe(held.proposal.rationale)
  })

  it("reports an unknown id as not-held rather than as an empty answer", async () => {
    const store = memoryHoldStore()

    const found = await store.get("p_missing" as ProposalId)

    expect(found).toEqual({ ok: false, error: { code: "not-held", proposalId: "p_missing" } })
  })

  it("refuses to hold the same proposal twice", async () => {
    const store = memoryHoldStore()
    const held = heldProposal()
    await store.hold(held)

    const again = await store.hold(held)

    expect(again).toEqual({
      ok: false,
      error: { code: "already-held", proposalId: held.proposalId },
    })
  })

  /**
   * The whole reason `release` is a take rather than a read: two reviewers
   * clicking confirm cannot both come away holding the same change.
   */
  it("releases a proposal exactly once", async () => {
    const store = memoryHoldStore()
    const held = heldProposal()
    await store.hold(held)

    const first = await store.release(held.proposalId)
    const second = await store.release(held.proposalId)

    expect(first.ok).toBe(true)
    expect(second).toEqual({ ok: false, error: { code: "not-held", proposalId: held.proposalId } })
  })

  it("cannot be read after it is released", async () => {
    const store = memoryHoldStore()
    const held = heldProposal()
    await store.hold(held)
    await store.release(held.proposalId)

    const found = await store.get(held.proposalId)

    expect(found.ok).toBe(false)
  })

  it("lists only the proposals held against the tree asked about", async () => {
    const store = memoryHoldStore()
    const mine = heldProposal()
    const theirs = heldProposal({ treeId: treeIdSchema.parse("t_elsewhere") })
    await store.hold(mine)
    await store.hold(theirs)

    const listed = await store.forTree(mine.treeId)
    if (!listed.ok) throw new Error("expected a listing")

    expect(listed.value.map((entry) => entry.proposalId)).toEqual([mine.proposalId])
  })

  it("lists a tree with nothing held as empty rather than as missing", async () => {
    const store = memoryHoldStore()
    const { tree } = sampleTree()

    expect(await store.forTree(tree.treeId)).toEqual({ ok: true, value: [] })
  })

  /** Oldest first, because the oldest hold is the one closest to going stale. */
  it("orders a listing by when each proposal was held", async () => {
    const store = memoryHoldStore()
    const later = heldProposal({ heldAt: "2026-07-30T12:00:00.000Z" })
    const earlier = heldProposal({ heldAt: "2026-07-30T09:00:00.000Z" })

    await store.hold(later)
    await store.hold(earlier)

    const listed = await store.forTree(later.treeId)
    if (!listed.ok) throw new Error("expected a listing")

    expect(listed.value.map((entry) => entry.heldAt)).toEqual([earlier.heldAt, later.heldAt])
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
