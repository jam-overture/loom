import { describe, expect, it } from "vitest"

import { publishedNames } from "../api/mentions"
import { readPageProse } from "../search/prose"

import {
  LEAVES_MISSED_EXAMPLE,
  READING_STOPPED_EXAMPLE,
  produceOrdered,
  produceStopped,
} from "./stopped"

/**
 * The claims *A count of parts is not a count of things to fix* makes, held
 * against the figures the page prints.
 *
 * **The plain version.** That section says three things a reader could check:
 * the obvious count of unread parts is bigger than the number of things to fix;
 * every unreached part is behind exactly one of those things; and ordering a
 * deployment's pages on the count sends somebody to the wrong page. All three
 * are properties of the arithmetic, so each is a case here rather than a
 * sentence somebody has to believe.
 *
 * **Why the figures are not in the prose at all.** The section states no
 * number. Every one of them is in a produced block, which is this page's
 * convention for a reason the last case below enforces: a figure typed into a
 * paragraph is true on the day it is typed, and the example trees it is about
 * belong to a catalogue another unit of work edits.
 */

const SECTION_ANCHOR = "a-count-of-parts-is-not-a-count-of-things-to-fix"

/** The words of the section this file is about, as the search box reads them. */
const sectionProse = (): string => {
  const body = readPageProse("the-runtime", "what-your-readers-do").get(SECTION_ANCHOR)

  if (body === undefined) {
    throw new Error(`loom: what-your-readers-do has no section at #${SECTION_ANCHOR}`)
  }

  return body
}

describe("where a reading stopped", () => {
  /**
   * The reason the section exists. The page's own example tree, read over a
   * window in which everybody stopped at the opening band: the count of
   * unreached parts is several, and there is one place to fix.
   */
  it("reports fewer places than parts, which is the claim the section makes", () => {
    const reading = produceStopped()

    expect(reading.places).toBe(1)
    expect(reading.unseen).toBeGreaterThan(reading.places)
    expect(reading.parts).toBeGreaterThan(reading.unseen)
  })

  /**
   * The invariant the whole reading rests on, and the one the prose states as
   * *every unreached part is behind exactly one of them*. If the stops ever
   * stopped partitioning the unreached parts, *this is the one place to fix and
   * it costs you this much of the page* would become an estimate.
   */
  it("accounts for every unreached part exactly once", () => {
    const reading = produceStopped()

    expect(reading.stops.reduce((total, stop) => total + stop.unseen, 0)).toBe(reading.unseen)
  })

  /**
   * What the one stop costs, in the words a person would act on rather than in
   * node ids. The band nobody reached holds a heading, two questions and a
   * link, and the words of all of them are what going and looking at it
   * recovers.
   */
  it("carries the words nobody reached, and none that somebody did", () => {
    const reading = produceStopped()

    expect(reading.words.length).toBeGreaterThan(0)
    expect(reading.words).not.toContain("Bicycles built for one road")
    expect(reading.words.some((word) => word.includes("How long does a frame take?"))).toBe(true)
  })

  /**
   * The disclosure, which is load-bearing rather than courteous: these two
   * trees have no readers, so a block printing figures about them without
   * saying the window is constructed would be the thing this surface keeps
   * refusing to ship.
   *
   * Held against the component rather than described, because the sentence is
   * the only place a reader learns it — the prose does not repeat it.
   */
  it("says on the page that the window is constructed", async () => {
    const { WhereTheReadingStopped } = await import("../../_components/reader-signals")
    const { renderedWords } = await import("../search/rendered")

    expect(renderedWords(WhereTheReadingStopped())).toContain("constructed")
  })
})

describe("the order over a deployment", () => {
  /**
   * The whole argument of the second block, as a comparison rather than as a
   * claim: the two keys put a different page first. A run that made them agree
   * would have removed the reason `unread.ts` ranks on what one fix recovers,
   * and this is the case that would notice.
   */
  it("puts a different page first than the count of parts does", () => {
    const ordered = produceOrdered()
    const byCost = ordered.byCost[0]
    const byParts = ordered.byParts[0]

    expect(byCost?.example).toBe(READING_STOPPED_EXAMPLE)
    expect(byParts?.example).toBe(LEAVES_MISSED_EXAMPLE)
    expect(byCost?.example).not.toBe(byParts?.example)
  })

  /** Each order is really on the key it is named for. */
  it("orders by what one fix recovers, and the other order by parts", () => {
    const ordered = produceOrdered()

    expect(ordered.byCost.map((row) => row.costs ?? 0)).toEqual(
      [...ordered.byCost.map((row) => row.costs ?? 0)].sort((left, right) => right - left)
    )
    expect(ordered.byParts.map((row) => row.unseen)).toEqual(
      [...ordered.byParts.map((row) => row.unseen)].sort((left, right) => right - left)
    )
  })

  /**
   * The direction of the disagreement, which is the half that makes it worth
   * printing. The page the count puts first is the page whose places are worth
   * least one at a time — so an order on the count is not merely different, it
   * is wrong in the one direction an operator would act on.
   *
   * **If this case goes red, the remedy is another pair of examples and never
   * the arithmetic.** The second tree is the starter library's pricing band, so
   * how many leaves it has and how deeply they sit is `Loom primitives`' to
   * change — and a band restructured into a few deep groups would stop
   * out-counting the first page, which would leave the block printing two
   * orders that agree and a page arguing they do not. That is a demonstration
   * that has stopped demonstrating, which is exactly the failure this site
   * wants red rather than quiet.
   */
  it("would send an afternoon to the page where it buys least", () => {
    const ordered = produceOrdered()

    expect(ordered.byParts[0]?.costs ?? 0).toBeLessThan(ordered.byCost[0]?.costs ?? 0)
    expect(ordered.byParts[0]?.places ?? 0).toBeGreaterThan(ordered.byCost[0]?.places ?? 0)
  })

  /**
   * Both pages are in the order on the strength of a reading rather than of an
   * absence. `whole`, `unread`, `unsplit` and `mismatched` all produce an empty
   * reading, and only one of them means every part was read — so a page in this
   * block standing as anything but `ranked` would be a figure about nothing.
   */
  it("stands both pages in the order, with the runtime's own sentence for why", () => {
    const ordered = produceOrdered()

    for (const row of ordered.byCost) {
      expect(row.standing).toBe("ranked")
      expect(row.standingSays).toContain("in the order")
    }
  })

  /**
   * The sharpest place across the deployment, which the block names and which a
   * screen would open with. It is the top page's own largest place — anything
   * else would mean the two orders had been drawn from different readings — and
   * its share is what says whether one afternoon is worth spending.
   */
  it("names the sharpest place across the deployment, with its share", () => {
    const ordered = produceOrdered()
    const places = ordered.places

    expect(places.length).toBeGreaterThan(1)
    expect(places[0]?.example).toBe(ordered.byCost[0]?.example)
    expect(places[0]?.unseen).toBe(ordered.byCost[0]?.costs)
    expect(places.map((place) => place.unseen)).toEqual(
      [...places.map((place) => place.unseen)].sort((left, right) => right - left)
    )
    expect(places[0]?.share ?? 0).toBeGreaterThan(0)
    expect(places.reduce((total, place) => total + place.share, 0)).toBeLessThanOrEqual(1)
  })

  /**
   * The captions and the sentence under them name the pages the way the
   * catalogue names them, not the way a url does. A reader of this block has
   * never heard of `a-page-a-reader-scrolls`, and the caption is the first
   * thing they read.
   */
  it("names the pages the way a reader would", () => {
    for (const row of produceOrdered().byCost) {
      expect(row.title).not.toBe(row.example)
      expect(row.title).toMatch(/^[A-Z]/)
    }

    const reading = produceStopped()

    expect(reading.title).not.toBe(reading.example)
    expect(reading.title).toMatch(/^[A-Z]/)
  })

  /** Places add up to the deployment's unread parts, across the pages in the order. */
  it("adds the places across the deployment", () => {
    const ordered = produceOrdered()

    expect(ordered.unseen).toBe(ordered.byCost.reduce((total, row) => total + row.unseen, 0))
    expect(ordered.stops).toBe(ordered.byCost.reduce((total, row) => total + row.places, 0))
  })
})

describe("the section on the page", () => {
  /**
   * **The rule this page runs on, as a test rather than as a habit.** A figure
   * in a paragraph is true on the day somebody types it; the example trees
   * these figures are about live in a catalogue another unit edits, and the
   * produced blocks move with them. So the section may argue and may not count.
   *
   * It is the cheapest guard in this file and it is the one that would have
   * caught the first draft of the section, which opened with the word *seven*.
   */
  it("states no figure, because every figure in it is produced", () => {
    expect(sectionProse()).not.toMatch(/\d/)
  })

  /**
   * **The one figure the prose does state, in words rather than in digits.**
   * *One band nobody scrolled to holds a heading, two questions and a link* is
   * a claim about the example tree, and the case above it cannot see it: that
   * one forbids `2` and this site writes *two*.
   *
   * So the sentence is held here against the tree instead. A third question in
   * the catalogue's example takes this red, which is the whole of what the
   * digits rule is for — and it is the reason that rule is a floor and not the
   * guard. **A number spelled out is a number.**
   */
  it("holds the one sentence that counts the band's contents", () => {
    const reading = produceStopped()
    const asked = reading.words.filter((word) => word.trim().endsWith("?")).length
    const spelled = ["no", "one", "two", "three", "four", "five", "six", "seven"][asked]

    expect(reading.words).toContain("Before you order")
    expect(reading.words).toContain("Send a question")
    expect(sectionProse()).toContain(`${spelled} questions`)
  })

  /**
   * The names the two blocks are built on, held where a rename lands rather
   * than on a page nobody rereads. Each of these is a published export of
   * `@jam-overture/loom/signals`; the module importing them would fail to
   * resolve on a rename, and this says which door they came through.
   */
  it("is built on published names", () => {
    for (const name of [
      "pageFrontierOf",
      "pageReadingOf",
      "largestUnreachedIn",
      "unreachedWordsIn",
      "deploymentUnreadOf",
      "worstPlacesIn",
      "describeUnreadStanding",
      "PageFrontier",
      "UnreachedPart",
      "PageUnread",
      "DeploymentPlace",
      "DeploymentUnread",
      "UnreadStanding",
      "UNREAD_STANDINGS",
    ]) {
      expect(publishedNames.has(name), name).toBe(true)
    }
  })

  /**
   * The section's argument, in the words that carry it. Not a spelling check: a
   * rewrite that dropped *stopped* would have dropped the one word that
   * distinguishes the reading from the count it exists instead of.
   */
  it("says what a place the reading stopped is", () => {
    const prose = sectionProse()

    expect(prose).toContain("stopped")
    expect(prose).toContain("behind exactly one")
  })
})
