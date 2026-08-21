import { describe, expect, it } from "vitest"

import { sequentialIdFactory, treeIdSchema, type NodeId, type ProposalId } from "../ids.js"
import type { Result } from "../result.js"
import type { StoreError } from "../store/errors.js"
import type { AppendRequest, RevisionPage, TreeStore } from "../store/store.js"
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
    authoredBy: "model",
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

/** A tree that exists and has never been changed — not the same as no tree. */
const EMPTY_LOG: RevisionPage = { revisions: [], older: null, newer: null }

export const treeNamed = (namespace: string): LoomTree => {
  const ids = sequentialIdFactory(namespace)

  return createTree(buildElement(ids, { type: "loom.page" }), ids)
}

/**
 * A delta that reconfigures one node, so a test can append as many as it likes
 * to the same tree. Removals run out of nodes; reconfiguring a title does not.
 */
const retitle = (tree: LoomTree, nodeId: NodeId, baseRevision: number, title: string): TreeDelta => ({
  deltaId: sequentialIdFactory("s").deltaId(),
  treeId: tree.treeId,
  baseRevision,
  operations: [{ op: "configure", nodeId, set: { title }, unset: [] }],
})

/** A tree with `count` entries in its log, appended one at a time from revision 0. */
const treeWithLog = async (store: TreeStore, count: number): Promise<LoomTree> => {
  const { tree, ids } = sampleTree()
  await store.create(tree)

  for (const revision of Array.from({ length: count }, (_, index) => index)) {
    await store.append(
      tree.treeId,
      appendOf(retitle(tree, ids.page, revision, `title ${revision + 1}`), `p_${revision + 1}`)
    )
  }

  return tree
}

const revisionNumbers = (page: Result<RevisionPage, StoreError>): readonly number[] =>
  page.ok ? page.value.revisions.map((stored) => stored.revision) : []

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
      expect(await store.revisions(tree.treeId)).toEqual({ ok: true, value: EMPTY_LOG })
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
      expect(await store.revisions(absent)).toEqual({
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
      const log = await store.revisions(tree.treeId)

      expect(head.ok && head.value.revision).toBe(1)
      expect(log.ok && log.value.revisions).toHaveLength(1)
      expect(log.ok && log.value.revisions[0]?.revision).toBe(1)
      expect(log.ok && log.value.revisions[0]?.provenance.interpreter).toBe("scripted")
      expect(log.ok && log.value.revisions[0]?.appliedAt).toBe(FIXED_INSTANT)
    })

    /**
     * Who allowed a change (0029). Both stores have to agree on the *absence* as well as the value: a
     * null column and an absent key must read back the same, or the two
     * implementations differ on what an unapproved change looks like.
     */
    it("keeps who allowed a change, and keeps it absent when nobody had to", async () => {
      const { tree, ids } = sampleTree()
      const store = await freshStore()
      await store.create(tree)

      await store.append(tree.treeId, appendOf(removalOf(tree, ids.footer)))
      await store.append(tree.treeId, {
        ...appendOf(removalOf(tree, ids.header, 1), "p_2"),
        answeredBy: "reviewer:ana",
      })

      const log = await store.revisions(tree.treeId)
      if (!log.ok) throw new Error("expected a log")

      expect(log.value.revisions.map((stored) => stored.answeredBy)).toEqual([
        undefined,
        "reviewer:ana",
      ])
      expect("answeredBy" in (log.value.revisions[0] ?? {})).toBe(false)
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

    /** The atomicity the store promises, asserted from the outside (0016). */
    it("leaves the snapshot and the log untouched when an append is refused", async () => {
      const { tree } = sampleTree()
      const store = await freshStore()
      await store.create(tree)

      await store.append(tree.treeId, appendOf(removalOf(tree, "n_999")))

      expect(await store.head(tree.treeId)).toEqual({ ok: true, value: tree })
      expect(await store.revisions(tree.treeId)).toEqual({ ok: true, value: EMPTY_LOG })
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

    /**
     * The log is read a page at a time, from either end (0026). These are the
     * same promises made about the telemetry journal (0025), asserted here for
     * the log because the two are separate contracts that happen to agree.
     */
    describe("revisions", () => {
      it("reads forward from the oldest entry by default", async () => {
        const store = await freshStore()
        const tree = await treeWithLog(store, 5)

        expect(revisionNumbers(await store.revisions(tree.treeId, { limit: 3 }))).toEqual([1, 2, 3])
      })

      it("reads the newest entries when asked for the older end", async () => {
        const store = await freshStore()
        const tree = await treeWithLog(store, 5)

        expect(
          revisionNumbers(await store.revisions(tree.treeId, { direction: "older", limit: 2 }))
        ).toEqual([4, 5])
      })

      /**
       * The whole reason a direction exists: a page taken from the newest end
       * still arrives in applied order, so `replayTree` and every reader can fold
       * it without knowing which end it came from.
       */
      it("returns a backwards page in applied order", async () => {
        const store = await freshStore()
        const tree = await treeWithLog(store, 4)

        const page = await store.revisions(tree.treeId, { direction: "older", limit: 3 })

        expect(revisionNumbers(page)).toEqual([2, 3, 4])
      })

      it("names both ends of a page, and only the ends that exist", async () => {
        const store = await freshStore()
        const tree = await treeWithLog(store, 3)

        const newest = await store.revisions(tree.treeId, { direction: "older", limit: 2 })
        expect(newest.ok && newest.value.older).toBe("2")
        expect(newest.ok && newest.value.newer).toBeNull()

        const oldest = await store.revisions(tree.treeId, { limit: 2 })
        expect(oldest.ok && oldest.value.older).toBeNull()
        expect(oldest.ok && oldest.value.newer).toBe("2")
      })

      it("walks a whole log backwards and reassembles it", async () => {
        const store = await freshStore()
        const tree = await treeWithLog(store, 5)

        const first = await store.revisions(tree.treeId, { direction: "older", limit: 2 })
        const firstCursor = first.ok ? first.value.older : null
        const second = await store.revisions(tree.treeId, {
          direction: "older",
          limit: 2,
          ...(firstCursor === null ? {} : { cursor: firstCursor }),
        })
        const secondCursor = second.ok ? second.value.older : null
        const third = await store.revisions(tree.treeId, {
          direction: "older",
          limit: 2,
          ...(secondCursor === null ? {} : { cursor: secondCursor }),
        })

        expect([
          ...revisionNumbers(third),
          ...revisionNumbers(second),
          ...revisionNumbers(first),
        ]).toEqual([1, 2, 3, 4, 5])
        expect(third.ok && third.value.older).toBeNull()
      })

      /** A resumed page names the end it came from, so paging is reversible. */
      it("names the newer end of a resumed backwards page", async () => {
        const store = await freshStore()
        const tree = await treeWithLog(store, 4)

        const first = await store.revisions(tree.treeId, { direction: "older", limit: 2 })
        const cursor = first.ok ? first.value.older : null
        const second = await store.revisions(tree.treeId, {
          direction: "older",
          limit: 2,
          ...(cursor === null ? {} : { cursor }),
        })

        expect(revisionNumbers(second)).toEqual([1, 2])
        expect(second.ok && second.value.newer).toBe("2")

        const back = await store.revisions(tree.treeId, {
          limit: 2,
          ...(second.ok && second.value.newer !== null ? { cursor: second.value.newer } : {}),
        })

        expect(revisionNumbers(back)).toEqual(revisionNumbers(first))
      })

      /**
       * Reversibility is not one step. A reader who has walked to the oldest end
       * of a long log walks back out of it the same way they came in, and every
       * page on the way has to name the end they are still moving toward — not
       * only the first one, which is the only case a single step ever exercises.
       */
      it("walks a whole log forwards again and reassembles it", async () => {
        const store = await freshStore()
        const tree = await treeWithLog(store, 5)

        const oldest = await store.revisions(tree.treeId, { direction: "newer", limit: 2 })
        const firstCursor = oldest.ok ? oldest.value.newer : null
        const second = await store.revisions(tree.treeId, {
          direction: "newer",
          limit: 2,
          ...(firstCursor === null ? {} : { cursor: firstCursor }),
        })
        const secondCursor = second.ok ? second.value.newer : null
        const third = await store.revisions(tree.treeId, {
          direction: "newer",
          limit: 2,
          ...(secondCursor === null ? {} : { cursor: secondCursor }),
        })

        expect([
          ...revisionNumbers(oldest),
          ...revisionNumbers(second),
          ...revisionNumbers(third),
        ]).toEqual([1, 2, 3, 4, 5])
        expect(third.ok && third.value.newer).toBeNull()
      })

      /**
       * A page reached by moving forwards has entries behind it by construction —
       * the cursor it resumed from came off one. A reader who steps forward and
       * then changes their mind must not find the way back missing.
       */
      it("names the older end of a resumed forwards page", async () => {
        const store = await freshStore()
        const tree = await treeWithLog(store, 4)

        const oldest = await store.revisions(tree.treeId, { direction: "newer", limit: 2 })
        const cursor = oldest.ok ? oldest.value.newer : null
        const forward = await store.revisions(tree.treeId, {
          direction: "newer",
          limit: 2,
          ...(cursor === null ? {} : { cursor }),
        })

        expect(revisionNumbers(forward)).toEqual([3, 4])
        expect(forward.ok && forward.value.older).toBe("3")

        const back = await store.revisions(tree.treeId, {
          direction: "older",
          limit: 2,
          ...(forward.ok && forward.value.older !== null ? { cursor: forward.value.older } : {}),
        })

        expect(revisionNumbers(back)).toEqual(revisionNumbers(oldest))
      })

      /**
       * The step a reader takes after arriving at a revision a link named. The
       * anchored page is not an end of the log, so it has entries on both sides,
       * and the cursor it reports for its newer end has to resume like any other.
       */
      it("steps forward from an anchored page", async () => {
        const store = await freshStore()
        const tree = await treeWithLog(store, 5)

        const anchored = await store.revisions(tree.treeId, {
          direction: "older",
          limit: 2,
          at: 3,
        })

        expect(revisionNumbers(anchored)).toEqual([2, 3])

        const cursor = anchored.ok ? anchored.value.newer : null
        expect(cursor).not.toBeNull()

        const forward = await store.revisions(tree.treeId, {
          direction: "newer",
          limit: 2,
          ...(cursor === null ? {} : { cursor }),
        })

        expect(revisionNumbers(forward)).toEqual([4, 5])
      })

      it("clamps a limit the caller should not get, rather than honouring it", async () => {
        const store = await freshStore()
        const tree = await treeWithLog(store, 3)

        expect(revisionNumbers(await store.revisions(tree.treeId, { limit: 0 }))).toHaveLength(1)
      })

      /**
       * A revision a caller names is a position it may open at (0043). The
       * property that distinguishes it from a cursor is inclusion: a reader sent
       * to revision 3 is there to read revision 3.
       */
      describe("opening at a named revision", () => {
        it("includes the revision it was pointed at, at the newest end", async () => {
          const store = await freshStore()
          const tree = await treeWithLog(store, 6)

          expect(
            revisionNumbers(await store.revisions(tree.treeId, { at: 4, direction: "older", limit: 3 }))
          ).toEqual([2, 3, 4])
        })

        it("includes it at the oldest end when reading forward", async () => {
          const store = await freshStore()
          const tree = await treeWithLog(store, 6)

          expect(revisionNumbers(await store.revisions(tree.treeId, { at: 4, limit: 3 }))).toEqual([
            4, 5, 6,
          ])
        })

        it("names the end the anchor leaves entries on", async () => {
          const store = await freshStore()
          const tree = await treeWithLog(store, 6)

          const page = await store.revisions(tree.treeId, { at: 4, direction: "older", limit: 2 })

          expect(revisionNumbers(page)).toEqual([3, 4])
          expect(page.ok && page.value.older).toBe("3")
          expect(page.ok && page.value.newer).toBe("4")
        })

        /**
         * The case a cursor cannot produce and an anchor can: the newest entry.
         * `resumed` is true for any cursor, because a cursor came from a page —
         * an anchor is inside its own page, so claiming a newer end here would
         * offer a reader a page that does not exist.
         */
        it("claims no newer end when pointed at the newest entry", async () => {
          const store = await freshStore()
          const tree = await treeWithLog(store, 3)

          const page = await store.revisions(tree.treeId, { at: 3, direction: "older", limit: 2 })

          expect(revisionNumbers(page)).toEqual([2, 3])
          expect(page.ok && page.value.newer).toBeNull()
        })

        it("claims no older end when pointed forward at the first entry", async () => {
          const store = await freshStore()
          const tree = await treeWithLog(store, 3)

          const page = await store.revisions(tree.treeId, { at: 1, limit: 2 })

          expect(revisionNumbers(page)).toEqual([1, 2])
          expect(page.ok && page.value.older).toBeNull()
        })

        /**
         * A revision no entry holds is a stale link, not a broken store. Reading
         * older from beyond the end is the newest page, and reading older from
         * before the start is empty — both are what the position means.
         */
        it("answers a revision the log does not hold with the entries on that side", async () => {
          const store = await freshStore()
          const tree = await treeWithLog(store, 3)

          const beyond = await store.revisions(tree.treeId, {
            at: 99,
            direction: "older",
            limit: 2,
          })
          expect(revisionNumbers(beyond)).toEqual([2, 3])
          expect(beyond.ok && beyond.value.newer).toBeNull()

          const before = await store.revisions(tree.treeId, { at: 0, direction: "older" })
          expect(revisionNumbers(before)).toEqual([])
        })

        /** The page a cursor would have produced, reached without holding one. */
        it("agrees with the cursor that names the same position", async () => {
          const store = await freshStore()
          const tree = await treeWithLog(store, 6)

          const anchored = await store.revisions(tree.treeId, {
            at: 4,
            direction: "older",
            limit: 2,
          })
          const cursored = await store.revisions(tree.treeId, {
            cursor: "5",
            direction: "older",
            limit: 2,
          })

          expect(revisionNumbers(anchored)).toEqual(revisionNumbers(cursored))
        })
      })

      it("keeps one tree's log out of another's", async () => {
        const store = await freshStore()
        const mine = await treeWithLog(store, 2)
        const other = treeNamed("o")
        await store.create(other)

        expect(revisionNumbers(await store.revisions(mine.treeId))).toEqual([1, 2])
        expect(revisionNumbers(await store.revisions(other.treeId))).toEqual([])
      })
    })
  })
}
