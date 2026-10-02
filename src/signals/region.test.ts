import { describe, expect, it } from "vitest"

import { batchOf, OTHER_TREE, region, TREE, viewed, viewKey } from "../testing/reader-signal-contract.js"

import {
  DEFAULT_REGION_FLOOR,
  readerRegionOf,
  regionCountsOf,
  regionFloorOf,
  regionReadingOf,
  UNKNOWN_REGION,
  type StoredRegionCount,
} from "./region.js"

const AT = "2026-10-02T00:00:00.000Z"

const row = (over: Partial<StoredRegionCount> = {}): StoredRegionCount => ({
  treeId: TREE,
  revision: 1,
  region: region("GB"),
  views: 1,
  updatedAt: AT,
  ...over,
})

describe("readerRegionOf", () => {
  it("reads a country code the platform wrote", () => {
    expect(readerRegionOf("DE")).toBe("DE")
  })

  it("does not have an opinion about casing or whitespace", () => {
    expect(readerRegionOf(" de ")).toBe("DE")
  })

  it("is unplaced when no header said anything", () => {
    expect(readerRegionOf(null)).toBe(UNKNOWN_REGION)
    expect(readerRegionOf(undefined)).toBe(UNKNOWN_REGION)
    expect(readerRegionOf("")).toBe(UNKNOWN_REGION)
  })

  /**
   * The header is written by whatever sits in front of the application, and on a
   * deployment whose proxy does not overwrite it, by the caller. A column fed
   * from it has to be a closed set or it is a free-text field a stranger owns.
   */
  it("is unplaced rather than trusting for anything that is not a country", () => {
    expect(readerRegionOf("Greater London")).toBe(UNKNOWN_REGION)
    expect(readerRegionOf("T1")).toBe(UNKNOWN_REGION)
    expect(readerRegionOf("GBR")).toBe(UNKNOWN_REGION)
    expect(readerRegionOf("g")).toBe(UNKNOWN_REGION)
    expect(readerRegionOf("<script>")).toBe(UNKNOWN_REGION)
  })
})

describe("regionCountsOf", () => {
  const GB = region("GB")

  it("counts the page view a delivery opened", () => {
    const counts = regionCountsOf([batchOf([viewed("a")], { view: viewKey(1), first: true })], GB)

    expect(counts).toEqual([{ treeId: TREE, revision: 1, region: "GB", views: 1 }])
  })

  /**
   * The counter that makes the floor mean something. A reader who stays on a
   * page delivers a batch every few seconds, and counting deliveries would make
   * one visitor clear any floor on their own — which is the protection
   * inverting rather than failing.
   */
  it("counts nothing for the deliveries that follow the opening one", () => {
    const counts = regionCountsOf(
      [
        batchOf([viewed("b")], { view: viewKey(1) }),
        batchOf([viewed("c")], { view: viewKey(1) }),
      ],
      GB
    )

    expect(counts).toEqual([])
  })

  /**
   * A queue draining after an outage posts what it held, which may include the
   * opening batch whose first delivery failed. A view counted twice cannot be
   * uncounted, so the keys are compared rather than the batches.
   */
  it("counts one view when the same opening arrives twice in one delivery", () => {
    const opening = batchOf([viewed("a")], { view: viewKey(1), first: true })

    expect(regionCountsOf([opening, opening], GB)[0]?.views).toBe(1)
  })

  it("counts two readers who opened inside the same delivery", () => {
    const counts = regionCountsOf(
      [
        batchOf([viewed("a")], { view: viewKey(1), first: true }),
        batchOf([viewed("a")], { view: viewKey(2), first: true }),
      ],
      GB
    )

    expect(counts[0]?.views).toBe(2)
  })

  it("counts nothing for a sender that opens nothing", () => {
    expect(regionCountsOf([batchOf([viewed("a")])], GB)).toEqual([])
  })

  /** An opening with no page view to open is not a reader arriving. */
  it("counts nothing for an opening that names no page view", () => {
    expect(regionCountsOf([batchOf([viewed("a")], { first: true })], GB)).toEqual([])
  })

  it("counts the revisions a delivery opened apart", () => {
    const counts = regionCountsOf(
      [
        batchOf([viewed("a")], { view: viewKey(1), first: true }),
        batchOf([viewed("a")], { view: viewKey(2), first: true, revision: 2 }),
      ],
      GB
    )

    expect(counts.map((count) => `${count.revision}:${count.views}`).sort()).toEqual(["1:1", "2:1"])
  })

  it("counts nothing from nothing", () => {
    expect(regionCountsOf([], GB)).toEqual([])
  })
})

describe("regionFloorOf", () => {
  it("is the runtime's number when nobody asked for one", () => {
    expect(regionFloorOf(undefined)).toBe(DEFAULT_REGION_FLOOR)
  })

  it("can be raised", () => {
    expect(regionFloorOf(200)).toBe(200)
  })

  /**
   * The one place this subsystem overrides an operator. A floor of one is a
   * different product, and the difference would be invisible on the screen that
   * showed the result.
   */
  it("cannot be lowered", () => {
    expect(regionFloorOf(1)).toBe(DEFAULT_REGION_FLOOR)
    expect(regionFloorOf(0)).toBe(DEFAULT_REGION_FLOOR)
    expect(regionFloorOf(-5)).toBe(DEFAULT_REGION_FLOOR)
  })

  it("is the runtime's number for anything that is not a whole number of views", () => {
    expect(regionFloorOf(40.5)).toBe(DEFAULT_REGION_FLOOR)
    expect(regionFloorOf(Number.NaN)).toBe(DEFAULT_REGION_FLOOR)
    expect(regionFloorOf(Number.POSITIVE_INFINITY)).toBe(DEFAULT_REGION_FLOOR)
  })
})

describe("regionReadingOf", () => {
  it("names a bucket that is large enough", () => {
    const reading = regionReadingOf([row({ views: 40 })])

    expect(reading.regions).toEqual([{ region: "GB", views: 40 }])
    expect(reading.withheld).toEqual({ buckets: 0, views: 0 })
  })

  /** Country plus a handful of views is a person, which is the whole reason for a floor. */
  it("withholds a bucket small enough to be one reader", () => {
    const reading = regionReadingOf([row({ region: region("LU"), views: 1 })])

    expect(reading.regions).toEqual([])
    expect(reading.withheld).toEqual({ buckets: 1, views: 1 })
  })

  it("keeps the total true while withholding where it came from", () => {
    const reading = regionReadingOf([
      row({ views: 40 }),
      row({ region: region("LU"), views: 1 }),
      row({ region: region("IE"), views: 2 }),
    ])

    expect(reading.regions.map((bucket) => bucket.region)).toEqual(["GB"])
    expect(reading.withheld).toEqual({ buckets: 2, views: 3 })
    expect(reading.views).toBe(43)
  })

  /**
   * Grouped before it is suppressed. Ten readers of one revision and twenty of
   * the next are thirty readers of one country; suppressing each revision first
   * would withhold both and draw a map of nowhere.
   */
  it("adds a region's revisions together before it applies the floor", () => {
    const reading = regionReadingOf([row({ views: 10 }), row({ revision: 2, views: 20 })])

    expect(reading.regions).toEqual([{ region: "GB", views: 30 }])
  })

  /**
   * Region views are counted once, when a page view opened, so unlike the
   * per-node view counters they are exact and may be added across revisions,
   * trees and months.
   */
  it("adds a region's trees together too", () => {
    const reading = regionReadingOf([row({ views: 10 }), row({ treeId: OTHER_TREE, views: 20 })])

    expect(reading.regions).toEqual([{ region: "GB", views: 30 }])
  })

  it("never withholds the readers it could not place, however few they are", () => {
    const reading = regionReadingOf([row({ region: UNKNOWN_REGION, views: 1 })])

    expect(reading.regions).toEqual([{ region: "unknown", views: 1 }])
    expect(reading.withheld).toEqual({ buckets: 0, views: 0 })
  })

  it("reports most-read first, and by code when two are equal", () => {
    const reading = regionReadingOf([
      row({ region: region("FR"), views: 30 }),
      row({ region: region("DE"), views: 30 }),
      row({ region: region("US"), views: 90 }),
    ])

    expect(reading.regions.map((bucket) => bucket.region)).toEqual(["US", "DE", "FR"])
  })

  it("says what floor it read at, so a screen can say what it is withholding by", () => {
    expect(regionReadingOf([], { floor: 100 }).floor).toBe(100)
    expect(regionReadingOf([]).floor).toBe(DEFAULT_REGION_FLOOR)
  })

  it("cannot be read at a floor below the runtime's", () => {
    const reading = regionReadingOf([row({ views: 2 })], { floor: 1 })

    expect(reading.floor).toBe(DEFAULT_REGION_FLOOR)
    expect(reading.regions).toEqual([])
  })

  it("reads nothing as nothing rather than as a reading of nowhere", () => {
    expect(regionReadingOf([])).toMatchObject({ regions: [], withheld: { buckets: 0, views: 0 }, views: 0 })
  })
})
