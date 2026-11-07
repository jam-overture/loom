/**
 * The live pages a customer's server holds, and the one question a render asks
 * of them.
 *
 * Loom is not in the render path (0262), so a page that an accepted change has
 * moved cannot be fetched while a reader waits for it. What the server does
 * instead is keep the project's live pages in its own process and draw from
 * what it holds — and this is that holding, as a value rather than as a mutable
 * cache. Every pull produces a new one; nothing here is edited in place, so a
 * render that has already read a page cannot have it changed underneath.
 *
 * **A page this does not hold is not an error.** `livePageOf` answers
 * `undefined`, and the caller renders the page as it was built. That is the
 * whole of the fallback a host has to write, and it is the same answer for a
 * server that has never pulled, a pull that failed, and a page the answer did
 * not name.
 */

import type { TreeId } from "../ids.js"
import type { LoomTree } from "../tree/tree.js"

/**
 * What a pull leaves behind: the pages, the tag that names them, and enough of
 * the last outcome to say whether the site is current.
 *
 * The tag and the pages travel together by construction. A pull that cannot be
 * read does not move either, so the tag always names the pages held beside it —
 * which is what makes it safe to send back as `If-None-Match`.
 */
export type LivePages = {
  /** The live pages, by the id of the page each one is. */
  readonly pages: ReadonlyMap<TreeId, LoomTree>
  /** The entity tag the door gave for exactly these pages, if it gave one. */
  readonly tag: string | undefined
  /** When the door last answered, whether it answered pages or `304`. */
  readonly pulledAt: number | undefined
  /** When these pages arrived, which is older than `pulledAt` after a `304`. */
  readonly freshAt: number | undefined
  /** Failed pulls since the last one the door answered. Zero while current. */
  readonly failures: number
}

/**
 * A server that has not pulled yet, which is every server at the moment it
 * starts.
 *
 * It renders every page as built, so a deployment whose pull is misconfigured
 * serves its site rather than an error — the property the pull exists to keep
 * (0358 clause 4) is true before the first pull as well as after a failed one.
 */
export const NO_LIVE_PAGES: LivePages = {
  pages: new Map(),
  tag: undefined,
  pulledAt: undefined,
  freshAt: undefined,
  failures: 0,
}

/**
 * The live page for this page id, or `undefined` to render the page as built.
 *
 * This is the only call a render path makes. Selection for an audience (0263)
 * happens after it, in the customer's process, against the tree this answers —
 * the pull carries no audience and the door refuses a request that names one.
 */
export const livePageOf = (held: LivePages, page: TreeId): LoomTree | undefined =>
  held.pages.get(page)

/** Every live page held, in the order the door answered them. */
export const livePagesHeld = (held: LivePages): readonly LoomTree[] => [...held.pages.values()]

/**
 * Whether the server is drawing on pages the door confirmed, rather than on
 * nothing.
 *
 * A site holding pages after ten failed pulls is still serving Loom's pages,
 * which is the behaviour clause 4 asks for and not a state worth hiding. What
 * `failures` is for is saying so out loud in a log; what this is for is the
 * simpler question of whether the door has ever been reached.
 */
export const isPulling = (held: LivePages): boolean => held.pulledAt !== undefined
