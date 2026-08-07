import { describe, expect, it } from "vitest"

import type { TreeId } from "@loom/runtime"

import { historyStart, parseRevisionParam, revisionAnchorId, revisionHref } from "./history-link"

const TREE = "t_1" as TreeId

describe("revisionHref", () => {
  it("names the tree, the revision to open at, and the row to scroll to", () => {
    expect(revisionHref(TREE, 4)).toBe("/history?tree=t_1&at=4#revision-4")
  })

  /** The fragment and the row id are the same string, or the link scrolls nowhere. */
  it("ends at the id the row will carry", () => {
    expect(revisionHref(TREE, 12).endsWith(`#${revisionAnchorId(12)}`)).toBe(true)
  })

  it("escapes a tree id rather than pasting it into a query string", () => {
    expect(revisionHref("t_a b&c" as TreeId, 1)).toContain("tree=t_a%20b%26c")
  })
})

describe("parseRevisionParam", () => {
  it("reads a revision a link put there", () => {
    expect(parseRevisionParam("4")).toBe(4)
  })

  it("treats an absent or empty parameter as no anchor at all", () => {
    expect(parseRevisionParam(undefined)).toBeUndefined()
    expect(parseRevisionParam("")).toBeUndefined()
    expect(parseRevisionParam("   ")).toBeUndefined()
  })

  /**
   * Revision 0 is the shape a tree was created with and no log entry produces
   * it, so a parameter naming it is a mistake rather than a position — as are
   * the rest of these. Each would otherwise reach the store as an anchor and
   * come back as a page nobody asked for.
   */
  it("refuses anything that is not a revision a log entry could have", () => {
    expect(parseRevisionParam("0")).toBeUndefined()
    expect(parseRevisionParam("-2")).toBeUndefined()
    expect(parseRevisionParam("3.5")).toBeUndefined()
    expect(parseRevisionParam("four")).toBeUndefined()
    expect(parseRevisionParam("1e400")).toBeUndefined()
  })
})

describe("historyStart", () => {
  it("opens at the revision a link named", () => {
    expect(historyStart(undefined, 4)).toEqual({ at: 4 })
  })

  it("takes the newest page when nothing named a position", () => {
    expect(historyStart(undefined, undefined)).toEqual({})
  })

  /**
   * A reader who paged away from the revision they arrived at has given a newer
   * instruction than the link did. Sending both to the store is not an option:
   * the contract makes them mutually exclusive precisely so that a read cannot
   * quietly ignore half of what it was asked.
   */
  it("prefers the step the reader took over the link that brought them", () => {
    expect(historyStart("7", 4)).toEqual({ cursor: "7" })
  })
})
