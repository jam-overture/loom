/**
 * Which of your pages a listing is showing, and the one the data can answer.
 *
 * The prototype at `/portal/preview` offers four entries under `Pages`: all of
 * them, the front door, the ones waiting on you, and the ones changed recently.
 * Two of those four are not portable as drawn, and saying which is the whole of
 * this module.
 *
 * **`waiting` is free.** `/portal/pages` already reads a hold listing per page
 * to put a count on each card, so filtering to the pages with a count costs no
 * read at all — it is a decision about rows this screen is already holding.
 *
 * **`changed` cannot be computed.** `TreeListing` is `{ treeId, revision }` and
 * nothing else; a revision number is a count of what has happened to *one*
 * page, so it does not compare across two. Ordering by it would put a page
 * edited nine times last March above one edited twice this morning. Filed for
 * the framework lane rather than guessed at here.
 *
 * **The front door is a bookmark**, not a filter, and the rail already refuses
 * those: *"a rail entry carrying a particular tree would be a bookmark rather
 * than a destination"*.
 */

/** The parameter the rail and the screen agree on. */
export const PAGE_FILTER_KEY = "filter"

export type PageFilter = "waiting"

/**
 * What a filter is called where a person can read it.
 *
 * Beside the reading rather than in the screen, so the rail's label and the
 * sentence the screen prints when the filter is on cannot come apart — they are
 * the same claim about what is being shown.
 */
export const PAGE_FILTER_NAME: Readonly<Record<PageFilter, string>> = {
  waiting: "Waiting on you",
}

/**
 * The filter somebody asked for, or nothing.
 *
 * Anything unrecognised reads as no filter rather than as an error. A query
 * string is whatever was typed or whatever a stale link carries, and the honest
 * answer to `?filter=nonsense` is the whole list — a listing that refused to
 * draw itself over an unreadable parameter would be a screen lost to a typo.
 */
export const readPageFilter = (value: unknown): PageFilter | undefined =>
  value === "waiting" ? "waiting" : undefined

/** Whether a row survives the filter. `undefined` keeps everything. */
export const keptBy = (
  filter: PageFilter | undefined,
  page: { readonly waiting: number | null; readonly unreadable: number }
): boolean => filter === undefined || (page.waiting ?? 0) + page.unreadable > 0
