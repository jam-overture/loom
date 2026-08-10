import { describe, expect, it } from "vitest"

import { anchorBound, anchorResumes, FIRST_REVISION, type RevisionReadRequest } from "./store.js"

/**
 * The two pure functions that turn a revision a caller named into the bounds
 * both implementations already page from. Tested here rather than through a
 * store, for the reason `clampListingLimit` is: every implementation calls them,
 * and that is what stops one backend placing an anchor where another does not.
 */
describe("anchorBound", () => {
  it("puts the anchored revision inside the page, on the side the read runs from", () => {
    expect(anchorBound(4, "older")).toBe(5)
    expect(anchorBound(4, "newer")).toBe(3)
  })

  /**
   * Revisions are dense integers, so the position just outside an anchor is one
   * step away and nothing can fall between them. A fractional anchor is a caller
   * error rather than a position; it rounds outwards, so the revision it is
   * nearest to is still in the page rather than excluded by a rounding accident.
   */
  it("rounds a fraction outwards rather than dropping the entry beside it", () => {
    expect(anchorBound(4.5, "older")).toBe(5)
    expect(anchorBound(4.5, "newer")).toBe(4)
  })
})

describe("anchorResumes", () => {
  it("reports a newer end only when the log has gone past the anchor", () => {
    expect(anchorResumes(4, "older", 6)).toBe(true)
    expect(anchorResumes(6, "older", 6)).toBe(false)
  })

  /**
   * The case that makes this worth having: the newest revision. A cursor is
   * always resumable because a page produced it, so borrowing that answer for an
   * anchor would offer a reader the page after the last one.
   */
  it("reports no newer end past the head, and none older before the first", () => {
    expect(anchorResumes(FIRST_REVISION, "newer", 6)).toBe(false)
    expect(anchorResumes(FIRST_REVISION + 1, "newer", 6)).toBe(true)
  })

  /** A stale link naming a revision beyond the head still has nothing past it. */
  it("claims nothing newer than an anchor the log has not reached", () => {
    expect(anchorResumes(99, "older", 6)).toBe(false)
  })
})

/**
 * The mutual exclusion is a type rather than a check, so this is where it is
 * held down: `tsc --noEmit` runs over the suite in `pnpm verify`, and the
 * directive below fails the build the day both positions become assignable at
 * once — which is the day a request starts quietly ignoring half of itself.
 */
describe("a read starts from one position", () => {
  it("refuses a request that names both a cursor and a revision", () => {
    const both = { direction: "older", cursor: "5", at: 4 } as const

    // @ts-expect-error — one position per read, and the type is the enforcement.
    const request: RevisionReadRequest = both

    expect(request.at).toBe(4)
  })
})
