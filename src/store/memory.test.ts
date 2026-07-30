import { describe, expect, it } from "vitest"

import { sequentialIdFactory, treeIdSchema, type ProposalId } from "../ids.js"
import { FIXED_INSTANT } from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"
import { buildElement } from "../tree/builders.js"
import type { TreeDelta } from "../tree/delta.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { memoryTreeStore } from "./memory.js"
import type { AppendRequest } from "./store.js"

const appendOf = (delta: TreeDelta, proposal = "p_1"): AppendRequest => ({
  proposalId: proposal as ProposalId,
  delta,
  provenance: {
    origin: "user-instruction",
    interpreter: "scripted",
    confidence: 0.9,
    interpretedAt: FIXED_INSTANT,
  },
  appliedAt: FIXED_INSTANT,
})

const removalOf = (tree: LoomTree, nodeId: string, baseRevision = tree.revision): TreeDelta => ({
  deltaId: sequentialIdFactory("s").deltaId(),
  treeId: tree.treeId,
  baseRevision,
  operations: [{ op: "remove", nodeId: nodeId as never }],
})

describe("memoryTreeStore", () => {
  it("stores a tree once and reads it back at revision 0 with an empty log", async () => {
    const { tree } = sampleTree()
    const store = memoryTreeStore()

    expect((await store.create(tree)).ok).toBe(true)
    expect(await store.head(tree.treeId)).toEqual({ ok: true, value: tree })
    expect(await store.history(tree.treeId)).toEqual({ ok: true, value: [] })
    expect(store.size()).toBe(1)
  })

  it("refuses to create the same tree twice", async () => {
    const { tree } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)

    expect(await store.create(tree)).toEqual({
      ok: false,
      error: { code: "already-exists", treeId: tree.treeId },
    })
  })

  it("distinguishes a tree it does not have from one with no history", async () => {
    const store = memoryTreeStore()
    const absent = treeIdSchema.parse("t_absent")

    expect(await store.head(absent)).toEqual({ ok: false, error: { code: "not-found", treeId: absent } })
    expect(await store.history(absent)).toEqual({
      ok: false,
      error: { code: "not-found", treeId: absent },
    })
  })

  it("advances the snapshot and appends to the log in one step", async () => {
    const { tree, ids } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)

    const appended = await store.append(tree.treeId, appendOf(removalOf(tree, ids.footer)))

    expect(appended.ok && appended.value.revision).toBe(1)

    const head = await store.head(tree.treeId)
    const log = await store.history(tree.treeId)

    expect(head.ok && head.value.revision).toBe(1)
    expect(log.ok && log.value).toHaveLength(1)
    expect(log.ok && log.value[0]?.revision).toBe(1)
    expect(log.ok && log.value[0]?.provenance.interpreter).toBe("scripted")
    expect(log.ok && log.value[0]?.appliedAt).toBe(FIXED_INSTANT)
  })

  /**
   * The whole of concurrency control: a second writer at the same base revision
   * is refused rather than applied to a tree it never saw.
   */
  it("refuses a delta whose base revision is not the head, and says which is which", async () => {
    const { tree, ids } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)
    await store.append(tree.treeId, appendOf(removalOf(tree, ids.footer)))

    const stale = await store.append(tree.treeId, appendOf(removalOf(tree, ids.header, 0)))

    expect(stale).toEqual({
      ok: false,
      error: { code: "revision-conflict", treeId: tree.treeId, expected: 0, found: 1 },
    })
  })

  it("reports a delta that does not apply as rejected, not as a conflict", async () => {
    const { tree } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)

    const missing = await store.append(tree.treeId, appendOf(removalOf(tree, "n_999")))

    expect(missing.ok).toBe(false)
    expect(missing.ok ? "" : missing.error.code).toBe("delta-rejected")
  })

  it("leaves the snapshot and the log untouched when an append is refused", async () => {
    const { tree } = sampleTree()
    const store = memoryTreeStore()
    await store.create(tree)

    await store.append(tree.treeId, appendOf(removalOf(tree, "n_999")))

    expect((await store.head(tree.treeId)).ok && (await store.head(tree.treeId))).toEqual({
      ok: true,
      value: tree,
    })
    expect(await store.history(tree.treeId)).toEqual({ ok: true, value: [] })
  })

  it("refuses to append to a tree it does not have", async () => {
    const { tree } = sampleTree()
    const store = memoryTreeStore()

    expect(await store.append(tree.treeId, appendOf(removalOf(tree, "n_1")))).toEqual({
      ok: false,
      error: { code: "not-found", treeId: tree.treeId },
    })
  })

  it("keeps trees separate", async () => {
    const store = memoryTreeStore()
    const first = sampleTree().tree
    const other = sequentialIdFactory("o")
    const second = createTree(buildElement(other, { type: "loom.page" }), other)

    await store.create(first)
    await store.create(second)

    expect(store.size()).toBe(2)
    expect((await store.head(second.treeId)).ok).toBe(true)
    expect(first.treeId).not.toBe(second.treeId)
  })
})
