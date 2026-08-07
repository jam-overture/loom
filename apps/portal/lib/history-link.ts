import type { TreeId } from "@loom/runtime"
import type { RevisionStart } from "@loom/runtime/store"

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
 * Where a `/history` read starts, given what the URL asked for.
 *
 * The two parameters are not the same kind of thing, which is why they resolve
 * rather than compete. `at` is where a link *sent* the reader; `older` is a step
 * they took after arriving. So a cursor wins whenever there is one — it is the
 * more recent instruction — and the anchor stays behind as the row to mark,
 * which quietly comes to nothing once they have paged past it.
 *
 * The two positions are mutually exclusive in the store's own type (0043), so
 * the resolution has to happen somewhere; here is where it can be tested, which
 * a branch inside a Server Component is not.
 */
export const historyStart = (
  older: string | undefined,
  anchor: number | undefined
): RevisionStart => {
  if (older !== undefined) return { cursor: older }

  return anchor === undefined ? {} : { at: anchor }
}
