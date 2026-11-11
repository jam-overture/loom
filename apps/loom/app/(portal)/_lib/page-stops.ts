import type { LoomTree } from "@jam-overture/loom"
import {
  largestUnreachedIn,
  pageFrontierOf,
  readReaderWindow,
  treesIn,
  unreachedWordsIn,
  windowReadingsOf,
  type PageReading,
  type PartDeclarations,
  type ReaderWindowSources,
} from "@jam-overture/loom/signals"

import type { NamedPart } from "./by-page"
import { namesInTree } from "./part-name"

/**
 * **Where readers stopped** on one page, for the *By page* drawer (8a of
 * `docs/portal.md`; the maintainer's yes of 11 November on #849).
 *
 * Read from `pageFrontierOf` (0374) rather than from the reading's `skipped`
 * count, because forty skipped parts are usually one skipped band and the
 * forty below it: a page drawn with *forty parts unread* has one place to fix.
 * The frontier is every place reading stopped, each with the parts it
 * accounts for, and those add up to the parts nobody reached exactly once.
 *
 * It is a reading of **the version the site last published, since that
 * version was first counted**: the window is asked for that tree at that
 * revision alone, so every part it names is a part of the page the site
 * serves. The counters behind it keep no time, so it is not a figure for the
 * range the screen is read over, and the drawer says so.
 *
 * **Four answers are refusals rather than readings**, each a sentence a person
 * can act on, and none drawn as a nought:
 *
 * - the site has not published the page, so there is no tree to read the
 *   counters against;
 * - the counters did not answer within the portal's budget;
 * - the page is served in more than one form (0263), so its readers are two
 *   populations, and where *they* stopped is no one place;
 * - the counters name parts this version does not hold, which is a tree and a
 *   window that do not belong together, and the one case where the reading
 *   looks most plausible while being wrong (`PageFrontier.orphaned`). This is
 *   checked before anything else is said.
 *
 * Parts that reported nothing while a part inside them reported reach are
 * kept apart from the places readers stopped: they are a part not saying it
 * was on screen, not a reader going no further (`PageFrontier.notReporting`).
 */

/** How many of the places that cost the most the drawer names. */
export const COSTLIEST_SHOWN = 3

/** One place reading stopped, and how many parts of the page it accounts for, itself included. */
export type StoppedAt = NamedPart & { readonly unseen: number }

export type PageStops =
  | { readonly kind: "unpublished" }
  | { readonly kind: "unreadable" }
  | { readonly kind: "two-forms" }
  | { readonly kind: "mismatched"; readonly orphaned: number }
  | { readonly kind: "unopened"; readonly version: number }
  | {
      readonly kind: "read"
      readonly version: number
      /** The floor on page views the reading was drawn from. */
      readonly views: number
      /** Every part of the version. */
      readonly parts: number
      /** Parts no page view reported reaching. */
      readonly unseen: number
      /** How many places reading stopped. */
      readonly places: number
      /** The places that cost the page the most, largest first, at most {@link COSTLIEST_SHOWN}. */
      readonly costliest: readonly StoppedAt[]
      /** The words nobody reached, in reading order, one passage per entry. */
      readonly words: readonly string[]
      /** Parts that were on a reader's screen and did not say so. */
      readonly notReporting: readonly NamedPart[]
    }

/** The page's readings of one version as where readers stopped, or why it cannot be said. Pure. */
export const pageStopsOf = (readings: readonly PageReading[], tree: LoomTree): PageStops => {
  if (readings.length > 1) return { kind: "two-forms" }

  const [reading] = readings

  if (reading === undefined) return { kind: "unopened", version: tree.revision }

  const frontier = pageFrontierOf(reading)

  if (frontier.orphaned > 0) return { kind: "mismatched", orphaned: frontier.orphaned }
  if (frontier.views === 0) return { kind: "unopened", version: tree.revision }

  const names = namesInTree(tree)
  const named = (nodeId: string): NamedPart => ({ nodeId, name: names.get(nodeId)?.name })

  return {
    kind: "read",
    version: frontier.revision,
    views: frontier.views,
    parts: frontier.parts,
    unseen: frontier.unseen,
    places: frontier.frontier.length,
    costliest: largestUnreachedIn(frontier, COSTLIEST_SHOWN).map((part) => ({
      ...named(part.nodeId),
      unseen: part.unseen,
    })),
    words: unreachedWordsIn(frontier),
    notReporting: frontier.notReporting.map(named),
  }
}

/**
 * Read where readers stopped on the version of a page the site last published.
 *
 * `undefined` for a page the site has not published. The window is asked for
 * that one revision, so nothing about another version is read.
 */
export const readPageStops = async (
  sources: ReaderWindowSources,
  declarations: PartDeclarations,
  tree: LoomTree | undefined
): Promise<PageStops> => {
  if (tree === undefined) return { kind: "unpublished" }

  const window = await readReaderWindow(sources, { treeId: tree.treeId, revision: tree.revision })

  if (!window.ok) return { kind: "unreadable" }

  return pageStopsOf(windowReadingsOf(window.value, treesIn([tree]), declarations).pages, tree)
}

/** How many words the passages hold, counted the way a person would. */
export const wordCountOf = (passages: readonly string[]): number =>
  passages.reduce((total, passage) => total + passage.split(/\s+/).filter(Boolean).length, 0)
