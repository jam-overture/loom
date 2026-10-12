import { describe, expect, it } from "vitest"

import { portalFile, screenSource } from "@/app/(portal)/_lib/screen-source"

/**
 * The properties that separate this screen from every other one in the portal.
 *
 * The first is that its **claim** costs nothing to make. The catalogue is the
 * registry, in memory, and it cannot fail — so *this list bounds what an AI can
 * do to your pages* is true on a deployment whose database is down, whose
 * readers have never been counted, and whose pages have never been visited. The
 * reader half added on 11 October is an addition to that claim and must never
 * become a condition of it: every failure below degrades the half that failed
 * and leaves the catalogue whole.
 *
 * The second is that the list is a **catalogue and not a league table**. What an
 * AI may build with is a fact about this project's code, so the order of these
 * cards may not depend on what readers did last week — a person who learnt where
 * a piece was yesterday must find it in the same place today. The section above
 * the list is how somebody gets to the one that needs them.
 *
 * The third is that it takes nothing and proposes nothing. The figures are an
 * argument for a person to make a change with, never a change; the same shape
 * 0031 fixed for calibration, for the same reason.
 */
const source = screenSource(portalFile("portal", "pieces", "page.tsx"))

describe("the catalogue screen's reading order", () => {
  it("names what the reader is looking at before it opens any technical record", () => {
    const heading = source.indexOf("<h1")
    const disclosure = source.indexOf("<TechnicalDetail")

    expect(heading).toBeGreaterThan(-1)
    expect(disclosure).toBeGreaterThan(heading)
  })

  /**
   * *Which piece should I look at first* is the answer to a question about the
   * list, so it comes before the list. Below it, it would be a footnote to
   * eighteen cards a reader has already scrolled past.
   */
  it("puts the piece to look at first above the list it is about", () => {
    expect(source.indexOf("<WhichPieceFirst")).toBeGreaterThan(source.indexOf("<h1"))
    expect(source.indexOf("<WhichPieceFirst")).toBeLessThan(source.indexOf("<CardGrid"))
  })

  /**
   * **The catalogue is never reordered by what readers did.**
   *
   * The obvious move, and the wrong one: *most skipped first* is right for a
   * list of pages and wrong for the list of what an AI may build with, because
   * the answer to *what can Loom use* would then change with last week's
   * traffic and a person would lose the place they learnt a piece was in. The
   * section above names the piece instead and links down to its card.
   */
  it("lists the catalogue in the order the registry hands it over", () => {
    expect(source).toContain("catalogue.map((primitive)")
    expect(source).not.toContain(".sort(")
    expect(source).not.toContain("<ListOrder")
  })

  /**
   * **One join, two readings.**
   *
   * Both runtime readings are taken off one list of joined pages. Joining twice
   * would be two chances to hand one reading a different window from the other,
   * and the two figures on every card would then be about two different
   * deployments — which is exactly the failure the pair on each card exists to
   * make impossible.
   */
  it("joins the counters to the pages once and takes both readings off it", () => {
    expect(source.match(/pageReadingOf\(/gu)).toHaveLength(1)
    expect(source).toContain("libraryReadingOf(readings)")
    expect(source).toContain("libraryReachOf(readings, rows)")
  })

  /**
   * **The pairing rule, guarded where it is applied.**
   *
   * A placement is a part of a version of a page, so laying one version's
   * counters over another version's page is the single way this reading can be
   * wrong and look right: most places would read *nobody reached it* while
   * every number stayed plausible. The guard is in front of the join itself
   * rather than in front of either reading taken off it.
   */
  it("pairs the counters with a page only when they are about the same version", () => {
    expect(source).toContain("skippingComparable")
    expect(source.indexOf("skippingComparable")).toBeLessThan(source.indexOf("pageReadingOf("))
  })

  /** And the count of pages it turned away is handed over rather than hidden. */
  it("says how many pages are not behind the figures rather than listing a smaller library", () => {
    expect(source).toContain("unjoined += 1")
    expect(source).toContain("names, unjoined)")
  })

  /**
   * One read per **distinct** page rather than one per counter row: a page with
   * forty counted parts is one page, and reading it forty times would be a
   * fan-out over a list the counters did not bound.
   */
  it("reads each page once however many of its parts were counted", () => {
    expect(source).toContain("[...new Set(counted.value.map((tally) => tally.treeId))]")
  })

  /**
   * **Three reads, three different costs, and none of them the screen.**
   *
   * The counters are the reader half and a failed read of them says so quietly.
   * The door rows are what makes two pages' readers comparable, and without
   * them every reader share is withheld and every places figure stands — which
   * is the state 0256 already publishes for a page the door cannot scale, so a
   * failed read degrades into something this screen draws properly. A page
   * whose read did not come back is simply not in the reading.
   */
  it("costs the reader half on a failed read and never the catalogue", () => {
    expect(source).toContain('return { kind: "failed", error: counted.error }')
    expect(source).toContain("doors.ok ? doors.value : []")
    expect(source).not.toContain("if (!doors.ok)")
    expect(source).toContain("if (!head.ok)")
  })

  /**
   * And that the failure is drawn as a notice rather than as a failure. The
   * catalogue above it is intact and is this screen's whole claim, so a red box
   * across the top would be reporting a working page as broken.
   */
  it("reports the failed read quietly, under the list that still stands", () => {
    expect(source).toContain('tone="notice"')
    expect(source).not.toContain('tone="failure"')
    expect(source.indexOf("<CardGrid")).toBeLessThan(source.indexOf('tone="notice"'))
  })

  /**
   * *The counters did not answer* and *nothing has ever reported* render
   * identically as a blank half-screen and send a person to completely
   * different places — one to a fault, the other to a guide. The empty state is
   * where a new person actually starts, and `StateNotice` makes its action
   * mandatory at the type level; what a type cannot check is that the action
   * leads somewhere that teaches them how to end the state.
   */
  it("tells a failed read apart from a deployment that has never been measured", () => {
    expect(source).toContain('read.kind === "failed"')
    expect(source).toContain('read.kind === "none"')
    expect(source).toContain('tone="empty"')
    expect(source).toContain("/docs/the-runtime/what-your-readers-do")
  })

  /**
   * The pair arrives from the one call that produces both halves. A card that
   * could be handed one of them would be a card that could print the share of
   * places under a sentence about readers, which is a mistake of roughly a
   * factor of three on the first deployment this was photographed against.
   */
  it("hands each card both figures or neither", () => {
    expect(source).toContain("howPieceIsRead(library, primitive.type)")
    expect(source.match(/howItIsRead\(/gu)).toHaveLength(1)
  })

  /**
   * And never *nothing uses this*. The reading is over the pages a deployment
   * has counted and joined, so a piece standing only on a page in the version
   * gap has no row here and is in use all the same.
   */
  it("says a registered piece is on none of the counted pages rather than unused", () => {
    expect(source).toContain("notOnThesePages(library)")
  })

  it("offers nothing to press, because a measurement is not a control", () => {
    expect(source).not.toContain("<form")
    expect(source).not.toContain("<button")
  })

  it("never reverses a row or a column to place something", () => {
    expect(source).not.toContain("flex-row-reverse")
    expect(source).not.toContain("flex-col-reverse")
  })
})
