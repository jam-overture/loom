import {
  composeTreeForContext,
  describeComposeError,
  type AudienceOverlay,
} from "../audience/compose.js"
import {
  describeAudienceOverlayError,
  type AudienceOverlayReader,
} from "../audience/overlay-store.js"
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

/**
 * The store, as the composition's `AudienceOverlaySource`.
 *
 * The seam 0359 clause 6 declared instead of a table now has the table under
 * it, and this is the one function that joins them. It is the audience
 * dimension's `treeSourceFromStore`: two reads above it, a pure composition
 * beside it, and nothing about the reader leaving the process (0262).
 *
 * **A page with no rules is an empty overlay and not a failure**, which is what
 * the store answers and what `composeTreeForContext` serves the base for. So
 * wiring the composing source into a deployment that has never defined an
 * audience changes nothing about what it serves — the property 0359 promised
 * and the one this adapter must not quietly break.
 *
 * `unreadable` and `out-of-date` both read as `unavailable` here for the reason
 * the composition's own errors do: `TreeSourceError` is published and
 * exhaustively switched on by hosts, what a caller does about a page it cannot
 * have does not change with the reason, and the sentence somebody acts on is in
 * `detail`.
 */
export const audienceOverlaySourceFromStore = (
  overlays: AudienceOverlayReader
): AudienceOverlaySource => ({
  load: async (treeId: TreeId): Promise<Result<AudienceOverlay, TreeSourceError>> => {
    const overlay = await overlays.overlay(treeId)

    return overlay.ok
      ? overlay
      : err({ code: "unavailable", detail: describeAudienceOverlayError(overlay.error) })
  },
})
