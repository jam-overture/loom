import type { TreeId } from "@loom/runtime"
import type { RevisionReadRequest } from "@loom/runtime/store"

/**
 * Where a revision is, as a URL.
 *
 * A revision number is public and stable — it is the log entry's identity — so
 * anything holding one can link to the change it names without having read the
 * page it falls on. 0043 is what makes that reachable: the store can open a page
 * at a revision a caller names rather than only at an end.
 *
 * Written once here because both halves of the link have to agree. The page
 * builds row ids from `revisionAnchorId` and the credit builds fragments from
 * it; a fragment that did not match an id would scroll nowhere and say nothing.
 */

export const revisionAnchorId = (revision: number): string => `revision-${revision}`

export const revisionHref = (treeId: TreeId, revision: number): string =>
  `/history?tree=${encodeURIComponent(treeId)}&at=${revision}#${revisionAnchorId(revision)}`

/**
 * A revision out of a query string, or nothing.
 *
 * Deliberately strict. A revision is a whole number from 1 up, so `0`, `-2`,
 * `3.5` and `four` are all somebody's mistake rather than positions — and a
 * store asked to open at one would answer with a page nobody asked for. Better
 * to treat the parameter as absent and show the newest page, which is what
 * `/history` shows anyway when nobody names a position.
 */
export const parseRevisionParam = (value: string | undefined): number | undefined => {
  if (value === undefined || value.trim() === "") return undefined

  const revision = Number(value)

  return Number.isSafeInteger(revision) && revision >= 1 ? revision : undefined
}

/**
 * A step away from the page a reader is on, as the store names its ends.
 *
 * Mutually exclusive in the type for the reason `RevisionStart` is (0043): a
 * step is one direction, and a caller holding both has not decided which.
 */
export type HistoryStep =
  | { readonly older: string; readonly newer?: never }
  | { readonly newer: string; readonly older?: never }
  | { readonly older?: never; readonly newer?: never }

/**
 * Where a `/history` page is, as a URL.
 *
 * Every link out of the page comes from here, so the parameter names cannot
 * drift from the ones `historyRead` reads back. The step is the cursor the page
 * reported for the end being left by, passed back unread (0026).
 */
export const historyPageHref = (treeId: TreeId, step: HistoryStep = {}): string => {
  const scope = `tree=${encodeURIComponent(treeId)}`

  if (step.older !== undefined) return `/history?${scope}&older=${encodeURIComponent(step.older)}`
  if (step.newer !== undefined) return `/history?${scope}&newer=${encodeURIComponent(step.newer)}`

  return `/history?${scope}`
}

/**
 * How a `/history` read runs, given what the URL asked for.
 *
 * Three parameters, three kinds of thing, and they resolve rather than compete.
 * `at` is where a link *sent* the reader; `older` and `newer` are steps they
 * took after arriving. So a cursor wins whenever there is one — it is the more
 * recent instruction — and the anchor stays behind as the row to mark, which
 * quietly comes to nothing once they have paged past it.
 *
 * A cursor also carries the direction with it, because a cursor is only
 * meaningful in the direction the page that issued it was read: `newer` runs
 * forward from it, `older` back. Without a cursor the read takes the newest
 * page, which is the question a reader opening a log brings (0026).
 *
 * Both cursors at once cannot come from anything this page rendered, so it is a
 * hand-made URL and the honest options are to refuse it or to pick. It picks —
 * `newer` first, since that is the parameter somebody typing one would be
 * adding — and never sends the store two positions, which is the failure the
 * contract's own type exists to prevent.
 *
 * A pure function rather than a branch inside a Server Component, because this
 * is the part worth testing and that is the part that is not testable.
 */
export type HistoryParams = {
  readonly older: string | undefined
  readonly newer: string | undefined
  readonly at: number | undefined
}

export const historyRead = ({ older, newer, at }: HistoryParams): RevisionReadRequest => {
  if (newer !== undefined) return { direction: "newer", cursor: newer }
  if (older !== undefined) return { direction: "older", cursor: older }

  return at === undefined ? { direction: "older" } : { direction: "older", at }
}

/**
 * What to say when the revision a link named is not on the page.
 *
 * Three different facts wear the same appearance — a page that does not hold the
 * revision asked for — and a reader can act on only one of them. A log that
 * never reached the revision is a link that has aged; a reader who has since
 * paged away has left it behind, and which way they went says where it is. The
 * page would otherwise look exactly like an ordinary visit.
 */
export const describeStaleAnchor = (
  anchor: number,
  { older, newer }: Pick<HistoryParams, "older" | "newer">
): string => {
  const opening = `Nothing on this page is revision ${anchor}`

  if (newer !== undefined) return `${opening}, which is further back than this page.`
  if (older !== undefined) return `${opening}, which is further along than this page.`

  return `${opening} — this log has not reached it, or has not kept it.`
}
