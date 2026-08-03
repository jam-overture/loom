import { describe, expect, it } from "vitest"

import { harnessWith, proposalScript } from "../testing/episode-harness.js"
import { sampleTree } from "../testing/fixtures.js"
import { calibrationOf } from "../telemetry/calibration.js"

import { commitIntent, confirmHeld, revertRevision } from "./commit.js"
import { describeRevertRefusal } from "./revert.js"

/**
 * A revert is judged by the real Gate against the real policy, so these run the
 * whole path rather than asserting over a hand-built proposal. What is being
 * checked is mostly that a revert is *not* special: same custody, same append,
 * same record.
 */

const committedHarness = async (confidence = 0.9) => {
  const harness = await harnessWith({ script: proposalScript(confidence) })
  const outcome = await commitIntent(harness.path, harness.intent)

  return { harness, outcome }
}

/** The seed every fixture starts from — revision 0, before anything was applied. */
const seed = () => sampleTree().tree

describe("revertRevision", () => {
  it("undoes the change by appending its inverse, so the log only ever grows", async () => {
    const { harness } = await committedHarness()
    const { ids } = sampleTree()

    const before = await harness.path.store.head(harness.tree.treeId)
    const reverted = await revertRevision(
      harness.path,
      { treeId: harness.tree.treeId, revision: 1 },
      seed()
    )

    expect(reverted.kind).toBe("committed")
    if (reverted.kind !== "committed") throw new Error("expected a commit")

    /** Revision 2, not revision 0 — undoing is a new entry, never an erasure. */
    expect(reverted.tree.revision).toBe(2)
    expect(before.ok && before.value.revision).toBe(1)

    /** The node the original change removed is back where it was. */
    const restored = JSON.stringify(reverted.tree)
    expect(restored).toContain(ids.footer)
  })

  it("puts the tree back exactly as it stood before the change", async () => {
    const { harness } = await committedHarness()
    const original = seed()

    const reverted = await revertRevision(
      harness.path,
      { treeId: harness.tree.treeId, revision: 1 },
      original
    )
    if (reverted.kind !== "committed") throw new Error("expected a commit")

    expect(JSON.stringify(reverted.tree.root)).toBe(JSON.stringify(original.root))
  })

  it("records who asked for the undo", async () => {
    const { harness } = await committedHarness()

    const reverted = await revertRevision(
      harness.path,
      { treeId: harness.tree.treeId, revision: 1, actor: "reviewer:ana" },
      seed()
    )
    if (reverted.kind !== "committed") throw new Error("expected a commit")

    expect(reverted.proposal.provenance.actor).toBe("reviewer:ana")
    expect(reverted.proposal.provenance.authoredBy).toBe("runtime")
    expect(reverted.proposal.provenance.interpreter).toBe("loom.revert")
  })

  /**
   * The property that makes a revert an ordinary write rather than an escape
   * hatch: it is judged, and it carries the verdict. "It is only putting things
   * back" is a claim about intent, and the Gate judges deltas.
   *
   * This particular inverse — the insert that undoes a removal — is one the
   * default policy accepts outright, so what is asserted is that a disposition
   * exists at all. A policy that held the change would hold its undo, because
   * after `composeProposal` the two take the same path.
   */
  it("is put to the Gate rather than applied straight to the tree", async () => {
    const harness = await harnessWith({ script: proposalScript(0.5) })
    const held = await commitIntent(harness.path, harness.intent)
    if (held.kind !== "held") throw new Error("the fixture must be held")

    await confirmHeld(harness.path, { proposalId: held.held.proposalId })

    const reverted = await revertRevision(
      harness.path,
      { treeId: harness.tree.treeId, revision: 1 },
      seed()
    )
    if (reverted.kind !== "committed") throw new Error("expected a commit")

    expect(reverted.disposition.kind).toBe("accepted")
    expect(reverted.disposition.reason.code).toBe("within-policy")
  })

  it("refuses to undo anything but the latest revision", async () => {
    const { harness } = await committedHarness()

    const reverted = await revertRevision(
      harness.path,
      { treeId: harness.tree.treeId, revision: 0 },
      seed()
    )

    expect(reverted.kind).toBe("not-revertible")
    if (reverted.kind !== "not-revertible") throw new Error("expected a refusal")
    expect(reverted.refusal).toEqual({
      code: "not-the-latest-revision",
      requested: 0,
      head: 1,
    })
  })

  it("refuses a revision the log does not have", async () => {
    const { harness } = await committedHarness()

    const reverted = await revertRevision(
      harness.path,
      { treeId: harness.tree.treeId, revision: 9 },
      seed()
    )

    expect(reverted.kind).toBe("not-revertible")
  })

  /**
   * 0028's condition, inherited: an inverse is a function of the state its
   * delta saw, and reaching that state means replaying from a seed. A host that
   * cannot produce revision 0 gets a refusal rather than an inverse assembled
   * from the tree it is meant to be undoing.
   */
  it("refuses when the seed it is handed cannot replay the log", async () => {
    const { harness } = await committedHarness()
    const wrongSeed = { ...seed(), revision: 5 }

    const reverted = await revertRevision(
      harness.path,
      { treeId: harness.tree.treeId, revision: 1 },
      wrongSeed
    )

    expect(reverted.kind).toBe("not-revertible")
  })

  /**
   * 0031 measures self-graded confidence. An inverse is derived, so its 1 is not
   * a claim anyone made, and averaging it in would move the number for a reason
   * that has nothing to do with the model.
   */
  it("stays out of the calibration denominators", async () => {
    const { harness } = await committedHarness()
    await revertRevision(harness.path, { treeId: harness.tree.treeId, revision: 1 }, seed())

    const report = calibrationOf(await harness.fold())

    expect(report.overall.judged).toBe(1)
    expect(report.runtimeAuthored).toBe(1)
  })

  it("narrates the undo into the journal like any other ask", async () => {
    const { harness } = await committedHarness()
    await revertRevision(harness.path, { treeId: harness.tree.treeId, revision: 1 }, seed())

    const { episodes } = await harness.fold()

    expect(episodes).toHaveLength(2)
    expect(episodes[1]?.resolution).toEqual({
      kind: "committed",
      proposalId: episodes[1]?.proposals[0]?.proposalId,
      revision: 2,
    })
  })
})

describe("describeRevertRefusal", () => {
  it("says which revision was asked for and where the tree actually is", () => {
    const sentence = describeRevertRefusal({ code: "not-the-latest-revision", requested: 3, head: 7 })

    expect(sentence).toContain("Revision 3")
    expect(sentence).toContain("7")
  })

  it("has a sentence for every refusal", () => {
    const refusals = [
      { code: "not-the-latest-revision", requested: 1, head: 2 },
      { code: "no-such-revision", revision: 4 },
      { code: "unreplayable", mismatch: { code: "revision-gap", expected: 2, found: 5 } },
      { code: "not-invertible", error: { code: "node-not-found", nodeId: "n_1" as never } },
    ] as const

    for (const refusal of refusals) {
      expect(describeRevertRefusal(refusal).length).toBeGreaterThan(0)
    }
  })
})
