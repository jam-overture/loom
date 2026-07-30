import type { TreeId } from "../ids.js"
import { err, ok } from "../result.js"
import { applyDelta } from "../tree/apply.js"
import type { LoomTree } from "../tree/tree.js"

import type { AppendRequest, StoredRevision, StoreError, TreeStore } from "./store.js"

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

export type MemoryTreeStore = TreeStore & {
  /** For tests and the dev portal: how many trees are held. */
  readonly size: () => number
}

export const memoryTreeStore = (): MemoryTreeStore => {
  const trees = new Map<string, Entry>()

  const entryOf = (treeId: TreeId): Entry | undefined => trees.get(treeId)

  return {
    size: () => trees.size,

    create: (tree) =>
      Promise.resolve(
        trees.has(tree.treeId)
          ? err<StoreError>({ code: "already-exists", treeId: tree.treeId })
          : (() => {
              trees.set(tree.treeId, { snapshot: tree, log: [] })

              return ok(tree)
            })()
      ),

    head: (treeId) => {
      const entry = entryOf(treeId)

      return Promise.resolve(
        entry ? ok(entry.snapshot) : err<StoreError>({ code: "not-found", treeId })
      )
    },

    history: (treeId) => {
      const entry = entryOf(treeId)

      return Promise.resolve(
        entry ? ok(entry.log) : err<StoreError>({ code: "not-found", treeId })
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
      }

      /** One write, so the log and the snapshot cannot be seen disagreeing. */
      trees.set(treeId, { snapshot: applied.value, log: [...entry.log, revision] })

      return Promise.resolve(ok(applied.value))
    },
  }
}
