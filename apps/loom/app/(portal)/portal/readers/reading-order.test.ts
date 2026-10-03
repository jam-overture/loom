import { describe, expect, it } from "vitest"

import { READER_SIGNAL_KINDS } from "@jam-overture/loom/signals"

import { portalFile, screenSource } from "@/app/(portal)/_lib/screen-source"

/**
 * The properties that separate this screen from every other one in the portal.
 *
 * The first is that it is the only screen here whose subject is not Loom. Every
 * other one reports what the runtime did; this one reports what people did, and
 * the runtime's vocabulary for that — `viewed`, `dwelled`, `activated`,
 * `disclosed` — is exactly the kind of word the 18 August redirection exists to
 * keep off a surface. A kind is a perfectly good name for an event and no name
 * at all for a thing a person did.
 *
 * The second is that this screen is empty on every deployment that has not
 * switched measurement on, which is all of them by default (0136). So the empty
 * state is not an edge case here — it is the screen, for most readers, most of
 * the time, and it is pinned as hard as the populated one.
 *
 * The third is that it takes nothing and proposes nothing. A number here is an
 * argument for a person to make a change with, never a change; the same shape
 * 0031 fixed for calibration, for the same reason.
 */
const source = screenSource(portalFile("portal", "readers", "page.tsx"))

describe("the reader screen's reading order", () => {
  it("names what the reader is looking at before it opens any technical record", () => {
    const heading = source.indexOf("<h1")
    const disclosure = source.indexOf("<TechnicalDetail")

    expect(heading).toBeGreaterThan(-1)
    expect(disclosure).toBeGreaterThan(heading)
  })

  /**
   * A strip above the heading puts six destinations in front of a reader who
   * has not been told which page they are on yet.
   */
  it("puts the heading before the strip of other views", () => {
    expect(source.indexOf("<PageViews")).toBeGreaterThan(source.indexOf("<h1"))
  })

  /**
   * Read from the runtime rather than written out, so a fifth kind — `completed`
   * is approved and on its way — is inside this rule the day it exists rather
   * than the day somebody remembers to add it here.
   */
  it("never prints the runtime's word for a kind of signal", () => {
    for (const kind of READER_SIGNAL_KINDS) {
      expect([kind, source.includes(`"${kind}"`)]).toEqual([kind, false])
      expect([kind, source.includes(`>${kind}<`)]).toEqual([kind, false])
    }
  })

  it("offers nothing to press, because a reading is not a control", () => {
    expect(source).not.toContain("<form")
    expect(source).not.toContain("<button")
  })

  /**
   * The empty state is where a new person actually starts on this screen, and a
   * dead end is the way it fails. `StateNotice` makes an action mandatory on the
   * `empty` tone at the type level; what a type cannot check is that the action
   * leads somewhere that teaches them how to end the state.
   */
  it("sends a reader with nothing to look at to the guide that would change that", () => {
    expect(source).toContain('tone="empty"')
    expect(source).toContain("/docs/the-runtime/what-your-readers-do")
  })

  /**
   * Batches that have arrived and not been counted are a different state from a
   * deployment nothing has ever reported to, and the two are indistinguishable
   * without the second read. A refactor that dropped it would leave a reader
   * hunting for a fault in a page that is working.
   */
  it("tells an uncounted window apart from a deployment nobody has visited", () => {
    expect(source).toContain("portalReaderSignals.read")
    expect(source).toContain("arriving")
  })

  /**
   * The counters are the screen and the buffer is one sentence. A read of the
   * counters that fails is reported as the screen failing; a read of the buffer
   * that fails costs the sentence and nothing else, which is why one of them
   * returns early and the other cannot.
   */
  it("fails the screen on the read that is the screen, and not on the one that is a footnote", () => {
    expect(source).toContain("if (!counted.ok)")
    expect(source).toContain("buffered.ok ?")
    expect(source).not.toContain("if (!buffered.ok)")
  })

  it("says so rather than implying it when the counters will not outlive the process", () => {
    expect(source).toContain("signalsAreDurable")
  })

  /**
   * The wiring the whole of this screen's honesty now rests on, guarded at the
   * source because no render of the card can see whether the page bothered to
   * ask. The counters carry a version and so does the page being served; a
   * screen holding only the first cannot know whether it is describing the page
   * its reader is looking at, and for as long as an hour after every change it
   * is not.
   */
  it("hands each card the version of the page actually being served", () => {
    expect(source).toContain("live={served.revisions.get(")
  })

  /**
   * A page whose read did not come back must be **missing** from the map rather
   * than defaulted to a number. A zero or a fallback would make an unreadable
   * page indistinguishable from a page at that revision, and the card would
   * report a guess as a fact.
   */
  it("never invents a version for a page it could not read", () => {
    expect(source).not.toContain("revisions.get(reading.treeId) ??")
    expect(source).toContain("if (!head.ok)")
  })

  /**
   * One fan-out over the pages, not two. It was `partNamesFor` and
   * `pageNamesFor` over the same list, so every page was fetched twice per
   * render to answer two halves of one read.
   */
  it("reads each page once for all three things it needs from it", () => {
    expect(source).toContain("pagesServed")
    expect(source).not.toContain("partNamesFor")
    expect(source).not.toContain("pageNamesFor")
  })

  /**
   * **The pairing rule, guarded where it is applied.**
   *
   * *Which parts did nobody get to* is the one reading here that needs the page
   * as well as the counters, and laying one version's counters over another
   * version's page is the single way it can be wrong and look right — most
   * parts read *nobody got to it* while every number stays plausible. So the
   * pair is assembled on the screen, behind `skippingComparable`, and a card is
   * handed either a reading it may draw or nothing.
   *
   * What this pins is that the guard is still in front of the join. A refactor
   * that moved the pairing into the card, or that dropped the comparison
   * because every fixture happened to match, would leave every other test on
   * this screen passing.
   */
  it("pairs the counters with a page only when they are about the same version", () => {
    expect(source).toContain("skippingComparable")
    expect(source.indexOf("skippingComparable")).toBeLessThan(source.indexOf("skippingOf("))
  })

  /**
   * And that the question is never asked of a page whose read did not come back.
   * `skippingComparable` refuses an undefined version, and the `continue` above
   * it means a page with no tree never reaches the join at all — two guards,
   * because the cost of getting this one wrong is a list of invented findings
   * about parts that were never there.
   */
  it("never asks which parts were skipped on a page it could not read", () => {
    expect(source).toContain("tree === undefined || !skippingComparable")
  })

  it("never reverses a row or a column to place something", () => {
    expect(source).not.toContain("flex-row-reverse")
    expect(source).not.toContain("flex-col-reverse")
  })
})
