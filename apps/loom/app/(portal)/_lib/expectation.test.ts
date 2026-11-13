import { describe, expect, it } from "vitest"

import { nodeIdSchema, primitiveTypeSchema, treeIdSchema } from "@jam-overture/loom"
import type { StoredActed, StoredArrivals } from "@jam-overture/loom/signals"
import { DEFAULT_AUDIENCE_ID } from "@jam-overture/loom/store"

import {
  edgesOf,
  expectationOf,
  expectationRangeOf,
  expectationWords,
  type Expectation,
} from "./expectation"
import { MEASURING_MS, verdictOf, type Side } from "./measuring"

const HOUR = 3_600_000
const DAY = 24 * HOUR
const NOW = Date.UTC(2026, 10, 12, 9, 40)
const RANGE = expectationRangeOf(NOW)
const PAGE = treeIdSchema.parse("t_home")
const PART = nodeIdSchema.parse("n_start")
const BUTTON = primitiveTypeSchema.parse("loom.button")
const GOAL = { name: "Sign-ups", kind: "activated" } as const

const arrivals = (rows: readonly (readonly [number, number])[]): StoredArrivals => ({
  hours: rows.map(([hour, views]) => ({
    treeId: PAGE,
    revision: 1,
    hour,
    views,
    audienceId: DEFAULT_AUDIENCE_ID,
    updatedAt: new Date(hour).toISOString(),
  })),
  ...(rows[0] === undefined ? {} : { begins: Math.min(...rows.map(([hour]) => hour)) }),
})

const acted = (rows: readonly (readonly [number, number])[]): StoredActed => ({
  hours: rows.map(([hour, activations]) => ({
    treeId: PAGE,
    revision: 1,
    nodeId: PART,
    type: BUTTON,
    hour,
    activations,
    opens: 0,
    closes: 0,
    completions: 0,
    audienceId: DEFAULT_AUDIENCE_ID,
    updatedAt: new Date(hour).toISOString(),
  })),
})

/** Counters with `views` page views and `count` presses in one hour, counting from `begins`. */
const counters = (hour: number, views: number, count: number, begins = RANGE.from - DAY) => ({
  arrivals: { ...arrivals([[hour, views]]), begins },
  acted: acted([[hour, count]]),
  actedBegins: begins,
})

const side = (views: number, count: number): Side => ({ range: RANGE, views, count })

describe("expectationRangeOf", () => {
  it("is the 14 whole days of hours before the hour now is in", () => {
    expect(RANGE).toEqual({
      from: Date.UTC(2026, 10, 12, 9) - MEASURING_MS,
      to: Date.UTC(2026, 10, 12, 9),
    })
  })
})

describe("edgesOf", () => {
  /** Every count on an after side as large as the before side, by brute force. */
  const every = (before: Side) =>
    Array.from({ length: before.views + 1 }, (_, count) => ({
      count,
      verdict: verdictOf(before, { ...before, count }).kind,
    }))

  it.each([
    [2_000, 70],
    [1_000, 0],
    [1_000, 1_000],
    [5_000, 2_500],
    [1_200, 3],
  ])("agrees with the verdict at every count for %i page views and %i presses", (views, count) => {
    const before = side(views, count)
    const edges = edgesOf(before)
    const verdicts = every(before)

    expect(edges.helpedFrom).toBe(verdicts.find((row) => row.verdict === "helped")?.count)
    expect(edges.hurtTo).toBe(verdicts.filter((row) => row.verdict === "hurt").at(-1)?.count)
  })

  it("has no Hurt edge where nobody did it before, and no Helped edge where every page view did", () => {
    expect(edgesOf(side(1_000, 0)).hurtTo).toBeUndefined()
    expect(edgesOf(side(1_000, 1_000)).helpedFrom).toBeUndefined()
  })
})

describe("expectationOf", () => {
  it("is uncounted where nothing was counted before now", () => {
    expect(
      expectationOf("activated", RANGE, {
        arrivals: { hours: [] },
        acted: { hours: [] },
        actedBegins: undefined,
      })
    ).toEqual({ kind: "uncounted" })
  })

  it("says there were no page views where counting began and none came", () => {
    expect(
      expectationOf("activated", RANGE, {
        arrivals: { hours: [], begins: RANGE.from - DAY },
        acted: { hours: [] },
        actedBegins: RANGE.from - DAY,
      })
    ).toEqual({ kind: "no-views", range: RANGE, clipped: false })
  })

  it("reads the goal on the page over the 14 days, leaving out hours outside them", () => {
    const read = {
      arrivals: arrivals([
        [RANGE.from - HOUR, 900],
        [RANGE.from, 1_500],
        [RANGE.to - HOUR, 500],
        [RANGE.to, 700],
      ]),
      acted: acted([
        [RANGE.from - HOUR, 90],
        [RANGE.from, 40],
        [RANGE.to - HOUR, 30],
        [RANGE.to, 70],
      ]),
      actedBegins: RANGE.from - HOUR,
    }
    const expectation = expectationOf("activated", RANGE, read)

    expect(expectation).toMatchObject({
      kind: "read",
      now: { range: RANGE, views: 2_000, count: 70 },
      clipped: false,
      views: 2_000,
    })
    expect(expectation.kind === "read" && expectation.band).toEqual(edgesOf(side(2_000, 70)))
  })

  it("scales the page views to 14 days where counting began inside them", () => {
    const begins = RANGE.to - 7 * DAY
    const expectation = expectationOf("activated", RANGE, counters(begins, 600, 30, begins))

    expect(expectation).toMatchObject({
      kind: "read",
      now: { range: { from: begins, to: RANGE.to }, views: 600, count: 30 },
      clipped: true,
      views: 1_200,
    })
    expect(expectation.kind === "read" && expectation.band).toEqual(
      edgesOf({ range: { from: begins, to: RANGE.to }, views: 1_200, count: 60 })
    )
  })

  it("has no band where a side would fall short of the page views a verdict needs", () => {
    expect(expectationOf("activated", RANGE, counters(RANGE.from, 999, 30))).toMatchObject({
      band: { kind: "too-few" },
    })
  })

  it("has no band where readers did it more times than there were page views", () => {
    expect(expectationOf("activated", RANGE, counters(RANGE.from, 1_000, 1_400))).toMatchObject({
      band: { kind: "not-a-share" },
    })
  })
})

describe("expectationWords", () => {
  const said = (...args: Parameters<typeof expectationWords>): string =>
    expectationWords(...args).join(" ")

  const read = (over: Partial<Extract<Expectation, { kind: "read" }>>): Expectation => ({
    kind: "read",
    now: side(2_000, 70),
    clipped: false,
    views: 2_000,
    band: edgesOf(side(2_000, 70)),
    ...over,
  })

  it("says where the goal stands, the band a result has to leave, and that it is no prediction", () => {
    const words = said(GOAL, read({}))

    expect(words).toContain(
      "On this page over the last 14 days, “Sign-ups” counted 70 presses in 2,000 page views, 3.5 per 100."
    )
    expect(words).toMatch(
      /If the page keeps about 2,000 page views every 14 days, the change reads Helped at \d\.\d per 100 or more and Hurt at \d\.\d per 100 or less over the 14 days after it goes live, and No clear change in between\./u
    )
    expect(words).toContain("Loom does not predict where in that band it will land.")
    expect(words).toContain(
      "Once it is live it is measured on “Sign-ups” for the 14 days after against the 14 days before."
    )
  })

  it("prints the edges from the band itself", () => {
    const before = side(2_000, 70)
    const { helpedFrom, hurtTo } = edgesOf(before)

    expect(helpedFrom).toBeDefined()
    expect(hurtTo).toBeDefined()
    expect(said(GOAL, read({}))).toContain(
      `Helped at ${(((helpedFrom ?? 0) / 2_000) * 100).toFixed(1)} per 100 or more and Hurt at ${(((hurtTo ?? 0) / 2_000) * 100).toFixed(1)} per 100 or less`
    )
  })

  it("prints an edge to more decimals where one would read as the rate now", () => {
    const busy = side(2_000_000, 70_000)
    const words = said(GOAL, read({ now: busy, views: busy.views, band: edgesOf(busy) }))

    expect(words).toMatch(/Helped at 3\.5\d per 100 or more and Hurt at 3\.4\d per 100 or less/u)
  })

  it("says which edge no result could reach", () => {
    expect(
      said(GOAL, read({ now: side(1_000, 0), views: 1_000, band: edgesOf(side(1_000, 0)) }))
    ).toContain("No fall could read Hurt at that traffic.")
  })

  it("says a quiet page would read Too early", () => {
    expect(
      said(GOAL, read({ now: side(400, 10), views: 400, band: { kind: "too-few" } }))
    ).toContain(
      "At about 400 page views every 14 days, a side would fall short of the 1,000 page views a result needs, so it would read Too early unless the page gets busier."
    )
  })

  it("says the test cannot weigh a figure that is not a share", () => {
    expect(said(GOAL, read({ band: { kind: "not-a-share" } }))).toContain(
      "the agreed test cannot weigh it and a result could only read No clear change."
    )
  })

  it("says when counting began inside the 14 days", () => {
    const from = RANGE.to - 7 * DAY

    expect(
      said(
        GOAL,
        read({ now: { range: { from, to: RANGE.to }, views: 600, count: 30 }, clipped: true })
      )
    ).toMatch(
      /^On this page since counting began on .+, “Sign-ups” counted 30 presses in 600 page views, 5 per 100\./u
    )
  })

  it("says nothing was counted, or no page views came, rather than a nought", () => {
    expect(said(GOAL, { kind: "uncounted" })).toMatch(
      /^Nothing has been counted on this page by the hour yet/u
    )
    expect(said(GOAL, { kind: "no-views", range: RANGE, clipped: false })).toMatch(
      /^This page had no page views over the last 14 days, so there is nothing yet to measure “Sign-ups” against\./u
    )
  })
})
