import { describe, expect, it } from "vitest"

import { sequentialIdFactory, treeIdSchema, type ProposalId, type TreeId } from "../ids.js"
import type { TreeDelta } from "../tree/delta.js"
import type { HeldProposal, HoldStore } from "../write/held.js"

import { buildIntent, buildProposal, FIXED_INSTANT } from "./doubles.js"
import { sampleTree } from "./fixtures.js"

/**
 * One suite, run against every `HoldStore`.
 *
 * `held.ts` calls `memoryHoldStore` the reference implementation, which is a
 * promise rather than a fact until something checks a second one against it.
 * This is that check, and it exists for a sharper reason than the tree store's
 * did: the property that makes a hold safe — that `release` is a take rather
 * than a read, so two reviewers confirming at once cannot both come away with
 * the same change — is a *race*, and a race is exactly the kind of thing a
 * single-threaded `Map` gets right for free and a database has to be made to
 * get right on purpose.
 *
 * Only behaviour the contract promises belongs here. How an implementation
 * reports a connection failure, and what it does with the row underneath, stays
 * in that implementation's own test file.
 */

const ids = sequentialIdFactory("holdcontract")

/**
 * A hold against a real tree.
 *
 * `sampleTree` mints the same ids every time, so a test that needs two holds to
 * differ has to say how. Every optional field on the three stored shapes is left
 * absent by default and set only by the test that is about them — absence is the
 * case a JSON round-trip is most likely to get wrong, so it is the one the rest
 * of the suite should be exercising.
 */
export const heldProposalFixture = (options?: {
  readonly heldAt?: string
  readonly treeId?: TreeId
  readonly actor?: string
  readonly policyFingerprint?: string
}): HeldProposal => {
  const { tree, ids: nodes } = sampleTree()
  const treeId = options?.treeId ?? tree.treeId

  /**
   * A real operation rather than an empty list, because a delta with nothing in
   * it is not a `TreeDelta`: `treeDeltaSchema` requires at least one. The
   * in-memory store never noticed, since it stores what it is handed; a backing
   * store that reads a hold back has to parse it, and would refuse this on the
   * way out having accepted it on the way in.
   */
  const delta: TreeDelta = {
    deltaId: ids.deltaId(),
    treeId,
    baseRevision: tree.revision,
    operations: [{ op: "configure", nodeId: nodes.page, set: { title: "Held" }, unset: [] }],
  }

  const intent = buildIntent(ids, {
    treeId,
    baseRevision: tree.revision,
    ...(options?.actor === undefined ? {} : { actor: options.actor }),
  })

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
      policyId: "default",
      ...(options?.policyFingerprint === undefined
        ? {}
        : { policyFingerprint: options.policyFingerprint }),
    },
    heldAt: options?.heldAt ?? FIXED_INSTANT,
  }
}

export const describeHoldStoreContract = (
  name: string,
  makeStore: () => HoldStore | Promise<HoldStore>
): void => {
  describe(`${name} — HoldStore contract`, () => {
    it("gives back what it was given, whole", async () => {
      const store = await makeStore()
      const held = heldProposalFixture()

      expect(await store.hold(held)).toEqual({ ok: true, value: held })

      const found = await store.get(held.proposalId)

      expect(found).toEqual({ ok: true, value: held })
    })

    /**
     * The one a backing store is most likely to break. `actor` and
     * `policyFingerprint` are absent on an ordinary hold, and a column-per-
     * field store would read them back as `null` — which is a different value
     * from an absent key and would make the two implementations disagree about
     * a proposal neither of them refused.
     */
    it("keeps an optional field that was set, and does not invent one that was not", async () => {
      const store = await makeStore()
      const bare = heldProposalFixture()
      const full = heldProposalFixture({
        treeId: treeIdSchema.parse("t_full"),
        actor: "alex",
        policyFingerprint: "sha256:abc",
      })

      await store.hold(bare)
      await store.hold(full)

      const readBare = await store.get(bare.proposalId)
      const readFull = await store.get(full.proposalId)
      if (!readBare.ok || !readFull.ok) throw new Error("expected both holds")

      expect("actor" in readBare.value.intent).toBe(false)
      expect("policyFingerprint" in readBare.value.disposition).toBe(false)
      expect(readFull.value.intent.actor).toBe("alex")
      expect(readFull.value.disposition.policyFingerprint).toBe("sha256:abc")
    })

    it("reports an unknown id as not-held rather than as an empty answer", async () => {
      const store = await makeStore()

      expect(await store.get("p_missing" as ProposalId)).toEqual({
        ok: false,
        error: { code: "not-held", proposalId: "p_missing" },
      })
    })

    it("refuses to hold the same proposal twice", async () => {
      const store = await makeStore()
      const held = heldProposalFixture()
      await store.hold(held)

      expect(await store.hold(held)).toEqual({
        ok: false,
        error: { code: "already-held", proposalId: held.proposalId },
      })
    })

    /** A refused second hold must not have overwritten the first. */
    it("leaves the original in place when a second hold is refused", async () => {
      const store = await makeStore()
      const held = heldProposalFixture()
      await store.hold(held)

      await store.hold({ ...held, heldAt: "2026-07-31T00:00:00.000Z" })
      const found = await store.get(held.proposalId)
      if (!found.ok) throw new Error("expected the first hold to survive")

      expect(found.value.heldAt).toBe(held.heldAt)
    })

    /**
     * The whole reason `release` is a take rather than a read: two reviewers
     * pressing confirm cannot both come away holding the same change.
     */
    it("releases a proposal exactly once", async () => {
      const store = await makeStore()
      const held = heldProposalFixture()
      await store.hold(held)

      const first = await store.release(held.proposalId)
      const second = await store.release(held.proposalId)

      expect(first).toEqual({ ok: true, value: held })
      expect(second).toEqual({
        ok: false,
        error: { code: "not-held", proposalId: held.proposalId },
      })
    })

    /**
     * The same property under concurrency, which is where an implementation that
     * reads and then deletes in two steps differs from one that takes in one.
     * Sequential release cannot tell them apart; this can.
     */
    it("releases exactly once when two callers race", async () => {
      const store = await makeStore()
      const held = heldProposalFixture()
      await store.hold(held)

      const outcomes = await Promise.all([
        store.release(held.proposalId),
        store.release(held.proposalId),
        store.release(held.proposalId),
      ])

      expect(outcomes.filter((outcome) => outcome.ok)).toHaveLength(1)
    })

    it("cannot be read after it is released", async () => {
      const store = await makeStore()
      const held = heldProposalFixture()
      await store.hold(held)
      await store.release(held.proposalId)

      expect((await store.get(held.proposalId)).ok).toBe(false)
    })

    /** Answering frees the id, because a repair may be held under a fresh one. */
    it("can hold a proposal again once it has been released", async () => {
      const store = await makeStore()
      const held = heldProposalFixture()
      await store.hold(held)
      await store.release(held.proposalId)

      expect((await store.hold(held)).ok).toBe(true)
    })

    it("lists only the proposals held against the tree asked about", async () => {
      const store = await makeStore()
      const mine = heldProposalFixture()
      const theirs = heldProposalFixture({ treeId: treeIdSchema.parse("t_elsewhere") })
      await store.hold(mine)
      await store.hold(theirs)

      const listed = await store.forTree(mine.treeId)
      if (!listed.ok) throw new Error("expected a listing")

      expect(listed.value.map((entry) => entry.proposalId)).toEqual([mine.proposalId])
    })

    it("lists a tree with nothing held as empty rather than as missing", async () => {
      const store = await makeStore()
      const { tree } = sampleTree()

      expect(await store.forTree(tree.treeId)).toEqual({ ok: true, value: [] })
    })

    /** Oldest first, because the oldest hold is the one closest to going stale. */
    it("orders a listing by when each proposal was held", async () => {
      const store = await makeStore()
      const later = heldProposalFixture({ heldAt: "2026-07-30T12:00:00.000Z" })
      const earlier = heldProposalFixture({ heldAt: "2026-07-30T09:00:00.000Z" })

      await store.hold(later)
      await store.hold(earlier)

      const listed = await store.forTree(later.treeId)
      if (!listed.ok) throw new Error("expected a listing")

      expect(listed.value.map((entry) => entry.heldAt)).toEqual([earlier.heldAt, later.heldAt])
    })

    it("drops a released proposal from the listing", async () => {
      const store = await makeStore()
      const first = heldProposalFixture({ heldAt: "2026-07-30T09:00:00.000Z" })
      const second = heldProposalFixture({ heldAt: "2026-07-30T12:00:00.000Z" })
      await store.hold(first)
      await store.hold(second)

      await store.release(first.proposalId)
      const listed = await store.forTree(first.treeId)
      if (!listed.ok) throw new Error("expected a listing")

      expect(listed.value.map((entry) => entry.proposalId)).toEqual([second.proposalId])
    })
  })
}
