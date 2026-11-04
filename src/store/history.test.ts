import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type NodeId, type ProposalId, type TreeId } from "../ids.js"
import { err } from "../result.js"
import { FIXED_INSTANT } from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"
import type { TreeDelta, TreeOperation } from "../tree/delta.js"
import { findNode } from "../tree/navigation.js"
import type { LoomTree } from "../tree/tree.js"

import { describeTreeVersion, historyOf, seedRegistry, type SeedSource } from "./history.js"
import { memoryTreeStore } from "./memory.js"
import type { AppendRequest, TreeReader } from "./store.js"

const provenance = {
  origin: "user-instruction",
  interpreter: "scripted",
  authoredBy: "model",
  confidence: 0.9,
  interpretedAt: FIXED_INSTANT,
} as const

const appendOf = (delta: TreeDelta): AppendRequest => ({
  proposalId: "p_1" as ProposalId,
  delta,
  provenance,
  appliedAt: FIXED_INSTANT,
})

const deltaOf = (
  treeId: TreeId,
  baseRevision: number,
  operations: readonly TreeOperation[]
): TreeDelta => ({
  deltaId: sequentialIdFactory("r").deltaId(),
  treeId,
  baseRevision,
  operations,
})

const removalOf = (treeId: TreeId, nodeId: string, baseRevision: number): TreeDelta =>
  deltaOf(treeId, baseRevision, [{ op: "remove", nodeId: nodeId as NodeId }])

/** Two removals, so revision 1 is a version that is neither the seed nor the head. */
const twoRemovals = async () => {
  const { tree, ids } = sampleTree()
  const store = memoryTreeStore()
  await store.create(tree)
  await store.append(tree.treeId, appendOf(removalOf(tree.treeId, ids.footer, 0)))
  await store.append(tree.treeId, appendOf(removalOf(tree.treeId, ids.header, 1)))

  return { tree, ids, store }
}

/** A reader that records every log read, to prove which answers cost one. */
const counting = (reader: TreeReader) => {
  const reads: number[] = []

  return {
    reads,
    reader: {
      head: (treeId: TreeId) => reader.head(treeId),
      revisions: async (treeId: TreeId, request?: Parameters<TreeReader["revisions"]>[1]) => {
        reads.push(request?.at ?? -1)

        return await reader.revisions(treeId, request)
      },
    } satisfies TreeReader,
  }
}

const seedOf = (tree: LoomTree): SeedSource =>
  seedRegistry(new Map([[tree.treeId, () => tree]]))

describe("seedRegistry", () => {
  it("answers for a tree it holds and not for one it does not", () => {
    const { tree } = sampleTree()
    const seeds = seedOf(tree)

    expect(seeds(tree.treeId)).toEqual(tree)
    expect(seeds("t_absent" as TreeId)).toBeUndefined()
  })

  /**
   * The property the audit depends on (0028): a seed is evidence because it is
   * re-derived, so a registry must not hand back a value it is holding on to.
   */
  it("derives the seed on each call rather than caching one", () => {
    const { tree } = sampleTree()
    let derivations = 0
    const seeds = seedRegistry(
      new Map([
        [
          tree.treeId,
          () => {
            derivations += 1

            return tree
          },
        ],
      ])
    )

    seeds(tree.treeId)
    seeds(tree.treeId)

    expect(derivations).toBe(2)
  })

  /** A deployment naming many seeds should not build the ones nobody asked about. */
  it("does not build the seeds it was not asked for", () => {
    const { tree } = sampleTree()
    let built = 0
    const seeds = seedRegistry(
      new Map([
        [tree.treeId, () => tree],
        [
          "t_other" as TreeId,
          () => {
            built += 1

            return tree
          },
        ],
      ])
    )

    seeds(tree.treeId)

    expect(built).toBe(0)
  })
})

describe("historyOf", () => {
  it("answers for a past revision a host can seed", async () => {
    const { tree, ids, store } = await twoRemovals()

    const answer = await historyOf(store, seedOf(tree)).at(tree.treeId, 1)
    if (!answer.ok || answer.value.outcome !== "replayed") throw new Error("expected a tree")

    expect(answer.value.replayed.tree.revision).toBe(1)
    /** The footer went at revision 1 and the header at revision 2. */
    expect(findNode(answer.value.replayed.tree.root, ids.footer)).toBeNull()
    expect(findNode(answer.value.replayed.tree.root, ids.header)).not.toBeNull()
  })

  /**
   * The case the framework had no shape for. The portal invented
   * `{ kind: "unknown-start" }` for it because `TreeAtRevision` has no member
   * that is about the host rather than about the log.
   */
  it("says the host has no seed rather than failing or guessing one", async () => {
    const { tree, store } = await twoRemovals()

    const answer = await historyOf(store, () => undefined).at(tree.treeId, 1)
    if (!answer.ok) throw new Error("expected an answer rather than a store error")

    expect(answer.value).toEqual({ outcome: "unseeded", treeId: tree.treeId, revision: 1 })
  })

  /** An answer about the host is not a question for the log. */
  it("reads nothing at all when it has no seed", async () => {
    const { tree, store } = await twoRemovals()
    const { reads, reader } = counting(store)

    await historyOf(reader, () => undefined).at(tree.treeId, 1)

    expect(reads).toEqual([])
  })

  /**
   * `unseeded` is a statement about this deployment and not about the tree: the
   * same store, read through a history that can seed it, answers.
   */
  it("distinguishes a tree this host cannot seed from a log it cannot read", async () => {
    const { tree, store } = await twoRemovals()
    const seeds = seedOf(tree)

    const unseeded = await historyOf(store, () => undefined).at(tree.treeId, 1)
    const seeded = await historyOf(store, seeds).at(tree.treeId, 1)

    expect(unseeded.ok && unseeded.value.outcome).toBe("unseeded")
    expect(seeded.ok && seeded.value.outcome).toBe("replayed")
  })

  /** A store error is still an error: the seam adds an answer, it hides nothing. */
  it("passes a store error through rather than reporting it as an absent seed", async () => {
    const { tree } = sampleTree()
    const broken: TreeReader = {
      head: () => Promise.resolve(err({ code: "unavailable", detail: "down" } as const)),
      revisions: () => Promise.resolve(err({ code: "unavailable", detail: "down" } as const)),
    }

    const answer = await historyOf(broken, seedOf(tree)).at(tree.treeId, 1)

    expect(answer.ok).toBe(false)
  })

  /** The out-of-range and unreplayable answers still come from the fold. */
  it("reports a revision past the head as out of range", async () => {
    const { tree, store } = await twoRemovals()

    const answer = await historyOf(store, seedOf(tree)).at(tree.treeId, 9)
    if (!answer.ok || answer.value.outcome !== "out-of-range") throw new Error("expected a range")

    expect(answer.value.earliest).toBe(0)
    expect(answer.value.headRevision).toBe(2)
  })
})

describe("historyOf atEach", () => {
  /** The reading this seam exists for: two versions, folded once. */
  it("answers two revisions from one walk of the log", async () => {
    const { tree, store } = await twoRemovals()
    const { reads, reader } = counting(store)

    const answers = await historyOf(reader, seedOf(tree)).atEach(tree.treeId, [1, 2])
    if (!answers.ok) throw new Error("expected answers")

    expect(answers.value.get(1)?.outcome).toBe("replayed")
    expect(answers.value.get(2)?.outcome).toBe("replayed")
    /** One fold rather than one per revision. */
    expect(reads.length).toBe(1)
  })

  it("gives every revision the same unseeded answer, without reading", async () => {
    const { tree, store } = await twoRemovals()
    const { reads, reader } = counting(store)

    const answers = await historyOf(reader, () => undefined).atEach(tree.treeId, [1, 2])
    if (!answers.ok) throw new Error("expected answers")

    expect([...answers.value.keys()]).toEqual([1, 2])
    expect(answers.value.get(1)).toEqual({
      outcome: "unseeded",
      treeId: tree.treeId,
      revision: 1,
    })
    expect(answers.value.get(2)).toEqual({
      outcome: "unseeded",
      treeId: tree.treeId,
      revision: 2,
    })
    expect(reads).toEqual([])
  })

  /**
   * Keyed, not positional, as `treesAt` is. The map is what enforces it rather
   * than a de-duplicating pass, which is why there is no `Set` on either path.
   */
  it("answers once for a revision named twice", async () => {
    const { tree, store } = await twoRemovals()

    const answers = await historyOf(store, () => undefined).atEach(tree.treeId, [1, 1])
    if (!answers.ok) throw new Error("expected answers")

    expect(answers.value.size).toBe(1)
  })

  /** Each answer is what `at` would have said on its own. */
  it("agrees with asking one revision at a time", async () => {
    const { tree, store } = await twoRemovals()
    const history = historyOf(store, seedOf(tree))

    const batch = await history.atEach(tree.treeId, [0, 1, 2])
    if (!batch.ok) throw new Error("expected answers")

    for (const revision of [0, 1, 2]) {
      const alone = await history.at(tree.treeId, revision)
      if (!alone.ok) throw new Error("expected an answer")

      expect(batch.value.get(revision)).toEqual(alone.value)
    }
  })
})

describe("describeTreeVersion", () => {
  it("names the host rather than the log when there is no seed", () => {
    expect(
      describeTreeVersion({ outcome: "unseeded", treeId: "t_1" as TreeId, revision: 4 })
    ).toBe("revision 4 of t_1 cannot be replayed: this host has no seed for it")
  })

  /** The other members keep the sentences `describeTreeAt` already writes. */
  it("defers to describeTreeAt for every answer the fold produces", () => {
    expect(
      describeTreeVersion({ outcome: "out-of-range", revision: 1, earliest: 3, headRevision: 7 })
    ).toBe("revision 1 is outside 3–7")
  })
})
