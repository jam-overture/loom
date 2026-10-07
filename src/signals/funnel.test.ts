import { describe, expect, it } from "vitest"

import { nodeId, primitiveType, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION } from "../tree/tree.js"

import {
  describeEndStanding,
  describeFunnelStage,
  END_STANDINGS,
  FUNNEL_STAGES,
  funnelReachOf,
  inflationFor,
  pageReadingOf,
  pageViewsFor,
  type FunnelPair,
  type PageReading,
  type PartDeclarations,
  type StoredFunnel,
  type StoredPageViews,
} from "./index.js"

/**
 * Built on stored rows and a tree, because those are what the function takes: a
 * window's funnel counters, the two numbers the door and the rollups wrote, and
 * the revision the pairs are being asked about. A share of the readers who
 * arrived comes out of the other end, and so does whether the question still
 * names anything.
 */

const element = (name: string, type: string, children: readonly LoomNode[] = []): ElementNode => ({
  kind: "element",
  id: nodeId(name),
  type: primitiveType(type),
  props: {},
  children,
})

const text = (name: string, value: string): LoomNode => ({
  kind: "text",
  id: nodeId(name),
  value,
})

const NOTHING_DECLARED: PartDeclarations = {
  copyFor: () => undefined,
  typesWithRole: () => [],
}

/**
 * The revision every pair below is asked of, holding each node the fixtures
 * name. Built through `pageReadingOf` rather than written out, so what the
 * reading says a revision contains is what §6 says it does and not a second
 * spelling of it.
 */
const readingOf = (root: ElementNode, revision = 1): PageReading =>
  pageReadingOf(
    { treeId: TREE, schemaVersion: TREE_SCHEMA_VERSION, revision, root },
    [],
    NOTHING_DECLARED
  )

const PAGE = element("root", "loom.stack", [
  element("a", "loom.section"),
  element("b", "loom.section"),
  element("c", "loom.section"),
  element("z", "loom.section"),
  element("band", "loom.section", [element("form", "loom.form")]),
  element("deep", "loom.section"),
])

const WHERE = readingOf(PAGE)

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

describe("END_STANDINGS", () => {
  it("has a line for every standing", () => {
    for (const standing of END_STANDINGS) expect(describeEndStanding(standing)).toBeTruthy()
  })
})

describe("the pair the revision no longer has", () => {
  /**
   * The finding this closes, as the two readings it could not tell apart. Both
   * rows say `reached 0, converted 0`; one is a band readers never scroll to
   * and the other is a question about a part the page has not had since a
   * change, and the remedies are opposite.
   */
  it("tells a stale question from a funnel nobody reached", () => {
    const reach = funnelReachOf(
      WHERE,
      [funnel("band", "form", 0, 0), funnel("gone", "form", 0, 0)],
      [views(100, 100)]
    )
    const unreached = reach.pairs.find((one) => one.pair.from.nodeId === nodeId("band"))
    const stale = reach.pairs.find((one) => one.pair.from.nodeId === nodeId("gone"))

    expect(unreached?.stale).toBe(false)
    expect(unreached?.ends).toStrictEqual({ from: "present", to: "present" })
    expect(unreached?.entry.share).toBe(0)
    expect(unreached?.lostBefore).toBe(1)
    expect(unreached?.worse).toBe("before")

    expect(stale?.stale).toBe(true)
    expect(stale?.ends).toStrictEqual({ from: "absent", to: "present" })
    expect(stale?.entry.share).toBeNull()
    expect(stale?.lostBefore).toBeNull()
    expect(stale?.worse).toBeNull()
  })

  it("withholds every figure that needed the missing first end, and keeps the counts", () => {
    const reach = funnelReachOf(WHERE, [funnel("gone", "form", 40, 10)], [views(100, 100)])
    const [only] = reach.pairs

    expect(only?.reached).toBe(40)
    expect(only?.converted).toBe(10)
    expect(only?.updatedAt).toBe(AT)

    expect(only?.rate).toBeNull()
    expect(only?.rateAtMost).toBeNull()
    expect(only?.entry.share).toBeNull()
    expect(only?.entry.atMost).toBeNull()
    expect(only?.conversion.share).toBeNull()
    expect(only?.lostBefore).toBeNull()
    expect(only?.lostBetween).toBeNull()
  })

  /**
   * The two ends fail differently, which is why the withholding is per figure.
   * Readers who reached the first end reached it whatever became of the second.
   */
  it("keeps the entry share where only the second end is gone", () => {
    const reach = funnelReachOf(WHERE, [funnel("band", "gone", 40, 0)], [views(100, 100)])
    const [only] = reach.pairs

    expect(only?.ends).toStrictEqual({ from: "present", to: "absent" })
    expect(only?.stale).toBe(true)
    expect(only?.entry.share).toBe(0.4)
    expect(only?.entry.readers).toBe(40)
    expect(only?.lostBefore).toBe(0.6)

    expect(only?.conversion.share).toBeNull()
    expect(only?.rate).toBeNull()
    expect(only?.rateAtMost).toBeNull()
    expect(only?.lostBetween).toBeNull()
    expect(only?.worse).toBeNull()
  })

  it("withholds the rate on a stale pair even though it needs no denominator", () => {
    /**
     * `rate` survives a silence, because two counts off one row divide into
     * each other without arrivals. It does not survive a missing end: there is
     * no question, rather than a question with no denominator.
     */
    const silenced = funnelReachOf(WHERE, [funnel("band", "form", 60, 15)], [])
    const gone = funnelReachOf(WHERE, [funnel("band", "gone", 60, 15)], [])

    expect(silenced.pairs[0]?.rate).toBe(0.25)
    expect(gone.pairs[0]?.rate).toBeNull()
  })

  it("reads an end against the revision it was handed, not the one the row names", () => {
    /**
     * The change that dissolves a pair: revision 2 of the same tree without the
     * band. The counters are filed under the revision being asked about either
     * way, which is what makes the tree the only thing that can say.
     */
    const without = readingOf(element("root", "loom.stack", [element("deep", "loom.section")]), 2)
    const reach = funnelReachOf(
      without,
      [funnel("band", "form", 0, 0, { treeId: TREE, revision: 2 })],
      [views(100, 100, { treeId: TREE, revision: 2 })]
    )

    expect(reach.pairs[0]?.ends).toStrictEqual({ from: "absent", to: "absent" })
    expect(reach.stalePairs).toBe(1)
  })

  it("calls an end naming a text node absent, because no signal can ever name one", () => {
    const withText = readingOf(element("root", "loom.stack", [text("legal", "All rights")]))
    const reach = funnelReachOf(withText, [funnel("legal", "root", 0, 0)], [views(10, 10)])

    expect(reach.pairs[0]?.ends.from).toBe("absent")
  })

  it("counts the stale pairs once for a window read twice", () => {
    /** The double-count case every counter here is held to (0158). */
    const once = funnelReachOf(WHERE, [funnel("gone", "form", 0, 0)], [views(100, 100)])
    const twice = funnelReachOf(
      WHERE,
      [funnel("gone", "form", 0, 0), funnel("gone", "form", 0, 0)],
      [views(100, 100)]
    )

    expect(once.stalePairs).toBe(1)
    expect(twice.stalePairs).toBe(1)
    expect(twice.duplicatedPairs).toBe(1)
  })

  it("is nought on a page whose every pair still names something", () => {
    const reach = funnelReachOf(
      WHERE,
      [funnel("band", "form", 60, 15), funnel("root", "form", 100, 20)],
      [views(100, 100)]
    )

    expect(reach.stalePairs).toBe(0)
    expect(reach.orphanedPairs).toBe(0)
    expect(reach.pairs.every((one) => !one.stale)).toBe(true)
  })

  describe("an end the tree has not got, with a count against it", () => {
    it("raises the orphan alarm for a count on a missing first end", () => {
      const reach = funnelReachOf(WHERE, [funnel("gone", "form", 40, 10)], [views(100, 100)])

      expect(reach.pairs[0]?.orphaned).toBe(true)
      expect(reach.orphanedPairs).toBe(1)
    })

    it("raises it for a conversion on a missing second end", () => {
      const reach = funnelReachOf(WHERE, [funnel("band", "gone", 40, 10)], [views(100, 100)])

      expect(reach.pairs[0]?.orphaned).toBe(true)
    })

    it("does not raise it where the missing end counted nothing", () => {
      const reach = funnelReachOf(WHERE, [funnel("gone", "form", 0, 0)], [views(100, 100)])

      expect(reach.pairs[0]?.stale).toBe(true)
      expect(reach.pairs[0]?.orphaned).toBe(false)
      expect(reach.orphanedPairs).toBe(0)
    })

    it("is independent of a reach above the page views there were", () => {
      const both = funnelReachOf(WHERE, [funnel("gone", "form", 140, 90)], [views(100, 100)])

      expect(both.pairs[0]?.orphaned).toBe(true)
      expect(both.pairs[0]?.unreconciled).toBe(true)
    })

    it("counts an orphan once for a window read twice", () => {
      const twice = funnelReachOf(
        WHERE,
        [funnel("gone", "form", 40, 10), funnel("gone", "form", 40, 10)],
        [views(100, 100)]
      )

      expect(twice.orphanedPairs).toBe(1)
    })
  })

  /**
   * The tree says where the two ends sit, so the temptation is to call a pair
   * whose second end comes first a fault. A pair has no ordering beyond its two
   * ends (0146), and a reader who scrolls back up satisfies it honestly.
   */
  it("says nothing about a pair whose second end comes first in the page", () => {
    const forwards = funnelReachOf(WHERE, [funnel("a", "z", 40, 10)], [views(100, 100)])
    const backwards = funnelReachOf(WHERE, [funnel("z", "a", 40, 10)], [views(100, 100)])

    expect(backwards.pairs[0]?.ends).toStrictEqual({ from: "present", to: "present" })
    expect(backwards.pairs[0]?.stale).toBe(false)
    expect(backwards.pairs[0]?.conversion).toStrictEqual(forwards.pairs[0]?.conversion)
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
