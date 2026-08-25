import type { TreeId } from "@loom/runtime"
import { FIRST_REVISION, type RevisionReadRequest } from "@loom/runtime/store"

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
  `/portal/history?tree=${encodeURIComponent(treeId)}&at=${revision}#${revisionAnchorId(revision)}`

/**
 * Whether a revision names a log entry a reader can be sent to.
 *
 * A tree is created at revision 0 and no entry produces it — the log is dense
 * from 1 (0026) — so a link to revision 0 would open a page that cannot hold it
 * and explain that the log has not reached it. True, and useless. A tree nothing
 * has changed yet has nowhere to send anyone, and not offering the link is the
 * honest way to say so.
 *
 * The rule lives here, beside the href it guards, so a caller cannot build one
 * without it. `revisionHref` stays total on purpose: it answers where a revision
 * would be, and whether to go is a separate question with a separate answer.
 */
export const isReachableRevision = (revision: number): boolean => revision >= FIRST_REVISION

/**
 * What a URL said about the revision to open at.
 *
 * Three answers rather than two, and the third is the whole reason this changed.
 * An anchor used to arrive only from `revisionHref`, so a parameter that was not
 * a revision could only be a hand-edited URL, and treating it as absent was the
 * kindest reading available. A reader can now type one, and a typo is no longer
 * a hand-edited URL — it is the ordinary way this goes wrong. Collapsing "nobody
 * named a revision" and "somebody typed `elevn`" into the same answer would give
 * a person who just typed something the one response they cannot act on: the
 * page they would have got anyway, with nothing said.
 *
 * So the parse stays exactly as strict — a revision is a whole number from 1 up,
 * and `0`, `-2`, `3.5` and `four` are still not positions — and reports the
 * refusal instead of swallowing it.
 */
export type RevisionParam =
  | { readonly kind: "absent" }
  | { readonly kind: "malformed"; readonly typed: string }
  | { readonly kind: "named"; readonly revision: number }

/**
 * A typed value is echoed back to the reader who typed it, so its length is
 * bounded where it is parsed rather than trusted by every view that shows it.
 * A query string is as long as whoever wrote it liked.
 */
const TYPED_ECHO_LIMIT = 24

export const parseRevisionParam = (value: string | undefined): RevisionParam => {
  if (value === undefined || value.trim() === "") return { kind: "absent" }

  const typed = value.trim()
  const revision = Number(typed)

  if (Number.isSafeInteger(revision) && revision >= 1) return { kind: "named", revision }

  return { kind: "malformed", typed: typed.slice(0, TYPED_ECHO_LIMIT) }
}

/** The revision a parameter names, for the callers that only need the anchor. */
export const anchorOf = (param: RevisionParam): number | undefined =>
  param.kind === "named" ? param.revision : undefined

/**
 * What to show back in the box, given what the URL carried.
 *
 * The parsed value, never the raw parameter. A revision comes back as the number
 * it was read as, and a refused value as the bounded echo the parse kept — so a
 * page anyone can be linked to cannot be made to render an arbitrary string into
 * an input by whoever wrote the link.
 */
export const echoOf = (param: RevisionParam): string | undefined => {
  if (param.kind === "absent") return undefined

  return param.kind === "named" ? String(param.revision) : param.typed
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
 * Where a `/portal/history` page is, as a URL.
 *
 * Every link out of the page comes from here, so the parameter names cannot
 * drift from the ones `historyRead` reads back. The step is the cursor the page
 * reported for the end being left by, passed back unread (0026).
 */
export const historyPageHref = (treeId: TreeId, step: HistoryStep = {}): string => {
  const scope = `tree=${encodeURIComponent(treeId)}`

  if (step.older !== undefined) return `/portal/history?${scope}&older=${encodeURIComponent(step.older)}`
  if (step.newer !== undefined) return `/portal/history?${scope}&newer=${encodeURIComponent(step.newer)}`

  return `/portal/history?${scope}`
}

/**
 * How a `/portal/history` read runs, given what the URL asked for.
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
 * What the page was given, beyond the revision itself, in order to explain a
 * miss.
 *
 * `newestOnPage` is the log's head only when no cursor is in play — an anchored
 * read with no cursor runs `older` from the anchor, so the newest row it can
 * return is `min(anchor, head)`, and a miss means the head came back instead.
 * That is the only branch that reads it, and it is why the number is passed as
 * "newest on this page" rather than as "head": the page cannot honestly claim
 * the second, and a sentence that named a head it had not seen would be a guess
 * dressed as a fact.
 */
export type AnchorContext = Pick<HistoryParams, "older" | "newer"> & {
  /** Whether the named revision is among the rows this page is showing. */
  readonly onPage: boolean
  readonly newestOnPage: number | undefined
}

/**
 * What to say about the revision somebody named, when the page does not show it.
 *
 * Four different facts wear the same appearance — a page that is not showing the
 * revision asked for — and a reader can act on only one of them. A typed value
 * that is not a revision at all was refused before the store was ever asked; a
 * log that has not reached the revision is a number from the future; a reader
 * who has since paged away has left it behind, and which way they went says
 * where it is. Every one of them otherwise looks exactly like an ordinary visit.
 *
 * Silence is the answer in one case only, and it is the common one: the revision
 * is on the page, so the row marks itself and there is nothing to explain.
 */
export const describeAnchorMiss = (
  param: RevisionParam,
  { older, newer, onPage, newestOnPage }: AnchorContext
): string | undefined => {
  if (param.kind === "absent") return undefined

  if (param.kind === "malformed") {
    return `“${param.typed}” is not a revision — a revision is a whole number from 1 up — so these are the newest changes instead.`
  }

  if (onPage) return undefined

  /*
   * "This page" means two different things on this screen — the page whose
   * history is being read, and the batch of changes currently shown — and these
   * sentences used to say it of the second while the heading above them said it
   * of the first. So they say "these changes" instead, and never "log".
   */
  const opening = `Revision ${param.revision} isn’t among the changes shown here`

  if (newer !== undefined) return `${opening} — it is further back. Keep going back to reach it.`
  if (older !== undefined) return `${opening} — it is further along. Keep going forward to reach it.`

  if (newestOnPage === undefined) return `${opening}, because nothing has been changed on this page yet.`

  if (param.revision > newestOnPage) {
    return `${opening} — this page has only got as far as revision ${newestOnPage}.`
  }

  return `${opening}, and this deployment’s copy of the record does not reach back to it.`
}
