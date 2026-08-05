import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type NodeId, type ProposalId, type TreeId } from "../ids.js"
import { ok } from "../result.js"
import { FIXED_INSTANT } from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"
import { compareTrees } from "../tree/compare.js"
import { buildText } from "../tree/builders.js"
import type { TreeDelta, TreeOperation } from "../tree/delta.js"
import { findNode } from "../tree/navigation.js"
import { withRoot } from "../tree/tree.js"

import { memoryTreeStore } from "./memory.js"
import { auditSnapshot, replayTree } from "./replay.js"
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
