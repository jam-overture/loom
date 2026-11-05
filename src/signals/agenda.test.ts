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
  AGENDA_SUBJECTS,
  AGENDA_WORK,
  arrivalStandingOf,
  collectionHealthOf,
  COUNTS_INFLATED_ABOVE,
  deploymentAgendaOf,
  deploymentConversionOf,
  deploymentReadingOf,
  describeAgendaSubject,
  describeAgendaWork,
  funnelReachOf,
  readingProgressOf,
  pageReadingOf,
  type ArrivalStanding,
  type CollectionSchedule,
  type DeploymentAgenda,
  type FunnelPair,
  type PageReading,
  type PartDeclarations,
  type ReaderTally,
  type StoredFunnel,
  type StoredPageViews,
  type TurnedAwayTally,
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

/**
 * A question this deployment asks of a page: of the readers who saw its first
 * band, how many finished the form at the bottom.
 */
const asking = (from: string, to: string): FunnelPair => ({
  from: { nodeId: nodeId(from), kind: "viewed" },
  to: { nodeId: nodeId(to), kind: "completed" },
})

/** One question of one revision, as the window's funnel row has it. */
const question = (
  treeId: TreeId,
  revision: number,
  from: string,
  to: string,
  reached: number,
  converted: number
): StoredFunnel => ({
  audienceId: DEFAULT_AUDIENCE_ID,
  treeId,
  revision,
  pair: asking(from, to),
  reached,
  converted,
  updatedAt: "2026-11-01T06:00:00.000Z",
})

/**
 * The route a surface takes: one window, three readings, one join.
 *
 * The funnel rows default to none, which is a deployment that asks its readers
 * nothing — every page `unasked` in the order of conversions, which is where the
 * join stood before the third order existed (0336).
 */
const agendaOf = (
  readings: readonly PageReading[],
  rows: readonly StoredPageViews[],
  over?: CollectionSchedule,
  funnels: readonly StoredFunnel[] = [],
  arrival: Pick<ArrivalStanding, "standing"> | null = null
): DeploymentAgenda =>
  deploymentAgendaOf(
    deploymentReadingOf(
      readings.map((page) => readingProgressOf(page)),
      rows
    ),
    deploymentConversionOf(readings.map((page) => funnelReachOf(page, funnels, rows))),
    collectionHealthOf(readings, rows, over),
    arrival
  )

/** The order of conversions a caller gets for a deployment that asks nothing. */
const asksNothing = (
  readings: readonly PageReading[],
  rows: readonly StoredPageViews[]
): ReturnType<typeof deploymentConversionOf> =>
  deploymentConversionOf(readings.map((page) => funnelReachOf(page, [], rows)))

/** One reason this deployment's door turned deliveries away, as its counter holds it. */
const refusal = (reason: string, refused: number): TurnedAwayTally => ({
  reason,
  refused,
  lastAt: Date.parse(NOW) - 5 * 60 * 1000,
  lastOrigin: "https://loomjs.org",
})

/**
 * An arrival standing built by the published reading over a real health
 * reading, never written by hand: what the subject is a claim about is what
 * that reading published, and a hand-written standing would let this file agree
 * with itself about a deployment the reading could never have produced.
 */
const arrivingAt = (
  readings: readonly PageReading[],
  rows: readonly StoredPageViews[],
  turnedAway: readonly TurnedAwayTally[] | undefined
): ArrivalStanding => arrivalStandingOf(collectionHealthOf(readings, rows), turnedAway)

const named = (row: { readonly treeId: TreeId; readonly revision: number }): string =>
  `${row.treeId}@${String(row.revision)}`

describe("describeAgendaWork", () => {
  it("says one distinct thing about each member", () => {
    const said = AGENDA_WORK.map(describeAgendaWork)

    expect(new Set(said).size).toBe(AGENDA_WORK.length)
    expect(said.every((line) => line.length > 0)).toBe(true)
  })
})

describe("describeAgendaSubject", () => {
  it("says one distinct thing about each member", () => {
    const said = AGENDA_SUBJECTS.map(describeAgendaSubject)

    expect(new Set(said).size).toBe(AGENDA_SUBJECTS.length)
    expect(said.every((line) => line.length > 0)).toBe(true)
  })
})

describe("deploymentAgendaOf — what an empty fix-list is about", () => {
  it("sends an operator to the intake where nothing was collected and the door refused deliveries", () => {
    const agenda = agendaOf([], [], undefined, [], arrivingAt([], [], [refusal("wrong-site", 12)]))

    expect(agenda.subject).toBe("intake")
    expect(agenda.first).toBeNull()
    expect(agenda.rows).toEqual([])
  })

  it("says nothing is posting where nothing was collected and the door refused nothing", () => {
    expect(agendaOf([], [], undefined, [], arrivingAt([], [], [])).subject).toBe("silence")
  })

  it("refuses to choose between the two silences where nothing counted refusals", () => {
    expect(agendaOf([], [], undefined, [], arrivingAt([], [], undefined)).subject).toBe("unverified")
  })

  it("reads a caller with no arrival reading to hand in exactly as it reads a deployment with no counter", () => {
    expect(agendaOf([], [], undefined, [], null).subject).toBe("unverified")
    expect(agendaOf([], [], undefined, [], arrivingAt([], [], undefined)).subject).toBe(
      agendaOf([], [], undefined, [], null).subject
    )
  })

  it("names a subject for every state the arrival reading can be in, and never nothing", () => {
    const subjects = [
      agendaOf([], [], undefined, [], null),
      agendaOf([], [], undefined, [], arrivingAt([], [], undefined)),
      agendaOf([], [], undefined, [], arrivingAt([], [], [])),
      agendaOf([], [], undefined, [], arrivingAt([], [], [refusal("wrong-site", 1)])),
      agendaOf([leaky(TREE)], [exact(TREE, 1, 100)], undefined, [], arrivingAt([], [], [])),
    ].map((agenda) => agenda.subject)

    expect(subjects).toEqual(["unverified", "unverified", "silence", "intake", "pages"])
    expect(subjects.every((subject) => AGENDA_SUBJECTS.includes(subject))).toBe(true)
  })

  it("has no row, no list and no first thing to do on every subject but pages", () => {
    for (const agenda of [
      agendaOf([], [], undefined, [], null),
      agendaOf([], [], undefined, [], arrivingAt([], [], [])),
      agendaOf([], [], undefined, [], arrivingAt([], [], [refusal("closed", 4)])),
    ]) {
      expect(agenda.subject).not.toBe("pages")
      expect(agenda.first).toBeNull()
      expect([agenda.rows, agenda.page, agenda.converting, agenda.collection]).toEqual([
        [],
        [],
        [],
        [],
      ])
    }
  })
})

describe("deploymentAgendaOf — the subject is a claim about these rows", () => {
  it("says pages wherever the health reading named one, whatever the door was doing", () => {
    const rows = [exact(TREE, 1, 100)]

    expect(agendaOf([leaky(TREE)], rows, undefined, [], null).subject).toBe("pages")
    expect(
      agendaOf([leaky(TREE)], rows, undefined, [], arrivingAt([leaky(TREE)], rows, [])).subject
    ).toBe("pages")
    expect(
      agendaOf([leaky(TREE)], rows, undefined, [], arrivingAt([leaky(TREE)], rows, [refusal("wrong-site", 3)]))
        .subject
    ).toBe("pages")
  })

  it("does not let a stale arrival reading claim pages for a window that holds none", () => {
    const collecting = arrivingAt([leaky(TREE)], [exact(TREE, 1, 100)], [])
    const alsoRefusing = arrivingAt(
      [leaky(TREE)],
      [exact(TREE, 1, 100)],
      [refusal("wrong-site", 2)]
    )

    expect([collecting.standing, alsoRefusing.standing]).toEqual(["collecting", "mixed"])
    expect([collecting.collected, alsoRefusing.collected]).toEqual([1, 1])

    expect(agendaOf([], [], undefined, [], collecting).subject).toBe("silence")
    expect(agendaOf([], [], undefined, [], alsoRefusing).subject).toBe("intake")
  })

  it("says pages off the health reading even where neither order named one", () => {
    const rows = [exact(TREE, 1, 100)]
    const agenda = deploymentAgendaOf(
      deploymentReadingOf([], rows),
      asksNothing([], rows),
      collectionHealthOf([leaky(TREE)], rows),
      arrivingAt([], [], [refusal("wrong-site", 9)])
    )

    expect(agenda.subject).toBe("pages")
    expect(agenda.rows).toEqual([])
    expect(agenda.unpaired.health).toBe(1)
  })

  it("is unmoved by a caller that handed one page in twice, which is the count it is not made of", () => {
    const rows = [exact(TREE, 1, 100)]
    const health = collectionHealthOf([leaky(TREE)], rows)
    const order = deploymentReadingOf([readingProgressOf(leaky(TREE))], rows)
    const once = deploymentAgendaOf(order, asksNothing([leaky(TREE)], rows), health, null)
    const twice = deploymentAgendaOf(
      order,
      asksNothing([leaky(TREE)], rows),
      { ...health, pages: [...health.pages, ...health.pages] },
      null
    )

    expect(twice.duplicated).toBe(1)
    expect(twice.subject).toBe(once.subject)
    expect(twice.subject).toBe("pages")
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

    const leaking = asksNothing([leaky(TREE)], [exact(TREE, 1, 100)])

    const doubledOrder = deploymentAgendaOf(
      { ...order, ranked: [...order.ranked, ...order.ranked] },
      leaking,
      health,
      null
    )
    const doubledHealth = deploymentAgendaOf(
      order,
      leaking,
      { ...health, pages: [...health.pages, ...health.pages] },
      null
    )
    const doubledConversion = deploymentAgendaOf(
      order,
      { ...leaking, unranked: [...leaking.unranked, ...leaking.unranked] },
      health,
      null
    )

    expect(doubledOrder.rows.length).toBe(1)
    expect(doubledOrder.duplicated).toBe(1)
    expect(doubledOrder.page.length).toBe(1)
    expect(doubledOrder.work).toEqual({ page: 1, collection: 0, both: 0, none: 0 })

    expect(doubledHealth.rows.length).toBe(1)
    expect(doubledHealth.duplicated).toBe(1)
    expect(doubledHealth.unpaired).toEqual({ order: 0, health: 0, conversion: 0 })

    expect(doubledConversion.rows.length).toBe(1)
    expect(doubledConversion.duplicated).toBe(1)
    expect(doubledConversion.unpaired).toEqual({ order: 0, health: 0, conversion: 0 })
  })

  it("does not put a page in a list twice because the order named it twice", () => {
    const order = deploymentReadingOf([readingProgressOf(leaky(TREE))], [exact(TREE, 1, 100)])
    const agenda = deploymentAgendaOf(
      { ...order, ranked: [...order.ranked, ...order.ranked] },
      asksNothing([leaky(TREE)], [exact(TREE, 1, 100)]),
      collectionHealthOf([leaky(TREE)], [exact(TREE, 1, 100)]),
      null
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
      asksNothing(both, rows),
      collectionHealthOf([leaky(TREE)], rows),
      null
    )
    const shortOrder = deploymentAgendaOf(
      deploymentReadingOf([readingProgressOf(leaky(TREE))], rows),
      asksNothing(both, rows),
      collectionHealthOf(both, rows),
      null
    )
    const shortConversion = deploymentAgendaOf(
      deploymentReadingOf(
        both.map((page) => readingProgressOf(page)),
        rows
      ),
      asksNothing([leaky(TREE)], rows),
      collectionHealthOf(both, rows),
      null
    )

    expect(shortHealth.unpaired).toEqual({ order: 1, health: 0, conversion: 1 })
    expect(shortHealth.rows.map(named)).toEqual([named({ treeId: TREE, revision: 1 })])

    expect(shortOrder.unpaired).toEqual({ order: 0, health: 1, conversion: 1 })
    expect(shortOrder.rows.map(named)).toEqual([named({ treeId: TREE, revision: 1 })])

    expect(shortConversion.unpaired).toEqual({ order: 1, health: 1, conversion: 0 })
    expect(shortConversion.rows.map(named)).toEqual([named({ treeId: TREE, revision: 1 })])
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

  it("answers an empty deployment with two empty orders and a subject rather than nothing to do", () => {
    const agenda = agendaOf([], [])

    expect(agenda).toEqual({
      subject: "unverified",
      rows: [],
      page: [],
      converting: [],
      collection: [],
      contested: [],
      first: null,
      work: { page: 0, collection: 0, both: 0, none: 0 },
      trees: 0,
      unpaired: { order: 0, health: 0, conversion: 0 },
      duplicated: 0,
    })
  })

  it("carries all three readings' own rows rather than re-spelling any of their figures", () => {
    const rows = [exact(TREE, 1, 100)]
    const asked = [question(TREE, 1, "band1", "band2", 80, 20)]
    const agenda = agendaOf([leaky(TREE)], rows, undefined, asked)
    const order = deploymentReadingOf([readingProgressOf(leaky(TREE))], rows)
    const health = collectionHealthOf([leaky(TREE)], rows)
    const conversion = deploymentConversionOf([funnelReachOf(leaky(TREE), asked, rows)])

    expect(agenda.rows[0]?.order).toEqual(order.ranked[0])
    expect(agenda.rows[0]?.health).toEqual(health.pages[0])
    expect(agenda.rows[0]?.conversion).toEqual(conversion.ranked[0])
  })
})

/**
 * The third order, joined (0336). What is being tested is not that a list
 * arrived but that the join asks each order whether *its own* figure survived
 * the faults on the row — because the two answers differ, and reading one off
 * the other is the 0330 defect put back by a shortcut.
 */
describe("the conversions a deployment's fix-list was silent about", () => {
  it("sends an operator to a page nobody leaves and nobody answers, which no order of falls can name", () => {
    const sound = reading(TREE, 1, [100, 100])
    const agenda = agendaOf(
      [sound],
      [exact(TREE, 1, 100)],
      undefined,
      [question(TREE, 1, "band1", "band2", 80, 20)]
    )

    /** The page readers read to the end of: nothing falls, so the old join said `none`. */
    expect(agenda.rows[0]?.order.standing).toBe("unbroken")
    expect(agenda.page).toEqual([])

    expect(agenda.rows[0]?.work).toBe("page")
    expect(agenda.converting.map(named)).toEqual([named({ treeId: TREE, revision: 1 })])
    expect(agenda.converting[0]?.conversion.lost).toBe(60)
    expect(agenda.converting[0]?.conversion.readers).toBe(60)
    expect(agenda.first?.work).toBe("page")
    expect(named(agenda.first!)).toBe(named({ treeId: TREE, revision: 1 }))
    expect(agenda.contested).toEqual([])
  })

  it("asks for nothing about a page whose readers are asked nothing, which is not a page nobody answered", () => {
    const agenda = agendaOf([reading(TREE, 1, [100, 100])], [exact(TREE, 1, 100)])

    expect(agenda.rows[0]?.conversion.standing).toBe("unasked")
    expect(agenda.rows[0]?.work).toBe("none")
    expect(agenda.converting).toEqual([])
    expect(agenda.first).toBeNull()
  })

  it("keeps a short window's fall and withdraws its leak, because one key divides the straddle out and the other is made of it", () => {
    const agenda = agendaOf(
      [leaky(TREE)],
      [door(TREE, 1, 100, 200)],
      undefined,
      [question(TREE, 1, "band1", "band2", 80, 20)]
    )
    const row = agenda.rows[0]

    expect(row?.health.faults).toEqual(["counts-inflated"])
    expect(row?.order.standing).toBe("ranked")
    expect(row?.conversion.standing).toBe("ranked")

    /** The one fault whose two answers disagree, and this is the disagreement. */
    expect(row?.spoiled).toBe(false)
    expect(row?.spoiledConversion).toBe(true)

    expect(row?.work).toBe("both")
    expect(agenda.page.map(named)).toEqual([named({ treeId: TREE, revision: 1 })])
    expect(agenda.converting).toEqual([])
    expect(agenda.contested.map(named)).toEqual([named({ treeId: TREE, revision: 1 })])

    /** The rank it was taken out of travels with it, as a fall's does (0301, 0326). */
    expect(agenda.contested[0]?.conversion.readers).toBe(30)
  })

  it("keeps both ranks where a sender credits no action, because no funnel figure is made of that counter", () => {
    const agenda = agendaOf(
      [uncredited(TREE)],
      [exact(TREE, 1, 100)],
      undefined,
      [question(TREE, 1, "band1", "band2", 80, 20)]
    )
    const row = agenda.rows[0]

    expect(row?.health.faults).toEqual(["actions-uncredited"])
    expect(row?.spoiled).toBe(false)
    expect(row?.spoiledConversion).toBe(false)
    expect(row?.work).toBe("both")
    expect(agenda.page.map(named)).toEqual([named({ treeId: TREE, revision: 1 })])
    expect(agenda.converting.map(named)).toEqual([named({ treeId: TREE, revision: 1 })])
    expect(agenda.contested).toEqual([])
  })

  it("withdraws both ranks where a caller's tree and window do not belong together", () => {
    const agenda = agendaOf(
      [mishandled(TREE)],
      [exact(TREE, 1, 100)],
      undefined,
      [question(TREE, 1, "band1", "band2", 80, 20)]
    )
    const row = agenda.rows[0]

    expect(row?.health.faults).toEqual(["rows-mishandled"])
    expect(row?.spoiled).toBe(true)
    expect(row?.spoiledConversion).toBe(true)
    expect(row?.work).toBe("collection")
    expect(agenda.page).toEqual([])
    expect(agenda.converting).toEqual([])
    expect(agenda.contested.map(named)).toEqual([named({ treeId: TREE, revision: 1 })])
  })

  it("puts the worst fall before the worst leak, because a reader who never reached an ask stopped reading", () => {
    const falls = leaky(TREE)
    const leaks = reading(OTHER_TREE, 1, [100, 100])
    const agenda = agendaOf(
      [falls, leaks],
      [exact(TREE, 1, 100), exact(OTHER_TREE, 1, 100)],
      undefined,
      [question(OTHER_TREE, 1, "band1", "band2", 99, 1)]
    )

    expect(agenda.page.map(named)).toEqual([named({ treeId: TREE, revision: 1 })])
    expect(agenda.converting.map(named)).toEqual([named({ treeId: OTHER_TREE, revision: 1 })])

    /** The leak is the larger headcount and the fall still comes first: two units, one rule. */
    expect(agenda.converting[0]?.conversion.readers).toBe(98)
    expect(agenda.page[0]?.order.readers).toBe(60)
    expect(named(agenda.first!)).toBe(named({ treeId: TREE, revision: 1 }))
  })

  it("counts a page once where both page orders rank it", () => {
    const agenda = agendaOf(
      [leaky(TREE)],
      [exact(TREE, 1, 100)],
      undefined,
      [question(TREE, 1, "band1", "band2", 80, 20)]
    )

    const counted = AGENDA_WORK.reduce((sum, work) => sum + agenda.work[work], 0)

    expect(agenda.page.length).toBe(1)
    expect(agenda.converting.length).toBe(1)
    expect(agenda.page[0]).toBe(agenda.converting[0])
    expect(counted).toBe(agenda.rows.length)
    expect(agenda.work).toEqual({ page: 1, collection: 0, both: 0, none: 0 })
  })

  it("does not put a page in the conversion order twice because that order named it twice", () => {
    const rows = [exact(TREE, 1, 100)]
    const asked = [question(TREE, 1, "band1", "band2", 80, 20)]
    const conversion = deploymentConversionOf([funnelReachOf(leaky(TREE), asked, rows)])
    const agenda = deploymentAgendaOf(
      deploymentReadingOf([readingProgressOf(leaky(TREE))], rows),
      { ...conversion, ranked: [...conversion.ranked, ...conversion.ranked] },
      collectionHealthOf([leaky(TREE)], rows),
      null
    )

    expect(agenda.converting.map(named)).toEqual([named({ treeId: TREE, revision: 1 })])
    expect(agenda.duplicated).toBe(1)
  })

  it("keeps the contested rows a slice of the collection order where only the leak was withdrawn", () => {
    const agenda = agendaOf(
      [leaky(TREE)],
      [door(TREE, 1, 100, 200)],
      undefined,
      [question(TREE, 1, "band1", "band2", 80, 20)]
    )

    expect(agenda.contested.length).toBe(1)
    expect(agenda.contested.every((row) => agenda.collection.includes(row))).toBe(true)
  })
})
