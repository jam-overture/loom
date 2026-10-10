import { describe, expect, it } from "vitest"

import type { TreeId } from "../ids.js"
import { nodeId, OTHER_TREE, primitiveType, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  DEPLOYMENT_SILENCES,
  deploymentReadingOf,
  describeRankStanding,
  pageReadingOf,
  RANK_STANDINGS,
  readingProgressOf,
  type PartDeclarations,
  type ReaderTally,
  type ReadingProgress,
  type StoredPageViews,
} from "./index.js"

/**
 * Built on real readings rather than on hand-written progress objects, because
 * the thing being tested is an order over what a deployment actually holds: a
 * tree and a window's counters go in one end of the pipeline and a page's place
 * in the order comes out of the other.
 */

const NOTHING_DECLARED: PartDeclarations = {
  copyFor: () => undefined,
  typesWithRole: () => [],
}

const band = (name: string): ElementNode => ({
  kind: "element",
  id: nodeId(name),
  type: primitiveType("loom.section"),
  props: {},
  children: [],
})

const treeOf = (treeId: TreeId, revision: number, bands: number): LoomTree => ({
  treeId,
  schemaVersion: TREE_SCHEMA_VERSION,
  revision,
  root: {
    kind: "element",
    id: nodeId("page"),
    type: primitiveType("loom.stack"),
    props: {},
    children: Array.from({ length: bands }, (_, at) => band(`band${at + 1}`)),
  },
})

const tally = (
  treeId: TreeId,
  revision: number,
  name: string,
  reached: number
): ReaderTally => ({
  treeId,
  revision,
  nodeId: nodeId(name),
  type: primitiveType("loom.section"),
  views: reached,
  reached,
  engaged: 0,
  dwellMs: 0,
  activations: 0,
  opens: 0,
  closes: 0,
  completions: 0,
})

/**
 * One page of bands, each reached by the readers given.
 *
 * A band reached by nobody is handed in with **no row at all**, which is what a
 * rollup does and what makes its standing `skipped` rather than `unknown` — a
 * row of zeroes would be a part that reported something other than a view, and
 * that is a different fixture for a different test.
 */
const page = (treeId: TreeId, revision: number, reached: readonly number[]): ReadingProgress => {
  const counters = reached.flatMap((count, at) =>
    count > 0 ? [tally(treeId, revision, `band${at + 1}`, count)] : []
  )

  return readingProgressOf(
    pageReadingOf(treeOf(treeId, revision, reached.length), counters, NOTHING_DECLARED)
  )
}

/** A page nothing reported, which is a tree, a revision and an empty window. */
const unreadPage = (treeId: TreeId, revision: number): ReadingProgress =>
  readingProgressOf(pageReadingOf(treeOf(treeId, revision, 3), [], NOTHING_DECLARED))

const door = (
  treeId: TreeId,
  revision: number,
  opened: number,
  appearances: number
): StoredPageViews => ({
  treeId,
  revision,
  opened,
  appearances,
  updatedAt: "2026-10-09T21:00:00.000Z",
})

/** A page whose readers never straddled a window, so its counters need no scaling. */
const exact = (treeId: TreeId, revision: number, views: number): StoredPageViews =>
  door(treeId, revision, views, views)

describe("deploymentReadingOf", () => {
  it("names the page to fix first out of the pages a deployment holds", () => {
    const reading = deploymentReadingOf(
      [page(TREE, 1, [100, 90, 80]), page(OTHER_TREE, 1, [100, 20, 10])],
      [exact(TREE, 1, 100), exact(OTHER_TREE, 1, 100)]
    )

    expect(reading.worst?.treeId).toBe(OTHER_TREE)
    expect(reading.worst?.readers).toBe(80)
    expect(reading.ranked.map((row) => row.treeId)).toEqual([OTHER_TREE, TREE])
  })

  it("names the two bands the worst page loses its readers between", () => {
    const reading = deploymentReadingOf([page(TREE, 1, [100, 90, 20])], [exact(TREE, 1, 100)])

    expect(reading.worst?.at?.after).toBe(nodeId("band2"))
    expect(reading.worst?.at?.before).toBe(nodeId("band3"))
  })

  describe("the scale two pages are ordered on", () => {
    /**
     * The whole of why this module exists. Inside one page the over-count in a
     * distinct view count divides out of a ratio; across two pages it does not,
     * because the straddle rate is each page's own.
     */
    const PAGES = [page(TREE, 1, [1_000, 600]), page(OTHER_TREE, 1, [500, 300])]
    const ROWS = [door(TREE, 1, 250, 1_000), exact(OTHER_TREE, 1, 500)]

    it("orders by the readers lost at the door's scale and not by the readers the counters report", () => {
      const reading = deploymentReadingOf(PAGES, ROWS)

      expect(reading.ranked.map((row) => row.lost)).toEqual([200, 400])
      expect(reading.ranked.map((row) => row.readers)).toEqual([200, 100])
      expect(reading.worst?.treeId).toBe(OTHER_TREE)
    })

    it("publishes the loss the counters report beside the one it ordered on", () => {
      const row = deploymentReadingOf(PAGES, ROWS).ranked.find((one) => one.treeId === TREE)

      expect(row).toMatchObject({ lost: 400, readers: 100, inflation: 3, opened: 250 })
    })

    /**
     * The mistake the published matching rule exists to prevent, from this
     * module's side: handing a lingered-over page's straddle rate to a quick one
     * is an invented correction with three decimal places on it, and nothing
     * anywhere would fail. So each page is asked to be scaled by its own row,
     * and the test is that a second page's row in the window changes neither.
     */
    it("scales each page by its own row and never by the window's", () => {
      const alone = deploymentReadingOf([PAGES[1] as ReadingProgress], [ROWS[1] as StoredPageViews])
      const beside = deploymentReadingOf(PAGES, ROWS).ranked.find(
        (one) => one.treeId === OTHER_TREE
      )

      expect(beside).toEqual(alone.ranked[0])
      expect(beside?.inflation).toBe(0)
    })

    /**
     * A loss scaled to the door can never exceed what the door counted, and the
     * proof is arithmetic rather than a clamp: the loss is at most the
     * appearances, and the appearances divided by one plus the straddle rate are
     * the openings. Worth a test because the figure is a headline and a figure
     * above its own denominator is the kind of number a screen prints with three
     * decimal places.
     */
    it("never scales a loss above the page views counted at the door", () => {
      const rows = [door(TREE, 1, 250, 1_000), door(OTHER_TREE, 1, 400, 500)]

      for (const row of deploymentReadingOf(PAGES, rows).ranked) {
        expect(row.readers).not.toBeNull()
        expect(row.readers ?? 0).toBeLessThanOrEqual(row.opened ?? 0)
      }
    })
  })

  describe("ranking two pages that lose the same", () => {
    it("prefers the larger share when two pages lose the same readers", () => {
      const reading = deploymentReadingOf(
        [page(TREE, 1, [100, 50]), page(OTHER_TREE, 1, [60, 10])],
        [exact(TREE, 1, 100), exact(OTHER_TREE, 1, 60)]
      )

      expect(reading.ranked.map((row) => row.readers)).toEqual([50, 50])
      expect(reading.worst?.treeId).toBe(OTHER_TREE)
      expect(reading.worst?.share).toBeCloseTo(50 / 60)
    })

    it("orders two identical pages by tree and newest revision, so a refresh does not reorder", () => {
      const pages = [
        page(OTHER_TREE, 1, [100, 40]),
        page(TREE, 1, [100, 40]),
        page(TREE, 2, [100, 40]),
      ]
      const rows = [exact(TREE, 1, 100), exact(TREE, 2, 100), exact(OTHER_TREE, 1, 100)]
      const once = deploymentReadingOf(pages, rows)
      const again = deploymentReadingOf([...pages].reverse(), rows)

      expect(once.ranked.map((row) => [row.treeId, row.revision])).toEqual([
        [TREE, 2],
        [TREE, 1],
        [OTHER_TREE, 1],
      ])
      expect(again.ranked).toEqual(once.ranked)
    })
  })

  describe("a page with no place in the order", () => {
    it("leaves out a page whose loss nothing can scale, and says that is what is missing", () => {
      const reading = deploymentReadingOf([page(TREE, 1, [100, 40])], [])

      expect(reading.ranked).toEqual([])
      expect(reading.worst).toBeNull()
      expect(reading.unranked.map((row) => row.standing)).toEqual(["unscaled"])
      expect(reading.unranked[0]).toMatchObject({ views: 100, opened: null, readers: null })
    })

    it("answers that nothing read a revision rather than that the door could not scale it", () => {
      const reading = deploymentReadingOf([unreadPage(TREE, 1)], [])

      expect(reading.unranked.map((row) => row.standing)).toEqual(["unread"])
    })

    it("tells a door row that has opened nothing from a door row that is missing", () => {
      const reading = deploymentReadingOf([page(TREE, 1, [100, 40])], [door(TREE, 1, 0, 100)])

      expect(reading.unranked.map((row) => row.standing)).toEqual(["unopened"])
      expect(reading.unranked[0]).toMatchObject({ opened: 0, inflation: null, readers: null })
    })

    it("reports a page that loses nobody as read rather than as a page it cannot speak for", () => {
      const reading = deploymentReadingOf([page(TREE, 1, [100, 100])], [exact(TREE, 1, 100)])

      expect(reading.unranked.map((row) => row.standing)).toEqual(["unbroken"])
      expect(reading.unranked[0]).toMatchObject({ views: 100, at: null, readers: null })
    })

    it("withholds the scaled figure where a fall is larger than anything that appeared, and keeps the fall", () => {
      const reading = deploymentReadingOf([page(TREE, 1, [100, 10])], [door(TREE, 1, 5, 20)])
      const row = reading.unranked[0]

      expect(row?.standing).toBe("inconsistent")
      expect(row?.readers).toBeNull()
      expect(row?.lost).toBe(90)
      expect(row?.share).toBeCloseTo(0.9)
      expect(row?.at?.after).toBe(nodeId("band1"))
    })

    it("counts how many pages stand in each state", () => {
      const reading = deploymentReadingOf(
        [
          page(TREE, 1, [100, 40]),
          page(TREE, 2, [100, 100]),
          page(OTHER_TREE, 1, [100, 40]),
          unreadPage(OTHER_TREE, 2),
        ],
        [exact(TREE, 1, 100), exact(TREE, 2, 100)]
      )

      expect(reading.standings).toEqual({
        ranked: 1,
        unbroken: 1,
        unread: 1,
        unscaled: 1,
        unopened: 0,
        inconsistent: 0,
      })
    })
  })

  describe("the ways an order could count one page twice", () => {
    /**
     * The first shape, and the one that would make an order lie about how much
     * there is to fix: a caller that concatenated two reads holds one page
     * twice, and a page twice in an order is a problem twice on a screen.
     */
    it("keeps one reading of a revision however many times it is handed in", () => {
      const one = page(TREE, 1, [100, 40])
      const reading = deploymentReadingOf([one, one, one], [exact(TREE, 1, 100)])

      expect(reading.ranked).toHaveLength(1)
      expect(reading.duplicated).toBe(2)
      expect(reading.arrivals).toBe(100)
      expect(reading.trees).toBe(1)
    })

    /**
     * The second shape, which is quieter and worse: doubling a page's door row
     * doubles its arrivals and halves the loss the order is on, so the page
     * moves down the order with nothing looking wrong.
     */
    it("keeps one door row per revision, so a doubled row neither doubles arrivals nor halves the loss", () => {
      const row = door(TREE, 1, 250, 1_000)
      const doubled = deploymentReadingOf([page(TREE, 1, [1_000, 600])], [row, row])
      const single = deploymentReadingOf([page(TREE, 1, [1_000, 600])], [row])

      expect(doubled.ranked).toEqual(single.ranked)
      expect(doubled.arrivals).toBe(250)
      expect(doubled.duplicatedRows).toBe(1)
      expect(single.duplicatedRows).toBe(0)
    })

    /**
     * The third shape is not a double count and is deliberately not treated as
     * one. Two revisions of one tree are two live versions of one page, both
     * with readers of their own, and the arrivals add because a page view began
     * on exactly one of them.
     */
    it("keeps both revisions of one tree in the order, and says they are one tree", () => {
      const reading = deploymentReadingOf(
        [page(TREE, 1, [900, 300]), page(TREE, 2, [100, 90])],
        [exact(TREE, 1, 900), exact(TREE, 2, 100)]
      )

      expect(reading.ranked.map((row) => row.revision)).toEqual([1, 2])
      expect(reading.trees).toBe(1)
      expect(reading.arrivals).toBe(1_000)
    })

    /**
     * The fourth shape is absent by construction, and this is what keeps it
     * absent. There is no total loss to double because the artefact is an order
     * and not a sum — so the published shape is pinned, and a figure added here
     * later has to argue with this test first.
     */
    it("publishes no deployment-wide loss", () => {
      const reading = deploymentReadingOf([page(TREE, 1, [100, 40])], [exact(TREE, 1, 100)])

      expect(Object.keys(reading).sort()).toEqual([
        "arrivals",
        "duplicated",
        "duplicatedRows",
        "ranked",
        "standings",
        "trees",
        "unranked",
        "worst",
      ])
    })
  })

  describe("a deployment with nothing in it", () => {
    it("answers nothing rather than nothing wrong", () => {
      const reading = deploymentReadingOf([], [])

      expect(reading).toMatchObject({
        ranked: [],
        unranked: [],
        worst: null,
        trees: 0,
        arrivals: 0,
        duplicated: 0,
        duplicatedRows: 0,
      })
    })

    it("ignores rows for pages it was not handed", () => {
      const reading = deploymentReadingOf([], [exact(TREE, 1, 100)])

      expect(reading.arrivals).toBe(0)
      expect(reading.duplicatedRows).toBe(0)
    })
  })

  describe("the published sets", () => {
    it("names every standing once, with the silences among them", () => {
      expect([...RANK_STANDINGS].sort()).toEqual([...new Set(RANK_STANDINGS)].sort())

      for (const silence of DEPLOYMENT_SILENCES) expect(RANK_STANDINGS).toContain(silence)
    })

    it("describes every standing, and never twice the same way", () => {
      const lines = RANK_STANDINGS.map(describeRankStanding)

      expect(new Set(lines).size).toBe(RANK_STANDINGS.length)
      expect(lines.every((line) => line.length > 0)).toBe(true)
    })
  })
})
