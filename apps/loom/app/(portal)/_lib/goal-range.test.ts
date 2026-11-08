import { describe, expect, it } from "vitest"

import { nodeIdSchema, primitiveTypeSchema, treeIdSchema } from "@jam-overture/loom"
import { arrivalRangeOf, type StoredActed, type StoredArrivals } from "@jam-overture/loom/signals"
import { DEFAULT_AUDIENCE_ID } from "@jam-overture/loom/store"

import {
  goalFigureOf,
  goalRangeOf,
  goalSpanOf,
  rangeTotalsOf,
  type GoalCounters,
} from "./goal-range"
import { goalIdSchema, type Goal } from "./goals/goal"

const HOUR = 3_600_000
const NOW = Date.UTC(2026, 10, 8, 12, 30)
const RANGE = arrivalRangeOf(NOW, 24)
const BEFORE = RANGE.from - 24 * HOUR
const HOME = treeIdSchema.parse("t_home")
const PRICING = treeIdSchema.parse("t_pricing")
const ABOUT = treeIdSchema.parse("t_about")
const START = nodeIdSchema.parse("n_start")
const OTHER = nodeIdSchema.parse("n_other")
const BUTTON = primitiveTypeSchema.parse("loom.button")

type Row = readonly [page: typeof HOME, hour: number, count: number]

/** `null` for a counter that has never counted anything. */
const arrivals = (rows: readonly Row[], begins: number | null = BEFORE): StoredArrivals => ({
  hours: rows.map(([treeId, hour, views]) => ({
    treeId,
    revision: 1,
    hour,
    views,
    audienceId: DEFAULT_AUDIENCE_ID,
    updatedAt: new Date(hour).toISOString(),
  })),
  ...(begins === null ? {} : { begins }),
})

const acted = (rows: readonly Row[], nodeId = START): StoredActed => ({
  hours: rows.map(([treeId, hour, activations]) => ({
    treeId,
    revision: 1,
    nodeId,
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

const goal = (overrides: Partial<Goal> = {}): Goal => ({
  goalId: goalIdSchema.parse(`g_${"0".repeat(32)}`),
  name: "Starts a trial",
  kind: "activated",
  nodeId: START,
  pages: null,
  primarySince: 1,
  createdAt: 1,
  createdBy: null,
  ...overrides,
})

const counters = (overrides: Partial<GoalCounters> = {}): GoalCounters => ({
  arrivals: arrivals([
    [HOME, RANGE.from, 200],
    [HOME, BEFORE, 100],
  ]),
  acted: acted([
    [HOME, RANGE.from + HOUR, 6],
    [HOME, BEFORE + HOUR, 2],
  ]),
  actedBegins: BEFORE,
  parts: new Map([[HOME, new Set([START])]]),
  ...overrides,
})

const read = (reading: ReturnType<typeof goalRangeOf>) => {
  if (reading.kind !== "read") throw new Error(`expected a reading, got ${reading.kind}`)

  return reading
}

describe("goalSpanOf", () => {
  it("reads the period before the range and the range, in one stretch", () => {
    expect(goalSpanOf(RANGE)).toEqual({ from: BEFORE, to: RANGE.to })
  })
})

describe("goalRangeOf", () => {
  it("counts the goal's kind on its part over page views, in the range and the period before", () => {
    const reading = read(goalRangeOf(goal(), RANGE, counters()))

    expect(reading.current).toEqual({ range: RANGE, views: 200, count: 6 })
    expect(reading.before).toEqual({
      range: { from: BEFORE, to: RANGE.from },
      views: 100,
      count: 2,
    })
    expect(reading.clipped).toBe(false)
  })

  it("counts only the pages that have the part, for a goal on every page", () => {
    const reading = read(
      goalRangeOf(
        goal(),
        RANGE,
        counters({
          arrivals: arrivals([
            [HOME, RANGE.from, 200],
            [ABOUT, RANGE.from, 5_000],
          ]),
          acted: acted([
            [HOME, RANGE.from, 6],
            [PRICING, RANGE.from, 4],
          ]),
        })
      )
    )

    expect(reading.current.count).toBe(10)
    expect(reading.current.views).toBe(200)
  })

  it("counts only the pages chosen, and only the goal's own part", () => {
    const reading = read(
      goalRangeOf(
        goal({ pages: [PRICING] }),
        RANGE,
        counters({
          arrivals: arrivals([
            [HOME, RANGE.from, 200],
            [PRICING, RANGE.from, 50],
          ]),
          acted: acted([
            [HOME, RANGE.from, 6],
            [PRICING, RANGE.from, 4],
          ]),
        })
      )
    )

    expect(reading.current).toMatchObject({ views: 50, count: 4 })
    expect(
      read(goalRangeOf(goal(), RANGE, counters({ acted: acted([[HOME, RANGE.from, 9]], OTHER) })))
        .current.count
    ).toBe(0)
  })

  it("starts where counting began inside the range, and compares with nothing", () => {
    const begins = RANGE.from + 3 * HOUR
    const reading = read(
      goalRangeOf(goal(), RANGE, counters({ arrivals: arrivals([[HOME, begins, 40]], begins) }))
    )

    expect(reading.current.range.from).toBe(begins)
    expect(reading.before).toBeUndefined()
    expect(reading.clipped).toBe(true)
  })

  it("begins with the later of the two counters", () => {
    const begins = RANGE.from + HOUR

    expect(
      read(goalRangeOf(goal(), RANGE, counters({ actedBegins: begins }))).current.range.from
    ).toBe(begins)
  })

  it("compares only with a period counted from its first hour", () => {
    expect(
      read(goalRangeOf(goal(), RANGE, counters({ actedBegins: BEFORE + HOUR }))).before
    ).toBeUndefined()
  })

  it("is uncounted where nothing was counted by the hour, or only after the range", () => {
    expect(
      goalRangeOf(goal(), RANGE, counters({ arrivals: arrivals([], null), actedBegins: undefined }))
    ).toEqual({
      kind: "uncounted",
    })
    expect(goalRangeOf(goal(), RANGE, counters({ actedBegins: RANGE.to }))).toEqual({
      kind: "uncounted",
    })
  })
})

describe("goalFigureOf", () => {
  const figure = (overrides: Partial<GoalCounters> = {}, of: Goal = goal()) =>
    goalFigureOf(
      { kind: "read", goal: of, range: goalRangeOf(of, RANGE, counters(overrides)) },
      "24h"
    )

  it("is not drawn for a project without a goal", () => {
    expect(goalFigureOf({ kind: "none" }, "24h")).toBeUndefined()
  })

  it("says the rate per 100 page views, what it rests on and the change on the period before", () => {
    expect(figure()).toEqual({
      label: "Primary goal, last 24 hours",
      value: "3 per 100",
      note: "Starts a trial: 6 presses in 200 page views, 3 per 100. Up 50% on the 24 hours before (2 per 100).",
    })
  })

  it("says the period before was not counted, and counts nothing from before counting began", () => {
    const begins = RANGE.from + 3 * HOUR

    expect(figure({ arrivals: arrivals([[HOME, begins, 40]], begins) })?.note).toBe(
      "Starts a trial: 0 presses in 40 page views, 0 per 100. Nothing to compare with: the 24 hours before were not counted. Counted by the hour from 7 November 2026 at 16:00 UTC."
    )
  })

  it("keeps a period before with no page views or no presses apart from a fall", () => {
    expect(figure({ arrivals: arrivals([[HOME, RANGE.from, 200]]) })?.note).toContain(
      "No page views on the pages it covers in the 24 hours before."
    )
    expect(figure({ acted: acted([[HOME, RANGE.from, 6]]) })?.note).toContain(
      "None in the 24 hours before, in 100 page views."
    )
    expect(figure({ acted: acted([]) })?.note).toContain("None in the 24 hours before either.")
  })

  it("says no page views rather than a rate of nought", () => {
    expect(figure({ arrivals: arrivals([[HOME, BEFORE, 100]]) })).toMatchObject({
      value: "No page views",
      note: "Starts a trial: no page views on the pages it covers.",
    })
  })

  it("says nothing was counted, and says a reading that failed rather than a nought", () => {
    expect(figure({ arrivals: arrivals([], null), actedBegins: undefined })).toMatchObject({
      value: "Not counted yet",
    })
    expect(goalFigureOf({ kind: "unreadable" }, "7d")).toMatchObject({ value: "Not available" })
  })
})

describe("rangeTotalsOf", () => {
  it("folds the range's hours into a total per page and per part, each kind apart", () => {
    const totals = rangeTotalsOf(
      counters({
        arrivals: arrivals([
          [HOME, RANGE.from, 200],
          [HOME, RANGE.from + HOUR, 50],
          [PRICING, RANGE.from, 30],
          [HOME, BEFORE, 100],
        ]),
        acted: {
          hours: [
            ...acted([
              [HOME, RANGE.from, 6],
              [HOME, RANGE.from + HOUR, 1],
              [HOME, BEFORE, 9],
            ]).hours,
            ...acted([[PRICING, RANGE.from, 2]], OTHER).hours.map((row) => ({ ...row, opens: 4 })),
          ],
        },
      }),
      RANGE
    )

    expect(totals).toEqual({
      kind: "read",
      from: RANGE.from,
      clipped: false,
      pages: [
        { treeId: HOME, views: 250 },
        { treeId: PRICING, views: 30 },
      ],
      parts: [
        { treeId: HOME, nodeId: START, counts: { activated: 7, completed: 0, disclosed: 0 } },
        { treeId: PRICING, nodeId: OTHER, counts: { activated: 2, completed: 0, disclosed: 4 } },
      ],
    })
  })

  it("starts where counting began inside the range, and says so", () => {
    const begins = RANGE.from + 4 * HOUR

    expect(
      rangeTotalsOf(
        counters({
          arrivals: arrivals(
            [
              [HOME, RANGE.from, 200],
              [HOME, begins, 40],
            ],
            begins
          ),
        }),
        RANGE
      )
    ).toMatchObject({ from: begins, clipped: true, pages: [{ treeId: HOME, views: 40 }] })
  })

  it("is uncounted where nothing was counted by the hour before the range ended", () => {
    expect(
      rangeTotalsOf(counters({ arrivals: arrivals([], null), actedBegins: undefined }), RANGE)
    ).toEqual({ kind: "uncounted" })
  })
})
