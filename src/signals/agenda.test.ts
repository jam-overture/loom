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
  AGENDA_WORK,
  collectionHealthOf,
  COUNTS_INFLATED_ABOVE,
  deploymentAgendaOf,
  deploymentReadingOf,
  describeAgendaWork,
  readingProgressOf,
  pageReadingOf,
  type CollectionSchedule,
  type DeploymentAgenda,
  type PageReading,
  type PartDeclarations,
  type ReaderTally,
  type StoredPageViews,
} from "./index.js"

/**
 * Built on real readings and real door rows, because what is being joined is
 * two verdicts about one window: a tree and a window's counters go in one end
 * and *rewrite this page* or *repair this measurement* comes out of the other.
 * Hand-written orders and health readings would let the join agree with itself
 * about a deployment neither reading could ever have been given.
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

/** One page of bands, each reached by the readers given, with no row where nobody reached one. */
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
        count > 0 ? [tally(treeId, revision, `band${at + 1}`, { views: count, reached: count })] : []
      ),
      ...extra,
    ],
    NOTHING_DECLARED
  )

/** A page readers leave: a hundred reach the first band and forty the second. */
const leaky = (treeId: TreeId, revision = 1): PageReading => reading(treeId, revision, [100, 40])

/**
 * The same leaky page, with counters filed against a node its tree does not
 * contain — which is a caller holding a tree and a window that do not belong
 * together, and the one fault that manufactures a fall.
 */
const mishandled = (treeId: TreeId, revision = 1): PageReading =>
  reading(treeId, revision, [100, 40], [tally(treeId, revision, "ghost", { views: 9, reached: 9 })])

/**
 * The same leaky page, with presses nobody is credited for — which is a sender
 * that does not walk its ancestry, and spends a counter no fall is made of.
 */
const uncredited = (treeId: TreeId, revision = 1): PageReading =>
  pageReadingOf(
    treeOf(treeId, revision, 2),
    [
      tally(treeId, revision, "band1", { views: 100, reached: 100 }),
      tally(treeId, revision, "band2", { views: 40, reached: 40, activations: 7 }),
    ],
    NOTHING_DECLARED
  )

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
  updatedAt: "2026-11-01T06:00:00.000Z",
})

/** A page whose readers never straddled a rollup window, so nothing needs scaling. */
const exact = (treeId: TreeId, revision: number, views: number): StoredPageViews =>
  door(treeId, revision, views, views)

const AN_HOUR = 60 * 60 * 1000
const NOW = "2026-11-01T12:00:00.000Z"

const ago = (ms: number): string => new Date(Date.parse(NOW) - ms).toISOString()

const schedule = (over: Partial<CollectionSchedule> = {}): CollectionSchedule => ({
  at: NOW,
  foldsWithinMs: AN_HOUR,
  ...over,
})

/** The route a surface takes: one window, two readings, one join. */
const agendaOf = (
  readings: readonly PageReading[],
  rows: readonly StoredPageViews[],
  over?: CollectionSchedule
): DeploymentAgenda =>
  deploymentAgendaOf(
    deploymentReadingOf(
      readings.map((page) => readingProgressOf(page)),
      rows
    ),
    collectionHealthOf(readings, rows, over)
  )

const named = (row: { readonly treeId: TreeId; readonly revision: number }): string =>
  `${row.treeId}@${String(row.revision)}`

describe("describeAgendaWork", () => {
  it("says one distinct thing about each member", () => {
    const said = AGENDA_WORK.map(describeAgendaWork)

    expect(new Set(said).size).toBe(AGENDA_WORK.length)
    expect(said.every((line) => line.length > 0)).toBe(true)
  })
})

describe("deploymentAgendaOf", () => {
  it("sends an operator to the page its readers leave, where the collection is sound", () => {
    const agenda = agendaOf(
      [leaky(TREE), reading(OTHER_TREE, 1, [40, 38])],
      [exact(TREE, 1, 100), exact(OTHER_TREE, 1, 40)]
    )

    expect(agenda.first?.work).toBe("page")
    expect(named(agenda.first!)).toBe(named({ treeId: TREE, revision: 1 }))
    expect(agenda.page.map(named)).toEqual([
      named({ treeId: TREE, revision: 1 }),
      named({ treeId: OTHER_TREE, revision: 1 }),
    ])
    expect(agenda.collection).toEqual([])
    expect(agenda.contested).toEqual([])
    expect(agenda.work).toEqual({ page: 2, collection: 0, both: 0, none: 0 })
  })

  it("takes a page whose fall its own fault manufactured out of the order, and names it with the rank it was taken from", () => {
    const agenda = agendaOf([mishandled(TREE)], [exact(TREE, 1, 100)])

    expect(agenda.page).toEqual([])
    expect(agenda.contested.map(named)).toEqual([named({ treeId: TREE, revision: 1 })])
    expect(agenda.contested[0]?.work).toBe("collection")
    expect(agenda.contested[0]?.spoiled).toBe(true)
    expect(agenda.contested[0]?.health.faults).toEqual(["rows-mishandled"])

    /** The rank it would have had travels with it, which is what says why it was moved. */
    expect(agenda.contested[0]?.order.standing).toBe("ranked")
    expect(agenda.contested[0]?.order.readers).toBe(60)
  })

  it("keeps a page whose sender credits no action in the order, because a fall is made of another counter", () => {
    const agenda = agendaOf([uncredited(TREE)], [exact(TREE, 1, 100)])

    expect(agenda.rows[0]?.health.faults).toEqual(["actions-uncredited"])
    expect(agenda.rows[0]?.work).toBe("both")
    expect(agenda.rows[0]?.spoiled).toBe(false)
    expect(agenda.page.map(named)).toEqual([named({ treeId: TREE, revision: 1 })])
    expect(agenda.collection.map(named)).toEqual([named({ treeId: TREE, revision: 1 })])
    expect(agenda.contested).toEqual([])
    expect(agenda.first?.work).toBe("both")
  })

  it("keeps a page whose rollup window is short in the order, because the ranking key already divides the inflation out", () => {
    const agenda = agendaOf([leaky(TREE)], [door(TREE, 1, 100, 200)])

    expect(COUNTS_INFLATED_ABOVE).toBeLessThan(1)
    expect(agenda.rows[0]?.health.faults).toEqual(["counts-inflated"])
    expect(agenda.rows[0]?.work).toBe("both")
    expect(agenda.page.map(named)).toEqual([named({ treeId: TREE, revision: 1 })])
    expect(agenda.contested).toEqual([])
  })

  it("contests a ranked page whose fold has stopped, because its loss is of one window and its scale of another", () => {
    const agenda = agendaOf(
      [leaky(TREE)],
      [{ ...door(TREE, 1, 100, 60), foldedAt: ago(4 * AN_HOUR) }],
      schedule()
    )

    expect(agenda.rows[0]?.health.faults).toEqual(["collection-stalled"])
    expect(agenda.contested.map(named)).toEqual([named({ treeId: TREE, revision: 1 })])
    expect(agenda.page).toEqual([])
  })

  it("puts a faulted page the door cannot price in the collection order and in no page order", () => {
    const agenda = agendaOf([leaky(TREE), leaky(OTHER_TREE)], [exact(OTHER_TREE, 1, 100)])

    expect(agenda.rows.find((row) => row.treeId === TREE)?.health.faults).toEqual(["door-unscaled"])
    expect(agenda.collection.map(named)).toEqual([named({ treeId: TREE, revision: 1 })])
    expect(agenda.page.map(named)).toEqual([named({ treeId: OTHER_TREE, revision: 1 })])

    /** Unranked, so there was no loss to spoil — which is a sentence and not a default. */
    expect(agenda.collection[0]?.spoiled).toBe(false)
    expect(agenda.collection[0]?.order.standing).toBe("unscaled")
    expect(agenda.contested).toEqual([])
  })

  it("asks for nothing about a page nobody leaves and nothing is wrong with", () => {
    const agenda = agendaOf([reading(TREE, 1, [100, 100])], [exact(TREE, 1, 100)])

    expect(agenda.rows[0]?.work).toBe("none")
    expect(agenda.rows[0]?.order.standing).toBe("unbroken")
    expect(agenda.first).toBeNull()
    expect(agenda.work).toEqual({ page: 0, collection: 0, both: 0, none: 1 })
  })

  it("counts a page once however many of its lists name it", () => {
    const agenda = agendaOf(
      [uncredited(TREE), mishandled(OTHER_TREE), reading("tree_c" as TreeId, 1, [10, 10])],
      [exact(TREE, 1, 100), exact(OTHER_TREE, 1, 100), exact("tree_c" as TreeId, 1, 10)]
    )

    const counted = AGENDA_WORK.reduce((sum, work) => sum + agenda.work[work], 0)

    expect(counted).toBe(agenda.rows.length)
    expect(agenda.rows.length).toBe(3)
    expect(agenda.work).toEqual({ page: 0, collection: 1, both: 1, none: 1 })

    /** The `both` page stands in two orders and is one page in the counts. */
    expect(agenda.page.map(named)).toEqual([named({ treeId: TREE, revision: 1 })])
    /** Two faulted pages costing the same, so health's order falls through to the tree id. */
    expect(agenda.collection.map(named)).toEqual([
      named({ treeId: TREE, revision: 1 }),
      named({ treeId: OTHER_TREE, revision: 1 }),
    ])
  })

  it("keeps the contested rows a slice of the collection order rather than a list beside it", () => {
    const agenda = agendaOf(
      [mishandled(TREE), uncredited(OTHER_TREE)],
      [exact(TREE, 1, 100), exact(OTHER_TREE, 1, 100)]
    )

    expect(agenda.contested.length).toBe(1)
    expect(agenda.contested.every((row) => agenda.collection.includes(row))).toBe(true)
  })

  it("puts a contested page before the head of the order, because while one exists the order is not evidence", () => {
    const agenda = agendaOf(
      [reading(TREE, 1, [1000, 10]), mishandled(OTHER_TREE)],
      [exact(TREE, 1, 1000), exact(OTHER_TREE, 1, 100)]
    )

    expect(agenda.page[0]?.treeId).toBe(TREE)
    expect(agenda.first?.treeId).toBe(OTHER_TREE)
    expect(agenda.first?.work).toBe("collection")
  })

  it("names the worst fault first for a deployment with nothing in the order at all", () => {
    const agenda = agendaOf(
      [leaky(TREE), leaky(OTHER_TREE)],
      [door(TREE, 1, 0, 100), door(OTHER_TREE, 1, 0, 40)]
    )

    expect(agenda.page).toEqual([])
    expect(agenda.first?.work).toBe("collection")
    expect(agenda.first?.health.faults).toEqual(["openings-unmarked"])
  })

  it("drops a page a caller handed in twice on either side, and says how many it dropped", () => {
    const order = deploymentReadingOf([readingProgressOf(leaky(TREE))], [exact(TREE, 1, 100)])
    const health = collectionHealthOf([leaky(TREE)], [exact(TREE, 1, 100)])

    const doubledOrder = deploymentAgendaOf(
      { ...order, ranked: [...order.ranked, ...order.ranked] },
      health
    )
    const doubledHealth = deploymentAgendaOf(order, {
      ...health,
      pages: [...health.pages, ...health.pages],
    })

    expect(doubledOrder.rows.length).toBe(1)
    expect(doubledOrder.duplicated).toBe(1)
    expect(doubledOrder.page.length).toBe(1)
    expect(doubledOrder.work).toEqual({ page: 1, collection: 0, both: 0, none: 0 })

    expect(doubledHealth.rows.length).toBe(1)
    expect(doubledHealth.duplicated).toBe(1)
    expect(doubledHealth.unpaired).toEqual({ order: 0, health: 0 })
  })

  it("does not put a page in a list twice because the order named it twice", () => {
    const order = deploymentReadingOf([readingProgressOf(leaky(TREE))], [exact(TREE, 1, 100)])
    const agenda = deploymentAgendaOf(
      { ...order, ranked: [...order.ranked, ...order.ranked] },
      collectionHealthOf([leaky(TREE)], [exact(TREE, 1, 100)])
    )

    expect(agenda.page.map(named)).toEqual([named({ treeId: TREE, revision: 1 })])
  })

  it("counts the rows only one reading named, and leaves them out of every list", () => {
    const rows = [exact(TREE, 1, 100), exact(OTHER_TREE, 1, 100)]
    const both = [leaky(TREE), leaky(OTHER_TREE)]

    const shortHealth = deploymentAgendaOf(
      deploymentReadingOf(
        both.map((page) => readingProgressOf(page)),
        rows
      ),
      collectionHealthOf([leaky(TREE)], rows)
    )
    const shortOrder = deploymentAgendaOf(
      deploymentReadingOf([readingProgressOf(leaky(TREE))], rows),
      collectionHealthOf(both, rows)
    )

    expect(shortHealth.unpaired).toEqual({ order: 1, health: 0 })
    expect(shortHealth.rows.map(named)).toEqual([named({ treeId: TREE, revision: 1 })])

    expect(shortOrder.unpaired).toEqual({ order: 0, health: 1 })
    expect(shortOrder.rows.map(named)).toEqual([named({ treeId: TREE, revision: 1 })])
  })

  it("reads two forms of one page as two rows, because their losses are from two readerships", () => {
    const skiers = pageReadingOf(
      treeOf(TREE, 1, 2),
      [
        { ...tally(TREE, 1, "band1", { views: 100, reached: 100 }), audienceId: SKIERS },
        { ...tally(TREE, 1, "band2", { views: 40, reached: 40 }), audienceId: SKIERS },
      ],
      NOTHING_DECLARED,
      SKIERS
    )
    const riders = pageReadingOf(
      treeOf(TREE, 1, 2),
      [
        { ...tally(TREE, 1, "band1", { views: 900, reached: 900 }), audienceId: RIDERS },
        { ...tally(TREE, 1, "band2", { views: 880, reached: 880 }), audienceId: RIDERS },
      ],
      NOTHING_DECLARED,
      RIDERS
    )
    const rows: readonly StoredPageViews[] = [
      { ...exact(TREE, 1, 100), audienceId: SKIERS },
      { ...exact(TREE, 1, 900), audienceId: RIDERS },
    ]

    const agenda = agendaOf([skiers, riders], rows)

    expect(agenda.rows.length).toBe(2)
    expect(agenda.trees).toBe(1)
    expect(agenda.rows.map((row) => row.audienceId)).toEqual([RIDERS, SKIERS])
    expect(agenda.page.map((row) => row.audienceId)).toEqual([SKIERS, RIDERS])
  })

  it("holds two revisions of one tree as two pages of one tree", () => {
    const agenda = agendaOf(
      [leaky(TREE, 1), leaky(TREE, 2)],
      [exact(TREE, 1, 100), exact(TREE, 2, 100)]
    )

    expect(agenda.rows.map(named)).toEqual([
      named({ treeId: TREE, revision: 2 }),
      named({ treeId: TREE, revision: 1 }),
    ])
    expect(agenda.trees).toBe(1)
    expect(agenda.rows.length).toBe(2)
  })

  it("answers an empty deployment with two empty orders and nothing to do", () => {
    const agenda = agendaOf([], [])

    expect(agenda).toEqual({
      rows: [],
      page: [],
      collection: [],
      contested: [],
      first: null,
      work: { page: 0, collection: 0, both: 0, none: 0 },
      trees: 0,
      unpaired: { order: 0, health: 0 },
      duplicated: 0,
    })
  })

  it("carries both readings' own rows rather than re-spelling either's figures", () => {
    const agenda = agendaOf([leaky(TREE)], [exact(TREE, 1, 100)])
    const order = deploymentReadingOf([readingProgressOf(leaky(TREE))], [exact(TREE, 1, 100)])
    const health = collectionHealthOf([leaky(TREE)], [exact(TREE, 1, 100)])

    expect(agenda.rows[0]?.order).toEqual(order.ranked[0])
    expect(agenda.rows[0]?.health).toEqual(health.pages[0])
  })
})
