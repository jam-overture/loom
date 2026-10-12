import { DEFAULT_PROJECT_ID, type StoreScope } from "../project/project.js"
import type { TreeId } from "../ids.js"
import { cursorPosition, pageEnds } from "../paging.js"
import { err, ok } from "../result.js"
import { applyDelta } from "../tree/apply.js"
import type { LoomTree } from "../tree/tree.js"

import type { StoreError } from "./errors.js"
import {
  anchorBound,
  anchorResumes,
  clampListingLimit,
  clampRevisionLimit,
  type AppendRequest,
  type ListRequest,
  type RevisionPage,
  type RevisionReadRequest,
  type StoredRevision,
  type TreeListing,
  type TreeListPage,
  type TreeStore,
} from "./store.js"

/**
 * A store in memory: the log, the snapshot, and the invariant that ties them.
 *
 * It is the reference implementation rather than a test double — the ordering
 * rules it enforces are the ones any backing store has to enforce, so writing
 * them once here is what a SQL or KV implementation will be checked against.
 * A real one differs in exactly one way: `append` must be a transaction, because
 * a log entry without its snapshot advance leaves the two disagreeing.
 */

type Entry = {
  readonly snapshot: LoomTree
  readonly log: readonly StoredRevision[]
}

export const memoryTreeStore = (scope: StoreScope = {}): TreeStore => {
  const project = scope.project ?? DEFAULT_PROJECT_ID
  /*
   * Keyed by project and tree even though a handle only ever sees one project,
   * so that this store means the same thing the Postgres one does: a tree id
   * is unique within a project and says nothing about any other. Without it a
   * test that built one handle and expected two projects would quietly get one.
   */
  const trees = new Map<string, Entry>()
  const keyOf = (treeId: TreeId): string => `${project}\u0000${treeId}`

  const entryOf = (treeId: TreeId): Entry | undefined => trees.get(keyOf(treeId))

  return {
    create: (tree) =>
      Promise.resolve(
        trees.has(keyOf(tree.treeId))
          ? err<StoreError>({ code: "already-exists", treeId: tree.treeId })
          : (() => {
              trees.set(keyOf(tree.treeId), { snapshot: tree, log: [] })

              return ok(tree)
            })()
      ),

    head: (treeId) => {
      const entry = entryOf(treeId)

      return Promise.resolve(
        entry ? ok(entry.snapshot) : err<StoreError>({ code: "not-found", treeId })
      )
    },

    revisions: (treeId, request?: RevisionReadRequest) => {
      const entry = entryOf(treeId)
      if (!entry) return Promise.resolve(err<StoreError>({ code: "not-found", treeId }))

      const limit = clampRevisionLimit(request?.limit)
      const direction = request?.direction ?? "newer"
      const at = request?.at

      /**
       * An anchor and a cursor arrive as the same exclusive bound, so the filter
       * below never learns which one it was reading — only `resumed` does, and
       * only because an anchor sits inside its own page.
       */
      const from = at === undefined ? cursorPosition(request?.cursor) : anchorBound(at, direction)

      const matching = entry.log.filter(
        (stored) =>
          from === undefined ||
          (direction === "older" ? stored.revision < from : stored.revision > from)
      )

      /**
       * `older` takes the page from the far end, which is a slice rather than a
       * reverse: the entries that come back are still in applied order, because
       * the contract says a page's order never depends on which end it came from.
       */
      const page = direction === "older" ? matching.slice(-limit) : matching.slice(0, limit)

      return Promise.resolve(
        ok<RevisionPage>({
          revisions: page,
          ...pageEnds(page.map((stored) => stored.revision), direction, {
            beyond: matching.length > page.length,
            resumed:
              at === undefined
                ? from !== undefined
                : anchorResumes(at, direction, entry.snapshot.revision),
          }),
        })
      )
    },

    /**
     * Keyset pagination over the ids in ascending order. A `Map` iterates in
     * insertion order, so the sort is not decoration — it is what makes this
     * implementation obey the ordering the contract promises, and what a store
     * with a real index would get from the index instead.
     */
    list: (request?: ListRequest) => {
      const limit = clampListingLimit(request?.limit)
      const cursor = request?.cursor

      /*
       * Over tree ids rather than over the map's keys, which now carry the
       * project in front of them. A cursor is opaque to whoever holds it, and
       * a key would make it opaque *and* project-specific — so a page token
       * from one handle, replayed against another, would silently return
       * nothing instead of failing. The ids are what the caller was given and
       * are what it gets back.
       */
      const ids = Array.from(trees.values())
        .map((entry) => entry.snapshot.treeId)
        .sort()
        .filter((treeId) => cursor === undefined || treeId > cursor)

      const page = ids.slice(0, limit)

      const listings: readonly TreeListing[] = page.flatMap((treeId) => {
        const entry = entryOf(treeId)

        return entry ? [{ treeId: entry.snapshot.treeId, revision: entry.snapshot.revision }] : []
      })

      const last = page.at(-1)

      return Promise.resolve(
        ok<TreeListPage>({
          trees: listings,
          cursor: last !== undefined && ids.length > page.length ? last : null,
        })
      )
    },

    append: (treeId: TreeId, request: AppendRequest) => {
      const entry = entryOf(treeId)
      if (!entry) return Promise.resolve(err<StoreError>({ code: "not-found", treeId }))

      /**
       * The base-revision check is the concurrency control, and it runs before
       * the apply rather than relying on it: `applyDelta` would also refuse a
       * stale delta, but it would report a tree error, and "someone else wrote
       * first" deserves to be distinguishable from "this delta is malformed".
       */
      if (request.delta.baseRevision !== entry.snapshot.revision) {
        return Promise.resolve(
          err<StoreError>({
            code: "revision-conflict",
            treeId,
            expected: request.delta.baseRevision,
            found: entry.snapshot.revision,
          })
        )
      }

      const applied = applyDelta(entry.snapshot, request.delta)
      if (!applied.ok) {
        return Promise.resolve(err<StoreError>({ code: "delta-rejected", treeId, error: applied.error }))
      }

      const revision: StoredRevision = {
        treeId,
        revision: applied.value.revision,
        proposalId: request.proposalId,
        delta: request.delta,
        provenance: request.provenance,
        appliedAt: request.appliedAt,
        /**
         * Omitted rather than stored as `undefined`, so an entry nobody had to
         * approve has no key at all — the same shape a Postgres row with a null
         * column parses back to.
         */
        ...(request.answeredBy === undefined ? {} : { answeredBy: request.answeredBy }),
      }

      /** One write, so the log and the snapshot cannot be seen disagreeing. */
      trees.set(keyOf(treeId), { snapshot: applied.value, log: [...entry.log, revision] })

      return Promise.resolve(ok(applied.value))
    },
  }
}
