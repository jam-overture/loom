import {
  composeTreeForContext,
  describeComposeError,
  type AudienceOverlay,
} from "../audience/compose.js"
import type { TreeId } from "../ids.js"
import { err, ok, type Result } from "../result.js"
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

/**
 * Where a deployment's audience rules and audience-scoped deltas come from.
 *
 * A seam rather than a table, and deliberately: 0263's store dimension is a
 * schema change on top of 0260's, and the composition above it needs none of
 * that to be built or tested. A deployment holding its forms in a module
 * satisfies this; so will the store, once the dimension lands.
 *
 * Keyed by tree because that is what a request names, and answered whole
 * because both halves are cacheable beside the base (0263 clause 3).
 */
export interface AudienceOverlaySource {
  readonly load: (treeId: TreeId) => Promise<Result<AudienceOverlay, TreeSourceError>>
}

/**
 * The composing sibling of `treeSourceFromStore` — one tree per id stays the
 * right answer for a deployment that wants it, so this is a second function
 * rather than an option on the first (0263).
 *
 * Two reads and a pure composition: the base from the store, the overlay from
 * wherever a deployment keeps it, and `composeTreeForContext` over the
 * request's own context. Nothing about the reader leaves the process (0262).
 *
 * **A composition that cannot be served reads as `unavailable`**, with the
 * reason in `detail`. The code is not widened to say *stale form* because
 * `TreeSourceError` is published and exhaustively switched on by hosts, and
 * what a caller does about it is what it does about any other page it cannot
 * have — the sentence that says which audience and which revision is the part
 * somebody acts on, and that is in `detail`.
 */
export const composingTreeSourceFromStore = (
  store: TreeReader,
  overlays: AudienceOverlaySource
): TreeSource => ({
  load: async (request: RenderRequest): Promise<Result<unknown, TreeSourceError>> => {
    const base = await store.head(request.treeId)

    if (!base.ok) {
      return err({
        code: base.error.code === "not-found" ? "not-found" : "unavailable",
        detail: describeStoreError(base.error),
      })
    }

    const overlay = await overlays.load(request.treeId)
    if (!overlay.ok) return overlay

    const composed = composeTreeForContext(base.value, overlay.value, request.context)

    return composed.ok
      ? ok(composed.value.tree)
      : err({ code: "unavailable", detail: describeComposeError(composed.error) })
  },
})
