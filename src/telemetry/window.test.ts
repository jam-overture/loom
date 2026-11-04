import { describe, expect, it } from "vitest"

import {
  describeTelemetryWindowFault,
  telemetrySpanOf,
  telemetryWindow,
  withinTelemetryWindow,
  type TelemetryWindow,
} from "./window.js"

/**
 * The half of the window that never reaches a journal.
 *
 * A bound is refused here or it is comparable everywhere, which is the whole
 * reason this constructor exists rather than two optional strings on the read
 * request: `Date.parse` of a typo is `NaN`, every comparison against `NaN` is
 * false, and a journal handed one would answer *nothing happened that week*
 * with no way for anybody to tell that from the truth.
 */

const built = (request: Parameters<typeof telemetryWindow>[0]): TelemetryWindow => {
  const outcome = telemetryWindow(request)
  if (!outcome.ok) throw new Error(describeTelemetryWindowFault(outcome.error))

  return outcome.value
}

describe("building a window", () => {
  it("reads an ISO string into the instant it names", () => {
    expect(built({ since: "2026-01-01T00:00:00.000Z" })).toEqual({
      since: Date.parse("2026-01-01T00:00:00.000Z"),
    })
  })

  it("takes a Date, because a caller that did arithmetic is holding one", () => {
    const since = new Date("2026-03-04T05:06:07.008Z")

    expect(built({ since })).toEqual({ since: since.getTime() })
  })

  /**
   * The reason the window holds instants and not the strings it was given. Two
   * spellings of one moment must build one window, and a journal comparing the
   * strings would order them backwards.
   */
  it("gives one window for two spellings of the same instant", () => {
    expect(built({ since: "2026-01-01T02:00:00.000Z" })).toEqual(
      built({ since: "2026-01-01T04:00:00.000+02:00" })
    )
  })

  it("is unbounded when neither end is named, rather than a fault", () => {
    expect(built({})).toEqual({})
    expect(withinTelemetryWindow(built({}), "2026-01-01T00:00:00.000Z")).toBe(true)
  })

  it("names which bound it could not read, and what it was given", () => {
    expect(telemetryWindow({ since: "last tuesday" })).toEqual({
      ok: false,
      error: { code: "unreadable-bound", bound: "since", given: "last tuesday" },
    })
    expect(telemetryWindow({ until: "" })).toEqual({
      ok: false,
      error: { code: "unreadable-bound", bound: "until", given: "" },
    })
  })

  /** An `Invalid Date` is a `Date`, and its time is `NaN`. */
  it("refuses a Date that is not an instant", () => {
    expect(telemetryWindow({ until: new Date("nonsense") })).toMatchObject({
      ok: false,
      error: { code: "unreadable-bound", bound: "until" },
    })
  })

  it("refuses a window that ends before it begins", () => {
    const outcome = telemetryWindow({
      since: "2026-02-01T00:00:00.000Z",
      until: "2026-01-01T00:00:00.000Z",
    })

    expect(outcome).toEqual({
      ok: false,
      error: {
        code: "inverted",
        since: "2026-02-01T00:00:00.000Z",
        until: "2026-01-01T00:00:00.000Z",
      },
    })
    expect(!outcome.ok && describeTelemetryWindowFault(outcome.error)).toContain(
      "ends before it begins"
    )
  })

  /**
   * Allowed, and empty by construction. A caller slicing a range into windows
   * produces it at the edges, and refusing it would make that caller special-case
   * an arithmetic result rather than a mistake it made.
   */
  it("allows a window whose ends meet, and holds nothing in it", () => {
    const instant = "2026-01-01T00:00:00.000Z"
    const window = built({ since: instant, until: instant })

    expect(withinTelemetryWindow(window, instant)).toBe(false)
  })
})

describe("whether a stamp is in a window", () => {
  const JANUARY = "2026-01-01T00:00:00.000Z"
  const FEBRUARY = "2026-02-01T00:00:00.000Z"
  const MARCH = "2026-03-01T00:00:00.000Z"

  it("includes a stamp on the since and excludes one on the until", () => {
    const window = built({ since: JANUARY, until: MARCH })

    expect(withinTelemetryWindow(window, JANUARY)).toBe(true)
    expect(withinTelemetryWindow(window, FEBRUARY)).toBe(true)
    expect(withinTelemetryWindow(window, MARCH)).toBe(false)
  })

  it("holds everything when there is no window at all", () => {
    expect(withinTelemetryWindow(undefined, JANUARY)).toBe(true)
  })

  /**
   * Written at an offset, this stamp is half past seven on New Year's Eve — an
   * hour outside a window that begins at midnight on the 1st. Its *string*
   * sorts after the bound, so an implementation comparing the text lets it in.
   */
  it("compares instants rather than the strings they were written as", () => {
    expect(withinTelemetryWindow(built({ since: JANUARY }), "2026-01-01T00:30:00.000+05:00")).toBe(
      false
    )
    expect(withinTelemetryWindow(built({ since: JANUARY }), "2026-01-01T00:30:00.000-05:00")).toBe(
      true
    )
  })

  /**
   * The one direction that is safe. A record whose stamp cannot be read is a
   * record of unknown date, and letting it into a window would put it inside a
   * stretch somebody is about to draw a conclusion from.
   */
  it("puts a stamp it cannot read outside every window", () => {
    expect(withinTelemetryWindow(built({ since: JANUARY }), "not an instant")).toBe(false)
    expect(withinTelemetryWindow(built({ until: MARCH }), "not an instant")).toBe(false)
  })

  it("lets an unreadable stamp through when nothing was asked about time", () => {
    expect(withinTelemetryWindow(undefined, "not an instant")).toBe(true)
  })
})

describe("the stretch a page covers", () => {
  const stamped = (...recordedAt: readonly string[]) => recordedAt.map((value) => ({ recordedAt: value }))

  it("covers no time at all when there are no records", () => {
    expect(telemetrySpanOf([])).toBeNull()
  })

  it("begins and ends on the one stamp a single record carries", () => {
    expect(telemetrySpanOf(stamped("2026-01-01T00:00:00.000Z"))).toEqual({
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-01-01T00:00:00.000Z",
    })
  })

  /**
   * The earliest and latest rather than the first and last. `seq` is allocated
   * at insert and `recordedAt` is a clock's reading, so two writers whose
   * transactions overlap can land a lower stamp at a higher position — and
   * first-and-last would report a span running backwards.
   */
  it("reports the earliest and latest, not the first and last", () => {
    expect(
      telemetrySpanOf(
        stamped(
          "2026-01-02T00:00:00.000Z",
          "2026-01-01T00:00:00.000Z",
          "2026-01-03T00:00:00.000Z",
          "2026-01-02T12:00:00.000Z"
        )
      )
    ).toEqual({ from: "2026-01-01T00:00:00.000Z", to: "2026-01-03T00:00:00.000Z" })
  })

  it("compares instants rather than the strings, so an offset does not reorder the ends", () => {
    expect(
      telemetrySpanOf(stamped("2026-01-01T12:00:00.000Z", "2026-01-01T09:00:00.000-06:00"))
    ).toEqual({ from: "2026-01-01T12:00:00.000Z", to: "2026-01-01T09:00:00.000-06:00" })
  })

  it("lets a stamp it cannot read define neither end", () => {
    expect(telemetrySpanOf(stamped("not an instant", "2026-01-01T00:00:00.000Z"))).toEqual({
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-01-01T00:00:00.000Z",
    })
    expect(telemetrySpanOf(stamped("not an instant"))).toBeNull()
  })
})
