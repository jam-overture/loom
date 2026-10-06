import { describe, expect, it } from "vitest"

import { nodeId, TREE } from "../testing/reader-signal-contract.js"

import {
  describeFunnelStage,
  FUNNEL_STAGES,
  funnelReachOf,
  inflationFor,
  pageViewsFor,
  type FunnelPair,
  type StoredFunnel,
  type StoredPageViews,
} from "./index.js"

/**
 * Built on stored rows, because those are what the function takes: a window's
 * funnel counters and the two numbers the door and the rollups wrote go in one
 * end, and a share of the readers who arrived comes out of the other.
 */

const WHERE = { treeId: TREE, revision: 1 } as const

const AT = "2026-10-05T09:00:00.000Z"

const pair = (from: string, to: string): FunnelPair => ({
  from: { nodeId: nodeId(from), kind: "viewed" },
  to: { nodeId: nodeId(to), kind: "completed" },
})

const funnel = (
  from: string,
  to: string,
  reached: number,
  converted: number,
  where: { treeId: typeof TREE; revision: number } = WHERE
): StoredFunnel => ({
  treeId: where.treeId,
  revision: where.revision,
  pair: pair(from, to),
  reached,
  converted,
  updatedAt: AT,
})

const views = (
  opened: number,
  appearances: number,
  where: { treeId: typeof TREE; revision: number } = WHERE
): StoredPageViews => ({
  treeId: where.treeId,
  revision: where.revision,
  opened,
  appearances,
  updatedAt: AT,
})

describe("pageViewsFor", () => {
  it("picks the row for the revision asked about", () => {
    const picked = pageViewsFor(WHERE, [views(10, 10, { treeId: TREE, revision: 2 }), views(4, 5)])

    expect(picked.measured?.opened).toBe(4)
    expect(picked.measured?.appearances).toBe(5)
    expect(picked.foreign).toBe(1)
    expect(picked.duplicated).toBe(0)
  })

  it("reads drift, pending and inflation through the one definition of them", () => {
    expect(pageViewsFor(WHERE, [views(4, 5)]).measured).toMatchObject({
      drift: 1,
      pending: 0,
      inflation: 0.25,
    })

    expect(pageViewsFor(WHERE, [views(5, 4)]).measured).toMatchObject({
      drift: 0,
      pending: 1,
      inflation: 0,
    })
  })

  it("has no row to give where the revision was never counted", () => {
    const picked = pageViewsFor(WHERE, [views(9, 9, { treeId: TREE, revision: 7 })])

    expect(picked.measured).toBeNull()
    expect(picked.foreign).toBe(1)
  })

  it("keeps the first of two rows for one revision and says it dropped one", () => {
    const picked = pageViewsFor(WHERE, [views(4, 5), views(400, 500)])

    expect(picked.measured?.opened).toBe(4)
    expect(picked.duplicated).toBe(1)
  })
})

describe("inflationFor", () => {
  /**
   * The finding this closes is that every consumer writes the matching itself
   * and the matching fails quietly. So the case that matters is the one where a
   * window holds two pages with very different straddle rates.
   */
  it("gives each revision its own correction and never the other's", () => {
    const quiet = { treeId: TREE, revision: 1 } as const
    const busy = { treeId: TREE, revision: 2 } as const
    const rows = [views(100, 100, quiet), views(100, 150, busy)]

    expect(inflationFor(quiet, rows)).toBe(0)
    expect(inflationFor(busy, rows)).toBe(0.5)
  })

  it("is null where the revision has no row, rather than nought", () => {
    expect(inflationFor(WHERE, [])).toBeNull()
  })

  it("is null where nothing opened, because the question has no answer", () => {
    expect(inflationFor(WHERE, [views(0, 30)])).toBeNull()
  })
})

describe("funnelReachOf", () => {
  it("puts a funnel as three shares of the readers who arrived", () => {
    const reach = funnelReachOf(WHERE, [funnel("band", "form", 60, 15)], [views(100, 100)])
    const [only] = reach.pairs

    expect(reach.silence).toBeNull()
    expect(reach.exact).toBe(true)
    expect(only?.rate).toBe(0.25)
    expect(only?.entry.share).toBe(0.6)
    expect(only?.conversion.share).toBe(0.15)
    expect(only?.lostBefore).toBe(0.4)
    expect(only?.lostBetween).toBe(0.45)
  })

  it("partitions the arrivals, so the three shares sum to one", () => {
    const reach = funnelReachOf(WHERE, [funnel("band", "form", 37, 11)], [views(80, 80)])
    const [only] = reach.pairs

    expect((only?.lostBefore ?? 0) + (only?.lostBetween ?? 0) + (only?.conversion.share ?? 0)).toBe(
      1
    )
  })

  it("names the stage that costs more readers, and neither when they are level", () => {
    const steep = funnelReachOf(WHERE, [funnel("band", "form", 20, 15)], [views(100, 100)])
    const shallow = funnelReachOf(WHERE, [funnel("band", "form", 95, 10)], [views(100, 100)])
    const level = funnelReachOf(WHERE, [funnel("band", "form", 50, 0)], [views(100, 100)])

    expect(steep.pairs[0]?.worse).toBe("before")
    expect(shallow.pairs[0]?.worse).toBe("between")
    expect(level.pairs[0]?.worse).toBeNull()
  })

  it("is the rate that hides the first loss, which is the reason for the shares", () => {
    /**
     * Two pairs with the same magnificent rate and two readers between them.
     * `rate` cannot tell them apart; the conversion share can.
     */
    const reach = funnelReachOf(
      WHERE,
      [funnel("deep", "form", 2, 2), funnel("band", "form", 90, 90)],
      [views(100, 100)]
    )
    const deep = reach.pairs.find((one) => one.pair.from.nodeId === nodeId("deep"))
    const band = reach.pairs.find((one) => one.pair.from.nodeId === nodeId("band"))

    expect(deep?.rate).toBe(1)
    expect(band?.rate).toBe(1)
    expect(deep?.conversion.share).toBe(0.02)
    expect(band?.conversion.share).toBe(0.9)
  })

  describe("the straddle, which leans down here and up everywhere else", () => {
    it("bounds the rate above where visits spanned two windows", () => {
      /**
       * Thirty appearances against twenty openings is a drift of ten, so up to
       * ten conversions could have been split across windows and lost. The
       * stored rate is a floor and the ceiling is the arithmetic that says so.
       */
      const reach = funnelReachOf(WHERE, [funnel("band", "form", 20, 4)], [views(20, 30)])
      const [only] = reach.pairs

      expect(reach.drift).toBe(10)
      expect(reach.exact).toBe(false)
      expect(only?.rate).toBe(0.2)
      // (4 + 10) / (20 - 10)
      expect(only?.rateAtMost).toBe(1)
    })

    it("closes the ceiling onto the rate where nobody straddled", () => {
      const reach = funnelReachOf(WHERE, [funnel("band", "form", 40, 10)], [views(100, 100)])

      expect(reach.exact).toBe(true)
      expect(reach.pairs[0]?.rateAtMost).toBe(reach.pairs[0]?.rate)
    })

    it("never recovers a conversion the row already counted", () => {
      /** Everything converted, so a drift has nothing left to give back. */
      const reach = funnelReachOf(WHERE, [funnel("band", "form", 30, 30)], [views(20, 30)])

      expect(reach.pairs[0]?.rate).toBe(1)
      expect(reach.pairs[0]?.rateAtMost).toBe(1)
    })

    it("keeps the ceiling at or above the rate across every short sequence", () => {
      for (let reached = 0; reached <= 12; reached += 1) {
        for (let converted = 0; converted <= reached; converted += 1) {
          for (let drift = 0; drift <= 12; drift += 1) {
            const reach = funnelReachOf(
              WHERE,
              [funnel("band", "form", reached, converted)],
              [views(20, 20 + drift)]
            )
            const [only] = reach.pairs

            if (only?.rate === null || only === undefined) continue

            expect(only.rateAtMost).not.toBeNull()
            expect(only.rateAtMost ?? 0).toBeGreaterThanOrEqual(only.rate ?? 0)
            expect(only.rateAtMost ?? 0).toBeLessThanOrEqual(1)
          }
        }
      }
    })
  })

  describe("the two denominators", () => {
    it("takes the estimate of the appearances and the ceiling of the openings", () => {
      const reach = funnelReachOf(WHERE, [funnel("band", "form", 30, 15)], [views(40, 50)])
      const [only] = reach.pairs

      expect(only?.conversion.share).toBe(0.3)
      expect(only?.conversion.atMost).toBe(0.375)
      expect(only?.conversion.readers).toBe(12)
      expect(only?.conversion.atMostReaders).toBe(15)
    })

    it("holds the ceiling at one where more reached than opened", () => {
      const reach = funnelReachOf(WHERE, [funnel("band", "form", 48, 48)], [views(40, 50)])

      expect(reach.pairs[0]?.entry.atMost).toBe(1)
      expect(reach.pairs[0]?.entry.atMostReaders).toBe(40)
    })

    it("withholds the headcount while an opening is pending", () => {
      const reach = funnelReachOf(WHERE, [funnel("band", "form", 20, 10)], [views(50, 40)])
      const [only] = reach.pairs

      expect(reach.pending).toBe(10)
      expect(only?.conversion.share).toBe(0.25)
      expect(only?.conversion.readers).toBeNull()
      expect(only?.entry.readers).toBeNull()
    })

    it("divides two whole numbers rather than multiplying the share back up", () => {
      /** Seven in a hundred, times a hundred, is not seven in a float. */
      const reach = funnelReachOf(WHERE, [funnel("band", "form", 7, 7)], [views(100, 100)])

      expect(reach.pairs[0]?.conversion.readers).toBe(7)
    })
  })

  describe("the silences", () => {
    it("says unmeasured where the revision has no page-view row", () => {
      const reach = funnelReachOf(WHERE, [funnel("band", "form", 60, 15)], [])

      expect(reach.silence).toBe("unmeasured")
      expect(reach.pairs[0]?.conversion.share).toBeNull()
      expect(reach.pairs[0]?.lostBefore).toBeNull()
      expect(reach.pairs[0]?.worse).toBeNull()
      expect(reach.pairs[0]?.rateAtMost).toBeNull()
    })

    it("still gives the rate under a silence, because it needs no denominator", () => {
      const reach = funnelReachOf(WHERE, [funnel("band", "form", 60, 15)], [])

      expect(reach.pairs[0]?.rate).toBe(0.25)
    })

    it("says unopened where nothing marked an opening and rollups counted anyway", () => {
      const reach = funnelReachOf(WHERE, [funnel("band", "form", 60, 15)], [views(0, 90)])

      expect(reach.silence).toBe("unopened")
      expect(reach.exact).toBe(false)
    })

    it("says uncounted where readers arrived and no window has been folded", () => {
      const reach = funnelReachOf(WHERE, [funnel("band", "form", 0, 0)], [views(90, 0)])

      expect(reach.silence).toBe("uncounted")
    })
  })

  describe("rows that do not belong to the question", () => {
    it("ignores funnels and page views for another revision, and counts them", () => {
      const other = { treeId: TREE, revision: 9 } as const
      const reach = funnelReachOf(
        WHERE,
        [funnel("band", "form", 60, 15), funnel("band", "form", 1, 1, other)],
        [views(100, 100), views(3, 3, other)]
      )

      expect(reach.pairs).toHaveLength(1)
      expect(reach.pairs[0]?.reached).toBe(60)
      expect(reach.foreignPairs).toBe(1)
      expect(reach.foreign).toBe(1)
    })

    it("keeps the first of two rows naming one pair rather than adding them", () => {
      const reach = funnelReachOf(
        WHERE,
        [funnel("band", "form", 60, 15), funnel("band", "form", 60, 15)],
        [views(100, 100)]
      )

      expect(reach.pairs).toHaveLength(1)
      expect(reach.pairs[0]?.reached).toBe(60)
      expect(reach.duplicatedPairs).toBe(1)
    })

    /**
     * The double-count case this lane tests every counter against (0158). Two
     * reads of the store concatenated must not report twice the readers.
     */
    it("reports the same shares for a window read once and read twice", () => {
      const once = funnelReachOf(WHERE, [funnel("band", "form", 60, 15)], [views(100, 100)])
      const twice = funnelReachOf(
        WHERE,
        [funnel("band", "form", 60, 15), funnel("band", "form", 60, 15)],
        [views(100, 100), views(100, 100)]
      )

      expect(twice.pairs[0]?.conversion).toStrictEqual(once.pairs[0]?.conversion)
      expect(twice.opened).toBe(once.opened)
      expect(twice.duplicated).toBe(1)
      expect(twice.duplicatedPairs).toBe(1)
    })

    it("tells two pairs apart by the kinds of their ends and not only their nodes", () => {
      const viewedThenDone = funnel("band", "form", 60, 15)
      const pressedThenDone: StoredFunnel = {
        ...viewedThenDone,
        pair: {
          from: { nodeId: nodeId("band"), kind: "activated" },
          to: viewedThenDone.pair.to,
        },
        reached: 20,
        converted: 10,
      }

      const reach = funnelReachOf(WHERE, [viewedThenDone, pressedThenDone], [views(100, 100)])

      expect(reach.pairs).toHaveLength(2)
      expect(reach.duplicatedPairs).toBe(0)
    })

    it("reconciles a funnel every reader met, where reach equals the appearances", () => {
      /**
       * The boundary, and the ordinary case at it: a `from` on the root is in
       * the viewport of every page view the rollups counted.
       */
      const reach = funnelReachOf(WHERE, [funnel("root", "form", 100, 20)], [views(100, 100)])
      const [only] = reach.pairs

      expect(only?.unreconciled).toBe(false)
      expect(only?.entry.share).toBe(1)
      expect(only?.lostBefore).toBe(0)
      expect(only?.worse).toBe("between")
    })

    it("reports a funnel whose reach exceeds the page views rather than drawing it", () => {
      const reach = funnelReachOf(WHERE, [funnel("band", "form", 140, 90)], [views(100, 100)])
      const [only] = reach.pairs

      expect(only?.unreconciled).toBe(true)
      expect(only?.conversion.share).toBeNull()
      expect(only?.lostBefore).toBeNull()
      expect(only?.reached).toBe(140)
      expect(only?.rate).toBe(90 / 140)
    })
  })

  it("orders the pairs by their ends so a refresh does not reorder a screen", () => {
    const rows = [funnel("c", "z", 1, 1), funnel("a", "z", 2, 2), funnel("b", "z", 3, 3)]
    const forwards = funnelReachOf(WHERE, rows, [views(10, 10)])
    const backwards = funnelReachOf(WHERE, [...rows].reverse(), [views(10, 10)])

    expect(forwards.pairs.map((one) => one.pair.from.nodeId)).toStrictEqual([
      nodeId("a"),
      nodeId("b"),
      nodeId("c"),
    ])
    expect(backwards.pairs.map((one) => one.pair.from.nodeId)).toStrictEqual(
      forwards.pairs.map((one) => one.pair.from.nodeId)
    )
  })

  it("has no answer for a pair nothing reached, rather than nought", () => {
    const reach = funnelReachOf(WHERE, [funnel("band", "form", 0, 0)], [views(100, 100)])

    expect(reach.pairs[0]?.rate).toBeNull()
    expect(reach.pairs[0]?.rateAtMost).toBeNull()
    expect(reach.pairs[0]?.entry.share).toBe(0)
    expect(reach.pairs[0]?.worse).toBe("before")
  })

  it("carries the page-view arithmetic so a surface need not pair two readings up", () => {
    const reach = funnelReachOf(WHERE, [], [views(40, 50)])

    expect(reach).toMatchObject({
      treeId: TREE,
      revision: 1,
      opened: 40,
      appearances: 50,
      drift: 10,
      pending: 0,
      inflation: 0.25,
      updatedAt: AT,
      pairs: [],
    })
  })
})

describe("the stages as a closed set", () => {
  it("has a line for every member", () => {
    for (const stage of FUNNEL_STAGES) expect(describeFunnelStage(stage)).not.toBe("")

    expect(FUNNEL_STAGES).toHaveLength(2)
  })
})
