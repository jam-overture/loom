import { describe, expect, it } from "vitest"

import { OTHER_TREE, region, TREE } from "../testing/reader-signal-contract.js"

import {
  DEFAULT_REGION_FLOOR,
  regionReadingOf,
  UNKNOWN_REGION,
  type RegionReading,
  type StoredRegionCount,
} from "./region.js"
import {
  READERSHIP_COMPARABILITIES,
  READERSHIP_SHIFTED_ABOVE,
  REGION_MOVEMENTS,
  describeReadershipComparability,
  describeRegionMovement,
  readershipChangeOf,
  type ComparedRegion,
} from "./readership.js"

const AT = "2026-10-09T00:00:00.000Z"

/** A map of one revision, written as the counts the store would hold. */
const reading = (
  counts: Readonly<Record<string, number>>,
  options: { readonly floor?: number; readonly revision?: number } = {}
): RegionReading =>
  regionReadingOf(
    Object.entries(counts).map(
      ([code, views]): StoredRegionCount => ({
        treeId: TREE,
        revision: options.revision ?? 1,
        region: code === UNKNOWN_REGION ? UNKNOWN_REGION : region(code),
        views,
        updatedAt: AT,
      })
    ),
    options.floor === undefined ? {} : { floor: options.floor }
  )

const rowFor = (
  regions: readonly ComparedRegion[],
  code: string
): ComparedRegion | undefined => regions.find((row) => row.region === code)

describe("readershipChangeOf", () => {
  it("calls two windows of the same mix comparable", () => {
    const same = { GB: 100, US: 60, DE: 40 }
    const change = readershipChangeOf(reading(same), reading(same))

    expect(change.moved).toBe(0)
    expect(change.movedAtMost).toBe(0)
    expect(change.comparability).toBe("like-for-like")
    expect(change.unaccounted).toEqual({ was: 0, now: 0 })
  })

  /**
   * The sentence this exists for. A before-and-after reading of the page would
   * attribute the whole difference to the change; two thirds of the readers are
   * somewhere else.
   */
  it("calls two windows of different mixes shifted, and names what moved most", () => {
    const change = readershipChangeOf(
      reading({ GB: 300, US: 100 }),
      reading({ GB: 100, US: 300 })
    )

    expect(change.moved).toBeCloseTo(0.5, 10)
    expect(change.movedAtMost).toBeCloseTo(0.5, 10)
    expect(change.comparability).toBe("shifted")
    expect(change.loudest).toBe("GB")
  })

  /**
   * A header stopped arriving, a proxy changed, a CDN was rerouted. Nothing
   * about the readership moved, and a card that said *your audience changed*
   * would send somebody to look at the wrong thing.
   */
  it("tells a swing in the bucket that names nowhere apart from an audience moving", () => {
    const change = readershipChangeOf(
      reading({ GB: 300, US: 100 }),
      reading({ GB: 150, US: 50, [UNKNOWN_REGION]: 200 })
    )

    expect(change.comparability).toBe("unplaced")
    expect(change.loudest).toBe(UNKNOWN_REGION)
    expect(change.moved).toBeGreaterThan(READERSHIP_SHIFTED_ABOVE)
  })

  /**
   * The case the line above would otherwise get backwards. A map with no
   * unplaced bucket was written by a platform that placed every arrival, so the
   * absence is a nought and not a withholding — and the swing is therefore the
   * unplaced bucket's own rather than a loss in the countries it drained.
   */
  it("compares the bucket that names nowhere even where one map has none of it", () => {
    const change = readershipChangeOf(
      reading({ GB: 300, US: 100 }),
      reading({ GB: 150, US: 50, [UNKNOWN_REGION]: 200 })
    )
    const unplaced = rowFor(change.regions, UNKNOWN_REGION)

    expect(unplaced?.was.views).toBe(0)
    expect(unplaced?.was.share).toBe(0)
    expect(unplaced?.movement).toBe("grew")
    expect(unplaced?.shift).toBeCloseTo(0.5, 10)
    expect(change.unaccounted).toEqual({ was: 0, now: 0 })
  })

  it("refuses a verdict where the floor withholds enough to carry it either way", () => {
    const quiet = { GB: 100, FR: 20, ES: 20, IT: 20, PT: 20 }
    const change = readershipChangeOf(reading(quiet), reading({ ...quiet, GB: 104 }))

    expect(change.comparability).toBe("unsettled")
    expect(change.moved).toBeLessThanOrEqual(READERSHIP_SHIFTED_ABOVE)
    expect(change.movedAtMost).toBeGreaterThan(READERSHIP_SHIFTED_ABOVE)
  })

  it("has no mix to compare where a window counted nobody", () => {
    const change = readershipChangeOf(reading({ GB: 300 }), reading({}))

    expect(change.comparability).toBe("unmeasured")
    expect(change.moved).toBeUndefined()
    expect(change.movedAtMost).toBeUndefined()
    expect(change.arrivals).toEqual({ was: 300, now: 0 })
  })

  /**
   * A bucket named at one floor and withheld at another is an artefact of the
   * two floors. Nothing is compared, and the rows are not published either,
   * because every one of them would carry that artefact.
   */
  it("compares nothing where the two maps were floored differently", () => {
    const change = readershipChangeOf(
      reading({ GB: 300, FR: 40 }),
      reading({ GB: 300, FR: 40 }, { floor: 50 })
    )

    expect(change.comparability).toBe("incomparable")
    expect(change.floor).toBeUndefined()
    expect(change.regions).toEqual([])
    expect(change.moved).toBeUndefined()
  })

  describe("what the floor lets it say about one region", () => {
    it("reports a bucket that stopped clearing the floor without saying what is left", () => {
      const change = readershipChangeOf(reading({ GB: 300, FR: 30 }), reading({ GB: 300, FR: 10 }))
      const fr = rowFor(change.regions, "FR")

      expect(fr?.movement).toBe("thinned")
      expect(fr?.was.views).toBe(30)
      expect(fr?.now.views).toBeUndefined()
      expect(fr?.shift).toBeUndefined()
      expect(fr?.change).toBeUndefined()
    })

    it("reports a bucket that started clearing it the same way round", () => {
      const change = readershipChangeOf(reading({ GB: 300, FR: 10 }), reading({ GB: 300, FR: 30 }))
      const fr = rowFor(change.regions, "FR")

      expect(fr?.movement).toBe("thickened")
      expect(fr?.was.views).toBeUndefined()
      expect(fr?.now.views).toBe(30)
    })

    /**
     * The whole privacy design, as a property rather than as care: every figure
     * published here is one of the two floored maps' own named buckets.
     */
    it("publishes no figure that the map it came from withheld", () => {
      const was = reading({ GB: 300, FR: 30, ES: 4 })
      const now = reading({ GB: 300, FR: 10, ES: 60 })
      const named = (map: RegionReading): ReadonlySet<string> =>
        new Set(map.regions.map((bucket) => bucket.region))

      for (const row of readershipChangeOf(was, now).regions) {
        expect(row.was.views === undefined).toBe(!named(was).has(row.region))
        expect(row.now.views === undefined).toBe(!named(now).has(row.region))
      }
    })

    it("gives a region both maps withheld no row at all, only an unaccounted share", () => {
      const change = readershipChangeOf(reading({ GB: 300, FR: 10 }), reading({ GB: 300, FR: 20 }))

      expect(rowFor(change.regions, "FR")).toBeUndefined()
      expect(change.unaccounted.was).toBeCloseTo(10 / 310, 10)
      expect(change.unaccounted.now).toBeCloseTo(20 / 320, 10)
    })
  })

  /**
   * The two numbers are a bound and the bound holds, which is the only reason
   * publishing a figure off a floored map is honest at all. The truth here is
   * computed from the counts the floor hid.
   */
  it("brackets the movement the unfloored counts would have reported", () => {
    const change = readershipChangeOf(reading({ GB: 100, FR: 10 }), reading({ GB: 100, FR: 30 }))
    const truth =
      (Math.abs(100 / 110 - 100 / 130) + Math.abs(10 / 110 - 30 / 130)) / 2

    expect(change.moved).toBeLessThanOrEqual(truth)
    expect(truth).toBeLessThanOrEqual(change.movedAtMost ?? 0)
  })

  /**
   * The ceiling is the floor plus a width, and a width computed as *one minus
   * the shares accounted for* is negative by a float's last bit on a window
   * every bucket of which is comparable. Unclamped, the ceiling would sit under
   * the floor on the commonest case of all.
   */
  it("never puts the ceiling under the floor, on any mix", () => {
    const mixes: readonly Readonly<Record<string, number>>[] = [
      { GB: 100, US: 100, DE: 100 },
      { GB: 100, US: 60, DE: 40, FR: 20 },
      { GB: 1, US: 2, DE: 3 },
      { GB: 700, [UNKNOWN_REGION]: 3 },
      { GB: 100 },
      {},
    ]

    for (const was of mixes) {
      for (const now of mixes) {
        const change = readershipChangeOf(reading(was), reading(now))

        expect(change.unaccounted.was).toBeGreaterThanOrEqual(0)
        expect(change.unaccounted.now).toBeGreaterThanOrEqual(0)
        expect(change.moved ?? 0).toBeLessThanOrEqual(change.movedAtMost ?? 0)
        expect(READERSHIP_COMPARABILITIES).toContain(change.comparability)
      }
    }
  })

  it("never puts the ceiling above one, however much the floor is holding", () => {
    const spread = Object.fromEntries(
      ["FR", "ES", "IT", "PT", "NL", "BE", "DK", "SE", "NO", "FI"].map((code) => [code, 20])
    )
    const change = readershipChangeOf(reading(spread), reading({ ...spread, GB: 400 }))

    expect(change.movedAtMost).toBeLessThanOrEqual(1)
  })

  describe("the order the rows come back in", () => {
    /**
     * This subsystem ranks by headcount everywhere, because a small bucket that
     * halved is a worse rate and a smaller problem than a large one that moved
     * a tenth.
     */
    it("puts the most readers moved first and not the largest share moved", () => {
      const change = readershipChangeOf(
        reading({ GB: 1000, US: 500, DE: 30 }),
        reading({ GB: 1200, US: 500, DE: 60 })
      )

      expect(change.regions.map((row) => row.region)).toEqual(["GB", "DE", "US"])
    })

    it("breaks a tie by code, so a refresh does not reorder the screen", () => {
      const change = readershipChangeOf(
        reading({ GB: 100, US: 100, DE: 100 }),
        reading({ GB: 150, US: 150, DE: 150 })
      )

      expect(change.regions.map((row) => row.region)).toEqual(["DE", "GB", "US"])
    })
  })

  describe("what it refuses to publish", () => {
    /**
     * A region counter is a running total per revision with no window on it, so
     * the larger of two numbers is mostly the longer exposure. The counts are
     * the weight behind the mix and never a trend, and the absence of the ratio
     * anybody would quote is the whole of how that is said.
     */
    it("publishes the two arrival counts and no growth between them", () => {
      const change = readershipChangeOf(reading({ GB: 100 }), reading({ GB: 400 }))

      expect(change.arrivals).toEqual({ was: 100, now: 400 })
      expect(Object.keys(change).sort()).toEqual([
        "arrivals",
        "comparability",
        "floor",
        "loudest",
        "moved",
        "movedAtMost",
        "regions",
        "unaccounted",
      ])
    })

    /**
     * A share over the named buckets would make a window whose traffic is
     * mostly under the floor add to 1 and read as a complete picture.
     */
    it("takes a share of every view there was, not of the ones it can name", () => {
      const change = readershipChangeOf(reading({ GB: 100, FR: 10 }), reading({ GB: 100, FR: 10 }))

      expect(rowFor(change.regions, "GB")?.was.share).toBeCloseTo(100 / 110, 10)
    })
  })

  describe("what cannot be double counted", () => {
    /**
     * The lane's standing rule, and the sharpest case for a comparison: one map
     * handed in as both sides is a readership that did not move. A union that
     * listed a region once per side would report every country twice and a mix
     * that moved by nothing in twice as many rows.
     */
    it("gives one row per region when both maps name it", () => {
      const same = reading({ GB: 100, US: 60, DE: 40 })
      const change = readershipChangeOf(same, same)

      expect(change.regions).toHaveLength(3)
      expect(new Set(change.regions.map((row) => row.region)).size).toBe(3)
      expect(change.moved).toBe(0)
      expect(change.arrivals).toEqual({ was: 200, now: 200 })
    })

    /**
     * The labels are the caller's, exactly as they are for a before-and-after
     * reading of a page. Holding them backwards reverses the signs rather than
     * being refused, and the magnitude cannot change — which is also what makes
     * `moved` a property of the pair rather than of the order.
     */
    it("reverses every sign and no magnitude when the two sides are swapped", () => {
      const was = reading({ GB: 300, US: 100 })
      const now = reading({ GB: 100, US: 300 })
      const forwards = readershipChangeOf(was, now)
      const backwards = readershipChangeOf(now, was)

      expect(backwards.moved).toBeCloseTo(forwards.moved ?? 0, 10)
      expect(rowFor(backwards.regions, "GB")?.shift).toBeCloseTo(
        -(rowFor(forwards.regions, "GB")?.shift ?? 0),
        10
      )
    })
  })

  describe("the figures on one row", () => {
    it("counts a region that grew, shrank or held exactly, with no threshold in the way", () => {
      const change = readershipChangeOf(
        reading({ GB: 100, US: 100, DE: 100 }),
        reading({ GB: 101, US: 99, DE: 100 })
      )

      expect(rowFor(change.regions, "GB")?.movement).toBe("grew")
      expect(rowFor(change.regions, "GB")?.change).toBe(1)
      expect(rowFor(change.regions, "US")?.movement).toBe("shrank")
      expect(rowFor(change.regions, "DE")?.movement).toBe("steady")
      expect(rowFor(change.regions, "DE")?.change).toBe(0)
    })

    it("reads the floor off the maps rather than assuming the default", () => {
      expect(readershipChangeOf(reading({ GB: 300 }), reading({ GB: 300 })).floor).toBe(
        DEFAULT_REGION_FLOOR
      )
      expect(
        readershipChangeOf(
          reading({ GB: 300 }, { floor: 80 }),
          reading({ GB: 300 }, { floor: 80 })
        ).floor
      ).toBe(80)
    })
  })

  it("compares two revisions of a tree as readily as two windows of one", () => {
    const change = readershipChangeOf(
      reading({ GB: 300 }, { revision: 3 }),
      reading({ GB: 300 }, { revision: 4 })
    )

    expect(change.comparability).toBe("like-for-like")
    expect(OTHER_TREE).not.toBe(TREE)
  })
})

describe("the closed sets this publishes", () => {
  it("has a line for every movement and every standing", () => {
    for (const movement of REGION_MOVEMENTS) {
      expect(describeRegionMovement(movement)).toMatch(/\S/)
    }

    for (const comparability of READERSHIP_COMPARABILITIES) {
      expect(describeReadershipComparability(comparability)).toMatch(/\S/)
    }
  })

  it("names five movements and six standings", () => {
    expect(REGION_MOVEMENTS).toHaveLength(5)
    expect(READERSHIP_COMPARABILITIES).toHaveLength(6)
  })
})
