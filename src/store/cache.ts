/**
 * Serving a stored page without reading its row every time, and being told the
 * moment the row moves.
 *
 * A page the store governs costs one read per reader. A cache over that read is
 * only honest if something clears it when the log grows, because the
 * alternative — a window, a short interval, a build-time copy — serves a
 * revision somebody has already replaced and calls it current. These are the
 * two halves of being told instead: a read-through wrapper over `head`, an
 * invalidating wrapper over `append`, and one tag both derive the same way so
 * that neither can be wrong about which entry belongs to which tree.
 *
 * Neither half knows what the cache is. A host hands in a read-through and a
 * way to invalidate a tag; what sits behind them is its own business, which is
 * what keeps this module free of any framework.
 */

import type { TreeId } from "../ids.js"
import { err, ok, type Result } from "../result.js"
import { parseTree, type LoomTree } from "../tree/tree.js"

import type { StoreError } from "./errors.js"
import type { TreeStore } from "./store.js"

/**
 * The tag a cached reading of one tree carries.
 *
 * Derived rather than written down, because the reader and the writer are in
 * different places — on this deployment a public page and a portal action, and
 * on a host's they may be two applications — and a tag spelled twice is a cache
 * that stops being cleared the day one of the two spellings is edited.
 */
export const treeCacheTag = (treeId: TreeId): string => `loom-tree:${treeId}`

/**
 * Where a host's cache is reached, and the one obligation on it.
 *
 * `load` produces the value to remember, under `key`, filed against `tags`. A
 * host is free to answer from a previous call with the same `key`, and is
 * expected to drop every entry carrying a tag it is told to invalidate.
 *
 * **A rejecting `load` must not be remembered.** Rejection is the only way this
 * seam can say *do not keep this one*, and it is the only signal a read-through
 * cache is able to honour: by the time there is a value to judge, the cache has
 * been asked for it and a `put` it could decline does not exist. So a read that
 * the store refused is raised rather than returned, and the wrapper below turns
 * it back into the refusal the caller is owed.
 */
export interface TreeCache {
  readonly readThrough: (
    key: readonly string[],
    tags: readonly string[],
    load: () => Promise<unknown>
  ) => Promise<unknown>
}

const REFUSAL = Symbol("loom.store.cache.refusal")

type RaisedRefusal = { readonly [REFUSAL]: StoreError }

const raise = (error: StoreError): RaisedRefusal => ({ [REFUSAL]: error })

const raisedRefusal = (cause: unknown): StoreError | undefined =>
  typeof cause === "object" && cause !== null && REFUSAL in cause
    ? (cause as RaisedRefusal)[REFUSAL]
    : undefined

/**
 * A tree that came back from the cache is `unknown` until it is parsed, and it
 * is refused in the same words a stored tree that will not parse is refused.
 *
 * The honesty matters more than it looks. A cached value has been somewhere —
 * at minimum through JSON, possibly through another process — so a wrapper that
 * asserted the type would be the one place in this package where a `LoomTree`
 * is a claim rather than a parse. The taxonomy is not new either: the Postgres
 * store already answers `unavailable` for a row it cannot read back, and a
 * screen that draws one draws the other.
 */
const revived = (treeId: TreeId, cached: unknown): Result<LoomTree, StoreError> => {
  const parsed = parseTree(cached)

  return parsed.ok
    ? ok(parsed.value)
    : err<StoreError>({
        code: "unavailable",
        detail: `cached tree ${treeId} did not parse: ${parsed.error.code}`,
      })
}

const unexpected = (treeId: TreeId, cause: unknown): StoreError => ({
  code: "unavailable",
  detail: `reading cached tree ${treeId} threw: ${cause instanceof Error ? cause.message : String(cause)}`,
})

/**
 * A handle whose `head` is answered from a cache, and whose other reads are not.
 *
 * ## Why `head` alone
 *
 * It is the read a visitor waits for. A page the store governs is one `head`
 * and a render, so on a surface that serves pages this is the whole of what a
 * cache can recover — and the cost of being wrong about it is bounded by the
 * invalidation below, which is keyed by exactly the tree a `head` names.
 *
 * `revisions` is a history screen, where a reader is asking what happened and
 * is owed the answer as it is now. `list` is the one that could not be cached
 * correctly even if it were worth it: it spans trees, so no tag derived from a
 * tree id can clear it, and a page list that keeps a page somebody has since
 * added is a worse screen than a slow one.
 *
 * ## Writes pass through
 *
 * `create` and `append` are forwarded untouched. Invalidation is a separate
 * wrapper because the two compose in either order and over different handles:
 * on this deployment the writing handle is not the handle a page is read
 * through, and a store that cached its own writes away would still have to be
 * told about everybody else's.
 */
export const cachingTreeStore = (store: TreeStore, cache: TreeCache): TreeStore => ({
  create: (tree) => store.create(tree),
  append: (treeId, request) => store.append(treeId, request),
  revisions: (treeId, request) => store.revisions(treeId, request),
  list: (request) => store.list(request),
  head: async (treeId) => {
    const load = async (): Promise<LoomTree> => {
      const read = await store.head(treeId)

      if (!read.ok) throw raise(read.error)

      return read.value
    }

    try {
      return revived(treeId, await cache.readThrough([treeId], [treeCacheTag(treeId)], load))
    } catch (cause) {
      return err(raisedRefusal(cause) ?? unexpected(treeId, cause))
    }
  },
})

/**
 * A handle that tells a cache the log grew, every time it does.
 *
 * ## Why here rather than on the event stream
 *
 * The runtime narrates a commit, and a host could listen for it. This sits on
 * the store instead, because what a cache has to track is not *a change was
 * accepted* but *this row is not what it was* — and the second is true of every
 * append, including the ones that never went near a composition: a revert, a
 * reseed, a migration, a host's own script. Wrapping the store catches the
 * category; wrapping the runtime catches whichever members of it happen to be
 * proposed.
 *
 * ## `create` is not an invalidation
 *
 * Nothing cached can be wrong about a tree that has just come into existence,
 * because the wrapper above remembers only trees it was handed and a refusal is
 * never remembered. An absent page therefore stays absent for exactly as long
 * as it is absent, and the first reader after a seed reads the row.
 *
 * ## A cache that cannot be told does not lose a write
 *
 * `invalidate` is called after the append succeeded, and a throw from it is
 * contained. The write is already history by then: raising it would report a
 * durable change as a failure, and the caller would be entitled to retry
 * something that has already happened. What the containment costs is a stale
 * entry nobody is told about — so a host whose invalidation can fail should
 * make the failure visible on its own side, where there is something to say
 * about it.
 */
export const invalidatingTreeStore = (
  store: TreeStore,
  invalidate: (tag: string) => void
): TreeStore => ({
  create: (tree) => store.create(tree),
  head: (treeId) => store.head(treeId),
  revisions: (treeId, request) => store.revisions(treeId, request),
  list: (request) => store.list(request),
  append: async (treeId, request) => {
    const appended = await store.append(treeId, request)

    if (appended.ok) {
      try {
        invalidate(treeCacheTag(treeId))
      } catch {
        // Contained on purpose; the docblock above has the reason.
      }
    }

    return appended
  },
})
