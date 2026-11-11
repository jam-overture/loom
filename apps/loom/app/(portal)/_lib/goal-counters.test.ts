import { describe, expect, it } from "vitest"

import { err, nodeIdSchema, ok, treeIdSchema } from "@jam-overture/loom"
import {
  arrivalRangeOf,
  type ActedReadRequest,
  type ArrivalReadRequest,
  type ReaderSignalStoreError,
  type ReaderTallyStore,
} from "@jam-overture/loom/signals"

import { readGoalCounters } from "./goal-counters"
import { goalSpanOf } from "./goal-range"

const HOUR = 3_600_000
const SPAN = goalSpanOf(arrivalRangeOf(Date.UTC(2026, 10, 8, 12, 30), 168))
const HOME = treeIdSchema.parse("t_home")
const START = nodeIdSchema.parse("n_start")
const FIRST_ACTED = SPAN.from - 30 * HOUR
const BROKEN: ReaderSignalStoreError = { code: "unavailable", detail: "the connection went away" }

type Counters = Pick<ReaderTallyStore, "arrivals" | "acted">

/** Counters that answer, keeping every request they were asked so a test can say what was read. */
const recording = () => {
  const arrivalsAsked: ArrivalReadRequest[] = []
  const actedAsked: ActedReadRequest[] = []
  const tallies: Counters = {
    arrivals: (request = {}) => {
      arrivalsAsked.push(request)
      return Promise.resolve(ok({ hours: [], begins: SPAN.from }))
    },
    acted: (request = {}) => {
      actedAsked.push(request)
      return Promise.resolve(
        ok(request.nodeId === undefined ? { hours: [], begins: FIRST_ACTED } : { hours: [] })
      )
    },
  }

  return { tallies, arrivalsAsked, actedAsked }
}

describe("readGoalCounters", () => {
  it("reads every page and part over the span when no scope is named, as Goals does for all its goals at once", async () => {
    const { tallies, arrivalsAsked, actedAsked } = recording()

    const counters = await readGoalCounters(tallies, SPAN)

    expect(arrivalsAsked).toEqual([SPAN])
    expect(actedAsked).toEqual([SPAN, { from: SPAN.from, to: SPAN.from }])
    expect(counters).toEqual({
      arrivals: { hours: [], begins: SPAN.from },
      acted: { hours: [], begins: FIRST_ACTED },
      actedBegins: FIRST_ACTED,
    })
  })

  it("narrows what readers did to the goal's part and keeps page views project-wide", async () => {
    const { tallies, arrivalsAsked, actedAsked } = recording()

    const counters = await readGoalCounters(tallies, SPAN, { nodeId: START })

    expect(arrivalsAsked).toEqual([SPAN])
    expect(actedAsked[0]).toEqual({ nodeId: START, ...SPAN })
    expect(counters?.acted.begins).toBeUndefined()
    expect(counters?.actedBegins).toBe(FIRST_ACTED)
  })

  it("narrows both to one page for a drawer, and still takes when counting began from the whole project", async () => {
    const { tallies, arrivalsAsked, actedAsked } = recording()

    const counters = await readGoalCounters(tallies, SPAN, { treeId: HOME })

    expect(arrivalsAsked).toEqual([{ treeId: HOME, ...SPAN }])
    expect(actedAsked).toEqual([
      { treeId: HOME, ...SPAN },
      { from: SPAN.from, to: SPAN.from },
    ])
    expect(counters?.actedBegins).toBe(FIRST_ACTED)
  })

  it.each([
    ["page views", { arrivals: () => Promise.resolve(err(BROKEN)) }],
    ["what readers did", { acted: () => Promise.resolve(err(BROKEN)) }],
  ] as const)("is undefined where %s did not answer, never a nought", async (_, broken) => {
    const counters = await readGoalCounters({ ...recording().tallies, ...broken }, SPAN)

    expect(counters).toBeUndefined()
  })
})
