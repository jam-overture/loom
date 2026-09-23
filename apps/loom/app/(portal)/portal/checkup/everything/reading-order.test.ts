import { describe, expect, it } from "vitest"

import { portalFile, screenSource } from "@/app/(portal)/_lib/screen-source"

/**
 * The order a reader meets the sweep in, and the two properties of it that no
 * component test can see.
 *
 * Every component test here renders one component on its own, so none of them
 * can see what the page puts above what, and none of them can see how the page
 * reached the values it handed over. Both of those are the defects this unit
 * would most plausibly grow, so both are pinned at the source.
 */
const file = portalFile("portal", "checkup", "everything", "page.tsx")
const source = screenSource(file)

describe("the sweep's reading order", () => {
  it("says what the screen is before it renders a verdict", () => {
    const heading = source.indexOf("<h1")
    const verdict = source.indexOf("<SweepVerdict")

    expect(heading).toBeGreaterThan(-1)
    expect(verdict).toBeGreaterThan(heading)
  })

  /**
   * The answer over everything, then the pages it is made of. A reader who
   * meets twenty-five rows before the verdict has been handed the evidence and
   * asked to reach the conclusion themselves.
   */
  it("puts the answer above the pages it is an answer about", () => {
    expect(source.indexOf("<SweepVerdict")).toBeLessThan(source.indexOf("<SweepRows"))
  })

  it("never reverses a row or a column to place something", () => {
    expect(source).not.toContain("flex-row-reverse")
    expect(source).not.toContain("flex-col-reverse")
  })
})

describe("what the sweep does to the store", () => {
  /**
   * **The folds run one after another.**
   *
   * A fold is a paged walk of a whole log, not a bounded read, so a fan-out
   * over twenty-five pages is an unbounded number of concurrent reads against a
   * pool sized for one request. The reviewer who pressed the button is
   * expecting to wait; nobody else on the deployment should have to.
   *
   * This is the assertion that would fail if somebody "optimised" the sequence
   * into a `Promise.all`, which is the shape every other fan-out in this lane
   * uses and therefore the shape a reader of this file would reach for.
   */
  it("does not fan the replays out across the store at once", () => {
    const folds = source.slice(source.indexOf("const checks ="), source.indexOf("const names ="))

    expect(folds).toContain("await sofar")
    expect(folds).not.toContain("Promise.all")
  })

  /**
   * The names are the one read here that really is bounded — one head per page
   * — so they keep the fan-out, and they are read after the verdicts rather
   * than interleaved with them.
   */
  it("reads the names in one fan-out, after the verdicts", () => {
    expect(source).toContain("namesOf(")
    expect(source.indexOf("const checks =")).toBeLessThan(source.indexOf("namesOf("))
  })

  /**
   * The listing is bounded, and the bound is handed to the reading rather than
   * kept to the page. A sweep that read a limited listing and told
   * `sweepReading` it had seen everything would print *Everything adds up* over
   * pages it never listed — which is the one claim this whole unit exists to
   * stop being possible.
   */
  it("bounds the listing and tells the reading whether it reached the end", () => {
    expect(source).toContain("limit: SWEEP_LIMIT")
    expect(source).toContain("everyPage: listing.value.cursor === null")
  })

  /**
   * A page with no recorded starting shape is reported rather than folded from
   * its own snapshot, which would agree with itself every time (0028).
   */
  it("refuses to check a page it has no starting shape for", () => {
    expect(source).toContain("seedFor(")
    expect(source).toContain('state: "nothing-to-check-against"')
  })

  /**
   * A read that failed is a standing of its own and never an absent row. The
   * same discipline the single checkup states in words — "a checkup that could
   * not run is not a checkup that passed" — held here as a property, because
   * the sweep is where a silently dropped page would be invisible.
   */
  it("gives a page whose history did not come back a standing rather than dropping it", () => {
    expect(source).toContain('state: "could-not-be-read"')
  })
})
