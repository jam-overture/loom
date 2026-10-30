import { everyMemberOf } from "../closed-set.js"
import type { TreeId } from "../ids.js"

import {
  UNKNOWN_REGION,
  regionReadingOf,
  type ReaderRegion,
  type RegionBucket,
  type RegionReading,
  type StoredRegionCount,
} from "./region.js"

/**
 * Which of a deployment's pages the readers of one place opened.
 *
 * The region counter answers one question today and it is asked in one
 * direction: *where were the readers of this page*, and *where were the
 * readers of this deployment*. The rows hold more than that. A region row is a
 * place, a page, a revision and a count of the page views that began — so the
 * same rows, grouped the other way, answer *what do readers here read*, which
 * is the question an operator asks second and could not ask at all.
 *
 * Nothing is collected for it. No payload field, no header, no column and no
 * browser change: it is the eleventh thing taken out of the rows a deployment
 * already has rather than added to what it takes, and the counter it reads is
 * the exact one — a region view is counted once, at the moment a page view
 * began, so it adds across revisions and across forms without drifting
 * (0214).
 *
 * ## The floor applies to the cell, which is the whole of the design
 *
 * A region map withholds a bucket too small to be a readership. A breakdown of
 * that bucket by page is **finer than the bucket**, and the floor has to follow
 * it down: a country with four hundred views is a readership, and *one view of
 * the careers page from Iceland* inside it is a person. Publishing the
 * breakdown at the bucket's floor would hand back, one level down, exactly what
 * the floor exists to refuse.
 *
 * So a page is named inside a region only where **its own count in that
 * region** clears the floor, and what did not clear it is reported as a total
 * naming no page — the same bargain the map strikes one level up, so the
 * numbers still add to the views there were.
 *
 * Two consequences worth stating plainly, because both read as faults and
 * neither is one:
 *
 * - **Most of a small deployment's breakdown is withheld.** A thousand views
 *   over ten pages and twenty countries has almost no cell above twenty-five.
 *   {@link RegionPageStanding} `unattributable` is that state named, and it is
 *   *this place's readers cannot be attributed to a page* rather than *nobody
 *   read anything*, which is the sentence a screen must never print over it.
 * - **A region the map withheld has no breakdown at all.** The breakdowns are
 *   one per **named** bucket, in the map's own order, because naming a page
 *   inside an unnamed place would name the place.
 *
 * ## The unplaced bucket is broken down in full
 *
 * `unknown` is never withheld by the map, however small, because it names no
 * place and there is nobody in it to re-identify. The same argument reaches its
 * cells and so they are never withheld either: *two views of the pricing page
 * from somewhere we cannot name* is strictly less than the door already
 * publishes exactly, per revision, in `pageViews`.
 *
 * ## A cell is a place and a page, and never a revision or a form
 *
 * The cell sums every row of one page in one place — across the revisions the
 * window holds and across the forms the page was served in.
 *
 * Across revisions because the question is about the page: a page read by
 * thirty readers from one country over two revisions is a readership, and
 * splitting it would withhold both halves and report a page nobody reads.
 *
 * Across forms because arrivals are people and a reader who arrived arrived
 * once, whichever form they were served (0297). A page served in two forms has
 * two rows for one country and is **one** page in one place, so it is named
 * once — naming it twice would publish a deployment reading more pages than it
 * serves, which is the direction this subsystem has been bitten in before.
 *
 * ## The map is held rather than restated
 *
 * {@link RegionPagesReading.map} is {@link regionReadingOf} over the same rows,
 * unchanged. The totals a screen shows beside a breakdown are therefore the
 * same numbers by construction rather than by agreement — two spellings of one
 * rule that agree today is the fault this subsystem has been bitten by twice
 * (0218, 0235), and a transpose that recounted its own buckets would be the
 * third.
 *
 * ## The floor is asked for, not defaulted
 *
 * {@link RegionPagesOptions.floor} is required. The floor underneath is
 * raise-only, so a reading called with nothing suppresses at the smallest
 * bucket this runtime will ever name — and a deployment that raised its floor,
 * read by a surface that forgot to say so, would publish cells about real
 * people with nothing in the diff to show it (0322). A caller with nothing of
 * its own to say passes `DEFAULT_REGION_FLOOR` and has said so.
 *
 * Pure and linear in the rows, with no store, clock or DOM, and no import that
 * reaches a package.
 */

/** What a screen may say about one region's breakdown by page. */
export type RegionPageStanding =
  /** Every view in the bucket is on a page the breakdown names. */
  | "attributed"
  /** Some of the bucket's views are on named pages and the rest are withheld. */
  | "partly-attributed"
  /**
   * No page in this place cleared the floor, so the bucket's views are named
   * and nothing in it is attributed.
   *
   * The claim worth acting on, and the one that must not be drawn as a place
   * nobody read: the readers are in the map above, and it is the attribution
   * that is withheld rather than the readership that is absent.
   */
  | "unattributable"

/** The closed set, for a surface accounting for every breakdown it draws. */
export const REGION_PAGE_STANDINGS: readonly RegionPageStanding[] =
  everyMemberOf<RegionPageStanding>()(["attributed", "partly-attributed", "unattributable"])

/** One line per standing, for a surface saying what a breakdown is withholding. */
export const describeRegionPageStanding = (standing: RegionPageStanding): string => {
  switch (standing) {
    case "attributed":
      return "every page view from this place is on a page named below"
    case "partly-attributed":
      return "some page views from this place are on named pages and the rest are withheld"
    case "unattributable":
      return "no page from this place has enough readers to name, so the readership is reported and the attribution is not"
  }
}

/** One page the readers of a place opened. */
export type RegionPage = {
  readonly treeId: TreeId
  /**
   * Page views that began here, summed over the revisions and the forms the
   * rows named.
   */
  readonly views: number
  /**
   * This page's share of **the whole bucket**, including the views the
   * breakdown withheld.
   *
   * The denominator is published rather than left to be derived because the two
   * candidates differ and the obvious one is wrong: dividing by the named pages
   * alone makes the shares sum to one and hides the withheld part, so a place
   * whose attribution is mostly withheld would read as fully attributed.
   *
   * Absent only where the bucket's own total is nought, which is reachable on
   * the unplaced bucket alone — it is named at any size, so rows of no views
   * produce cells of no views and there is no quotient to take.
   */
  readonly share: number | undefined
}

/** One named region, with the pages its readers opened. */
export type RegionPageBreakdown = {
  readonly region: ReaderRegion
  /** The bucket's own total, which is the map's number unchanged. */
  readonly views: number
  /** Pages with enough readers in this place to name, most-read first. */
  readonly pages: readonly RegionPage[]
  /** What was too small to name here, as a total that names no page. */
  readonly withheld: {
    readonly pages: number
    readonly views: number
  }
  readonly standing: RegionPageStanding
}

/** What a breakdown is read at. */
export type RegionPagesOptions = {
  /**
   * The floor under a named cell, which is the deployment's and is required.
   *
   * Raised above `DEFAULT_REGION_FLOOR` and never lowered below it. A caller
   * with nothing of its own to say passes that constant.
   */
  readonly floor: number
}

/** A region map and, for each place it named, what the readers there read. */
export type RegionPagesReading = {
  /** The map itself, unchanged, so a breakdown's totals cannot disagree with it. */
  readonly map: RegionReading
  /**
   * One breakdown per named bucket, in the map's order, so a surface drawing
   * both reads them side by side.
   */
  readonly regions: readonly RegionPageBreakdown[]
}

/** Every row's page total within one place, keyed so two forms of a page are one page. */
const cellsIn = (
  rows: readonly StoredRegionCount[]
): ReadonlyMap<ReaderRegion, ReadonlyMap<TreeId, number>> => {
  const places = new Map<ReaderRegion, Map<TreeId, number>>()

  for (const row of rows) {
    const pages = places.get(row.region) ?? new Map<TreeId, number>()

    pages.set(row.treeId, (pages.get(row.treeId) ?? 0) + row.views)
    places.set(row.region, pages)
  }

  return places
}

const breakdownOf = (
  bucket: RegionBucket,
  cells: ReadonlyMap<TreeId, number>,
  floor: number
): RegionPageBreakdown => {
  const counted = [...cells].map(([treeId, views]) => ({ treeId, views }))
  const nameable = (cell: { readonly views: number }): boolean =>
    bucket.region === UNKNOWN_REGION || cell.views >= floor
  const named = counted.filter(nameable)
  const small = counted.filter((cell) => !nameable(cell))
  const withheld = small.reduce((total, cell) => total + cell.views, 0)

  return {
    region: bucket.region,
    views: bucket.views,
    /** Most-read first, and by tree id where two are equal, so a refresh does not reorder. */
    pages: named
      .sort((one, other) => other.views - one.views || one.treeId.localeCompare(other.treeId))
      .map(({ treeId, views }) => ({
        treeId,
        views,
        share: bucket.views === 0 ? undefined : views / bucket.views,
      })),
    withheld: { pages: small.length, views: withheld },
    standing:
      named.length === 0 ? "unattributable" : withheld === 0 ? "attributed" : "partly-attributed",
  }
}

/**
 * Rows from the store, read as a map and a breakdown of every place it named.
 *
 * Linear in the rows and in the places they name, with one pass to group the
 * cells and one per named bucket to floor them.
 */
export const regionPagesOf = (
  rows: readonly StoredRegionCount[],
  options: RegionPagesOptions
): RegionPagesReading => {
  const map = regionReadingOf(rows, options)
  const cells = cellsIn(rows)
  const none: ReadonlyMap<TreeId, number> = new Map()

  return {
    map,
    regions: map.regions.map((bucket) =>
      breakdownOf(bucket, cells.get(bucket.region) ?? none, map.floor)
    ),
  }
}
