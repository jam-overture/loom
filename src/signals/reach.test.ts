import { describe, expect, it } from "vitest"

import type { JsonObject } from "../json.js"
import { nodeId, primitiveType, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  pageReachOf,
  pageReadingOf,
  pageViewReadingOf,
  type PartDeclarations,
  type ReaderTally,
  type StoredPageViews,
} from "./index.js"

/**
 * Built on a reading and on page-view rows, because those are what the function
 * takes: a tree, a window's counters and the two numbers the door and the
 * rollups wrote go in one end, and a share of the readers there were comes out
 * of the other.
 */

const element = (
  name: string,
  type: string,
  props: JsonObject = {},
  children: readonly LoomNode[] = []
): ElementNode => ({
  kind: "element",
  id: nodeId(name),
  type: primitiveType(type),
  props,
  children,
})

const treeOf = (root: ElementNode, revision = 1): LoomTree => ({
  treeId: TREE,
  schemaVersion: TREE_SCHEMA_VERSION,
  revision,
  root,
})

const NOTHING_DECLARED: PartDeclarations = {
  copyFor: () => undefined,
  typesWithRole: () => [],
}

const tally = (name: string, counters: Partial<ReaderTally> = {}): ReaderTally => ({
  treeId: TREE,
  revision: 1,
  nodeId: nodeId(name),
  type: primitiveType("loom.section"),
  views: 0,
  reached: 0,
  engaged: 0,
  dwellMs: 0,
  activations: 0,
  opens: 0,
  closes: 0,
  completions: 0,
  ...counters,
})

const views = (row: Partial<StoredPageViews> = {}): StoredPageViews => ({
  treeId: TREE,
  revision: 1,
  opened: 0,
  appearances: 0,
  updatedAt: "2026-10-05T00:00:00.000Z",
  ...row,
})

/** A root and three bands, which is the shape every case here is asked about. */
const PAGE = element("page", "loom.stack", {}, [
  element("one", "loom.section"),
  element("two", "loom.section"),
  element("three", "loom.section"),
])

const reachOf = (counters: readonly ReaderTally[], rows: readonly StoredPageViews[]) =>
  pageReachOf(pageReadingOf(treeOf(PAGE), counters, NOTHING_DECLARED), rows)

const partOf = (reach: ReturnType<typeof pageReachOf>, name: string) =>
  reach.parts.find((part) => part.nodeId === nodeId(name))

describe("pageReachOf", () => {
  it("says how many of the readers who arrived got as far as a part", () => {
    const reach = reachOf(
      [
        tally("page", { views: 400, reached: 400 }),
        tally("one", { views: 400, reached: 400 }),
        tally("two", { views: 250, reached: 250 }),
      ],
      [views({ opened: 320, appearances: 400 })]
    )

    expect(reach.silence).toBeNull()
    expect(reach.opened).toBe(320)
    expect(reach.unreconciled).toEqual([])
    expect(partOf(reach, "two")).toMatchObject({
      reached: 250,
      share: 0.625,
      readers: 200,
      atMostReaders: 250,
    })
    expect(partOf(reach, "two")?.atMost).toBeCloseTo(0.78125, 10)
    /**
     * A root is in the viewport of every page view, so the share of readers who
     * reached it is 1 and its headcount is the arrival count itself. Nothing
     * computes that specially; it falls out of dividing by the denominator that
     * carries the same over-count.
     */
    expect(partOf(reach, "page")).toMatchObject({ share: 1, readers: 320, atMost: 1 })
  })

  it("divides the straddle out of the share and keeps the exact count for the headcount", () => {
    const counters = [
      tally("page", { views: 400, reached: 400 }),
      tally("two", { views: 250, reached: 250 }),
    ]

    /**
     * The same readers, counted by rollups twice as often. The share has to be
     * the same number and the headcount has to be the same number, because
     * neither the page nor the readers changed — only the window length did.
     */
    const once = reachOf(counters, [views({ opened: 320, appearances: 400 })])
    const twice = reachOf(
      [
        tally("page", { views: 800, reached: 800 }),
        tally("two", { views: 500, reached: 500 }),
      ],
      [views({ opened: 320, appearances: 800 })]
    )

    expect(twice.parts.map((part) => part.share)).toEqual(once.parts.map((part) => part.share))
    expect(twice.parts.map((part) => part.readers)).toEqual(once.parts.map((part) => part.readers))
  })

  it("is exact where nobody's visit spanned two windows, and says so", () => {
    const reach = reachOf(
      [tally("page", { views: 100, reached: 100 }), tally("two", { views: 40, reached: 40 })],
      [views({ opened: 100, appearances: 100 })]
    )

    expect(reach.exact).toBe(true)
    expect(reach.drift).toBe(0)
    expect(reach.inflation).toBe(0)
    expect(partOf(reach, "two")).toMatchObject({
      share: 0.4,
      atMost: 0.4,
      readers: 40,
      atMostReaders: 40,
    })
  })

  it("holds the ceiling at one where more reach was counted than readers arrived", () => {
    /**
     * Every visit spanned three windows, so the reach of a part half the
     * readers saw is above the openings. That is the ordinary state and not a
     * fault: the ceiling goes vacuous and the estimate is the figure with
     * information in it.
     */
    const reach = reachOf(
      [tally("page", { views: 300, reached: 300 }), tally("two", { views: 150, reached: 150 })],
      [views({ opened: 100, appearances: 300 })]
    )

    expect(reach.unreconciled).toEqual([])
    expect(partOf(reach, "two")).toMatchObject({
      share: 0.5,
      atMost: 1,
      readers: 50,
      atMostReaders: 100,
      unreconciled: false,
    })
  })

  it("marks counters older than the column rather than dividing them into a share under one", () => {
    /**
     * Reach added over windows the openings were never counted for. The drift
     * is nought, so this is not a straddle, and the share above one is the
     * alarm rather than a figure to draw.
     */
    const reach = reachOf(
      [tally("page", { views: 150, reached: 150 })],
      [views({ opened: 100, appearances: 100 })]
    )

    expect(reach.exact).toBe(true)
    expect(reach.drift).toBe(0)
    expect(reach.unreconciled).toEqual([nodeId("page")])
    expect(partOf(reach, "page")).toMatchObject({
      share: 1.5,
      atMost: 1,
      readers: null,
      atMostReaders: 100,
      unreconciled: true,
    })
  })

  it("withholds the headcount while openings are pending and keeps the share", () => {
    const reach = reachOf(
      [tally("page", { views: 60, reached: 60 }), tally("two", { views: 30, reached: 30 })],
      [views({ opened: 100, appearances: 60 })]
    )

    expect(reach.pending).toBe(40)
    expect(reach.exact).toBe(false)
    expect(partOf(reach, "two")).toMatchObject({
      share: 0.5,
      atMost: 0.3,
      readers: null,
      atMostReaders: 30,
    })
  })

  it("never puts the headcount above the most readers who could have got there", () => {
    const rows = [
      views({ opened: 320, appearances: 400 }),
      views({ opened: 100, appearances: 100 }),
      views({ opened: 1, appearances: 7 }),
    ]

    for (const row of rows) {
      const reach = reachOf(
        [
          tally("page", { views: 400, reached: 400 }),
          tally("one", { views: 213, reached: 213 }),
          tally("two", { views: 7, reached: 7 }),
        ],
        [row]
      )

      for (const part of reach.parts) {
        if (part.readers === null) continue

        expect(part.atMostReaders).not.toBeNull()
        expect(part.readers).toBeLessThanOrEqual(part.atMostReaders ?? 0)
      }
    }
  })

  it("gives a whole number of readers where the share divides exactly", () => {
    /**
     * Seven in a hundred, of a hundred readers, is seven — and is seven and a
     * quadrillionth if the share is multiplied back up instead of the two
     * counts being divided once.
     */
    const reach = reachOf(
      [tally("page", { views: 100, reached: 100 }), tally("two", { views: 7, reached: 7 })],
      [views({ opened: 100, appearances: 100 })]
    )

    expect(partOf(reach, "two")?.readers).toBe(7)
    expect(partOf(reach, "page")?.readers).toBe(100)
  })

  it("says nothing where no page views have been counted for the revision", () => {
    const reach = reachOf([tally("page", { views: 40, reached: 40 })], [])

    expect(reach.silence).toBe("unmeasured")
    expect(reach.exact).toBe(false)
    expect(reach.opened).toBe(0)
    expect(reach.updatedAt).toBeNull()
    expect(partOf(reach, "page")).toMatchObject({
      reached: 40,
      share: null,
      atMost: null,
      readers: null,
      atMostReaders: null,
      unreconciled: false,
    })
  })

  it("separates a sender that never marks an opening from a revision nobody read", () => {
    const unmarked = reachOf(
      [tally("page", { views: 50, reached: 50 })],
      [views({ opened: 0, appearances: 50 })]
    )
    const unread = reachOf([], [views({ opened: 0, appearances: 0 })])

    expect(unmarked.silence).toBe("unopened")
    expect(unmarked.appearances).toBe(50)
    expect(unread.silence).toBe("unopened")
    expect(unread.appearances).toBe(0)
  })

  it("says the collection has not folded a window yet rather than that nobody read", () => {
    const reach = reachOf([], [views({ opened: 40, appearances: 0 })])

    expect(reach.silence).toBe("uncounted")
    expect(reach.pending).toBe(40)
    expect(reach.parts.every((part) => part.share === null)).toBe(true)
  })

  it("drops the rows filed under another revision and says how many", () => {
    /** The other revision first, because a filter that reads row zero passes otherwise. */
    const reach = reachOf(
      [tally("page", { views: 100, reached: 100 })],
      [
        views({ revision: 2, opened: 9000, appearances: 9000 }),
        views({ opened: 100, appearances: 100 }),
      ]
    )

    expect(reach.foreign).toBe(1)
    expect(reach.opened).toBe(100)
    expect(partOf(reach, "page")?.readers).toBe(100)
  })

  /**
   * The double-count case this lane requires of anything that counts.
   *
   * Two rows for one revision are two reads of the same counter, which is what
   * a caller who concatenated instead of letting the store answer hands in — so
   * the two differ, because the second was taken later. Adding them doubles a
   * number that is already a total, and taking the later one is a choice this
   * cannot make on the caller's behalf.
   */
  it("counts one revision's readers once when the counter is handed in twice", () => {
    const earlier = views({ opened: 100, appearances: 100 })
    const later = views({ opened: 140, appearances: 120, updatedAt: "2026-10-05T01:00:00.000Z" })
    const reach = reachOf([tally("page", { views: 100, reached: 100 })], [earlier, later])

    expect(reach.duplicated).toBe(1)
    expect(reach.opened).toBe(100)
    expect(reach.appearances).toBe(100)
    expect(reach.updatedAt).toBe(earlier.updatedAt)
    expect(partOf(reach, "page")).toMatchObject({ share: 1, readers: 100 })
  })

  /**
   * One reader who reached three bands is in three rows, so a page-level sum of
   * readers would report three people. The field's absence is the decision, and
   * this is here because adding it is the natural thing for a later run to do.
   */
  it("has no page-level total of the readers who got anywhere", () => {
    const reach = reachOf(
      [
        tally("page", { views: 1, reached: 1 }),
        tally("one", { views: 1, reached: 1 }),
        tally("two", { views: 1, reached: 1 }),
      ],
      [views({ opened: 1, appearances: 1 })]
    )

    expect(reach.parts.every((part) => part.readers === 1 || part.readers === 0)).toBe(true)
    expect("readers" in reach).toBe(false)
    expect("reached" in reach).toBe(false)
  })

  it("keeps the parts in reading order with what the reading said about each", () => {
    const reach = reachOf(
      [tally("page", { views: 10, reached: 10 }), tally("one", { views: 10, reached: 10 })],
      [views({ opened: 10, appearances: 10 })]
    )

    expect(reach.parts.map((part) => part.nodeId)).toEqual([
      nodeId("page"),
      nodeId("one"),
      nodeId("two"),
      nodeId("three"),
    ])
    expect(reach.parts.map((part) => part.standing)).toEqual([
      "read",
      "read",
      "skipped",
      "skipped",
    ])
    expect(partOf(reach, "two")).toMatchObject({
      type: primitiveType("loom.section"),
      role: null,
      depth: 1,
      reached: 0,
      share: 0,
      readers: 0,
    })
  })

  it("publishes the floor the counters gave on their own beside the exact count", () => {
    const reach = reachOf(
      [tally("page", { views: 400, reached: 400 })],
      [views({ opened: 320, appearances: 400 })]
    )

    expect(reach.countedViews).toBe(400)
    expect(reach.opened).toBe(320)
  })

  it("reads the straddle through the page-view reading rather than subtracting it again", () => {
    const row = views({ opened: 320, appearances: 400 })
    const reach = reachOf([tally("page", { views: 400, reached: 400 })], [row])
    const reading = pageViewReadingOf([row])

    expect(reach.drift).toBe(reading.drift)
    expect(reach.pending).toBe(reading.pending)
    expect(reach.inflation).toBe(reading.inflation)
    expect(reach.updatedAt).toBe(row.updatedAt)
  })
})
