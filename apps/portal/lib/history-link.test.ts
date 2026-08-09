import { describe, expect, it } from "vitest"

import type { TreeId } from "@loom/runtime"

import {
  describeStaleAnchor,
  historyPageHref,
  historyRead,
  parseRevisionParam,
  revisionAnchorId,
  revisionHref,
} from "./history-link"

const TREE = "t_1" as TreeId

/** A read with no parameters at all — the page somebody opens from the nav. */
const NOTHING_ASKED = { older: undefined, newer: undefined, at: undefined } as const

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

describe("historyRead", () => {
  it("opens at the revision a link named", () => {
    expect(historyRead({ ...NOTHING_ASKED, at: 4 })).toEqual({ direction: "older", at: 4 })
  })

  it("takes the newest page when nothing named a position", () => {
    expect(historyRead(NOTHING_ASKED)).toEqual({ direction: "older" })
  })

  /**
   * A reader who paged away from the revision they arrived at has given a newer
   * instruction than the link did. Sending both to the store is not an option:
   * the contract makes them mutually exclusive precisely so that a read cannot
   * quietly ignore half of what it was asked.
   */
  it("prefers the step the reader took over the link that brought them", () => {
    expect(historyRead({ ...NOTHING_ASKED, older: "7", at: 4 })).toEqual({
      direction: "older",
      cursor: "7",
    })
  })

  /**
   * A cursor is only meaningful in the direction the page that issued it was
   * read, so the step carries the direction rather than the page choosing one.
   */
  it("runs forward from the end a reader stepped off", () => {
    expect(historyRead({ ...NOTHING_ASKED, newer: "7" })).toEqual({
      direction: "newer",
      cursor: "7",
    })
  })

  it("leaves an anchor behind once a reader has stepped forward from it", () => {
    expect(historyRead({ ...NOTHING_ASKED, newer: "7", at: 4 })).toEqual({
      direction: "newer",
      cursor: "7",
    })
  })

  /**
   * Nothing this page renders emits both, so a URL carrying them is hand-made
   * and one of them has to lose. What must not happen is both reaching the
   * store, which its own type is shaped to prevent.
   */
  it("sends one position when a hand-made URL carries two", () => {
    expect(historyRead({ ...NOTHING_ASKED, older: "2", newer: "7" })).toEqual({
      direction: "newer",
      cursor: "7",
    })
  })
})

describe("historyPageHref", () => {
  it("names the tree and the end being stepped off", () => {
    expect(historyPageHref(TREE, { older: "4" })).toBe("/history?tree=t_1&older=4")
    expect(historyPageHref(TREE, { newer: "4" })).toBe("/history?tree=t_1&newer=4")
  })

  it("names the tree alone for the newest page", () => {
    expect(historyPageHref(TREE)).toBe("/history?tree=t_1")
  })

  /** A cursor is the store's word and may hold anything, including a separator. */
  it("escapes a cursor rather than pasting it into a query string", () => {
    expect(historyPageHref(TREE, { older: "4&at=1" })).toBe("/history?tree=t_1&older=4%26at%3D1")
  })

  /** `historyRead` reads back what this writes, or paging goes nowhere. */
  it("writes the parameters the read resolves", () => {
    expect(historyRead({ ...NOTHING_ASKED, older: "4" })).toEqual({
      direction: "older",
      cursor: "4",
    })
    expect(historyPageHref(TREE, { older: "4" })).toContain("older=4")
  })
})

describe("describeStaleAnchor", () => {
  /** A link that aged: the log never reached the revision, or no longer keeps it. */
  it("says a log does not hold the revision when nobody has paged", () => {
    expect(describeStaleAnchor(9, { older: undefined, newer: undefined })).toBe(
      "Nothing on this page is revision 9 — this log has not reached it, or has not kept it."
    )
  })

  /**
   * A reader who paged has left the anchor behind, and which way they went is
   * the difference between "it is ahead of you" and "it is behind you". The same
   * sentence for both would send half of them the wrong way.
   */
  it("says which way the anchor went once a reader has paged", () => {
    expect(describeStaleAnchor(9, { older: "4", newer: undefined })).toContain("further along")
    expect(describeStaleAnchor(9, { older: undefined, newer: "4" })).toContain("further back")
  })

  it("names the revision that was asked for in every case", () => {
    expect(describeStaleAnchor(9, { older: "4", newer: undefined })).toContain("revision 9")
    expect(describeStaleAnchor(9, { older: undefined, newer: "4" })).toContain("revision 9")
  })
})
