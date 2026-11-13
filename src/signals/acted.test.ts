import { describe, expect, it } from "vitest"

import { nodeId, primitiveType, TREE } from "../testing/reader-signal-contract.js"

import {
  ACTED_KINDS,
  actedAgainstOf,
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
import {
  ARRIVAL_HOUR_MS,
  arrivalRangeOf,
  arrivalSeriesOf,
  type StoredArrivals,
} from "./arrivals.js"
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

  /**
   * The pairing's one guarantee is this call's one guarantee, so it is taken
   * here rather than left to a caller holding two readings.
   */
  it("pairs the two series it read over one range, with no second read", async () => {
    const handle = handleOver(
      [row(13, { activations: 5 })],
      hourOf(0),
      arrivals(
        [
          { hour: hourOf(12), views: 20 },
          { hour: hourOf(13), views: 30 },
        ],
        hourOf(0)
      )
    )
    const reading = await readReaderActedRate(handle, { range })

    expect(handle.reads).toHaveLength(1)
    expect(reading.ok && reading.value.against.hours[0]).toEqual({
      hour: hourOf(12),
      count: 0,
      views: null,
      whole: true,
    })
    expect(reading.ok && reading.value.against.hours[1]).toEqual({
      hour: hourOf(13),
      count: 5,
      views: 50,
      whole: true,
    })
    expect(reading.ok && reading.value.against.range).toEqual(range)
  })
})

/**
 * The pair, which is the reading 0362 clause 9's reason was about: an hour's
 * doings and the page views they could have come from, with no quotient between
 * them.
 *
 * Every test here is about a **denominator**, because the numerators are
 * `actedSeriesOf`'s and are already guarded above. Two of them are the whole
 * point: the rolling window (so an hour whose readers arrived in the previous
 * hour is a pair rather than presses from nobody), and the refusal to add the
 * denominators up (because every page view is in two of them on purpose).
 */
describe("actedAgainstOf", () => {
  const range = { from: hourOf(12), to: hourOf(24) }

  const arrivalRows = (
    hours: readonly { hour: number; views: number }[],
    begins?: number
  ): StoredArrivals => ({
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

  /** An acted series and an arrivals series over the same range, as a reading hands them over. */
  const pairOver = (
    acted: readonly StoredActedHour[],
    arrivals: readonly { hour: number; views: number }[],
    options: { readonly arrivalsBegins?: number } = {}
  ) =>
    actedAgainstOf(
      actedSeriesOf(stored(acted, hourOf(0)), range),
      arrivalSeriesOf(arrivalRows(arrivals, options.arrivalsBegins ?? hourOf(0)), range)
    )

  const viewsAt = (against: ReturnType<typeof pairOver>, hour: number): number | null | undefined =>
    against.hours.find((entry) => entry.hour === hourOf(hour))?.views

  it("pairs an hour's doings with the page views of that hour and the one before", () => {
    const against = pairOver(
      [row(14, { activations: 9 })],
      [
        { hour: hourOf(13), views: 40 },
        { hour: hourOf(14), views: 60 },
      ]
    )

    expect(viewsAt(against, 14)).toBe(100)
    expect(against.hours.find((entry) => entry.hour === hourOf(14))?.count).toBe(9)
  })

  /**
   * The test the finding of 6 November asked for first, in the shape this
   * reading takes: an hour holding doings and no arrivals of its own is not an
   * hour whose readers came from nowhere.
   */
  it("reads an hour whose readers all arrived in the previous hour as a pair, not as doings from nobody", () => {
    const against = pairOver([row(13, { activations: 5 })], [{ hour: hourOf(12), views: 20 }])

    expect(viewsAt(against, 13)).toBe(20)
  })

  /**
   * The denominator is the only number here that does not add, and this is the
   * assertion that keeps it from being added: every page view is in two hours'
   * windows deliberately, so a sum of them is about twice the range's page
   * views — and the range's own denominator is `ActedRate`'s, taken once
   * (0158).
   */
  it("publishes no total denominator, because every page view is in two hours' windows", () => {
    const hours = Array.from({ length: 12 }, (_, index) => index + 12)
    const against = pairOver(
      hours.map((hour) => row(hour, { activations: 1 })),
      hours.map((hour) => ({ hour: hourOf(hour), views: 10 }))
    )

    const denominators = against.hours.reduce((sum, entry) => sum + (entry.views ?? 0), 0)

    expect(denominators).toBe(220)
    expect(against.count).toBe(12)
    expect(against).not.toHaveProperty("views")
    expect(against.hours.reduce((sum, entry) => sum + entry.count, 0)).toBe(against.count)
  })

  it("withholds the first hour of the range, whose earlier hour the arrivals series does not draw", () => {
    const against = pairOver(
      [row(12, { activations: 3 })],
      [
        { hour: hourOf(11), views: 70 },
        { hour: hourOf(12), views: 30 },
      ]
    )

    expect(viewsAt(against, 12)).toBeNull()
    expect(against.hours.find((entry) => entry.hour === hourOf(12))?.count).toBe(3)
  })

  /**
   * The two states this field keeps apart, which is the rule the subsystem
   * keeps everywhere a figure can be empty for two reasons (0309, 0347).
   */
  it("counts a nought denominator as a nought and an unreachable one as a withholding", () => {
    const against = pairOver([row(14, { activations: 2 })], [{ hour: hourOf(20), views: 5 }])

    expect(viewsAt(against, 14)).toBe(0)
    expect(viewsAt(against, 12)).toBeNull()
  })

  it("withholds the hours before page views were first counted, rather than dividing by a page nobody counted", () => {
    const against = pairOver(
      [row(13, { activations: 1 }), row(15, { activations: 1 })],
      [
        { hour: hourOf(14), views: 10 },
        { hour: hourOf(15), views: 10 },
      ],
      { arrivalsBegins: hourOf(14) }
    )

    expect(viewsAt(against, 13)).toBeNull()
    expect(viewsAt(against, 14)).toBeNull()
    expect(viewsAt(against, 15)).toBe(20)
  })

  it("is in step with the acted series, and carries its range, kind and clipping", () => {
    const series = actedSeriesOf(stored([row(14, { activations: 1 })], hourOf(13)), range)
    const against = actedAgainstOf(
      series,
      arrivalSeriesOf(arrivalRows([{ hour: hourOf(14), views: 1 }], hourOf(0)), range)
    )

    expect(against.range).toEqual(series.range)
    expect(against.kind).toBe(series.kind)
    expect(against.clipped).toBe(series.clipped)
    expect(against.begins).toBe(hourOf(13))
    expect(against.hours.map((entry) => entry.hour)).toEqual(series.hours.map((entry) => entry.hour))
  })

  it("marks the hour in progress as the acted series does, so a surface does not draw the clock as a fall", () => {
    const against = actedAgainstOf(
      actedSeriesOf(stored([row(23, { activations: 1 })], hourOf(0)), range, { now: hourOf(23) }),
      arrivalSeriesOf(arrivalRows([{ hour: hourOf(23), views: 2 }], hourOf(0)), range)
    )

    expect(against.hours.at(-1)).toMatchObject({ hour: hourOf(23), whole: false })
  })

  it("draws nothing where nothing has ever been counted, rather than a row of noughts", () => {
    const against = actedAgainstOf(
      actedSeriesOf({ hours: [] }, range),
      arrivalSeriesOf(arrivalRows([{ hour: hourOf(14), views: 4 }], hourOf(0)), range)
    )

    expect(against.hours).toEqual([])
    expect(against.count).toBe(0)
  })

  /**
   * Handed two series a caller assembled over different ranges, the pairing
   * degrades to a withholding rather than to a denominator describing a
   * different stretch of time — which is a number nobody can tell is wrong by
   * looking at it.
   */
  it("withholds every denominator where the arrivals series is over another range", () => {
    const against = actedAgainstOf(
      actedSeriesOf(stored([row(14, { activations: 1 })], hourOf(0)), range),
      arrivalSeriesOf(arrivalRows([{ hour: hourOf(2), views: 100 }], hourOf(0)), {
        from: hourOf(0),
        to: hourOf(12),
      })
    )

    expect(against.hours.every((entry) => entry.views === null)).toBe(true)
    expect(against.hours).not.toHaveLength(0)
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
