import { describe, expect, it } from "vitest"

import { DEFAULT_AUDIENCE_ID } from "../audience/audience.js"
import { treeIdSchema, type TreeId } from "../ids.js"
import { OTHER_TREE, region, RIDERS, SKIERS, TREE } from "../testing/reader-signal-contract.js"

import {
  describeRegionPageStanding,
  REGION_PAGE_STANDINGS,
  regionPagesOf,
  type RegionPagesReading,
} from "./region-pages.js"
import { DEFAULT_REGION_FLOOR, UNKNOWN_REGION, type StoredRegionCount } from "./region.js"

const AT = "2026-10-29T00:00:00.000Z"
const THIRD_TREE = treeIdSchema.parse("t_third") as TreeId
const GB = region("GB")
const DE = region("DE")

const row = (over: Partial<StoredRegionCount> = {}): StoredRegionCount => ({
  audienceId: DEFAULT_AUDIENCE_ID,
  treeId: TREE,
  revision: 1,
  region: GB,
  views: 1,
  updatedAt: AT,
  ...over,
})

/** The floor a caller with nothing of its own to say passes. */
const atDefault = (rows: readonly StoredRegionCount[]): RegionPagesReading =>
  regionPagesOf(rows, { floor: DEFAULT_REGION_FLOOR })

const breakdownFor = (reading: RegionPagesReading, place: string) =>
  reading.regions.find(({ region: named }) => named === place)

describe("regionPagesOf", () => {
  it("names the pages a place's readers read, most-read first", () => {
    const reading = atDefault([
      row({ views: 60 }),
      row({ treeId: OTHER_TREE, views: 30 }),
      row({ treeId: THIRD_TREE, views: 40 }),
    ])

    expect(breakdownFor(reading, GB)?.pages.map(({ treeId, views }) => [treeId, views])).toEqual([
      [TREE, 60],
      [THIRD_TREE, 40],
      [OTHER_TREE, 30],
    ])
  })

  /**
   * Two pages with the same number of readers in one place would otherwise
   * swap places between two reads of the same rows, which reads as a change.
   */
  it("breaks a tie by tree id so a refresh does not reorder", () => {
    const reading = atDefault([row({ treeId: OTHER_TREE, views: 40 }), row({ views: 40 })])

    expect(breakdownFor(reading, GB)?.pages.map(({ treeId }) => treeId)).toEqual([
      TREE,
      OTHER_TREE,
    ])
  })

  it("shares each page against the whole bucket and not against the pages it named", () => {
    const reading = atDefault([row({ views: 75 }), row({ treeId: OTHER_TREE, views: 25 })])
    const breakdown = breakdownFor(reading, GB)

    expect(breakdown?.views).toBe(100)
    expect(breakdown?.pages.map(({ share }) => share)).toEqual([0.75, 0.25])
  })

  /**
   * The two candidate denominators differ only where something was withheld,
   * which is the case this subsystem is mostly in: dividing by the named pages
   * would make the shares sum to one and the withheld tenth vanish.
   */
  it("leaves the withheld part out of the shares rather than out of the denominator", () => {
    const reading = atDefault([
      row({ views: 60 }),
      row({ treeId: OTHER_TREE, views: 30 }),
      row({ treeId: THIRD_TREE, views: 10 }),
    ])
    const breakdown = breakdownFor(reading, GB)

    expect(breakdown?.pages.map(({ share }) => share)).toEqual([0.6, 0.3])
    expect(breakdown?.withheld).toEqual({ pages: 1, views: 10 })
    expect(
      breakdown?.pages.reduce((total, { share }) => total + (share ?? 0), 0)
    ).toBeCloseTo(0.9, 10)
  })

  /**
   * The point of the whole module: a place large enough to be a readership
   * breaks down into cells that are people, so the floor follows the question
   * down a level.
   */
  it("withholds a page whose own count in the place is under the floor", () => {
    const reading = atDefault([
      row({ views: 90 }),
      row({ treeId: OTHER_TREE, views: 7 }),
      row({ treeId: THIRD_TREE, views: 3 }),
    ])
    const breakdown = breakdownFor(reading, GB)

    expect(breakdown?.pages.map(({ treeId }) => treeId)).toEqual([TREE])
    expect(breakdown?.withheld).toEqual({ pages: 2, views: 10 })
    expect(breakdown?.standing).toBe("partly-attributed")
  })

  it("is attributed where every view in the place is on a named page", () => {
    const reading = atDefault([row({ views: 40 }), row({ treeId: OTHER_TREE, views: 30 })])
    const breakdown = breakdownFor(reading, GB)

    expect(breakdown?.withheld).toEqual({ pages: 0, views: 0 })
    expect(breakdown?.standing).toBe("attributed")
  })

  /**
   * The state a small deployment is mostly in, and the one a screen must not
   * draw as a place nobody read: the readership is in the map and only its
   * attribution is withheld.
   */
  it("is unattributable where a named place has no page above the floor", () => {
    const reading = atDefault([
      row({ views: 10 }),
      row({ treeId: OTHER_TREE, views: 10 }),
      row({ treeId: THIRD_TREE, views: 10 }),
    ])
    const breakdown = breakdownFor(reading, GB)

    expect(reading.map.regions).toEqual([{ region: GB, views: 30 }])
    expect(breakdown?.pages).toEqual([])
    expect(breakdown?.withheld).toEqual({ pages: 3, views: 30 })
    expect(breakdown?.standing).toBe("unattributable")
  })

  it("has no breakdown at all for a place the map withheld", () => {
    const reading = atDefault([row({ views: 100 }), row({ region: DE, views: 4 })])

    expect(reading.map.withheld).toEqual({ buckets: 1, views: 4 })
    expect(reading.regions.map(({ region: named }) => named)).toEqual([GB])
  })

  it("is in the map's order, so a surface draws the two side by side", () => {
    const reading = atDefault([
      row({ views: 30 }),
      row({ region: DE, views: 90 }),
      row({ region: UNKNOWN_REGION, views: 60 }),
    ])

    expect(reading.regions.map(({ region: named }) => named)).toEqual(
      reading.map.regions.map(({ region: named }) => named)
    )
    expect(reading.regions.map(({ region: named }) => named)).toEqual([DE, UNKNOWN_REGION, GB])
  })

  /**
   * The unplaced bucket names no place, so there is nobody in it to
   * re-identify — and a count of page views of one page is less than the door
   * already publishes exactly.
   */
  it("never withholds a cell of the unplaced bucket", () => {
    const reading = atDefault([
      row({ region: UNKNOWN_REGION, views: 2 }),
      row({ region: UNKNOWN_REGION, treeId: OTHER_TREE, views: 1 }),
    ])
    const breakdown = breakdownFor(reading, UNKNOWN_REGION)

    expect(breakdown?.pages.map(({ treeId, views }) => [treeId, views])).toEqual([
      [TREE, 2],
      [OTHER_TREE, 1],
    ])
    expect(breakdown?.withheld).toEqual({ pages: 0, views: 0 })
    expect(breakdown?.standing).toBe("attributed")
  })

  /** Reachable on the unplaced bucket alone, which is named at any size. */
  it("withholds a share where the bucket's own total is nought", () => {
    const reading = atDefault([row({ region: UNKNOWN_REGION, views: 0 })])
    const breakdown = breakdownFor(reading, UNKNOWN_REGION)

    expect(breakdown?.views).toBe(0)
    expect(breakdown?.pages).toEqual([{ treeId: TREE, views: 0, share: undefined }])
  })

  it("raises the floor a deployment asked for and ignores one below the runtime's", () => {
    const rows = [row({ views: 70 }), row({ treeId: OTHER_TREE, views: 30 })]

    expect(regionPagesOf(rows, { floor: 50 }).regions[0]?.withheld).toEqual({
      pages: 1,
      views: 30,
    })
    expect(regionPagesOf(rows, { floor: 1 }).regions[0]?.withheld).toEqual({
      pages: 0,
      views: 0,
    })
    expect(regionPagesOf(rows, { floor: 1 }).map.floor).toBe(DEFAULT_REGION_FLOOR)
  })

  it("holds the map rather than recounting it, so the totals cannot disagree", () => {
    const rows = [row({ views: 80 }), row({ region: DE, views: 2 })]
    const reading = regionPagesOf(rows, { floor: DEFAULT_REGION_FLOOR })

    expect(reading.map.views).toBe(82)
    expect(reading.map.audiences).toEqual([DEFAULT_AUDIENCE_ID])
    expect(reading.regions.map(({ views }) => views)).toEqual(
      reading.map.regions.map(({ views }) => views)
    )
  })

  it("groups the cells of a place that the rows name twice over", () => {
    const reading = atDefault([
      row({ region: DE, views: 40 }),
      row({ views: 30 }),
      row({ region: DE, treeId: OTHER_TREE, views: 30 }),
    ])

    expect(breakdownFor(reading, DE)?.pages.map(({ views }) => views)).toEqual([40, 30])
    expect(breakdownFor(reading, GB)?.pages.map(({ views }) => views)).toEqual([30])
  })

  it("answers nothing about nothing", () => {
    expect(atDefault([])).toEqual({
      map: {
        floor: DEFAULT_REGION_FLOOR,
        audienceId: null,
        audiences: [],
        regions: [],
        withheld: { buckets: 0, views: 0 },
        views: 0,
      },
      regions: [],
    })
  })
})

/**
 * A cell is a place and a page. Every other dimension on the rows is summed
 * into it, and a page that arrived on two rows must be named once — a page
 * named twice would publish a deployment reading more pages than it serves,
 * and a doubled cell cannot be undone once the raw window is gone.
 */
describe("the cell a page is counted in", () => {
  it("sums one page's revisions and names it once", () => {
    const reading = atDefault([
      row({ revision: 1, views: 18 }),
      row({ revision: 2, views: 12 }),
    ])
    const breakdown = breakdownFor(reading, GB)

    expect(breakdown?.pages).toEqual([{ treeId: TREE, views: 30, share: 1 }])
    expect(breakdown?.views).toBe(30)
  })

  /**
   * Arrivals are people and a reader who arrived arrived once, whichever form
   * they were served, so two forms of one page in one place are one page.
   */
  it("sums the forms one page was served in and names it once", () => {
    const reading = atDefault([
      row({ audienceId: SKIERS, views: 16 }),
      row({ audienceId: RIDERS, views: 14 }),
    ])
    const breakdown = breakdownFor(reading, GB)

    expect(breakdown?.pages).toEqual([{ treeId: TREE, views: 30, share: 1 }])
    expect(reading.map.audiences).toEqual([RIDERS, SKIERS])
  })

  /**
   * Two forms of one page, each quiet enough to be withheld on its own and a
   * readership together. Flooring the forms apart would withhold both and
   * report a page nobody reads in a place that reads it.
   */
  it("clears the floor on the sum where neither form clears it alone", () => {
    const reading = atDefault([
      row({ audienceId: SKIERS, views: 15 }),
      row({ audienceId: RIDERS, views: 15 }),
      row({ treeId: OTHER_TREE, views: 70 }),
    ])

    expect(breakdownFor(reading, GB)?.pages.map(({ treeId, views }) => [treeId, views])).toEqual([
      [OTHER_TREE, 70],
      [TREE, 30],
    ])
  })

  /**
   * The one way a transpose could double-count on its own: a cell summed over
   * rows the bucket above it did not. The map sums whatever it is handed
   * (`regionReadingOf`), so a caller that concatenated two reads of the store
   * doubles a bucket — and the cells must double with it rather than beside it,
   * or the breakdown would claim a share of a total it does not belong to.
   */
  it("doubles exactly with the bucket when a row is handed in twice", () => {
    const once = atDefault([row({ views: 60 }), row({ treeId: OTHER_TREE, views: 40 })])
    const twice = atDefault([
      row({ views: 60 }),
      row({ treeId: OTHER_TREE, views: 40 }),
      row({ views: 60 }),
      row({ treeId: OTHER_TREE, views: 40 }),
    ])

    expect(twice.map.views).toBe(200)
    expect(breakdownFor(twice, GB)?.pages.map(({ views }) => views)).toEqual([120, 80])
    expect(breakdownFor(twice, GB)?.pages.map(({ share }) => share)).toEqual(
      breakdownFor(once, GB)?.pages.map(({ share }) => share)
    )
  })

  /**
   * The invariant that makes the whole reading safe to add up: a breakdown
   * loses no view and invents none, at either level.
   */
  it("accounts for every view, named or withheld, at both levels", () => {
    const reading = atDefault([
      row({ views: 90 }),
      row({ treeId: OTHER_TREE, views: 9 }),
      row({ region: DE, views: 26 }),
      row({ region: DE, treeId: THIRD_TREE, views: 24 }),
      row({ region: region("FR"), views: 3 }),
      row({ region: UNKNOWN_REGION, views: 7 }),
    ])

    for (const breakdown of reading.regions) {
      const named = breakdown.pages.reduce((total, { views }) => total + views, 0)

      expect(named + breakdown.withheld.views).toBe(breakdown.views)
    }

    const buckets = reading.regions.reduce((total, { views }) => total + views, 0)

    expect(buckets + reading.map.withheld.views).toBe(reading.map.views)
    expect(reading.map.views).toBe(159)
  })

  /**
   * A deployment with one page has a transpose that repeats its map, which is
   * not a leak: it is the same number read the other way.
   */
  it("repeats the map on a deployment that serves one page", () => {
    const reading = atDefault([row({ region: DE, views: 40 }), row({ views: 30 })])

    expect(reading.regions.map(({ region: named, pages }) => [named, pages.length])).toEqual([
      [DE, 1],
      [GB, 1],
    ])
    expect(reading.regions.every(({ standing }) => standing === "attributed")).toBe(true)
  })
})

describe("the standings a breakdown publishes", () => {
  it("has a line for every member and no member without one", () => {
    expect(REGION_PAGE_STANDINGS).toEqual(["attributed", "partly-attributed", "unattributable"])
    expect(REGION_PAGE_STANDINGS.map(describeRegionPageStanding).every(Boolean)).toBe(true)
  })

  it("says of the unattributable one that the readership is reported", () => {
    expect(describeRegionPageStanding("unattributable")).toContain("readership is reported")
  })
})
