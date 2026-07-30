import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type ProposalId, type TreeId } from "../ids.js"
import { ok } from "../result.js"
import { FIXED_INSTANT } from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"
import type { TreeDelta } from "../tree/delta.js"
import { withRoot } from "../tree/tree.js"

import { memoryTreeStore } from "./memory.js"
import { auditSnapshot, replayTree } from "./replay.js"
import type { AppendRequest, StoredRevision, TreeReader } from "./store.js"

const provenance = {
  origin: "user-instruction",
  interpreter: "scripted",
  confidence: 0.9,
  interpretedAt: FIXED_INSTANT,
} as const

const appendOf = (delta: TreeDelta): AppendRequest => ({
  proposalId: "p_1" as ProposalId,
  delta,
  provenance,
  appliedAt: FIXED_INSTANT,
})

const removalOf = (treeId: TreeId, nodeId: string, baseRevision: number): TreeDelta => ({
  deltaId: sequentialIdFactory("r").deltaId(),
  treeId,
  baseRevision,
  operations: [{ op: "remove", nodeId: nodeId as never }],
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
    const log = await store.history(tree.treeId)
    if (!head.ok || !log.ok) throw new Error("expected the store to answer")

    const replayed = replayTree(tree, log.value)

    expect(replayed.ok && replayed.value).toEqual(head.value)
  })

  it("replays an empty log to the seed itself", () => {
    const { tree } = sampleTree()

    expect(replayTree(tree, [])).toEqual({ ok: true, value: tree })
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
      value: { outcome: "agrees", revision: 1 },
    })
  })

  it("agrees on a tree that has never been changed", async () => {
    const { tree } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)

    expect(await auditSnapshot(store, tree.treeId, tree)).toEqual({
      ok: true,
      value: { outcome: "agrees", revision: 0 },
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
      history: () => Promise.resolve(ok([entryOf(delta, 1)])),
    }

    const audit = await auditSnapshot(drifted, tree.treeId, tree)

    expect(audit.ok && audit.value.outcome).toBe("diverged")
    expect(audit.ok && audit.value.outcome === "diverged" && audit.value.revision).toBe(1)
  })

  it("reports an unreplayable log rather than pretending it agrees", async () => {
    const { tree, ids } = sampleTree()

    const gapped: TreeReader = {
      head: () => Promise.resolve(ok(tree)),
      history: () => Promise.resolve(ok([entryOf(removalOf(tree.treeId, ids.footer, 0), 5)])),
    }

    const audit = await auditSnapshot(gapped, tree.treeId, tree)

    expect(audit.ok && audit.value.outcome).toBe("unreplayable")
  })

  it("passes a store failure through rather than reporting agreement", async () => {
    const store = memoryTreeStore()
    const { tree } = sampleTree()

    const audit = await auditSnapshot(store, tree.treeId, tree)

    expect(audit.ok).toBe(false)
    expect(audit.ok ? "" : audit.error.code).toBe("not-found")
  })
})
