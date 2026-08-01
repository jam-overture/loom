import { describe, expect, it } from "vitest"

import { clampLimit, cursorPosition, pageEnds } from "./paging.js"

describe("clampLimit", () => {
  it("falls back when the caller named no limit", () => {
    expect(clampLimit(undefined, { fallback: 50, max: 200 })).toBe(50)
  })

  it("falls back rather than trusting a limit that is not a number", () => {
    expect(clampLimit(Number.NaN, { fallback: 50, max: 200 })).toBe(50)
    expect(clampLimit(Number.POSITIVE_INFINITY, { fallback: 50, max: 200 })).toBe(50)
  })

  it("holds a limit inside the bounds it was given", () => {
    expect(clampLimit(1000, { fallback: 50, max: 200 })).toBe(200)
    expect(clampLimit(0, { fallback: 50, max: 200 })).toBe(1)
    expect(clampLimit(-5, { fallback: 50, max: 200 })).toBe(1)
  })

  it("takes the floor of a fractional limit rather than passing it to a query", () => {
    expect(clampLimit(2.9, { fallback: 50, max: 200 })).toBe(2)
  })
})

/**
 * The shared half of every paged log in Loom — the telemetry journal (0025) and
 * the revision log (0026). Both contract suites exercise this through their own
 * implementations; these are the cases stated once, in terms of positions rather
 * than of whatever is being paged.
 */
describe("pageEnds", () => {
  const ends = (
    positions: readonly number[],
    direction: "newer" | "older",
    beyond: boolean,
    resumed: boolean
  ) => pageEnds(positions, direction, { beyond, resumed })

  it("names neither end of an empty page", () => {
    expect(ends([], "older", true, true)).toEqual({ older: null, newer: null })
  })

  /**
   * Paging toward the older end, the probe says whether anything is older than
   * the page; the newer end is bounded by the cursor the caller arrived with.
   */
  it("names the older end of a backwards page from the probe", () => {
    expect(ends([3, 4, 5], "older", true, false)).toEqual({ older: "3", newer: null })
    expect(ends([3, 4, 5], "older", false, false)).toEqual({ older: null, newer: null })
  })

  it("names the newer end of a backwards page only once it was resumed", () => {
    expect(ends([3, 4, 5], "older", true, true)).toEqual({ older: "3", newer: "5" })
  })

  it("mirrors both rules when paging forward", () => {
    expect(ends([1, 2], "newer", true, false)).toEqual({ older: null, newer: "2" })
    expect(ends([1, 2], "newer", false, true)).toEqual({ older: "1", newer: null })
  })

  it("names both ends of a single-entry page it arrived at and can leave", () => {
    expect(ends([7], "older", true, true)).toEqual({ older: "7", newer: "7" })
  })
})

describe("cursorPosition", () => {
  it("reads a cursor back into the position it names", () => {
    expect(cursorPosition("42")).toBe(42)
  })

  /**
   * A cursor is opaque to the caller, so an unreadable one means the same thing
   * to every implementation — start from the end the direction begins at —
   * rather than one refusing what another silently accepts.
   */
  it("treats an absent or unreadable cursor as no position at all", () => {
    expect(cursorPosition(undefined)).toBeUndefined()
    expect(cursorPosition("")).toBeUndefined()
    expect(cursorPosition("not-a-position")).toBeUndefined()
  })
})
