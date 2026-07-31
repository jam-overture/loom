import { describe, expect, it } from "vitest"

import { sequentialIdFactory, treeIdSchema, type ProposalId } from "../ids.js"
import type { AppendRequest, TreeStore } from "../store/store.js"
import { buildElement } from "../tree/builders.js"
import type { TreeDelta } from "../tree/delta.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { FIXED_INSTANT } from "./doubles.js"
import { sampleTree } from "./fixtures.js"

/**
 * One suite, run against every `TreeStore`.
 *
 * `memory.ts` has described itself as "the reference implementation ... what a
 * SQL or KV implementation will be checked against" since the day it was written.
 * That was a promise; this is what makes it true. A behavioural disagreement
 * between the in-memory store and Postgres is now a test failure rather than
 * something discovered in production.
 *
 * Only behaviour the *contract* promises belongs here. Anything specific to one
 * implementation — how it reports a connection failure, what it exposes beyond
 * the interface — stays in that implementation's own test file.
 */

export const appendOf = (delta: TreeDelta, proposal = "p_1"): AppendRequest => ({
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

export const removalOf = (
  tree: LoomTree,
  nodeId: string,
  baseRevision = tree.revision
): TreeDelta => ({
  deltaId: sequentialIdFactory("s").deltaId(),
  treeId: tree.treeId,
  baseRevision,
  operations: [{ op: "remove", nodeId: nodeId as never }],
})

export const treeNamed = (namespace: string): LoomTree => {
  const ids = sequentialIdFactory(namespace)

  return createTree(buildElement(ids, { type: "loom.page" }), ids)
}

/**
 * `makeStore` returns a store with nothing in it. Each test gets its own, so the
 * suite never depends on the order it runs in.
 */
export const describeTreeStoreContract = (
  name: string,
  makeStore: () => Promise<TreeStore> | TreeStore
): void => {
  const freshStore = async (): Promise<TreeStore> => await makeStore()

  describe(`${name} — TreeStore contract`, () => {
    it("stores a tree once and reads it back at revision 0 with an empty log", async () => {
      const { tree } = sampleTree()
      const store = await freshStore()

      expect((await store.create(tree)).ok).toBe(true)
      expect(await store.head(tree.treeId)).toEqual({ ok: true, value: tree })
      expect(await store.history(tree.treeId)).toEqual({ ok: true, value: [] })
    })

    it("refuses to create the same tree twice", async () => {
      const { tree } = sampleTree()
      const store = await freshStore()
      await store.create(tree)

      expect(await store.create(tree)).toEqual({
        ok: false,
        error: { code: "already-exists", treeId: tree.treeId },
      })
    })

    it("distinguishes a tree it does not have from one with no history", async () => {
      const store = await freshStore()
      const absent = treeIdSchema.parse("t_absent")

      expect(await store.head(absent)).toEqual({
        ok: false,
        error: { code: "not-found", treeId: absent },
      })
      expect(await store.history(absent)).toEqual({
        ok: false,
        error: { code: "not-found", treeId: absent },
      })
    })

    it("advances the snapshot and appends to the log in one step", async () => {
      const { tree, ids } = sampleTree()
      const store = await freshStore()
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

    /** The whole of concurrency control, stated once for every implementation. */
    it("refuses a delta whose base revision is not the head, and says which is which", async () => {
      const { tree, ids } = sampleTree()
      const store = await freshStore()
      await store.create(tree)
      await store.append(tree.treeId, appendOf(removalOf(tree, ids.footer)))

      expect(await store.append(tree.treeId, appendOf(removalOf(tree, ids.header, 0)))).toEqual({
        ok: false,
        error: { code: "revision-conflict", treeId: tree.treeId, expected: 0, found: 1 },
      })
    })

    it("reports a delta that does not apply as rejected, not as a conflict", async () => {
      const { tree } = sampleTree()
      const store = await freshStore()
      await store.create(tree)

      const missing = await store.append(tree.treeId, appendOf(removalOf(tree, "n_999")))

      expect(missing.ok).toBe(false)
      expect(missing.ok ? "" : missing.error.code).toBe("delta-rejected")
    })

    /** The atomicity 0016 requires, asserted from the outside. */
    it("leaves the snapshot and the log untouched when an append is refused", async () => {
      const { tree } = sampleTree()
      const store = await freshStore()
      await store.create(tree)

      await store.append(tree.treeId, appendOf(removalOf(tree, "n_999")))

      expect(await store.head(tree.treeId)).toEqual({ ok: true, value: tree })
      expect(await store.history(tree.treeId)).toEqual({ ok: true, value: [] })
    })

    it("refuses to append to a tree it does not have", async () => {
      const { tree } = sampleTree()
      const store = await freshStore()

      expect(await store.append(tree.treeId, appendOf(removalOf(tree, "n_1")))).toEqual({
        ok: false,
        error: { code: "not-found", treeId: tree.treeId },
      })
    })

    it("keeps trees separate", async () => {
      const store = await freshStore()
      const first = sampleTree().tree
      const second = treeNamed("o")

      await store.create(first)
      await store.create(second)

      expect((await store.head(second.treeId)).ok).toBe(true)
      expect((await store.head(first.treeId)).ok && first.treeId).not.toBe(second.treeId)
    })

    describe("list", () => {
      it("orders by tree id rather than by insertion", async () => {
        const store = await freshStore()
        for (const namespace of ["c", "a", "b"]) await store.create(treeNamed(namespace))

        const page = await store.list()

        expect(page.ok && page.value.trees.map((listing) => listing.treeId)).toEqual([
          "t_a1",
          "t_b1",
          "t_c1",
        ])
      })

      it("reports the revision, which is also the length of the log", async () => {
        const { tree, ids } = sampleTree()
        const store = await freshStore()
        await store.create(tree)
        await store.append(tree.treeId, appendOf(removalOf(tree, ids.footer)))

        expect((await store.list()).ok && (await store.list())).toEqual({
          ok: true,
          value: { trees: [{ treeId: tree.treeId, revision: 1 }], cursor: null },
        })
      })

      it("is empty with a null cursor when nothing is stored", async () => {
        const store = await freshStore()

        expect(await store.list()).toEqual({ ok: true, value: { trees: [], cursor: null } })
      })

      it("hands back a cursor only while there is another page", async () => {
        const store = await freshStore()
        for (const namespace of ["a", "b", "c"]) await store.create(treeNamed(namespace))

        const first = await store.list({ limit: 2 })

        expect(first.ok && first.value.trees.map((l) => l.treeId)).toEqual(["t_a1", "t_b1"])
        expect(first.ok && first.value.cursor).toBe("t_b1")

        const cursor = first.ok ? first.value.cursor : null
        const second = await store.list(cursor === null ? {} : { cursor })

        expect(second.ok && second.value.trees.map((l) => l.treeId)).toEqual(["t_c1"])
        expect(second.ok && second.value.cursor).toBeNull()
      })

      /** A page that exactly empties the store must not promise another one. */
      it("does not hand back a cursor when the page ends on the last tree", async () => {
        const store = await freshStore()
        for (const namespace of ["a", "b"]) await store.create(treeNamed(namespace))

        const page = await store.list({ limit: 2 })

        expect(page.ok && page.value.trees).toHaveLength(2)
        expect(page.ok && page.value.cursor).toBeNull()
      })

      /**
       * A cursor names a position, not a row. A tree deleted between two pages
       * must not strand the caller — keyset pagination gets this right and
       * offset pagination does not, which is why the cursor is a tree id.
       */
      it("resumes after a cursor that names no stored tree", async () => {
        const store = await freshStore()
        for (const namespace of ["a", "c"]) await store.create(treeNamed(namespace))

        const page = await store.list({ cursor: "t_b1" })

        expect(page.ok && page.value.trees.map((l) => l.treeId)).toEqual(["t_c1"])
      })

      it("clamps a limit the caller should not get, rather than honouring it", async () => {
        const store = await freshStore()
        for (const namespace of ["a", "b", "c"]) await store.create(treeNamed(namespace))

        const page = await store.list({ limit: 0 })

        expect(page.ok && page.value.trees).toHaveLength(1)
      })
    })
  })
}
