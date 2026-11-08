import { describe, expect, it } from "vitest"

import { nodeIdSchema, primitiveTypeSchema, treeIdSchema } from "@jam-overture/loom"
import { arrivalRangeOf, type StoredActed, type StoredArrivals } from "@jam-overture/loom/signals"
import { DEFAULT_AUDIENCE_ID } from "@jam-overture/loom/store"

import { pageRangeOf, type PageCounters } from "./page-range"

const HOUR = 3_600_000
const NOW = Date.UTC(2026, 10, 8, 12, 30)
const RANGE = arrivalRangeOf(NOW, 24)
const BEFORE = RANGE.from - 24 * HOUR
const HOME = treeIdSchema.parse("t_home")
const START = nodeIdSchema.parse("n_start")
const MENU = nodeIdSchema.parse("n_menu")

const arrivals = (
  rows: readonly (readonly [hour: number, views: number])[],
  /** `null` for a counter that has never counted anything. */
  begins: number | null = BEFORE
): StoredArrivals => ({
  hours: rows.map(([hour, views]) => ({
    treeId: HOME,
    revision: 1,
    hour,
    views,
    audienceId: DEFAULT_AUDIENCE_ID,
    updatedAt: new Date(hour).toISOString(),
  })),
  ...(begins === null ? {} : { begins }),
})

type Did = { readonly activations?: number; readonly opens?: number; readonly closes?: number }

const acted = (
  rows: readonly (readonly [hour: number, node: typeof START, did: Did])[]
): StoredActed => ({
  hours: rows.map(([hour, nodeId, did]) => ({
    treeId: HOME,
    revision: 1,
    nodeId,
    type: primitiveTypeSchema.parse("loom.button"),
    hour,
    activations: did.activations ?? 0,
    opens: did.opens ?? 0,
    closes: did.closes ?? 0,
    completions: 0,
    audienceId: DEFAULT_AUDIENCE_ID,
    updatedAt: new Date(hour).toISOString(),
  })),
})

const counters = (overrides: Partial<PageCounters> = {}): PageCounters => ({
  arrivals: arrivals([
    [RANGE.from, 30],
    [RANGE.to - HOUR, 10],
    [BEFORE, 500],
  ]),
  acted: acted([
    [RANGE.from, START, { activations: 4 }],
    [RANGE.from + HOUR, MENU, { activations: 1, opens: 3, closes: 2 }],
    [BEFORE, START, { activations: 99 }],
  ]),
  actedBegins: BEFORE,
  ...overrides,
})

describe("pageRangeOf", () => {
  it("adds up each kind over the range on every part, and nothing from the period before", () => {
    expect(pageRangeOf({ kind: "read", range: RANGE, counters: counters() })).toEqual({
      kind: "read",
      counts: { viewed: 40, activated: 5, disclosed: 5, completed: 0 },
      from: RANGE.from,
      clipped: false,
    })
  })

  it("starts where counting began when that is inside the range, for page views as for the rest", () => {
    const begins = RANGE.from + HOUR

    expect(
      pageRangeOf({ kind: "read", range: RANGE, counters: counters({ actedBegins: begins }) })
    ).toEqual({
      kind: "read",
      counts: { viewed: 10, activated: 1, disclosed: 5, completed: 0 },
      from: begins,
      clipped: true,
    })
  })

  it("is uncounted where nothing was counted by the hour, or only once the range had ended", () => {
    expect(
      pageRangeOf({
        kind: "read",
        range: RANGE,
        counters: counters({ arrivals: arrivals([], null), actedBegins: undefined }),
      })
    ).toEqual({ kind: "uncounted" })
    expect(
      pageRangeOf({ kind: "read", range: RANGE, counters: counters({ actedBegins: RANGE.to }) })
    ).toEqual({ kind: "uncounted" })
  })

  it("passes on counters that did not answer, rather than drawing them as noughts", () => {
    expect(pageRangeOf({ kind: "unreadable" })).toEqual({ kind: "unreadable" })
  })
})
