import { describe, expect, it } from "vitest"

import { DEFAULT_AUDIENCE_ID } from "../audience/audience.js"
import type { TreeId } from "../ids.js"
import {
  nodeId,
  OTHER_TREE,
  primitiveType,
  RIDERS,
  SKIERS,
  TREE,
} from "../testing/reader-signal-contract.js"
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
  type CollectionSchedule,
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
  audienceId: DEFAULT_AUDIENCE_ID,
  treeId,
  revision,
  opened,
  appearances,
  updatedAt: "2026-10-13T06:00:00.000Z",
})

/** A page whose readers never straddled a rollup window, so nothing needs scaling. */
const exact = (treeId: TreeId, revision: number, views: number): StoredPageViews =>
  door(treeId, revision, views, views)

const AN_HOUR = 60 * 60 * 1000

/** When the reading is taken, which is handed in rather than read off a clock. */
const NOW = "2026-10-13T12:00:00.000Z"

const ago = (ms: number): string => new Date(Date.parse(NOW) - ms).toISOString()

/** The same row, with the fold's own timestamp on it. */
const foldedAt = (row: StoredPageViews, at: string): StoredPageViews => ({ ...row, foldedAt: at })

/** The same row, filed under one of the forms a page is served in (0284). */
const inForm = (audienceId: typeof SKIERS, row: StoredPageViews): StoredPageViews => ({
  ...row,
  audienceId,
})

/** A deployment that folds hourly behind a ten-minute window, give or take. */
const schedule = (over: Partial<CollectionSchedule> = {}): CollectionSchedule => ({
  at: NOW,
  foldsWithinMs: AN_HOUR,
  ...over,
})

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

  /**
   * A page is one base tree and the deltas an audience earns (0263), so a
   * deployment serving two forms holds two readings of one tree at one
   * revision. Before the audience was in the key they were one page handed in
   * twice: the second form's reading was dropped, its readers were in no
   * figure here, and the deployment was told its caller had made a mistake.
   */
  describe("a page served in two forms", () => {
    const inAudience = (audienceId: typeof SKIERS, row: StoredPageViews): StoredPageViews => ({
      ...row,
      audienceId,
    })

    const servedTo = (audienceId: typeof SKIERS, reached: readonly number[]): PageReading =>
      pageReadingOf(
        treeOf(TREE, 1, reached.length),
        reached.flatMap((count, at) =>
          count > 0
            ? [
                {
                  ...tally(TREE, 1, `band${at + 1}`, { views: count, reached: count }),
                  audienceId,
                },
              ]
            : []
        ),
        NOTHING_DECLARED,
        audienceId
      )

    it("stands as two rows rather than one page counted twice", () => {
      const health = collectionHealthOf(
        [servedTo(SKIERS, [100, 80]), servedTo(RIDERS, [40, 30])],
        [inAudience(SKIERS, exact(TREE, 1, 100)), inAudience(RIDERS, exact(TREE, 1, 40))]
      )

      expect(health.duplicated).toBe(0)
      expect(health.pages).toHaveLength(2)
      expect(health.pages.map((page) => page.audienceId)).toEqual([RIDERS, SKIERS])
      expect(health.trees).toBe(1)
      expect(health.arrivals).toBe(140)
    })

    it("has nothing wrong with either form, where before both were a mishandled row", () => {
      const health = collectionHealthOf(
        [servedTo(SKIERS, [100, 80]), servedTo(RIDERS, [40, 30])],
        [inAudience(SKIERS, exact(TREE, 1, 100)), inAudience(RIDERS, exact(TREE, 1, 40))]
      )

      expect(health.standings.sound).toBe(2)
      expect(health.standings.faulted).toBe(0)
      expect(health.faults["rows-mishandled"]).toBe(0)
      expect(health.faults["audiences-mixed"]).toBe(0)
    })

    it("faults the caller that handed both forms in as one window, and says which fault it is", () => {
      const mixed = pageReadingOf(
        treeOf(TREE, 1, 2),
        [
          { ...tally(TREE, 1, "band1", { views: 100, reached: 100 }), audienceId: SKIERS },
          { ...tally(TREE, 1, "band1", { views: 40, reached: 40 }), audienceId: RIDERS },
        ],
        NOTHING_DECLARED
      )
      const health = collectionHealthOf([mixed], [inAudience(SKIERS, exact(TREE, 1, 100))])

      expect(faultsOn(health, TREE)).toEqual(["audiences-mixed"])
      expect(remedyOf("audiences-mixed")).toBe("caller")
      expect(health.faults["rows-mishandled"]).toBe(0)
    })
  })

  /**
   * The fault this reading could not raise until a page-view row said when the
   * fold last touched it (0274). Every case here is about the same two numbers
   * — openings waiting, and the age of the fold that should have cleared them —
   * and most of them are the cases where nothing may be claimed.
   */
  describe("a collection that has stopped, judged against the schedule its deployment states", () => {
    it("reports a revision whose openings have waited longer than a fold is meant to take", () => {
      const health = collectionHealthOf(
        [reading(TREE, 1, [100])],
        [foldedAt(door(TREE, 1, 140, 100), ago(3 * AN_HOUR))],
        schedule()
      )

      expect(faultsOn(health, TREE)).toEqual(["collection-stalled"])
      expect(health.pages[0]?.standing).toBe("faulted")
      expect(health.pages[0]?.pending).toBe(40)
      expect(health.pages[0]?.foldedAt).toBe(ago(3 * AN_HOUR))
      expect(health.readersAffected).toBe(140)
      expect(remedyOf("collection-stalled")).toBe("configuration")
    })

    /**
     * A reading that names no audience divides by every form's door added
     * together (0299), and the fold it waits on is the oldest attested by a
     * form that still has openings pending — so a fold that ran a minute ago
     * on a busy form cannot vouch for the form that has been waiting three
     * hours.
     */
    it("faults a revision where one of two forms has waited longer than a fold is meant to take", () => {
      const health = collectionHealthOf(
        [reading(TREE, 1, [100])],
        [
          foldedAt(inForm(SKIERS, door(TREE, 1, 140, 100)), ago(3 * AN_HOUR)),
          foldedAt(inForm(RIDERS, door(TREE, 1, 60, 60)), ago(60 * 1000)),
        ],
        schedule()
      )

      expect(faultsOn(health, TREE)).toEqual(["collection-stalled"])
      expect(health.pages[0]?.arrivals).toBe(200)
      expect(health.pages[0]?.pending).toBe(40)
    })

    /** And the other way about, which is why the oldest fold of them all is the wrong rule. */
    it("leaves a revision sound where the old fold belongs to the form with nothing pending", () => {
      const health = collectionHealthOf(
        [reading(TREE, 1, [100])],
        [
          foldedAt(inForm(SKIERS, door(TREE, 1, 140, 100)), ago(60 * 1000)),
          foldedAt(inForm(RIDERS, door(TREE, 1, 60, 60)), ago(3 * AN_HOUR)),
        ],
        schedule()
      )

      expect(faultsOn(health, TREE)).toEqual([])
      expect(health.pages[0]?.arrivals).toBe(200)
      expect(health.pages[0]?.pending).toBe(40)
    })

    /** The allowance itself is sound, which is the boundary the threshold rule asks for. */
    it("leaves a fold exactly as old as the allowance sound and faults the millisecond past it", () => {
      const rows = (lag: number): readonly StoredPageViews[] => [
        foldedAt(door(TREE, 1, 140, 100), ago(lag)),
      ]

      expect(
        faultsOn(collectionHealthOf([reading(TREE, 1, [100])], rows(AN_HOUR), schedule()), TREE)
      ).toEqual([])
      expect(
        faultsOn(collectionHealthOf([reading(TREE, 1, [100])], rows(AN_HOUR + 1), schedule()), TREE)
      ).toEqual(["collection-stalled"])
    })

    /**
     * The reading a caller with nothing to promise gets, which is every caller
     * until a deployment states its own cron interval.
     */
    it("claims nothing where no schedule was handed in, however old the fold is", () => {
      const health = collectionHealthOf(
        [reading(TREE, 1, [100])],
        [foldedAt(door(TREE, 1, 140, 100), ago(400 * AN_HOUR))]
      )

      expect(faultsOn(health, TREE)).toEqual([])
      expect(health.pages[0]?.foldedAt).toBe(ago(400 * AN_HOUR))
      expect(health.pending).toBe(40)
      expect(health.unattested).toBe(0)
    })

    /**
     * Every row of a deployment upgraded past the column, until its next fold.
     * A stalled collection and a revision published two minutes ago read the
     * same here, which is exactly the state the fault was dropped for in 0271.
     */
    it("claims nothing about a row no fold has ever touched, and counts the wait as unattested", () => {
      const health = collectionHealthOf(
        [reading(TREE, 1, [100])],
        [door(TREE, 1, 140, 100)],
        schedule()
      )

      expect(faultsOn(health, TREE)).toEqual([])
      expect(health.pages[0]?.foldedAt).toBeNull()
      expect(health.pages[0]?.pending).toBe(40)
      expect(health.unattested).toBe(1)
    })

    it("counts an unattested wait whether or not a schedule was handed in", () => {
      const rows = [door(TREE, 1, 140, 100)]

      expect(collectionHealthOf([reading(TREE, 1, [100])], rows).unattested).toBe(1)
      expect(collectionHealthOf([reading(TREE, 1, [100])], rows, schedule()).unattested).toBe(1)
    })

    /**
     * A collection that stopped where nobody has arrived since is costing no
     * reader's measurement anything, and there is nothing waiting for it.
     */
    it("leaves a page with nothing pending sound however long ago it was folded", () => {
      const health = collectionHealthOf(
        [reading(TREE, 1, [100])],
        [foldedAt(exact(TREE, 1, 100), ago(900 * AN_HOUR))],
        schedule()
      )

      expect(faultsOn(health, TREE)).toEqual([])
      expect(health.pages[0]?.standing).toBe("sound")
      expect(health.unattested).toBe(0)
    })

    /**
     * A nought allowance would turn the lag the design *requires* — one window
     * of batches waiting to ripen — into a fault on every live page.
     */
    it("judges nothing against an allowance that is not a positive number of milliseconds", () => {
      const rows = [foldedAt(door(TREE, 1, 140, 100), ago(900 * AN_HOUR))]

      for (const foldsWithinMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(
          faultsOn(
            collectionHealthOf([reading(TREE, 1, [100])], rows, schedule({ foldsWithinMs })),
            TREE
          )
        ).toEqual([])
      }
    })

    it("judges nothing against an instant that does not parse", () => {
      const health = collectionHealthOf(
        [reading(TREE, 1, [100])],
        [foldedAt(door(TREE, 1, 140, 100), ago(900 * AN_HOUR))],
        schedule({ at: "the day before yesterday" })
      )

      expect(faultsOn(health, TREE)).toEqual([])
    })

    /** Two clocks disagreeing is not a stall, and it needs no case of its own. */
    it("does not fault a fold the clocks put in the future", () => {
      const health = collectionHealthOf(
        [reading(TREE, 1, [100])],
        [foldedAt(door(TREE, 1, 140, 100), new Date(Date.parse(NOW) + AN_HOUR).toISOString())],
        schedule()
      )

      expect(faultsOn(health, TREE)).toEqual([])
    })

    /**
     * A window of counters a caller read may hold nothing while the lifetime
     * appearances hold something, so the page is `unfolded` by the counts and
     * `faulted` by the clock — and the fault is the thing to act on.
     */
    it("faults a page whose window is empty rather than calling it merely unfolded", () => {
      const health = collectionHealthOf(
        [unread(TREE, 1)],
        [foldedAt(door(TREE, 1, 80, 5), ago(5 * AN_HOUR))],
        schedule()
      )

      expect(faultsOn(health, TREE)).toEqual(["collection-stalled"])
      expect(health.pages[0]?.standing).toBe("faulted")
      expect(health.standings.unfolded).toBe(0)
    })

    /**
     * The double count this reading guards, with the new fault in it: a page
     * with two things wrong is one page and its readers are added once (0158).
     */
    it("counts the readers of a page that has stalled and has an old sender exactly once", () => {
      const health = collectionHealthOf(
        [uncredited(TREE, 1, 100)],
        [foldedAt(door(TREE, 1, 140, 100), ago(9 * AN_HOUR))],
        schedule()
      )

      expect(faultsOn(health, TREE)).toEqual(["collection-stalled", "actions-uncredited"])
      expect(health.standings.faulted).toBe(1)
      expect(health.faults["collection-stalled"]).toBe(1)
      expect(health.faults["actions-uncredited"]).toBe(1)
      expect(health.readersAffected).toBe(140)
      expect(health.arrivals).toBe(140)
    })

    /**
     * The two faults one hand answers for cannot both be true of one row, and
     * the reason is arithmetic rather than policy: `drift` and `pending` are the
     * two signs of one subtraction (0219), so a revision whose appearances
     * outrun its openings has nothing pending to be late. Pinned because a
     * surface may draw the configuration errand once and the ordering of the
     * two then decides which sentence it prints.
     */
    it("never reports an inflated count and a stalled fold on one revision", () => {
      const inflated = collectionHealthOf(
        [reading(TREE, 1, [100])],
        [foldedAt(door(TREE, 1, 100, 100 + 100 * COUNTS_INFLATED_ABOVE + 1), ago(9 * AN_HOUR))],
        schedule()
      )

      expect(faultsOn(inflated, TREE)).toEqual(["counts-inflated"])
      expect(inflated.pages[0]?.pending).toBe(0)
    })

    it("counts two stalled revisions of one tree as two faults and their readers once each", () => {
      const health = collectionHealthOf(
        [reading(TREE, 1, [100]), reading(TREE, 2, [40])],
        [
          foldedAt(door(TREE, 1, 140, 100), ago(9 * AN_HOUR)),
          foldedAt(door(TREE, 2, 60, 40), ago(9 * AN_HOUR)),
        ],
        schedule()
      )

      expect(health.faults["collection-stalled"]).toBe(2)
      expect(health.standings.faulted).toBe(2)
      expect(health.readersAffected).toBe(200)
      expect(health.trees).toBe(1)
    })

    it("drops a stalled revision handed in twice rather than counting its readers twice", () => {
      const twice = reading(TREE, 1, [100])
      const health = collectionHealthOf(
        [twice, twice],
        [foldedAt(door(TREE, 1, 140, 100), ago(9 * AN_HOUR))],
        schedule()
      )

      expect(health.duplicated).toBe(1)
      expect(health.faults["collection-stalled"]).toBe(1)
      expect(health.readersAffected).toBe(140)
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
      expect(COLLECTION_FAULTS).toHaveLength(7)

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
     * Four hands and six faults, and the point of the mapping is that two
     * faults falling to the same hand is one errand: a deployment told *your
     * senders are old* twice does not go twice.
     */
    it("falls to two hands twice each and names one hand it cannot determine", () => {
      const remedies = COLLECTION_FAULTS.map(remedyOf)

      expect(remedies.filter((remedy) => remedy === "senders")).toHaveLength(2)
      expect(remedies.filter((remedy) => remedy === "configuration")).toHaveLength(2)
      expect(remedies.filter((remedy) => remedy === "undetermined")).toHaveLength(1)
      expect(new Set(remedies).size).toBe(FAULT_REMEDIES.length)
    })

    /**
     * The two configuration faults are adjacent in the published order because
     * they are one errand — the rollup window is what both of them are about.
     */
    it("publishes the two faults one hand answers for next to each other", () => {
      expect(COLLECTION_FAULTS.indexOf("collection-stalled")).toBe(
        COLLECTION_FAULTS.indexOf("counts-inflated") + 1
      )
    })
  })
})
