import { describe, expect, it } from "vitest"

import { portalFile, screenSource } from "@/app/(portal)/_lib/screen-source"

/**
 * The properties that separate this screen from every other one in the portal.
 *
 * It had no guard of its own until now, which `screen-source.ts` names in as
 * many words: the portal-wide check's first run found its two defects here,
 * because this is the screen nobody had written one for. The portal-wide rules
 * still apply; these are the ones only this screen has.
 *
 * The first is that it is the only screen here whose subject is the AI's own
 * honesty. Every number on it is a comparison between what the model claimed and
 * what became of the claim, so the one way it can be wrong and look right is to
 * compare two things that are not comparable — two gates pooled under one name,
 * two stretches judged under different rules, a rate over a sample of four.
 * Every guard below is a case of that.
 *
 * The second is that it takes nothing and proposes nothing (0031). A reader who
 * concludes from this page that a floor is in the wrong place is making that
 * decision; the page names the next move and never takes it.
 *
 * The third is the only one that is about reading order rather than arithmetic.
 * The verdict is first, the trend qualifies it, the misses are what a person can
 * act on, and the bands and the gates are behind disclosures — because *the AI
 * has been over-sure of itself* reads very differently beside *and it is getting
 * better* than beside *and it is getting worse*.
 */
const source = screenSource(portalFile("portal", "trust", "page.tsx"))

const at = (needle: string): number => {
  const index = source.indexOf(needle)
  expect([needle, index > -1]).toEqual([needle, true])

  return index
}

describe("the trust screen's reading order", () => {
  it("answers the question it is named after before it opens any technical record", () => {
    expect(at("<TechnicalDetail")).toBeGreaterThan(at("<h1"))
  })

  it("puts the heading before the strip of other views", () => {
    expect(at("<PageViews")).toBeGreaterThan(at("<h1"))
  })

  /**
   * The verdict, then whether it is moving, then the thing to do about it. The
   * trend is between them rather than after the misses because it is how
   * urgently the misses should be read, not another finding.
   */
  it("reads verdict, then trend, then the misses a person can act on", () => {
    expect(at("<TrustTrend")).toBeGreaterThan(at("<TrustSummary"))
    expect(at("<MissedClaims")).toBeGreaterThan(at("<TrustTrend"))
  })

  it("offers nothing to press, because a track record is not a control", () => {
    expect(source).not.toContain("<form")
    expect(source).not.toContain("<button")
  })

  /**
   * **One fold per stretch, and both readings off it.**
   *
   * `calibrationOf` answers *is a 0.9 actually a 0.9* and discards the claims to
   * do it; `missesOf` keeps the ones the answer is made of. Folding twice is two
   * chances to describe different windows, and a page whose table and whose list
   * of misses disagreed about which claims were in view would be wrong in the way
   * nobody checks.
   */
  it("folds each stretch once and takes every reading off that fold", () => {
    expect(source.match(/episodesOf\(/gu)).toHaveLength(2)
    expect(source).toContain("const report = calibrationOf(fold)")
    expect(source).toContain("const misses = missesOf(fold)")
  })

  /**
   * **Two reads of the journal and no more.**
   *
   * The journal only grows, so a trend drawn over its whole history is a read
   * whose cost rises every day the deployment runs. The second read is taken at
   * the cursor the first came back with — one page further back, bounded exactly
   * as the first is.
   */
  it("looks one stretch further back, at the cursor the first read returned", () => {
    expect(source.match(/portalTelemetry\.read\(/gu)).toHaveLength(2)
    expect(source).toContain("cursor: page.value.older")
  })

  /**
   * And it does not make that read on a deployment with nothing to compare, where
   * the empty state is drawn instead.
   */
  it("does not look further back when nothing has been answered at all", () => {
    expect(at("const nothingScored")).toBeLessThan(at("const previous"))
    expect(source).toContain("nothingScored || page.value.older === null")
  })

  /**
   * The split every optional read on this surface is held to: the fold the screen
   * is made of returns early when it fails, and everything that refines it costs
   * itself and not the screen.
   */
  it("fails the screen on the read that is the screen, and not on the one that refines it", () => {
    expect(source).toContain("if (!page.ok)")
    expect(source).not.toContain("if (!previous.ok)")
    expect(source).toContain('previous === undefined || !previous.ok\n        ? "unreadable"')
  })

  /**
   * A table of em dashes over no claims used to be this page's first view, and it
   * reads as a broken table rather than as an honest "not yet". The empty state
   * replaces it, and `StateNotice` makes the way out mandatory at the type level.
   */
  it("says nothing has been answered rather than drawing a grid of dashes", () => {
    expect(source).toContain("nothingScored ?")
    expect(source).toContain('tone="empty"')
    expect(source).toContain("/portal/activity")
  })

  it("says so rather than implying it when the record will not outlive the process", () => {
    expect(source).toContain("storeIsDurable")
  })

  /**
   * Both of these are a comparison refusing to be drawn over things that are not
   * comparable: the breakdown appears when the window pools more than one gate,
   * and the trend refuses a stretch that is not shown to be one ruleset.
   */
  it("keeps the two incomparability guards it has, on the window and across them", () => {
    expect(source).toContain("<PolicyBreakdown")
    expect(source).toContain("readTrend(now, earlier)")
  })

  it("never reverses a row or a column to place something", () => {
    expect(source).not.toContain("flex-row-reverse")
    expect(source).not.toContain("flex-col-reverse")
  })
})
