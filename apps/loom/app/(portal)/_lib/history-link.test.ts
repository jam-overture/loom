import { describe, expect, it } from "vitest"

import type { TreeId } from "@loom/runtime"

import {
  anchorOf,
  describeAnchorMiss,
  echoOf,
  historyPageHref,
  historyRead,
  isReachableRevision,
  parseRevisionParam,
  revisionAnchorId,
  revisionHref,
} from "./history-link"

const TREE = "t_1" as TreeId

/** A read with no parameters at all — the page somebody opens from the nav. */
const NOTHING_ASKED = { older: undefined, newer: undefined, at: undefined } as const

describe("revisionHref", () => {
  it("names the tree, the revision to open at, and the row to scroll to", () => {
    expect(revisionHref(TREE, 4)).toBe("/portal/history?tree=t_1&at=4#revision-4")
  })

  /** The fragment and the row id are the same string, or the link scrolls nowhere. */
  it("ends at the id the row will carry", () => {
    expect(revisionHref(TREE, 12).endsWith(`#${revisionAnchorId(12)}`)).toBe(true)
  })

  it("escapes a tree id rather than pasting it into a query string", () => {
    expect(revisionHref("t_a b&c" as TreeId, 1)).toContain("tree=t_a%20b%26c")
  })
})

describe("isReachableRevision", () => {
  it("says a revision an entry produced is somewhere to go", () => {
    expect(isReachableRevision(1)).toBe(true)
    expect(isReachableRevision(12)).toBe(true)
  })

  /**
   * A tree is created at revision 0 and no log entry produces it, so a link to
   * it lands on a page that cannot hold it. The number is still worth showing —
   * it says the tree is unchanged — it is just not a destination.
   */
  it("says the shape a tree was created with is not", () => {
    expect(isReachableRevision(0)).toBe(false)
  })
})

describe("parseRevisionParam", () => {
  it("reads a revision a link put there", () => {
    expect(parseRevisionParam("4")).toEqual({ kind: "named", revision: 4 })
  })

  it("treats an absent or empty parameter as no anchor at all", () => {
    expect(parseRevisionParam(undefined)).toEqual({ kind: "absent" })
    expect(parseRevisionParam("")).toEqual({ kind: "absent" })
    expect(parseRevisionParam("   ")).toEqual({ kind: "absent" })
  })

  /**
   * Revision 0 is the shape a tree was created with and no log entry produces
   * it, so a parameter naming it is a mistake rather than a position — as are
   * the rest of these. Each would otherwise reach the store as an anchor and
   * come back as a page nobody asked for.
   */
  it("refuses anything that is not a revision a log entry could have", () => {
    for (const refused of ["0", "-2", "3.5", "four", "1e400"]) {
      expect(anchorOf(parseRevisionParam(refused))).toBeUndefined()
    }
  })

  /**
   * The refusal is now reported rather than swallowed. A reader who typed
   * `elevn` and got the newest page with nothing said would have no way to tell
   * their typo from an ordinary visit, which is the whole reason this parse
   * stopped answering `undefined` twice over.
   */
  it("distinguishes a value it refused from no value at all", () => {
    expect(parseRevisionParam("four")).toEqual({ kind: "malformed", typed: "four" })
    expect(parseRevisionParam("0")).toEqual({ kind: "malformed", typed: "0" })
  })

  it("reports the refused value without the whitespace around it", () => {
    expect(parseRevisionParam("  four  ")).toEqual({ kind: "malformed", typed: "four" })
  })

  /**
   * The refused value is echoed back into an input on a page anybody can be
   * linked to, so its length is settled here rather than trusted by each view.
   */
  it("bounds a refused value rather than echoing a whole query string", () => {
    const param = parseRevisionParam("x".repeat(500))

    expect(param.kind).toBe("malformed")
    expect(param.kind === "malformed" && param.typed.length).toBeLessThanOrEqual(24)
  })
})

describe("anchorOf", () => {
  it("gives the revision a parameter named", () => {
    expect(anchorOf({ kind: "named", revision: 7 })).toBe(7)
  })

  /** Neither of the other two is a position, and the read must not be given one. */
  it("gives nothing for a parameter that named no position", () => {
    expect(anchorOf({ kind: "absent" })).toBeUndefined()
    expect(anchorOf({ kind: "malformed", typed: "four" })).toBeUndefined()
  })
})

describe("echoOf", () => {
  it("shows a revision back as the number it was read as", () => {
    expect(echoOf(parseRevisionParam("  4 "))).toBe("4")
  })

  it("shows a refused value back so it can be seen and corrected", () => {
    expect(echoOf(parseRevisionParam("four"))).toBe("four")
  })

  it("leaves the box empty when nothing was asked for", () => {
    expect(echoOf(parseRevisionParam(undefined))).toBeUndefined()
  })

  /** What comes back is what the parse kept, never the parameter as written. */
  it("never echoes more than the parse was willing to keep", () => {
    expect(echoOf(parseRevisionParam("y".repeat(500)))?.length).toBeLessThanOrEqual(24)
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
    expect(historyPageHref(TREE, { older: "4" })).toBe("/portal/history?tree=t_1&older=4")
    expect(historyPageHref(TREE, { newer: "4" })).toBe("/portal/history?tree=t_1&newer=4")
  })

  it("names the tree alone for the newest page", () => {
    expect(historyPageHref(TREE)).toBe("/portal/history?tree=t_1")
  })

  /** A cursor is the store's word and may hold anything, including a separator. */
  it("escapes a cursor rather than pasting it into a query string", () => {
    expect(historyPageHref(TREE, { older: "4&at=1" })).toBe("/portal/history?tree=t_1&older=4%26at%3D1")
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

describe("describeAnchorMiss", () => {
  /** A reader who arrived somewhere unpaged, with the revision they asked for showing. */
  const ARRIVED = { older: undefined, newer: undefined, onPage: true, newestOnPage: 12 } as const

  it("says nothing when the revision asked for is on the page", () => {
    expect(describeAnchorMiss({ kind: "named", revision: 9 }, ARRIVED)).toBeUndefined()
  })

  it("says nothing when nobody asked for a revision", () => {
    expect(describeAnchorMiss({ kind: "absent" }, { ...ARRIVED, onPage: false })).toBeUndefined()
  })

  /**
   * The case the box added. A typed value that is not a revision never reached
   * the store, so the page it lands on is the one an ordinary visit produces —
   * and without this sentence that is all a reader who mistyped would get.
   */
  it("says a typed value was not a revision, and shows it back", () => {
    const said = describeAnchorMiss({ kind: "malformed", typed: "elevn" }, ARRIVED)

    expect(said).toContain("“elevn”")
    expect(said).toContain("whole number from 1 up")
  })

  /** A number from the future. The log's own end is the fact that answers it. */
  it("says how far the log actually reaches when the revision is beyond it", () => {
    expect(
      describeAnchorMiss({ kind: "named", revision: 900 }, { ...ARRIVED, onPage: false })
    ).toBe(
      "Version 900 isn’t among the changes shown here — this page has only got as far as version 12."
    )
  })

  it("says a history with nothing in it rather than naming an end it has not got", () => {
    expect(
      describeAnchorMiss(
        { kind: "named", revision: 9 },
        { ...ARRIVED, onPage: false, newestOnPage: undefined }
      )
    ).toBe("Version 9 isn’t among the changes shown here, because nothing has been changed on this page yet.")
  })

  /**
   * Three words this screen stopped using. "Log" is the runtime's name for what
   * a reader calls their history. "Revision" is its name for the number, and
   * these sentences say *Version 9* now, the way the rows they send a reader to
   * do. And "this page" used to mean the *batch of changes on screen* —
   * `Nothing on this page is revision 9` — while the heading three lines above
   * used the same words for the page being read, so a reader had two referents
   * and no way to pick. Every miss now leads with the version instead.
   */
  it("never says log or revision, and leads with the version rather than with a page", () => {
    const said = [
      describeAnchorMiss({ kind: "malformed", typed: "elevn" }, ARRIVED),
      describeAnchorMiss({ kind: "named", revision: 900 }, { ...ARRIVED, onPage: false }),
      describeAnchorMiss(
        { kind: "named", revision: 9 },
        { ...ARRIVED, onPage: false, newestOnPage: undefined }
      ),
      describeAnchorMiss({ kind: "named", revision: 9 }, { ...ARRIVED, onPage: false, older: "4" }),
      describeAnchorMiss({ kind: "named", revision: 9 }, { ...ARRIVED, onPage: false, newer: "4" }),
    ]

    for (const one of said) {
      expect(one).toBeDefined()
      expect(one).not.toMatch(/\blog\b/)
      expect(one).not.toMatch(/\brevisions?\b/iu)
      expect(one).not.toMatch(/Nothing on this page/)
    }
  })

  /**
   * A reader who paged has left the anchor behind, and which way they went is
   * the difference between "it is ahead of you" and "it is behind you". The same
   * sentence for both would send half of them the wrong way.
   *
   * A cursor also means the newest row on the page is not the log's end, so the
   * sentence that names an end must not be reachable from here.
   */
  it("says which way the anchor went once a reader has paged", () => {
    const paged = { onPage: false, newestOnPage: 12 } as const

    const back = describeAnchorMiss(
      { kind: "named", revision: 900 },
      { ...paged, older: "4", newer: undefined }
    )
    const along = describeAnchorMiss(
      { kind: "named", revision: 900 },
      { ...paged, older: undefined, newer: "4" }
    )

    expect(back).toContain("further along")
    expect(along).toContain("further back")
    expect(back).not.toContain("got as far as")
    expect(along).not.toContain("got as far as")
  })

  it("names the version that was asked for in every miss", () => {
    const misses = [
      describeAnchorMiss(
        { kind: "named", revision: 9 },
        { ...ARRIVED, onPage: false, older: "4" }
      ),
      describeAnchorMiss({ kind: "named", revision: 9 }, { ...ARRIVED, onPage: false }),
    ]

    for (const said of misses) expect(said).toContain("Version 9")
  })
})
