import { describe, expect, it } from "vitest"

import type { TreeId } from "../ids.js"
import { nodeId, OTHER_TREE, primitiveType, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  COLLECTION_FAULTS,
  collectionHealthOf,
  COUNTS_INFLATED_ABOVE,
  describeCollectionFault,
  describeHealthStanding,
  FAULT_REMEDIES,
  HEALTH_STANDINGS,
  pageReadingOf,
  remedyOf,
  type PageReading,
  type PartDeclarations,
  type ReaderTally,
  type StoredPageViews,
} from "./index.js"

/**
 * Built on real readings and real door rows, because what is being tested is a
 * verdict about what a deployment holds: a tree and a window's counters go in
 * one end and *this is wrong, and here is whose it is* comes out of the other.
 */

const NOTHING_DECLARED: PartDeclarations = {
  copyFor: () => undefined,
  typesWithRole: () => [],
}

const band = (name: string, children: readonly ElementNode[] = []): ElementNode => ({
  kind: "element",
  id: nodeId(name),
  type: primitiveType("loom.section"),
  props: {},
  children,
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
  counters: Partial<ReaderTally> = {}
): ReaderTally => ({
  treeId,
  revision,
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

/**
 * One page of bands, each reached by the readers given, with no row at all where
 * nobody reached one — which is what a rollup writes.
 */
const reading = (
  treeId: TreeId,
  revision: number,
  reached: readonly number[],
  extra: readonly ReaderTally[] = []
): PageReading =>
  pageReadingOf(
    treeOf(treeId, revision, reached.length),
    [
      ...reached.flatMap((count, at) =>
        count > 0
          ? [tally(treeId, revision, `band${at + 1}`, { views: count, reached: count })]
          : []
      ),
      ...extra,
    ],
    NOTHING_DECLARED
  )

/**
 * A page whose second band holds presses and whose every part credits a reader
 * with nothing, which is what a sender that does not walk its ancestry writes.
 */
const uncredited = (treeId: TreeId, revision: number, readers: number): PageReading =>
  reading(treeId, revision, [readers, 0], [
    tally(treeId, revision, "band2", { activations: 3 }),
  ])

/** A page nothing reported at all, which is a tree, a revision and an empty window. */
const unread = (treeId: TreeId, revision: number): PageReading =>
  pageReadingOf(treeOf(treeId, revision, 3), [], NOTHING_DECLARED)

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
  updatedAt: "2026-10-13T06:00:00.000Z",
})

/** A page whose readers never straddled a rollup window, so nothing needs scaling. */
const exact = (treeId: TreeId, revision: number, views: number): StoredPageViews =>
  door(treeId, revision, views, views)

const faultsOn = (
  health: ReturnType<typeof collectionHealthOf>,
  treeId: TreeId,
  revision = 1
): readonly string[] =>
  health.pages.find((page) => page.treeId === treeId && page.revision === revision)?.faults ?? []

const named = (page: { readonly treeId: TreeId; readonly revision: number }): string =>
  `${page.treeId}@${String(page.revision)}`

describe("collectionHealthOf", () => {
  it("says nothing is wrong with a deployment whose senders, window and caller are all sound", () => {
    const health = collectionHealthOf(
      [reading(TREE, 1, [100, 80]), reading(OTHER_TREE, 1, [40, 30])],
      [exact(TREE, 1, 100), exact(OTHER_TREE, 1, 40)]
    )

    expect(health.standings.sound).toBe(2)
    expect(health.standings.faulted).toBe(0)
    expect(health.worst).toBeNull()
    expect(health.readersAffected).toBe(0)
    expect(health.arrivals).toBe(140)
    expect(health.trees).toBe(2)
  })

  it("names the faulted page costing the most readers, by headcount and not by fault count", () => {
    const health = collectionHealthOf(
      [
        uncredited(TREE, 1, 900),
        reading(OTHER_TREE, 1, [30], [tally(OTHER_TREE, 1, "ghost", { views: 2, reached: 2 })]),
      ],
      [exact(TREE, 1, 900), exact(OTHER_TREE, 1, 30)]
    )

    expect(health.worst?.treeId).toBe(TREE)
    expect(health.worst?.arrivals).toBe(900)
    expect(faultsOn(health, OTHER_TREE)).toEqual(["rows-mishandled"])
    expect(health.faulted.map((page) => page.treeId)).toEqual([TREE, OTHER_TREE])
  })

  describe("the faults a deployment's own collection can have", () => {
    it("reports a revision whose counters hold readers and whose door row is missing", () => {
      const health = collectionHealthOf([reading(TREE, 1, [100, 60])], [])

      expect(faultsOn(health, TREE)).toEqual(["door-unscaled"])
      expect(health.pages[0]?.arrivals).toBeNull()
      expect(health.pages[0]?.views).toBe(100)
      expect(remedyOf("door-unscaled")).toBe("undetermined")
    })

    it("reports a door row that has appeared in a rollup and never said a page view began", () => {
      const health = collectionHealthOf([reading(TREE, 1, [100])], [door(TREE, 1, 0, 100)])

      expect(faultsOn(health, TREE)).toEqual(["openings-unmarked"])
      expect(remedyOf("openings-unmarked")).toBe("senders")
    })

    /**
     * The degenerate row the first spelling of this check passed over: a door
     * row with nothing in it at all, beside counters full of readers.
     */
    it("reports an empty door row beside counters that hold readers", () => {
      const health = collectionHealthOf([reading(TREE, 1, [100])], [door(TREE, 1, 0, 0)])

      expect(faultsOn(health, TREE)).toEqual(["openings-unmarked"])
    })

    it("reports counts inflated past the published threshold, and leaves the threshold itself sound", () => {
      const over = collectionHealthOf(
        [reading(TREE, 1, [100])],
        [door(TREE, 1, 100, 100 + 100 * COUNTS_INFLATED_ABOVE + 1)]
      )
      const at = collectionHealthOf(
        [reading(TREE, 1, [100])],
        [door(TREE, 1, 100, 100 + 100 * COUNTS_INFLATED_ABOVE)]
      )

      expect(faultsOn(over, TREE)).toEqual(["counts-inflated"])
      expect(faultsOn(at, TREE)).toEqual([])
      expect(remedyOf("counts-inflated")).toBe("configuration")
    })

    it("reports a sender that adds presses and credits no reader with acting inside anything", () => {
      const health = collectionHealthOf([uncredited(TREE, 1, 100)], [exact(TREE, 1, 100)])

      expect(faultsOn(health, TREE)).toEqual(["actions-uncredited"])
      expect(remedyOf("actions-uncredited")).toBe("senders")
    })

    it("leaves a page whose presses are credited to readers sound", () => {
      const health = collectionHealthOf(
        [
          pageReadingOf(
            {
              treeId: TREE,
              schemaVersion: TREE_SCHEMA_VERSION,
              revision: 1,
              root: band("page", [band("inner")]),
            },
            [
              tally(TREE, 1, "page", { views: 100, reached: 100, engaged: 40, activations: 7 }),
              tally(TREE, 1, "inner", { views: 90, reached: 90 }),
            ],
            NOTHING_DECLARED
          ),
        ],
        [exact(TREE, 1, 100)]
      )

      expect(faultsOn(health, TREE)).toEqual([])
    })

    it("reports counters naming a node the revision does not contain", () => {
      const health = collectionHealthOf(
        [reading(TREE, 1, [100], [tally(TREE, 1, "ghost", { views: 5, reached: 5 })])],
        [exact(TREE, 1, 100)]
      )

      expect(faultsOn(health, TREE)).toEqual(["rows-mishandled"])
      expect(health.pages[0]?.orphaned).toBe(1)
      expect(remedyOf("rows-mishandled")).toBe("caller")
    })

    it("reports a caller that concatenated two reads, in the counters and at the door alike", () => {
      const counters = collectionHealthOf(
        [reading(TREE, 1, [100], [tally(TREE, 1, "band1", { views: 60, reached: 60 })])],
        [exact(TREE, 1, 100)]
      )
      const rows = collectionHealthOf(
        [reading(TREE, 1, [100])],
        [exact(TREE, 1, 100), exact(TREE, 1, 100)]
      )

      expect(faultsOn(counters, TREE)).toEqual(["rows-mishandled"])
      expect(counters.pages[0]?.doubled).toBe(1)
      expect(faultsOn(rows, TREE)).toEqual(["rows-mishandled"])
      expect(rows.pages[0]?.doubled).toBe(1)
      expect(rows.pages[0]?.arrivals).toBe(100)
    })

    it("reports every fault a page has rather than the first one found, in the published order", () => {
      const health = collectionHealthOf(
        [
          reading(TREE, 1, [100, 0], [
            tally(TREE, 1, "band2", { activations: 3 }),
            tally(TREE, 1, "band1", { views: 5, reached: 5 }),
            tally(TREE, 1, "ghost", { views: 4, reached: 4 }),
          ]),
        ],
        [door(TREE, 1, 0, 400)]
      )

      expect(faultsOn(health, TREE)).toEqual([
        "openings-unmarked",
        "actions-uncredited",
        "rows-mishandled",
      ])
    })
  })

  describe("the readers a fault costs", () => {
    /**
     * The double-count available to this reading, and the one thing it guards: a
     * page with four faults is one page, and a count that has been added cannot
     * be unadded (0158).
     */
    it("adds a faulted revision's readers once however many faults it has", () => {
      const health = collectionHealthOf(
        [
          reading(TREE, 1, [100, 0], [
            tally(TREE, 1, "band2", { activations: 3 }),
            tally(TREE, 1, "band1", { views: 5, reached: 5 }),
            tally(TREE, 1, "ghost", { views: 4, reached: 4 }),
          ]),
        ],
        [door(TREE, 1, 100, 400)]
      )

      expect(health.pages[0]?.faults).toEqual([
        "counts-inflated",
        "actions-uncredited",
        "rows-mishandled",
      ])
      expect(health.standings.faulted).toBe(1)
      expect(health.readersAffected).toBe(100)
      expect(health.faults["counts-inflated"]).toBe(1)
      expect(health.faults["actions-uncredited"]).toBe(1)
      expect(health.faults["rows-mishandled"]).toBe(1)
      expect(health.faults["openings-unmarked"]).toBe(0)
    })

    it("adds the readers of every faulted revision the door can price, and no others", () => {
      const health = collectionHealthOf(
        [uncredited(TREE, 1, 100), uncredited(TREE, 2, 50), reading(OTHER_TREE, 1, [70])],
        [exact(TREE, 1, 100), exact(TREE, 2, 50), exact(OTHER_TREE, 1, 70)]
      )

      expect(health.readersAffected).toBe(150)
      expect(health.arrivals).toBe(220)
      expect(health.trees).toBe(2)
    })

    it("keeps a faulted revision the door cannot price out of the ranking and out of the total", () => {
      const health = collectionHealthOf(
        [reading(TREE, 1, [9_000]), uncredited(OTHER_TREE, 1, 20)],
        [exact(OTHER_TREE, 1, 20)]
      )

      expect(health.unpriced.map((page) => page.treeId)).toEqual([TREE])
      expect(health.faulted.map((page) => page.treeId)).toEqual([OTHER_TREE])
      expect(health.worst?.treeId).toBe(OTHER_TREE)
      expect(health.readersAffected).toBe(20)
    })

    it("counts two revisions of one tree as two pages and one tree", () => {
      const health = collectionHealthOf(
        [reading(TREE, 1, [100]), reading(TREE, 2, [40])],
        [exact(TREE, 1, 100), exact(TREE, 2, 40)]
      )

      expect(health.pages).toHaveLength(2)
      expect(health.trees).toBe(1)
      expect(health.arrivals).toBe(140)
    })

    it("drops a revision handed in twice rather than counting its readers twice", () => {
      const twice = uncredited(TREE, 1, 100)
      const health = collectionHealthOf([twice, twice], [exact(TREE, 1, 100)])

      expect(health.duplicated).toBe(1)
      expect(health.pages).toHaveLength(1)
      expect(health.readersAffected).toBe(100)
    })
  })

  describe("what is a quiet window rather than a fault", () => {
    it("calls a revision nothing was collected about unmeasured", () => {
      const health = collectionHealthOf([unread(TREE, 1)], [])

      expect(health.pages[0]?.standing).toBe("unmeasured")
      expect(health.pages[0]?.faults).toEqual([])
      expect(health.standings.faulted).toBe(0)
    })

    it("calls a revision whose openings no rollup has folded unfolded, and never stalled", () => {
      const health = collectionHealthOf([unread(TREE, 1)], [door(TREE, 1, 80, 0)])

      expect(health.pages[0]?.standing).toBe("unfolded")
      expect(health.pages[0]?.pending).toBe(80)
      expect(health.pages[0]?.faults).toEqual([])
      expect(health.pending).toBe(80)
    })

    it("publishes the openings a rollup is behind on a page that is otherwise sound", () => {
      const health = collectionHealthOf([reading(TREE, 1, [100])], [door(TREE, 1, 140, 100)])

      expect(health.pages[0]?.standing).toBe("sound")
      expect(health.pages[0]?.pending).toBe(40)
      expect(health.pages[0]?.inflation).toBe(0)
    })

    /**
     * A revision nobody opened in the window needs no door row, and reporting it
     * as a page the door could not price would make an idle page look broken.
     */
    it("does not ask for a door row for a revision nothing reported", () => {
      const health = collectionHealthOf([unread(TREE, 1), reading(OTHER_TREE, 1, [10])], [])

      expect(faultsOn(health, TREE)).toEqual([])
      expect(faultsOn(health, OTHER_TREE)).toEqual(["door-unscaled"])
    })
  })

  describe("the order the pages come back in", () => {
    it("ranks the faulted by readers, then by the view floor, then by page", () => {
      const health = collectionHealthOf(
        [uncredited(OTHER_TREE, 1, 100), uncredited(TREE, 1, 100), uncredited(TREE, 2, 500)],
        [exact(TREE, 1, 100), exact(TREE, 2, 500), exact(OTHER_TREE, 1, 100)]
      )

      expect(health.faulted.map(named)).toEqual([
        `${TREE}@2`,
        `${TREE}@1`,
        `${OTHER_TREE}@1`,
      ])
    })

    it("lists every page by tree id and newest revision first, whatever order they came in", () => {
      const health = collectionHealthOf(
        [reading(TREE, 1, [10]), reading(OTHER_TREE, 1, [10]), reading(TREE, 3, [10])],
        [exact(TREE, 1, 10), exact(TREE, 3, 10), exact(OTHER_TREE, 1, 10)]
      )

      expect(health.pages.map(named)).toEqual([`${TREE}@3`, `${TREE}@1`, `${OTHER_TREE}@1`])
    })

    it("has nothing to say about a deployment nothing was read of", () => {
      const health = collectionHealthOf([], [])

      expect(health.pages).toEqual([])
      expect(health.worst).toBeNull()
      expect(health.readersAffected).toBe(0)
      expect(health.arrivals).toBe(0)
      expect(health.pending).toBe(0)
      expect(health.trees).toBe(0)
    })
  })

  describe("the vocabularies this reading publishes", () => {
    it("gives every fault a remedy, a sentence and a place in the published order", () => {
      expect(COLLECTION_FAULTS).toHaveLength(5)

      for (const fault of COLLECTION_FAULTS) {
        expect(FAULT_REMEDIES).toContain(remedyOf(fault))
        expect(describeCollectionFault(fault).length).toBeGreaterThan(0)
      }
    })

    it("gives every standing a sentence", () => {
      for (const standing of HEALTH_STANDINGS) {
        expect(describeHealthStanding(standing).length).toBeGreaterThan(0)
      }
    })

    /**
     * Four hands and five faults, and the point of the mapping is that two
     * faults falling to the same hand is one errand: a deployment told *your
     * senders are old* twice does not go twice.
     */
    it("falls to the senders for two faults and names one hand it cannot determine", () => {
      const remedies = COLLECTION_FAULTS.map(remedyOf)

      expect(remedies.filter((remedy) => remedy === "senders")).toHaveLength(2)
      expect(remedies.filter((remedy) => remedy === "undetermined")).toHaveLength(1)
      expect(new Set(remedies).size).toBe(FAULT_REMEDIES.length)
    })
  })
})
