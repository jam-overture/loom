import { err, ok, treeIdSchema, type Result, type TreeId } from "@jam-overture/loom"
import {
  describeAudienceOverlayError,
  type AudienceForm,
  type AudienceOverlay,
  type AudienceOverlayError,
  type AudienceOverlayReader,
  type AudienceRule,
} from "@jam-overture/loom/store"

import { readWithin, unavailable } from "@/app/_lib/app/bounded-store"

/**
 * One page's segment overlay as the read door needs it: the rules that sort
 * its readers, and the delta each of its segments earns (0371 clauses 4 and
 * 5).
 *
 * **Both halves come out of one read.** The door answered the rules alone
 * until piece 4, from the store's `rules`; forms arrive from the same store
 * and the two have to describe one moment, so they are taken together rather
 * than asked for one after the other. A site holding one pull's rules beside
 * another pull's forms would compose a page for a segment the rules no longer
 * name.
 */
export type PageOverlay = {
  readonly treeId: TreeId
  /** `undefined` where nobody has written rules for this page. */
  readonly rules: readonly AudienceRule[] | undefined
  readonly forms: readonly AudienceForm[]
}

/**
 * Every page's overlay, read at once and each within the screens' budget,
 * since a pull is a read and must answer even when a store is slow.
 *
 * **One page that cannot be read makes the whole reading unreadable**, rather
 * than a list missing that page's. The door must never answer pages beside an
 * overlay that leaves one out: the site would hold the answer as current and
 * serve that page's segments the base for as long as the store stayed down,
 * with their signals still naming them (0371 clause 4).
 */
export const readPageOverlays = async (
  reader: AudienceOverlayReader,
  pages: readonly TreeId[]
): Promise<Result<readonly PageOverlay[], { readonly detail: string }>> => {
  const read = await Promise.all(
    pages.map(async (treeId): Promise<Result<PageOverlay, { readonly detail: string }>> => {
      const parsed = treeIdSchema.safeParse(treeId)

      if (!parsed.success) return err({ detail: `${treeId} is not a page id` })

      const overlay = await readWithin<AudienceOverlay, AudienceOverlayError>(
        () => reader.overlay(parsed.data),
        unavailable
      )

      return overlay.ok
        ? ok({ treeId: parsed.data, rules: overlay.value.rules, forms: overlay.value.forms })
        : err({ detail: describeAudienceOverlayError(overlay.error) })
    })
  )

  const failed = read.find((outcome) => !outcome.ok)

  return failed === undefined || failed.ok
    ? ok(read.flatMap((outcome) => (outcome.ok ? [outcome.value] : [])))
    : failed
}
