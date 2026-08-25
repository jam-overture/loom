import { describe, expect, it } from "vitest"

import {
  nodeIdSchema,
  primitiveTypeSchema,
  type DeltaId,
  type DiscardedWork,
  type NodeId,
  type ProposalId,
  type TreeDelta,
  type TreeError,
  type TreeId,
  type TreeOperation,
} from "@loom/runtime"
import { memoryTreeStore, type AppendRequest, type RevertPlan } from "@loom/runtime/store"

import { describeRestoration, previewReversal, reversalOf } from "./reversal"
import { readingOf } from "./vocabulary"
import { seedTree } from "./seed"

const nodeId = (id: string): NodeId => nodeIdSchema.parse(id)
const treeId = "t_1" as TreeId

/**
 * `reversalOf` reads only the outcome, the inverse operations, and the discards.
 * A revertable plan is built from those three; the target and head are named so
 * the fixture is a real plan rather than a partial cast.
 */
const revertablePlan = (
  operations: readonly TreeOperation[],
  discards: readonly DiscardedWork[] = []
): RevertPlan => ({
  outcome: "revertable",
  target: {
    treeId,
    revision: 3,
    proposalId: "p_1" as ProposalId,
    delta: { deltaId: "d_1" as DeltaId, treeId, baseRevision: 2, operations: [] },
    provenance: {
      origin: "user-instruction",
      interpreter: "scripted",
      authoredBy: "model",
      confidence: 0.9,
      interpretedAt: "2026-08-09T00:00:00.000Z",
    },
    appliedAt: "2026-08-09T00:00:00.000Z",
  },
  operations,
  headRevision: 5,
  discards,
})

describe("describeRestoration", () => {
  /**
   * The inverse of a removal is an insert that carries the whole subtree, so this
   * is the one that names what the deletion destroyed — the fact the forward
   * delta drops and only the log holds.
   */
  it("names the subtree a restore brings back, and how much came with it", () => {
    expect(
      describeRestoration({
        op: "insert",
        parentId: nodeId("n_page"),
        index: 2,
        node: {
          kind: "element",
          id: nodeId("n_card"),
          type: primitiveTypeSchema.parse("loom.card"),
          props: {},
          children: [
            { kind: "element", id: nodeId("n_h"), type: primitiveTypeSchema.parse("loom.heading"), props: {}, children: [{ kind: "text", id: nodeId("n_t"), value: "Hi" }] },
          ],
        },
      })
    ).toEqual({
      before: "Puts ",
      subject: "n_card",
      after: ", a loom.card with the 2 things that were inside it, back inside n_page.",
    })
  })

  it("counts a leaf restore as bringing nothing else with it", () => {
    expect(
      readingOf(describeRestoration({
        op: "insert",
        parentId: nodeId("n_page"),
        index: 0,
        node: { kind: "text", id: nodeId("n_t"), value: "Welcome" },
      }))
    ).toBe("Puts n_t, the words, back inside n_page.")
  })

  /**
   * The inverse of a reconfigure restores the values it wrote over — the prior
   * value, which is the thing a diff shows for free and the delta does not keep.
   */
  it("names the values a restore puts back, and the keys it clears", () => {
    expect(
      describeRestoration({
        op: "configure",
        nodeId: nodeId("n_card"),
        set: { variant: "outlined", level: 2 },
        unset: ["subtitle"],
      })
    ).toEqual({
      before: "Puts ",
      subject: "n_card",
      after:
        "'s variant back to “outlined”, level back to 2 and subtitle back to nothing at all.",
    })
  })

  it("says a restore of a no-op configure puts no props back", () => {
    expect(
      readingOf(
        describeRestoration({ op: "configure", nodeId: nodeId("n_card"), set: {}, unset: [] })
      )
    ).toBe("Puts n_card back as it was, though it had no settings to restore.")
  })

  it("reads the inverse of an insert as removing what was added", () => {
    expect(readingOf(describeRestoration({ op: "remove", nodeId: nodeId("n_new") }))).toBe(
      "Takes n_new back out again, along with anything now inside it."
    )
  })

  it("reads the inverse of a move as putting it back where it came from", () => {
    expect(
      readingOf(
        describeRestoration({ op: "move", nodeId: nodeId("n_a"), parentId: nodeId("n_b"), index: 1 })
      )
    ).toBe("Moves n_a back inside n_b, where it was.")
  })

  it("previews a container value without spelling it out", () => {
    expect(
      readingOf(
        describeRestoration({
          op: "configure",
          nodeId: nodeId("n_x"),
          set: { items: [1, 2, 3], meta: { a: 1 } },
          unset: [],
        })
      )
    ).toBe("Puts n_x's items back to a list of 3 and meta back to an object.")
  })
})

describe("reversalOf", () => {
  it("carries every inverse operation as a restoration, in order", () => {
    const reversal = reversalOf(
      revertablePlan([
        { op: "configure", nodeId: nodeId("n_card"), set: { variant: "outlined" }, unset: [] },
        { op: "remove", nodeId: nodeId("n_added") },
      ])
    )

    if (reversal.kind !== "revertable") throw new Error("a clean plan should read as revertable")
    expect(reversal.restores.map(readingOf)).toEqual([
      "Puts n_card's variant back to “outlined”.",
      "Takes n_added back out again, along with anything now inside it.",
    ])
  })

  it("keeps the revisions a contested undo would write over", () => {
    const reversal = reversalOf(
      revertablePlan([{ op: "remove", nodeId: nodeId("n_card") }], [
        { revision: 4, nodeIds: [nodeId("n_card")] },
        { revision: 5, nodeIds: [nodeId("n_card")] },
      ])
    )

    if (reversal.kind !== "revertable") throw new Error("a contested undo is still revertable (0035)")
    expect(reversal.discards.map((discarded) => discarded.revision)).toEqual([4, 5])
  })

  /**
   * The three blocked outcomes fail for different reasons, and a reader can act
   * on only one of them. Each says which, rather than sharing one sentence.
   */
  it("says a change from before the seed cannot be replayed to", () => {
    const plan: RevertPlan = { outcome: "out-of-range", revision: 2, earliest: 5, headRevision: 9 }
    const reversal = reversalOf(plan)

    if (reversal.kind !== "blocked") throw new Error("out-of-range is a blocked reversal")
    expect(reversal.reason).toContain("revision 2")
    expect(reversal.reason).toContain("revision 5")
    expect(reversal.technical).toBe("out-of-range: revision 2, earliest 5")
  })

  it("says a log that no longer replays cannot be inverted", () => {
    const plan: RevertPlan = {
      outcome: "unreplayable",
      mismatch: { code: "revision-gap", expected: 3, found: 5 },
    }

    const reversal = reversalOf(plan)
    if (reversal.kind !== "blocked") throw new Error("unreplayable is a blocked reversal")
    expect(reversal.reason).toContain("couldn’t rebuild this page")
    expect(reversal.technical).toContain("unreplayable")
  })

  it("names the error when a delta will not invert", () => {
    const error: TreeError = { code: "node-not-found", nodeId: nodeId("n_gone") }
    const plan: RevertPlan = { outcome: "uninvertible", revision: 4, error }

    const reversal = reversalOf(plan)
    if (reversal.kind !== "blocked") throw new Error("uninvertible is a blocked reversal")
    expect(reversal.technical).toContain("node-not-found")
  })
})

/**
 * The whole path, against the runtime rather than a fixture plan: a real seed, a
 * real store, real deltas, and the reversal read back off the log the runtime
 * inverted. A hand-built plan proves the wording; this proves the wording
 * describes what actually happened.
 */
const PROVENANCE = {
  origin: "user-instruction",
  interpreter: "scripted",
  authoredBy: "model",
  confidence: 0.9,
  interpretedAt: "2026-08-09T00:00:00.000Z",
} as const

const appendOf = (delta: TreeDelta, revision: number): AppendRequest => ({
  proposalId: `p_${revision}` as ProposalId,
  delta,
  provenance: PROVENANCE,
  appliedAt: "2026-08-09T00:00:00.000Z",
})

const deltaOf = (revision: number, operations: TreeOperation[], scope: TreeId): TreeDelta => ({
  deltaId: `d_${revision}` as DeltaId,
  treeId: scope,
  baseRevision: revision - 1,
  operations,
})

/** The outlined card the seed puts third in the page, the one a real edit reshapes. */
const seedCard = () => {
  const card = seedTree().root.children[2]
  if (card?.kind !== "element") throw new Error("the seed changed shape")

  return card
}

describe("previewReversal, end to end", () => {
  it("restores the value a reconfigure wrote over — read from the inverted log", async () => {
    const store = memoryTreeStore()
    const seed = seedTree()
    await store.create(seed)

    const card = seedCard()
    const configured = await store.append(
      seed.treeId,
      appendOf(
        deltaOf(1, [{ op: "configure", nodeId: card.id, set: { variant: "prominent" }, unset: [] }], seed.treeId),
        1
      )
    )
    if (!configured.ok) throw new Error("the store refused the reconfigure")

    const reversal = await previewReversal(store, seed.treeId, seed, 1)

    if (reversal?.kind !== "revertable") throw new Error("a fresh reconfigure is cleanly revertable")
    expect(reversal.restores).toHaveLength(1)
    expect(reversal.restores[0]?.subject).toBe(card.id)
    // The seed set variant to "outlined"; undoing the change puts that back.
    expect(reversal.restores[0] && readingOf(reversal.restores[0])).toBe(
      `Puts ${card.id}'s variant back to “outlined”.`
    )
    expect(reversal.discards).toEqual([])
  })

  it("brings back the subtree a removal destroyed, counting what came with it", async () => {
    const store = memoryTreeStore()
    const seed = seedTree()
    await store.create(seed)

    const card = seedCard()
    const removed = await store.append(
      seed.treeId,
      appendOf(deltaOf(1, [{ op: "remove", nodeId: card.id }], seed.treeId), 1)
    )
    if (!removed.ok) throw new Error("the store refused the removal")

    const reversal = await previewReversal(store, seed.treeId, seed, 1)

    if (reversal?.kind !== "revertable") throw new Error("removing a leaf card is revertable")
    // The card holds a heading (with text) and a prose (with text): four nodes under it.
    expect(reversal.restores[0] && readingOf(reversal.restores[0])).toBe(
      `Puts ${card.id}, a loom.card with the 4 things that were inside it, back inside ${seed.root.id}.`
    )
  })

  it("names the later revision a contested undo would write over", async () => {
    const store = memoryTreeStore()
    const seed = seedTree()
    await store.create(seed)

    const card = seedCard()
    const first = await store.append(
      seed.treeId,
      appendOf(deltaOf(1, [{ op: "configure", nodeId: card.id, set: { variant: "prominent" }, unset: [] }], seed.treeId), 1)
    )
    if (!first.ok) throw new Error("the store refused the first reconfigure")

    const second = await store.append(
      seed.treeId,
      appendOf(deltaOf(2, [{ op: "configure", nodeId: card.id, set: { variant: "flat" }, unset: [] }], seed.treeId), 2)
    )
    if (!second.ok) throw new Error("the store refused the second reconfigure")

    const reversal = await previewReversal(store, seed.treeId, seed, 1)

    if (reversal?.kind !== "revertable") throw new Error("a contested undo is still revertable (0035)")
    expect(reversal.discards.map((discarded) => discarded.revision)).toEqual([2])
  })

  /**
   * No seed, no replay: the row falls back to offering undo and answering on the
   * click, and the preview says nothing rather than guessing.
   */
  it("cannot be read when a revision is not in the log", async () => {
    const store = memoryTreeStore()
    const seed = seedTree()
    await store.create(seed)

    const reversal = await previewReversal(store, seed.treeId, seed, 7)

    if (reversal?.kind !== "blocked") throw new Error("a revision past head is out of range")
    expect(reversal.reason).toContain("revision 7")
  })
})
