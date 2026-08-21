import { ok, type Result } from "../result.js"
import type { RenderRequest, TreeSource, TreeSourceError } from "../render/request.js"

import { describeStoreError } from "./errors.js"
import type { TreeReader } from "./store.js"

/**
 * The adapter that lets the renderer read from the store.
 *
 * One function, and it is the join between the part of Loom that keeps trees
 * and the part that draws them.
 */

/**
 * The store, as the renderer's `TreeSource`.
 *
 * §3 defined that seam and nothing implemented it, so §2 and §3 have until now
 * been connected only through fixtures. This is the join: a delta accepted by the
 * runtime is appended to the store, and the next request renders the snapshot the
 * append produced.
 *
 * `load` returns `unknown` on purpose (see `render/request.ts`) — the renderer
 * parses what it is handed rather than trusting a source's word about it. Handing
 * it an already-parsed `LoomTree` would satisfy the type and skip the check, so
 * this passes the snapshot through the same boundary any other source would.
 */
export const treeSourceFromStore = (store: TreeReader): TreeSource => ({
  load: async (request: RenderRequest): Promise<Result<unknown, TreeSourceError>> => {
    const head = await store.head(request.treeId)

    if (!head.ok) {
      return {
        ok: false,
        error: {
          code: head.error.code === "not-found" ? "not-found" : "unavailable",
          detail: describeStoreError(head.error),
        },
      }
    }

    return ok(head.value)
  },
})
