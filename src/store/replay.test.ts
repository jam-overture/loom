import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type NodeId, type ProposalId, type TreeId } from "../ids.js"
import { ok } from "../result.js"
import { FIXED_INSTANT } from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"
import { compareTrees } from "../tree/compare.js"
import { buildText } from "../tree/builders.js"
import type { TreeDelta, TreeOperation } from "../tree/delta.js"
import { idReturnsIn } from "../tree/identity.js"
import { findNode } from "../tree/navigation.js"
import { withRoot } from "../tree/tree.js"

import { memoryTreeStore } from "./memory.js"
import { auditSnapshot, describeTreeAt, replayTree, treeAt, treesAt } from "./replay.js"
import type { AppendRequest, RevisionPage, StoredRevision, TreeReader } from "./store.js"

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

/** A whole log in one page: both ends reached, so the fold stops after it. */
const onePage = (revisions: readonly StoredRevision[]): RevisionPage => ({
  revisions,
  older: null,
  newer: null,
})

const entryOf = (delta: TreeDelta, revision: number): StoredRevision => ({
  treeId: delta.treeId,
  revision,
  proposalId: "p_1" as ProposalId,
  delta,
  provenance,
  appliedAt: FIXED_INSTANT,
})

describe("replayTree", () => {
  it("folds a log back into the tree the log produced", async () => {
    const { tree, ids } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)
    await store.append(tree.treeId, appendOf(removalOf(tree.treeId, ids.footer, 0)))
    await store.append(tree.treeId, appendOf(removalOf(tree.treeId, ids.header, 1)))

    const head = await store.head(tree.treeId)
    const log = await store.revisions(tree.treeId)
    if (!head.ok || !log.ok) throw new Error("expected the store to answer")

    const replayed = replayTree(tree, log.value.revisions)

    expect(replayed.ok && replayed.value.tree).toEqual(head.value)
  })

  it("replays an empty log to the seed itself", () => {
    const { tree } = sampleTree()

    const replayed = replayTree(tree, [])

    expect(replayed.ok && replayed.value.tree).toEqual(tree)
  })

  /** A gap or a repeat means the log is not the history it claims to be. */
  it("refuses a log whose revisions are not consecutive", () => {
    const { tree, ids } = sampleTree()
    const skipped = entryOf(removalOf(tree.treeId, ids.footer, 0), 2)

    expect(replayTree(tree, [skipped])).toEqual({
      ok: false,
      error: { code: "revision-gap", expected: 1, found: 2 },
    })
  })

  it("reports the revision at which a delta stopped applying", () => {
    const { tree } = sampleTree()
    const impossible = entryOf(removalOf(tree.treeId, "n_999", 0), 1)

    const replayed = replayTree(tree, [impossible])

    expect(replayed.ok).toBe(false)
    expect(replayed.ok ? "" : replayed.error.code).toBe("delta-rejected")
    expect(replayed.ok ? 0 : (replayed.error as { revision: number }).revision).toBe(1)
  })
})

describe("auditSnapshot", () => {
  it("agrees when the snapshot is what the log produces", async () => {
    const { tree, ids } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)
    await store.append(tree.treeId, appendOf(removalOf(tree.treeId, ids.footer, 0)))

    expect(await auditSnapshot(store, tree.treeId, tree)).toEqual({
      ok: true,
      value: { outcome: "agrees", revision: 1, idReturns: [] },
    })
  })

  it("agrees on a tree that has never been changed", async () => {
    const { tree } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)

    expect(await auditSnapshot(store, tree.treeId, tree)).toEqual({
      ok: true,
      value: { outcome: "agrees", revision: 0, idReturns: [] },
    })
  })

  /**
   * The drift this module exists to catch, forced with a store whose snapshot
   * disagrees with its log — which is exactly what a changed `applyDelta` would
   * produce, and what a pure event-sourced design could not notice.
   */
  it("reports divergence when the snapshot is not what the log produces", async () => {
    const { tree, ids } = sampleTree()
    const delta = removalOf(tree.treeId, ids.footer, 0)

    const drifted: TreeReader = {
      /** Claims revision 1 while still holding the untouched tree. */
      head: () => Promise.resolve(ok(withRoot(tree, tree.root))),
      revisions: () => Promise.resolve(ok(onePage([entryOf(delta, 1)]))),
    }

    const audit = await auditSnapshot(drifted, tree.treeId, tree)

    expect(audit.ok && audit.value.outcome).toBe("diverged")
    expect(audit.ok && audit.value.outcome === "diverged" && audit.value.revision).toBe(1)
  })

  /**
   * A verdict of "diverged" is not actionable on its own. The audit reports both
   * trees it compared so the caller can say how they differ without re-reading a
   * head that may have moved on since.
   */
  it("reports both trees it compared, so the divergence can be described", async () => {
    const { tree, ids } = sampleTree()
    const delta = removalOf(tree.treeId, ids.footer, 0)

    const drifted: TreeReader = {
      head: () => Promise.resolve(ok(withRoot(tree, tree.root))),
      revisions: () => Promise.resolve(ok(onePage([entryOf(delta, 1)]))),
    }

    const audit = await auditSnapshot(drifted, tree.treeId, tree)
    if (!audit.ok || audit.value.outcome !== "diverged") throw new Error("expected divergence")

    expect(audit.value.stored.root).toEqual(tree.root)
    expect(compareTrees(audit.value.stored, audit.value.replayed)).toEqual([
      { code: "missing", nodeId: ids.footer, label: "loom.footer" },
    ])
  })

  it("reports an unreplayable log rather than pretending it agrees", async () => {
    const { tree, ids } = sampleTree()

    const gapped: TreeReader = {
      head: () => Promise.resolve(ok(tree)),
      revisions: () =>
        Promise.resolve(ok(onePage([entryOf(removalOf(tree.treeId, ids.footer, 0), 5)]))),
    }

    const audit = await auditSnapshot(gapped, tree.treeId, tree)

    expect(audit.ok && audit.value.outcome).toBe("unreplayable")
  })

  /**
   * The log is read a page at a time (0026), and an audit is the one caller that
   * needs all of it. A fold that stopped at the first page would report agreement
   * on a tree it had only half replayed — which is the one wrong answer an audit
   * must never give.
   */
  it("follows the log across pages rather than auditing only the first", async () => {
    const { tree, ids } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)
    await store.append(tree.treeId, appendOf(removalOf(tree.treeId, ids.footer, 0)))
    await store.append(tree.treeId, appendOf(removalOf(tree.treeId, ids.header, 1)))

    const head = await store.head(tree.treeId)
    if (!head.ok) throw new Error("expected the store to answer")

    const asked: string[] = []
    const paged: TreeReader = {
      head: () => Promise.resolve(ok(head.value)),
      revisions: async (treeId, request) => {
        asked.push(request?.cursor ?? "start")

        /** One entry per page, so following `newer` is the only way to see both. */
        return await store.revisions(treeId, { ...request, limit: 1 })
      },
    }

    expect(await auditSnapshot(paged, tree.treeId, tree)).toEqual({
      ok: true,
      value: { outcome: "agrees", revision: 2, idReturns: [] },
    })
    expect(asked).toEqual(["start", "1"])
  })

  it("passes a store failure through rather than reporting agreement", async () => {
    const store = memoryTreeStore()
    const { tree } = sampleTree()

    const audit = await auditSnapshot(store, tree.treeId, tree)

    expect(audit.ok).toBe(false)
    expect(audit.ok ? "" : audit.error.code).toBe("not-found")
  })
})

/**
 * An audit answers two questions that can disagree. "Does the log still produce
 * the snapshot" is about drift; "does an id still name one node" is about
 * whether the log can be read by id at all (0038). A tree can pass the first and
 * fail the second, so the second is reported alongside the verdict rather than
 * folded into it.
 */
describe("auditSnapshot and id identity", () => {
  const spare = sequentialIdFactory("audit")

  it("reports an id that came back as a different node, while still agreeing", async () => {
    const { tree, ids } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)
    await store.append(tree.treeId, appendOf(removalOf(tree.treeId, ids.footer, 0)))

    const impostor = { ...buildText(spare, "Sale"), id: ids.footer }
    await store.append(
      tree.treeId,
      appendOf(
        deltaOf(tree.treeId, 1, [{ op: "insert", parentId: ids.page, index: 0, node: impostor }])
      )
    )

    const audit = await auditSnapshot(store, tree.treeId, tree)
    if (!audit.ok || audit.value.outcome !== "agrees") throw new Error("expected agreement")

    expect(audit.value.idReturns).toEqual([
      {
        code: "recycled",
        nodeId: ids.footer,
        leftAs: "loom.footer",
        returnedAs: "text",
        leftAt: 1,
        returnedAt: 2,
      },
    ])
  })

  /** An undo is not a fault, and an audit that called it one would cry wolf. */
  it("reports a removal that was taken back as a restoration", async () => {
    const { tree, ids } = sampleTree()
    const footer = findNode(tree.root, ids.footer)
    if (!footer) throw new Error("fixture missing footer")

    const store = memoryTreeStore()
    await store.create(tree)
    await store.append(tree.treeId, appendOf(removalOf(tree.treeId, ids.footer, 0)))
    await store.append(
      tree.treeId,
      appendOf(
        deltaOf(tree.treeId, 1, [{ op: "insert", parentId: ids.page, index: 2, node: footer }])
      )
    )

    const audit = await auditSnapshot(store, tree.treeId, tree)
    if (!audit.ok || audit.value.outcome !== "agrees") throw new Error("expected agreement")

    expect(audit.value.idReturns).toEqual([
      { code: "restored", nodeId: ids.footer, label: "loom.footer", leftAt: 1, returnedAt: 2 },
    ])
  })

  /** Paging is where a second pass would go wrong: the fold carries it along. */
  it("sees a return whose two halves fall in different pages", async () => {
    const { tree, ids } = sampleTree()
    const footer = findNode(tree.root, ids.footer)
    if (!footer) throw new Error("fixture missing footer")

    const store = memoryTreeStore()
    await store.create(tree)
    await store.append(tree.treeId, appendOf(removalOf(tree.treeId, ids.footer, 0)))
    await store.append(
      tree.treeId,
      appendOf(
        deltaOf(tree.treeId, 1, [{ op: "insert", parentId: ids.page, index: 2, node: footer }])
      )
    )

    const head = await store.head(tree.treeId)
    if (!head.ok) throw new Error("expected the store to answer")

    const paged: TreeReader = {
      head: () => Promise.resolve(ok(head.value)),
      revisions: async (treeId, request) => await store.revisions(treeId, { ...request, limit: 1 }),
    }

    const audit = await auditSnapshot(paged, tree.treeId, tree)
    if (!audit.ok || audit.value.outcome !== "agrees") throw new Error("expected agreement")

    expect(audit.value.idReturns.map((found) => found.code)).toEqual(["restored"])
  })

  it("reports a diverged tree's id returns too", async () => {
    const { tree, ids } = sampleTree()
    const impostor = { ...buildText(spare, "Sale"), id: ids.footer }

    const drifted: TreeReader = {
      /** Claims revision 2 while still holding the untouched tree. */
      head: () => Promise.resolve(ok({ ...tree, revision: 2 })),
      revisions: () =>
        Promise.resolve(
          ok(
            onePage([
              entryOf(removalOf(tree.treeId, ids.footer, 0), 1),
              entryOf(
                deltaOf(tree.treeId, 1, [
                  { op: "insert", parentId: ids.page, index: 0, node: impostor },
                ]),
                2
              ),
            ])
          )
        ),
    }

    const audit = await auditSnapshot(drifted, tree.treeId, tree)
    if (!audit.ok || audit.value.outcome !== "diverged") throw new Error("expected divergence")

    expect(audit.value.idReturns.map((found) => found.code)).toEqual(["recycled"])
  })

  it("says nothing about ids when the log cannot be replayed at all", async () => {
    const { tree, ids } = sampleTree()

    const gapped: TreeReader = {
      head: () => Promise.resolve(ok(tree)),
      revisions: () =>
        Promise.resolve(ok(onePage([entryOf(removalOf(tree.treeId, ids.footer, 0), 5)]))),
    }

    const audit = await auditSnapshot(gapped, tree.treeId, tree)

    expect(audit.ok && audit.value.outcome).toBe("unreplayable")
    expect(audit.ok && "idReturns" in audit.value).toBe(false)
  })
})

/**
 * The tree as it was, which a store materialises for exactly one revision.
 *
 * Every test here holds the seed and the log fixed and moves only the revision
 * asked for, because the one failure this read can have — one revision's tree
 * answered for another revision's question — is invisible in the answer and only
 * visible in the walk.
 */
describe("treeAt", () => {
  /** Three revisions, so there is a middle one that is neither seed nor head. */
  const threeRevisions = async () => {
    const { tree, ids } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)
    await store.append(tree.treeId, appendOf(removalOf(tree.treeId, ids.footer, 0)))
    await store.append(tree.treeId, appendOf(removalOf(tree.treeId, ids.header, 1)))
    await store.append(
      tree.treeId,
      appendOf(
        deltaOf(tree.treeId, 2, [
          { op: "configure", nodeId: ids.card, set: { elevation: 2 }, unset: [] },
        ])
      )
    )

    return { tree, ids, store }
  }

  it("answers with the tree the log had produced by that revision", async () => {
    const { tree, ids, store } = await threeRevisions()

    const answer = await treeAt(store, { treeId: tree.treeId, revision: 1, seed: tree })
    if (!answer.ok || answer.value.outcome !== "replayed") throw new Error("expected a tree")

    expect(answer.value.replayed.tree.revision).toBe(1)
    /** The footer is gone at 1 and the header is not: revision 2 removed that. */
    expect(findNode(answer.value.replayed.tree.root, ids.footer)).toBeNull()
    expect(findNode(answer.value.replayed.tree.root, ids.header)).not.toBeNull()
  })

  /**
   * The answer every consumer could already get, and the reason it has to come
   * from the same place as the others: a before-and-after reading compares two
   * revisions, and a head answered from the snapshot while its predecessor is
   * answered from the log compares two sources of truth. `auditSnapshot` exists
   * because those two can disagree.
   */
  it("answers for the head from the log rather than from the snapshot", async () => {
    const { tree, ids } = sampleTree()
    const delta = removalOf(tree.treeId, ids.footer, 0)

    const drifted: TreeReader = {
      /** Claims revision 1 while still holding the untouched tree. */
      head: () => Promise.resolve(ok(withRoot({ ...tree, revision: 1 }, tree.root))),
      revisions: () => Promise.resolve(ok(onePage([entryOf(delta, 1)]))),
    }

    const answer = await treeAt(drifted, { treeId: tree.treeId, revision: 1, seed: tree })
    if (!answer.ok || answer.value.outcome !== "replayed") throw new Error("expected a tree")

    expect(findNode(answer.value.replayed.tree.root, ids.footer)).toBeNull()
  })

  /** The tree at the seed's revision is the seed, and the log has nothing to add. */
  it("answers for the seed's own revision without opening the log", async () => {
    const { tree, store } = await threeRevisions()

    const reads: number[] = []
    const counted: TreeReader = {
      head: (treeId) => store.head(treeId),
      revisions: async (treeId, request) => {
        reads.push(request?.at ?? -1)

        return await store.revisions(treeId, request)
      },
    }

    const answer = await treeAt(counted, { treeId: tree.treeId, revision: 0, seed: tree })

    expect(answer.ok && answer.value.outcome).toBe("replayed")
    expect(answer.ok && answer.value.outcome === "replayed" && answer.value.replayed.tree).toEqual(tree)
    expect(reads).toEqual([])
  })

  /**
   * A fold that read to the end would cost the whole log for a revision near the
   * seed — which is the read a consumer writing the walk itself most easily gets
   * wrong in the other direction.
   */
  it("stops reading once it has the revision it was asked for", async () => {
    const { tree, store } = await threeRevisions()

    const reads: (string | number)[] = []
    const paged: TreeReader = {
      head: (treeId) => store.head(treeId),
      revisions: async (treeId, request) => {
        reads.push(request?.cursor ?? request?.at ?? "start")

        /** One entry per page, so a fold to the end would take three reads. */
        return await store.revisions(treeId, { ...request, limit: 1 })
      },
    }

    const answer = await treeAt(paged, { treeId: tree.treeId, revision: 1, seed: tree })

    expect(answer.ok && answer.value.outcome).toBe("replayed")
    expect(reads).toEqual([1])
  })

  it("follows the log across pages to reach a later revision", async () => {
    const { tree, ids, store } = await threeRevisions()

    const paged: TreeReader = {
      head: (treeId) => store.head(treeId),
      revisions: async (treeId, request) => await store.revisions(treeId, { ...request, limit: 1 }),
    }

    const answer = await treeAt(paged, { treeId: tree.treeId, revision: 3, seed: tree })
    if (!answer.ok || answer.value.outcome !== "replayed") throw new Error("expected a tree")

    expect(answer.value.replayed.tree.revision).toBe(3)
    expect(findNode(answer.value.replayed.tree.root, ids.header)).toBeNull()
  })

  /**
   * A revision before the seed is the one answer a fold cannot reach and cannot
   * detect: starting from a checkpoint, the entries that would have produced it
   * are behind the tree it was handed.
   */
  it("reports a revision before the seed as outside the span", async () => {
    const { tree, store } = await threeRevisions()

    const checkpoint = await store.head(tree.treeId)
    if (!checkpoint.ok) throw new Error("expected the store to answer")

    const answer = await treeAt(store, {
      treeId: tree.treeId,
      revision: 1,
      seed: checkpoint.value,
    })

    expect(answer).toEqual({
      ok: true,
      value: { outcome: "out-of-range", revision: 1, earliest: 3, headRevision: 3 },
    })
  })

  it("reports a revision past the head as outside the span", async () => {
    const { tree, store } = await threeRevisions()

    const answer = await treeAt(store, { treeId: tree.treeId, revision: 4, seed: tree })

    expect(answer).toEqual({
      ok: true,
      value: { outcome: "out-of-range", revision: 4, earliest: 0, headRevision: 3 },
    })
  })

  /**
   * Revisions are dense integers (0026), so nothing lies between two of them.
   * Folding for 1.5 would walk the whole log and then report the shape of
   * corruption, which would be a true sentence about the wrong thing.
   */
  it("reports a revision that is not an integer as outside the span", async () => {
    const { tree, store } = await threeRevisions()

    const answer = await treeAt(store, { treeId: tree.treeId, revision: 1.5, seed: tree })

    expect(answer.ok && answer.value.outcome).toBe("out-of-range")
  })

  /**
   * The id tenancy has to be the one that held *at* the revision asked for. A
   * consumer reading reader counters by node id is comparing nodes, and an id
   * that came back after the revision it is reading is not a fact about that
   * revision (0038).
   */
  it("carries the id history as it stood at that revision and no further", async () => {
    const { tree, ids } = sampleTree()
    const footer = findNode(tree.root, ids.footer)
    if (!footer) throw new Error("fixture missing footer")

    const store = memoryTreeStore()
    await store.create(tree)
    await store.append(tree.treeId, appendOf(removalOf(tree.treeId, ids.footer, 0)))
    await store.append(
      tree.treeId,
      appendOf(
        deltaOf(tree.treeId, 1, [{ op: "insert", parentId: ids.page, index: 2, node: footer }])
      )
    )

    const answers = await treesAt(store, { treeId: tree.treeId, revisions: [1, 2], seed: tree })
    if (!answers.ok) throw new Error("expected the store to answer")

    const returnsAt = (revision: number): readonly string[] => {
      const answer = answers.value.get(revision)
      if (answer?.outcome !== "replayed") throw new Error(`expected a tree at ${revision}`)

      return idReturnsIn(answer.replayed.idHistory).map((found) => found.code)
    }

    /** The footer has left and not yet come back. */
    expect(returnsAt(1)).toEqual([])
    expect(returnsAt(2)).toEqual(["restored"])
  })

  /**
   * The log holds fewer entries than the snapshot's revision claims, so the fold
   * ends before the revision asked for and no entry was ever wrong. The gap
   * between the last entry and the head is the only honest thing left to say.
   */
  it("reports a log that ends before the revision asked for", async () => {
    const { tree, ids } = sampleTree()

    const truncated: TreeReader = {
      /** Claims revision 5 with one entry in the log. */
      head: () => Promise.resolve(ok({ ...tree, revision: 5 })),
      revisions: () =>
        Promise.resolve(ok(onePage([entryOf(removalOf(tree.treeId, ids.footer, 0), 1)]))),
    }

    const answer = await treeAt(truncated, { treeId: tree.treeId, revision: 4, seed: tree })

    expect(answer).toEqual({
      ok: true,
      value: {
        outcome: "unreplayable",
        revision: 4,
        mismatch: { code: "revision-gap", expected: 2, found: 5 },
      },
    })
  })

  it("reports a delta before the revision that no longer applies", async () => {
    const { tree } = sampleTree()

    const impossible: TreeReader = {
      head: () => Promise.resolve(ok({ ...tree, revision: 2 })),
      revisions: () =>
        Promise.resolve(ok(onePage([entryOf(removalOf(tree.treeId, "n_999", 0), 1)]))),
    }

    const answer = await treeAt(impossible, { treeId: tree.treeId, revision: 2, seed: tree })
    if (!answer.ok || answer.value.outcome !== "unreplayable") throw new Error("expected a refusal")

    expect(answer.value.mismatch).toEqual({ code: "delta-rejected", revision: 1, detail: "node-not-found" })
  })

  it("passes a store failure through rather than answering with the seed", async () => {
    const store = memoryTreeStore()
    const { tree } = sampleTree()

    const answer = await treeAt(store, { treeId: tree.treeId, revision: 0, seed: tree })

    expect(answer.ok).toBe(false)
    expect(answer.ok ? "" : answer.error.code).toBe("not-found")
  })
})

/**
 * Several revisions from one walk. The claim under test is that batching changes
 * what it costs to ask and never what the answer is — the same claim
 * `planReverts` makes, and the one a before-and-after reading depends on,
 * because its two sides have to come from one read of a log that is still being
 * appended to.
 */
describe("treesAt", () => {
  const twoChanges = async () => {
    const { tree, ids } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)
    await store.append(tree.treeId, appendOf(removalOf(tree.treeId, ids.footer, 0)))
    await store.append(tree.treeId, appendOf(removalOf(tree.treeId, ids.header, 1)))

    return { tree, ids, store }
  }

  it("gives each revision the answer it would have had alone", async () => {
    const { tree, store } = await twoChanges()

    const batched = await treesAt(store, { treeId: tree.treeId, revisions: [0, 1, 2], seed: tree })
    if (!batched.ok) throw new Error("expected the store to answer")

    for (const revision of [0, 1, 2]) {
      const alone = await treeAt(store, { treeId: tree.treeId, revision, seed: tree })

      expect(alone.ok && alone.value).toEqual(batched.value.get(revision))
    }
  })

  it("reads the log once for every revision it was asked about", async () => {
    const { tree, store } = await twoChanges()

    let reads = 0
    const counted: TreeReader = {
      head: (treeId) => store.head(treeId),
      revisions: async (treeId, request) => {
        reads += 1

        return await store.revisions(treeId, request)
      },
    }

    await treesAt(counted, { treeId: tree.treeId, revisions: [1, 2], seed: tree })

    expect(reads).toBe(1)
  })

  it("answers a revision named twice once", async () => {
    const { tree, store } = await twoChanges()

    const answers = await treesAt(store, { treeId: tree.treeId, revisions: [1, 1], seed: tree })

    expect(answers.ok && answers.value.size).toBe(1)
    expect(answers.ok && answers.value.get(1)?.outcome).toBe("replayed")
  })

  it("answers an out-of-range revision beside one it reached", async () => {
    const { tree, store } = await twoChanges()

    const answers = await treesAt(store, { treeId: tree.treeId, revisions: [2, 9], seed: tree })
    if (!answers.ok) throw new Error("expected the store to answer")

    expect(answers.value.get(2)?.outcome).toBe("replayed")
    expect(answers.value.get(9)?.outcome).toBe("out-of-range")
  })

  /**
   * A survey of revisions that cannot be reached needs no read of the log — and
   * 1.5 is one of them, which is the half that costs rather than misleads: a
   * fractional revision sought is a revision no entry can retire, so the walk
   * would read every page of the log before answering what it already knew.
   */
  it("never opens the log when no revision is one the log has", async () => {
    const { tree, store } = await twoChanges()

    let reads = 0
    const counted: TreeReader = {
      head: (treeId) => store.head(treeId),
      revisions: async (treeId, request) => {
        reads += 1

        return await store.revisions(treeId, request)
      },
    }

    const answers = await treesAt(counted, {
      treeId: tree.treeId,
      revisions: [7, 9, 1.5],
      seed: tree,
    })

    expect(answers.ok && [...answers.value.values()].map((found) => found.outcome)).toEqual([
      "out-of-range",
      "out-of-range",
      "out-of-range",
    ])
    expect(reads).toBe(0)
  })

  it("answers nothing for no revisions, without reading anything but the head", async () => {
    const { tree, store } = await twoChanges()

    const answers = await treesAt(store, { treeId: tree.treeId, revisions: [], seed: tree })

    expect(answers.ok && answers.value.size).toBe(0)
  })
})

describe("describeTreeAt", () => {
  const { tree } = sampleTree()

  it("says a revision was replayed", () => {
    expect(
      describeTreeAt({
        outcome: "replayed",
        revision: 2,
        replayed: { tree, idHistory: new Map() },
      })
    ).toBe("revision 2 replayed from the log")
  })

  it("names the span a revision fell outside", () => {
    expect(
      describeTreeAt({ outcome: "out-of-range", revision: 1, earliest: 3, headRevision: 7 })
    ).toBe("revision 1 is outside 3–7")
  })

  it("names where the log jumps", () => {
    expect(
      describeTreeAt({
        outcome: "unreplayable",
        revision: 4,
        mismatch: { code: "revision-gap", expected: 2, found: 5 },
      })
    ).toBe("revision 4 is unreachable: the log jumps from 1 to 5")
  })

  it("names the revision that stopped applying", () => {
    expect(
      describeTreeAt({
        outcome: "unreplayable",
        revision: 4,
        mismatch: { code: "delta-rejected", revision: 2, detail: "no-such-node" },
      })
    ).toBe("revision 4 is unreachable: revision 2 no longer applies (no-such-node)")
  })
})

/**
 * A seed later than revision 0, which 0028 permits and a host that checkpoints
 * supplies. The fold opens at the seed's own position, so the entries it already
 * contains are never met — and before this it met the oldest of them and called
 * the log gapped.
 */
describe("auditSnapshot from a checkpoint seed", () => {
  it("audits from a seed the log has entries before", async () => {
    const { tree, ids } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)
    const checkpoint = await store.append(
      tree.treeId,
      appendOf(removalOf(tree.treeId, ids.footer, 0))
    )
    await store.append(tree.treeId, appendOf(removalOf(tree.treeId, ids.header, 1)))
    if (!checkpoint.ok) throw new Error("expected the store to answer")

    expect(await auditSnapshot(store, tree.treeId, checkpoint.value)).toEqual({
      ok: true,
      value: { outcome: "agrees", revision: 2, idReturns: [] },
    })
  })

  it("opens the log at the seed rather than at its oldest entry", async () => {
    const { tree, ids } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)
    const checkpoint = await store.append(
      tree.treeId,
      appendOf(removalOf(tree.treeId, ids.footer, 0))
    )
    await store.append(tree.treeId, appendOf(removalOf(tree.treeId, ids.header, 1)))
    if (!checkpoint.ok) throw new Error("expected the store to answer")

    const opened: (number | undefined)[] = []
    const watched: TreeReader = {
      head: (treeId) => store.head(treeId),
      revisions: async (treeId, request) => {
        opened.push(request?.at)

        return await store.revisions(treeId, request)
      },
    }

    await auditSnapshot(watched, tree.treeId, checkpoint.value)

    /** Inclusive, so revision 2 is the first entry the checkpoint has not applied. */
    expect(opened).toEqual([2])
  })

  /**
   * Nothing about the id history is lost by starting late: a checkpoint seeds it
   * with the tenancy its own tree holds, so a return that straddles the
   * checkpoint is a return nobody can see — which is the cost of the checkpoint
   * and not of this walk.
   */
  it("reports a return that happened entirely after the checkpoint", async () => {
    const { tree, ids } = sampleTree()
    const footer = findNode(tree.root, ids.footer)
    if (!footer) throw new Error("fixture missing footer")

    const store = memoryTreeStore()
    await store.create(tree)
    const checkpoint = await store.append(
      tree.treeId,
      appendOf(
        deltaOf(tree.treeId, 0, [
          { op: "configure", nodeId: ids.card, set: { elevation: 2 }, unset: [] },
        ])
      )
    )
    if (!checkpoint.ok) throw new Error("expected the store to answer")

    await store.append(tree.treeId, appendOf(removalOf(tree.treeId, ids.footer, 1)))
    await store.append(
      tree.treeId,
      appendOf(
        deltaOf(tree.treeId, 2, [{ op: "insert", parentId: ids.page, index: 2, node: footer }])
      )
    )

    const audit = await auditSnapshot(store, tree.treeId, checkpoint.value)
    if (!audit.ok || audit.value.outcome !== "agrees") throw new Error("expected agreement")

    expect(audit.value.idReturns.map((found) => found.code)).toEqual(["restored"])
  })
})
