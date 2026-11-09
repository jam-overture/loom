import { describe, expect, it } from "vitest"

import { primitiveTypeSchema, type NodeId, type TreeId } from "@jam-overture/loom"
import {
  arrivalRangeOf,
  type StoredActed,
  type StoredArrivals,
  type StoredPageViews,
} from "@jam-overture/loom/signals"
import { DEFAULT_AUDIENCE_ID } from "@jam-overture/loom/store"
import type { HeldProposal } from "@jam-overture/loom/write"

import { pageFixture } from "@/app/_lib/pages/fixtures"

import {
  byPageListOf,
  byPageRowsOf,
  cursorOf,
  openRowOf,
  pageDrawerOf,
  parseCursor,
  waitingByPage,
  type ByPageRow,
} from "./by-page"
import { goalIdSchema, type Goal } from "./goals/goal"
import type { PageHourly } from "./page-range"
import { elementIdsOf, tallyOf } from "./proposing/fixtures"

const home = pageFixture("home", "Welcome", 3)
const [, heading] = elementIdsOf(home)

if (heading === undefined) throw new Error("the fixture has a heading")

const views = (
  treeId: string,
  revision: number,
  opened: number,
  updatedAt: string,
  audienceId = "aud_everyone"
): StoredPageViews =>
  ({
    treeId,
    revision,
    opened,
    appearances: opened,
    audienceId,
    updatedAt,
  }) as StoredPageViews

const UNREAD: PageHourly = { kind: "unreadable" }

const HOUR = 3_600_000
const NOW = Date.UTC(2026, 10, 8, 12, 30)
const RANGE = arrivalRangeOf(NOW, 24)
const BEFORE = RANGE.from - 24 * HOUR

/** One page's hourly counters: page views by hour, and presses and sends on one part by hour. */
const hourlyOn = (
  tree: { readonly treeId: TreeId; readonly revision: number },
  node: NodeId,
  views: readonly (readonly [hour: number, views: number])[],
  acted: readonly (readonly [hour: number, presses: number, sends: number])[]
): PageHourly => {
  const arrivals: StoredArrivals = {
    hours: views.map(([hour, count]) => ({
      treeId: tree.treeId,
      revision: tree.revision,
      hour,
      views: count,
      audienceId: DEFAULT_AUDIENCE_ID,
      updatedAt: new Date(hour).toISOString(),
    })),
    begins: BEFORE,
  }
  const did: StoredActed = {
    hours: acted.map(([hour, activations, completions]) => ({
      treeId: tree.treeId,
      revision: tree.revision,
      nodeId: node,
      type: primitiveTypeSchema.parse("loom.heading"),
      hour,
      activations,
      opens: 1,
      closes: 0,
      completions,
      audienceId: DEFAULT_AUDIENCE_ID,
      updatedAt: new Date(hour).toISOString(),
    })),
  }

  return { kind: "read", range: RANGE, counters: { arrivals, acted: did, actedBegins: BEFORE } }
}

const nothingElse = {
  tallies: [],
  published: [],
  waiting: new Map<string, number>(),
  goals: undefined,
}

const rowAt = (treeId: string, lastMoved: string): ByPageRow => ({
  treeId,
  name: undefined,
  published: false,
  liveVersion: 1,
  opened: 1,
  lastMoved,
  mostPressed: undefined,
  waiting: 0,
  primaryGoal: undefined,
})

/** Rows `t_00` to `t_<n-1>`, each a minute older than the last, so the list's order is their names'. */
const rowsOf = (n: number): readonly ByPageRow[] =>
  Array.from({ length: n }, (_, index) =>
    rowAt(
      `t_${String(index).padStart(2, "0")}`,
      new Date(Date.UTC(2026, 10, 5, 12, 0) - index * 60_000).toISOString()
    )
  )

describe("a project's pages, one row each", () => {
  it("is empty for a project no page view has reached", () => {
    expect(byPageRowsOf({ pageViews: [], ...nothingElse })).toEqual([])
  })

  /** *By page* asks what readers did on the page, so its versions and audiences are one row. */
  it("adds a page's versions and audiences into one row, and keeps the latest move", () => {
    const [row] = byPageRowsOf({
      pageViews: [
        views("t_a", 1, 3, "2026-11-05T10:00:00.000Z"),
        views("t_a", 2, 4, "2026-11-05T12:00:00.000Z", "aud_trial"),
      ],
      ...nothingElse,
    })

    expect(row).toMatchObject({
      treeId: "t_a",
      name: undefined,
      published: false,
      liveVersion: 2,
      opened: 7,
      lastMoved: "2026-11-05T12:00:00.000Z",
      waiting: 0,
    })
  })

  it("lists the page that moved last first", () => {
    const rows = byPageRowsOf({
      pageViews: [
        views("t_old", 1, 9, "2026-11-05T09:00:00.000Z"),
        views("t_new", 1, 1, "2026-11-05T11:00:00.000Z"),
      ],
      ...nothingElse,
    })

    expect(rows.map((row) => row.treeId)).toEqual(["t_new", "t_old"])
  })

  it("names a page and its parts from what the site published, and its live version too", () => {
    const [row] = byPageRowsOf({
      pageViews: [views(home.treeId, 1, 5, "2026-11-05T10:00:00.000Z")],
      tallies: [tallyOf(home, heading, { activations: 4 })],
      published: [{ tree: home, receivedAt: 0 }],
      waiting: new Map(),
      goals: undefined,
    })

    expect(row).toMatchObject({
      name: "Welcome",
      published: true,
      liveVersion: 3,
      mostPressed: {
        nodeId: heading,
        name: "the heading “Welcome”",
        presses: 4,
      },
    })
  })

  it("says nothing was pressed rather than naming a part nobody pressed", () => {
    const [row] = byPageRowsOf({
      pageViews: [views(home.treeId, 3, 5, "2026-11-05T10:00:00.000Z")],
      tallies: [tallyOf(home, heading, { reached: 5 })],
      published: [],
      waiting: new Map(),
      goals: undefined,
    })

    expect(row?.mostPressed).toBeUndefined()
  })

  it("counts the changes waiting on each page, and leaves the count out when it could not be read", () => {
    const pageViews = [views("t_a", 1, 1, "2026-11-05T10:00:00.000Z")]

    expect(
      byPageRowsOf({
        pageViews,
        tallies: [],
        published: [],
        waiting: new Map([["t_a", 2]]),
        goals: undefined,
      })[0]?.waiting
    ).toBe(2)
    expect(
      byPageRowsOf({
        pageViews,
        tallies: [],
        published: [],
        waiting: undefined,
        goals: undefined,
      })[0]?.waiting
    ).toBeUndefined()
  })
})

describe("the changes waiting, by page", () => {
  /** A change is made to the page's copy, and the copy answers for the page (0329). */
  it("files a change made to a copy under the page the copy started from", () => {
    const held = [
      { treeId: "t_copy" },
      { treeId: "t_copy" },
      { treeId: "t_b" },
    ] as unknown as readonly HeldProposal[]
    const copies = [{ pageId: "t_a" as TreeId, copyId: "t_copy" as TreeId, startedAt: 0 }]

    expect(waitingByPage(held, copies)).toEqual(
      new Map([
        ["t_a", 2],
        ["t_b", 1],
      ])
    )
  })
})

describe("the list, fifty to a page", () => {
  it("opens on the newest fifty, with the way to the older ones", () => {
    const rows = rowsOf(120)
    const list = byPageListOf(rows, undefined)

    expect(list).toMatchObject({
      first: 1,
      last: 50,
      total: 120,
      newer: undefined,
    })
    expect(list.older).toBe(cursorOf(rows[50] as ByPageRow))
  })

  it("follows a cursor to the next page and back", () => {
    const rows = rowsOf(120)
    const second = byPageListOf(rows, parseCursor(byPageListOf(rows, undefined).older))

    expect(second).toMatchObject({ first: 51, last: 100 })
    expect(second.newer).toBe(cursorOf(rows[0] as ByPageRow))

    const third = byPageListOf(rows, parseCursor(second.older))

    expect(third).toMatchObject({ first: 101, last: 120, older: undefined })
  })

  /** A row that moves to the top between two reads must not shift the page a link opens on. */
  it("opens where the cursor's row was when that row has since moved", () => {
    const rows = rowsOf(4)
    const cursor = parseCursor(cursorOf(rows[2] as ByPageRow))
    const moved = [
      rowAt("t_02", "2026-11-05T13:00:00.000Z"),
      ...rows.filter((row) => row.treeId !== "t_02"),
    ]

    expect(byPageListOf(moved, cursor, 2).rows.map((row) => row.treeId)).toEqual(["t_03"])
  })

  it("opens the first page for anything that is not a cursor it wrote", () => {
    expect(parseCursor("not-a-cursor")).toBeUndefined()
    expect(parseCursor(Buffer.from('["only one"]').toString("base64url"))).toBeUndefined()
    expect(parseCursor(undefined)).toBeUndefined()
  })

  it("is an empty page for an empty list", () => {
    expect(byPageListOf([], undefined)).toEqual({
      rows: [],
      first: 0,
      last: 0,
      total: 0,
      newer: undefined,
      older: undefined,
    })
  })
})

describe("the drawer for one page", () => {
  const [row] = byPageRowsOf({
    pageViews: [views(home.treeId, 3, 10, "2026-11-05T10:00:00.000Z")],
    tallies: [],
    published: [],
    waiting: new Map(),
    goals: undefined,
  })

  if (row === undefined) throw new Error("one page was counted")

  it("opens on the page the address names, and on none for one it does not list", () => {
    expect(openRowOf([row], home.treeId)).toBe(row)
    expect(openRowOf([row], "t_elsewhere")).toBeUndefined()
    expect(openRowOf([row], undefined)).toBeUndefined()
  })

  it("draws a bar for each kind of thing readers did, against the longest", () => {
    const drawer = pageDrawerOf(
      row,
      {
        pageViews: [],
        tallies: [
          tallyOf(home, heading, {
            activations: 5,
            opens: 1,
            closes: 1,
            completions: 0,
          }),
        ],
        published: [{ tree: home, receivedAt: 0 }],
        goals: undefined,
      },
      UNREAD
    )

    expect(drawer.bars.map(({ technical, count, share }) => [technical, count, share])).toEqual([
      ["viewed", 10, 1],
      ["activated", 5, 0.5],
      ["disclosed", 2, 0.2],
      ["completed", 0, 0],
    ])
  })

  it("draws the range from the page's hourly counters, apart from since it was first counted", () => {
    const drawer = pageDrawerOf(
      row,
      { pageViews: [], tallies: [], published: [], goals: undefined },
      hourlyOn(
        home,
        heading,
        [
          [RANGE.from, 40],
          [BEFORE, 900],
        ],
        [
          [RANGE.from + HOUR, 8, 2],
          [BEFORE + HOUR, 50, 50],
        ]
      )
    )

    if (drawer.range.kind !== "read") throw new Error("the hours were read")

    expect(
      drawer.range.bars.map(({ technical, count, share }) => [technical, count, share])
    ).toEqual([
      ["viewed", 40, 1],
      ["activated", 8, 0.2],
      ["disclosed", 1, 0.025],
      ["completed", 2, 0.05],
    ])
    expect(drawer.range.countedFrom).toBeUndefined()
    expect(drawer.bars[0]?.count).toBe(10)
  })

  it("says where counting by the hour began inside the range, and when it has not begun or was not read", () => {
    const begun = hourlyOn(home, heading, [[RANGE.from + 2 * HOUR, 5]], [])

    if (begun.kind !== "read") throw new Error("a reading")

    const later = (begins: number | undefined): PageHourly => ({
      ...begun,
      counters: { ...begun.counters, actedBegins: begins },
    })
    const drawn = (hourly: PageHourly) =>
      pageDrawerOf(row, { pageViews: [], tallies: [], published: [], goals: undefined }, hourly)
        .range

    expect(drawn(later(RANGE.from + 2 * HOUR))).toMatchObject({
      kind: "read",
      countedFrom: RANGE.from + 2 * HOUR,
    })
    expect(drawn(later(RANGE.to))).toEqual({ kind: "uncounted" })
    expect(drawn(UNREAD)).toEqual({ kind: "unreadable" })
  })

  it("names the parts pressed most, at most three, and the one kept on screen longest", () => {
    const [root] = elementIdsOf(home)

    if (root === undefined) throw new Error("the fixture has a root")

    const drawer = pageDrawerOf(
      row,
      {
        pageViews: [],
        tallies: [
          tallyOf(home, heading, { activations: 2, reached: 4, dwellMs: 6_000 }),
          tallyOf(home, root, { activations: 7, reached: 10, dwellMs: 9_000 }),
          tallyOf({ ...home, revision: 2 }, heading, { activations: 1 }),
        ],
        published: [{ tree: home, receivedAt: 0 }],
        goals: undefined,
      },
      UNREAD
    )

    expect(drawer.pressed.map((part) => [part.nodeId, part.presses])).toEqual([
      [root, 7],
      [heading, 3],
    ])
    expect(drawer.longest).toEqual({
      nodeId: heading,
      name: "the heading “Welcome”",
      seconds: 1.5,
    })
  })

  it("draws empty bars and names no part for a page readers only opened", () => {
    const quiet = pageDrawerOf(
      { ...row, opened: 0 },
      { pageViews: [], tallies: [], published: [], goals: undefined },
      UNREAD
    )

    expect(quiet.bars.every((bar) => bar.share === 0)).toBe(true)
    expect(quiet.pressed).toEqual([])
    expect(quiet.longest).toBeUndefined()
  })
})

describe("goals, measured one page at a time", () => {
  const pricing = pageFixture("pricing", "Plans", 1)
  const [, pricingHeading] = elementIdsOf(pricing)

  if (pricingHeading === undefined) throw new Error("the fixture has a heading")

  const goal = (id: string, overrides: Partial<Goal>): Goal => ({
    goalId: goalIdSchema.parse(`g_${id.repeat(32)}`),
    name: `Goal ${id}`,
    kind: "activated",
    nodeId: heading,
    pages: null,
    primarySince: null,
    createdAt: 1,
    createdBy: null,
    ...overrides,
  })

  const readings = {
    pageViews: [
      views(home.treeId, 3, 200, "2026-11-05T10:00:00.000Z"),
      views(pricing.treeId, 1, 50, "2026-11-05T11:00:00.000Z"),
    ],
    tallies: [
      tallyOf(home, heading, { activations: 7, completions: 2 }),
      tallyOf(pricing, pricingHeading, { activations: 10 }),
    ],
    published: [
      { tree: home, receivedAt: 0 },
      { tree: pricing, receivedAt: 0 },
    ],
    waiting: undefined,
  }

  const presses = goal("a", { primarySince: 5, createdAt: 2 })
  const sends = goal("b", { kind: "completed" })
  const onPricing = goal("c", { nodeId: pricingHeading, pages: [pricing.treeId] })
  const goals = [onPricing, sends, presses]

  const rowsFor = (kept: readonly Goal[] | undefined) =>
    new Map(byPageRowsOf({ ...readings, goals: kept }).map((row) => [row.treeId, row]))

  it("gives each page the primary goal's count over that page's own page views", () => {
    expect(rowsFor(goals).get(home.treeId)?.primaryGoal).toEqual({
      goalId: presses.goalId,
      name: "Goal a",
      kind: "activated",
      primary: true,
      reading: { count: 7, pageViews: 200 },
    })
  })

  it("gives no rate where the primary goal does not cover the page, there is none, or goals were not read", () => {
    expect(rowsFor(goals).get(pricing.treeId)?.primaryGoal).toBeUndefined()
    expect(rowsFor([sends, onPricing]).get(home.treeId)?.primaryGoal).toBeUndefined()
    expect(rowsFor(undefined).get(home.treeId)?.primaryGoal).toBeUndefined()
  })

  it("lists in the drawer every goal covering the page, the primary first, and no other", () => {
    const rows = rowsFor(goals)
    const drawerOn = (treeId: string) => {
      const row = rows.get(treeId)

      if (row === undefined) throw new Error(`${treeId} was counted`)

      return pageDrawerOf(row, { ...readings, goals }, UNREAD).goals
    }

    expect(drawerOn(home.treeId)?.map((each) => [each.name, each.primary, each.reading])).toEqual([
      ["Goal a", true, { count: 7, pageViews: 200 }],
      ["Goal b", false, { count: 2, pageViews: 200 }],
    ])
    expect(drawerOn(pricing.treeId)?.map((each) => [each.name, each.reading])).toEqual([
      ["Goal c", { count: 10, pageViews: 50 }],
    ])
  })

  it("says the drawer's goals could not be read rather than that there are none", () => {
    const row = rowsFor(undefined).get(home.treeId)

    if (row === undefined) throw new Error("home was counted")

    expect(pageDrawerOf(row, { ...readings, goals: undefined }, UNREAD).goals).toBeUndefined()
    expect(pageDrawerOf(row, { ...readings, goals: [] }, UNREAD).goals).toEqual([])
  })

  it("measures each goal in the drawer over the range on this page alone, with the period before", () => {
    const row = rowsFor(goals).get(home.treeId)

    if (row === undefined) throw new Error("home was counted")

    const drawn = pageDrawerOf(
      row,
      { ...readings, goals },
      hourlyOn(
        home,
        heading,
        [
          [RANGE.from, 100],
          [BEFORE, 100],
        ],
        [
          [RANGE.from + HOUR, 3, 1],
          [BEFORE + HOUR, 2, 0],
        ]
      )
    ).goals

    expect(
      drawn?.map((each) => [
        each.name,
        each.range?.kind === "read" ? [each.range.current.count, each.range.current.views] : null,
        each.range?.kind === "read" ? [each.range.before?.count, each.range.before?.views] : null,
      ])
    ).toEqual([
      ["Goal a", [3, 100], [2, 100]],
      ["Goal b", [1, 100], [0, 100]],
    ])
  })

  it("leaves each goal's range unread where the page's hours were not read", () => {
    const row = rowsFor(goals).get(home.treeId)

    if (row === undefined) throw new Error("home was counted")

    expect(
      pageDrawerOf(row, { ...readings, goals }, UNREAD).goals?.map((each) => each.range)
    ).toEqual([undefined, undefined])
  })
})
