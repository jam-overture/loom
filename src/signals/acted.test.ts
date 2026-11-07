import { describe, expect, it } from "vitest"

import { nodeId, primitiveType, TREE } from "../testing/reader-signal-contract.js"

import {
  ACTED_KINDS,
  actedChangeOf,
  actedCountOf,
  actedSeriesOf,
  isActedKind,
  readReaderActed,
  readReaderActedRate,
  type ActedHourCount,
  type ActedKind,
  type StoredActed,
  type StoredActedHour,
} from "./acted.js"
import { ARRIVAL_HOUR_MS, arrivalRangeOf, type StoredArrivals } from "./arrivals.js"
import type { ReaderSignalStoreError } from "./journal.js"
import { DEFAULT_AUDIENCE_ID } from "../audience/audience.js"

const HOUR = ARRIVAL_HOUR_MS
const MIDNIGHT = Date.parse("2026-11-06T00:00:00.000Z")
const hourOf = (hour: number): number => MIDNIGHT + hour * HOUR

const row = (hour: number, overrides: Partial<ActedHourCount> = {}): StoredActedHour => ({
  audienceId: DEFAULT_AUDIENCE_ID,
  treeId: TREE,
  revision: 1,
  nodeId: nodeId("buy"),
  type: primitiveType("loom.button"),
  hour: hourOf(hour),
  activations: 1,
  opens: 0,
  closes: 0,
  completions: 0,
  updatedAt: new Date(hourOf(hour)).toISOString(),
  ...overrides,
})

const stored = (hours: readonly StoredActedHour[], begins?: number): StoredActed => ({
  hours,
  ...(begins === undefined ? {} : { begins }),
})

/** Midnight to midnight, which every range below is a slice of. */
const DAY = { from: hourOf(0), to: hourOf(24) }

describe("the kinds this counter holds", () => {
  it("is the three a reader aimed at something to cause", () => {
    expect(ACTED_KINDS).toEqual(["activated", "disclosed", "completed"])
  })

  it("says which kinds are in it, so a caller does not keep its own list", () => {
    expect(isActedKind("activated")).toBe(true)
    expect(isActedKind("viewed")).toBe(false)
    expect(isActedKind("dwelled")).toBe(false)
  })

  /**
   * The one mapping a surface would otherwise keep a second copy of: a goal on
   * a disclosure counts openings (0350 clause 4), not openings and shuttings.
   */
  it("counts a disclosure's openings for the kind, with the shuttings beside them", () => {
    const disclosure = row(9, { activations: 0, opens: 3, closes: 2 })

    expect(actedCountOf(disclosure, "disclosed")).toBe(3)
    expect(disclosure.closes).toBe(2)
  })

  it("counts presses and sends in their own counters", () => {
    expect(actedCountOf(row(9, { activations: 4 }), "activated")).toBe(4)
    expect(actedCountOf(row(9, { completions: 2 }), "completed")).toBe(2)
  })
})

describe("actedSeriesOf", () => {
  it("draws one dense bar an hour, including the hours nobody acted in", () => {
    const series = actedSeriesOf(
      stored([row(1), row(3, { activations: 5 })], hourOf(0)),
      { from: hourOf(0), to: hourOf(4) }
    )

    expect(series.hours.map((hour) => hour.count)).toEqual([0, 1, 0, 5])
    expect(series.count).toBe(6)
  })

  it("reads presses where no kind is named, because that is the commonest goal", () => {
    const series = actedSeriesOf(stored([row(1, { activations: 2, opens: 7 })], hourOf(0)), DAY)

    expect(series.kind).toBe("activated")
    expect(series.count).toBe(2)
  })

  it("reads one kind at a time, so two different things are never one chart", () => {
    const mixed = stored([row(1, { activations: 2, opens: 7, completions: 1 })], hourOf(0))

    expect(actedSeriesOf(mixed, DAY, { kind: "disclosed" }).count).toBe(7)
    expect(actedSeriesOf(mixed, DAY, { kind: "completed" }).count).toBe(1)
  })

  it("sums the parts and revisions the narrowing held, because occurrences add", () => {
    const series = actedSeriesOf(
      stored(
        [
          row(1),
          row(1, { nodeId: nodeId("signup"), activations: 2 }),
          row(1, { revision: 2, activations: 3 }),
        ],
        hourOf(0)
      ),
      { from: hourOf(1), to: hourOf(2) }
    )

    expect(series.hours.map((hour) => hour.count)).toEqual([6])
  })

  it("ignores a row outside the range rather than refusing it", () => {
    const series = actedSeriesOf(stored([row(1), row(9)], hourOf(0)), {
      from: hourOf(9),
      to: hourOf(10),
    })

    expect(series.count).toBe(1)
  })

  it("marks the hour in progress, so a surface does not draw the clock as a fall", () => {
    const range = arrivalRangeOf(hourOf(9) + 20 * 60_000, 3)
    const series = actedSeriesOf(stored([row(9)], hourOf(0)), range, {
      now: hourOf(9) + 20 * 60_000,
    })

    expect(series.hours.map((hour) => hour.whole)).toEqual([true, true, false])
  })

  it("starts where counting began and says the range was clipped", () => {
    const series = actedSeriesOf(stored([row(20)], hourOf(20)), DAY)

    expect(series.clipped).toBe(true)
    expect(series.hours).toHaveLength(4)
    expect(series.begins).toBe(hourOf(20))
  })

  it("draws nothing at all where nothing has ever been counted", () => {
    const series = actedSeriesOf(stored([]), DAY)

    expect(series.hours).toEqual([])
    expect(series.count).toBe(0)
    expect(series.begins).toBeUndefined()
    expect(series.clipped).toBe(false)
  })
})

describe("actedChangeOf", () => {
  const range = { from: hourOf(12), to: hourOf(24) }

  it("compares the range against the equal period before it", () => {
    const change = actedChangeOf(
      stored([row(6, { activations: 4 }), row(13, { activations: 6 })], hourOf(0)),
      range
    )

    expect(change.count).toBe(6)
    expect(change.was).toBe(4)
    expect(change.before).toEqual({ from: hourOf(0), to: hourOf(12) })
    expect(change.ratio.ratio).toBe(1.5)
  })

  /**
   * The field the whole comparison exists for: a deployment that started
   * counting inside the earlier period never had the presses it is missing.
   */
  it("withholds the earlier figure where counting had not begun", () => {
    const change = actedChangeOf(stored([row(13)], hourOf(13)), range)

    expect(change.was).toBeNull()
    expect(change.ratio).toEqual({ ratio: null, absent: "unmeasured" })
  })

  it("says a rise from a counted nought is a rise rather than nothing to compare", () => {
    const change = actedChangeOf(stored([row(13, { activations: 9 })], hourOf(0)), range)

    expect(change.was).toBe(0)
    expect(change.count).toBe(9)
    expect(change.ratio).toEqual({ ratio: null, absent: "from-nothing" })
  })

  it("publishes a fall to nought as a quotient, because it is a measurement", () => {
    const change = actedChangeOf(stored([row(6, { activations: 4 })], hourOf(0)), range)

    expect(change.count).toBe(0)
    expect(change.ratio.ratio).toBe(0)
  })
})

const handleOver = (
  hours: readonly StoredActedHour[],
  begins: number | undefined,
  arrivals: StoredArrivals = { hours: [] }
) => {
  const reads: { from?: number; to?: number; nodeId?: string }[] = []

  return {
    reads,
    acted: (request?: { from?: number; to?: number; nodeId?: string }) => {
      reads.push({ ...request })

      const inRange = hours.filter(
        (hour) =>
          (request?.from === undefined || hour.hour >= request.from) &&
          (request?.to === undefined || hour.hour < request.to) &&
          (request?.nodeId === undefined || hour.nodeId === request.nodeId)
      )

      return Promise.resolve({
        ok: true as const,
        value: stored(inRange, begins),
      })
    },
    arrivals: () => Promise.resolve({ ok: true as const, value: arrivals }),
  }
}

describe("readReaderActed", () => {
  const range = { from: hourOf(12), to: hourOf(24) }

  /**
   * The composition this function exists to prevent: a caller reading only the
   * range on the screen gets an earlier period that is empty because it was
   * not read, which reads as *every press you have is new*.
   */
  it("reads from the start of the earlier period, not the start of the range", async () => {
    const handle = handleOver([row(6, { activations: 4 }), row(13)], hourOf(0))
    const reading = await readReaderActed(handle, { range })

    expect(handle.reads).toEqual([{ from: hourOf(0), to: hourOf(24) }])
    expect(reading.ok && reading.value.change.was).toBe(4)
    expect(reading.ok && reading.value.series.count).toBe(1)
  })

  it("asks the store for the one part a goal is about", async () => {
    const handle = handleOver([row(13), row(13, { nodeId: nodeId("signup") })], hourOf(0))
    const reading = await readReaderActed(handle, { range, nodeId: nodeId("buy") })

    expect(handle.reads[0]?.nodeId).toBe(nodeId("buy"))
    expect(reading.ok && reading.value.series.count).toBe(1)
  })

  it("carries the kind into both halves of the reading", async () => {
    const handle = handleOver([row(13, { activations: 1, completions: 5 })], hourOf(0))
    const reading = await readReaderActed(handle, { range, kind: "completed" })

    expect(reading.ok && reading.value.series.kind).toBe("completed")
    expect(reading.ok && reading.value.change.count).toBe(5)
  })

  it("hands back the store's failure rather than an empty chart", async () => {
    const broken: ReaderSignalStoreError = { code: "unavailable", detail: "the connection went away" }
    const reading = await readReaderActed(
      { acted: () => Promise.resolve({ ok: false as const, error: broken }) },
      { range }
    )

    expect(reading).toEqual({ ok: false, error: broken })
  })
})

describe("readReaderActedRate", () => {
  const range = { from: hourOf(12), to: hourOf(24) }

  const arrivals = (hours: readonly { hour: number; views: number }[], begins?: number): StoredArrivals => ({
    hours: hours.map(({ hour, views }) => ({
      audienceId: DEFAULT_AUDIENCE_ID,
      treeId: TREE,
      revision: 1,
      hour,
      views,
      updatedAt: new Date(hour).toISOString(),
    })),
    ...(begins === undefined ? {} : { begins }),
  })

  it("is the count per hundred page views of the same range", async () => {
    const handle = handleOver(
      [row(13, { activations: 7 })],
      hourOf(0),
      arrivals([{ hour: hourOf(13), views: 200 }], hourOf(0))
    )
    const reading = await readReaderActedRate(handle, { range })

    expect(reading.ok && reading.value.rate.per100).toBe(3.5)
    expect(reading.ok && reading.value.arrivals.change.views).toBe(200)
  })

  it("compares the rate against the rate of the period before", async () => {
    const handle = handleOver(
      [row(6, { activations: 2 }), row(13, { activations: 6 })],
      hourOf(0),
      arrivals(
        [
          { hour: hourOf(6), views: 100 },
          { hour: hourOf(13), views: 100 },
        ],
        hourOf(0)
      )
    )
    const reading = await readReaderActedRate(handle, { range })

    expect(reading.ok && reading.value.rate.was).toBe(2)
    expect(reading.ok && reading.value.rate.per100).toBe(6)
    expect(reading.ok && reading.value.rate.ratio.ratio).toBe(3)
  })

  /**
   * The case this reading refuses to turn into a number: the denominator counts
   * page views that *began* in the range and the numerator what readers *did*
   * in it, so a range can hold presses and no arrivals — every reader in it
   * came in before it started.
   */
  it("withholds the rate where the range held no page views, rather than reading as nobody acts", async () => {
    const handle = handleOver([row(13, { activations: 4 })], hourOf(0), arrivals([], hourOf(0)))
    const reading = await readReaderActedRate(handle, { range })

    expect(reading.ok && reading.value.rate.per100).toBeNull()
    expect(reading.ok && reading.value.acted.change.count).toBe(4)
  })

  it("withholds the earlier rate where counting had not begun", async () => {
    const handle = handleOver(
      [row(13, { activations: 4 })],
      hourOf(13),
      arrivals([{ hour: hourOf(13), views: 50 }], hourOf(13))
    )
    const reading = await readReaderActedRate(handle, { range })

    expect(reading.ok && reading.value.rate.was).toBeNull()
    expect(reading.ok && reading.value.rate.ratio.absent).toBe("unmeasured")
  })

  it("does not narrow the page views to the part, because a page view is of a page", async () => {
    const handle = handleOver(
      [row(13, { activations: 1 })],
      hourOf(0),
      arrivals([{ hour: hourOf(13), views: 10 }], hourOf(0))
    )
    const read = await readReaderActedRate(handle, {
      range,
      nodeId: nodeId("buy"),
      kind: "activated",
    })

    expect(handle.reads[0]?.nodeId).toBe(nodeId("buy"))
    expect(handle.reads).toHaveLength(1)
    expect(read.ok && read.value.arrivals.change.views).toBe(10)
  })
})

describe("every kind is readable", () => {
  it.each(ACTED_KINDS)("reads a series of %s", (kind: ActedKind) => {
    const series = actedSeriesOf(
      stored([row(1, { activations: 1, opens: 1, completions: 1 })], hourOf(0)),
      DAY,
      { kind }
    )

    expect(series.count).toBe(1)
    expect(series.kind).toBe(kind)
  })
})
