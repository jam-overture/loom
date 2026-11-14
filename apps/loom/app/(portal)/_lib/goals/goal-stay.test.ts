import { describe, expect, it } from "vitest"

import { pageReadingOf, type PageReading } from "@jam-overture/loom/signals"

import { pageFixture } from "@/app/_lib/pages/fixtures"

import { elementIdsOf, NOTHING_DECLARED, pageViewsOf, tallyOf } from "../proposing/fixtures"
import { goalSkimSentence, goalStayOf, goalStaySentence, type GoalSkims } from "./goal-stay"

const HOME = pageFixture("home", "Welcome home")
const PRICING = pageFixture("pricing", "Plans and prices")
const TOUR = pageFixture("tour", "Take the tour")

/** The heading: the one part these pages have besides the page itself. */
const headingOf = (tree: typeof HOME) => {
  const heading = elementIdsOf(tree)[1]

  if (heading === undefined) throw new Error(`no heading on ${tree.treeId}`)

  return heading
}

/** A page whose heading was reached by `reached` page views for `dwellMs` between them. */
const readingOf = (tree: typeof HOME, reached: number, dwellMs: number): PageReading =>
  pageReadingOf(tree, [tallyOf(tree, headingOf(tree), { reached, dwellMs })], NOTHING_DECLARED)

const HOME_HEADING = headingOf(HOME)

describe("goalStayOf", () => {
  it("says how long the typical reader who reached the part had it on screen", () => {
    const stay = goalStayOf(
      { nodeId: HOME_HEADING, pages: null },
      [readingOf(HOME, 40, 180_000)],
      [pageViewsOf(HOME, 50)]
    )

    /** Two words take half a second, so four and a half seconds is far longer than they account for. */
    expect(stay).toEqual({
      kind: "read",
      spentMs: 4500,
      standing: "lingered",
      skims: { counted: 1, skimmed: [] },
    })
    expect(goalStaySentence(stay)).toBe(
      "Readers who reached it kept it on screen for 4.5 seconds on average."
    )
  })

  it("reads only the pages a goal names", () => {
    /** The same node id on two pages, which is what a goal's part is (0350). */
    const elsewhere = { ...PRICING, root: { ...PRICING.root, children: HOME.root.children } }

    const stay = goalStayOf(
      { nodeId: HOME_HEADING, pages: [HOME.treeId] },
      [readingOf(HOME, 10, 10_000), readingOf(elsewhere, 10, 90_000)],
      [pageViewsOf(HOME, 10), pageViewsOf(elsewhere, 10)]
    )

    expect(stay).toMatchObject({ kind: "read", spentMs: 1000 })
  })

  it("pools every page with the part for a goal on all of them", () => {
    const elsewhere = { ...PRICING, root: { ...PRICING.root, children: HOME.root.children } }

    const stay = goalStayOf(
      { nodeId: HOME_HEADING, pages: null },
      [readingOf(HOME, 10, 10_000), readingOf(elsewhere, 10, 90_000)],
      [pageViewsOf(HOME, 10), pageViewsOf(elsewhere, 10)]
    )

    expect(stay).toMatchObject({ kind: "read", spentMs: 5000 })
  })

  it("says nobody was seen on it rather than drawing a nought", () => {
    const stay = goalStayOf(
      { nodeId: HOME_HEADING, pages: null },
      [readingOf(HOME, 0, 0)],
      [pageViewsOf(HOME, 50)]
    )

    expect(stay).toEqual({
      kind: "silent",
      silence: "unread",
      skims: { counted: 0, skimmed: [] },
    })
    expect(goalStaySentence(stay)).toBe(
      "No time on screen to show: nothing reported a view of this part on any page it stands on."
    )
  })

  it("says the part stands on none of the pages read", () => {
    const stay = goalStayOf(
      { nodeId: HOME_HEADING, pages: [PRICING.treeId] },
      [readingOf(HOME, 10, 10_000), readingOf(PRICING, 10, 10_000)],
      [pageViewsOf(HOME, 10), pageViewsOf(PRICING, 10)]
    )

    expect(stay).toEqual({
      kind: "silent",
      silence: "unplaced",
      skims: { counted: 0, skimmed: [] },
    })
  })
})

/** `tree` carrying the home page's parts, so the home heading's node id stands on it too (0350). */
const withHomeParts = (tree: typeof HOME): typeof HOME => ({
  ...tree,
  root: { ...tree.root, children: HOME.root.children },
})

const PRICING_TOO = withHomeParts(PRICING)
const TOUR_TOO = withHomeParts(TOUR)

describe("where a goal's part is skimmed", () => {
  /**
   * The heading's two words take half a second a reader. Home's readers had
   * time enough; pricing's 400 had a tenth of a second each, short 160 seconds
   * between them; the tour's 10 had nothing, short 5 seconds. The tour has the
   * worse rate and is not the page to start with.
   */
  const stay = goalStayOf(
    { nodeId: HOME_HEADING, pages: null },
    [readingOf(HOME, 10, 6_000), readingOf(TOUR_TOO, 10, 0), readingOf(PRICING_TOO, 400, 40_000)],
    [pageViewsOf(HOME, 10), pageViewsOf(TOUR_TOO, 10), pageViewsOf(PRICING_TOO, 400)]
  )

  it("names the skimmed pages by the reading time their readers did not have, not by rate", () => {
    expect(stay.skims).toEqual({
      counted: 3,
      skimmed: [
        { treeId: PRICING.treeId, shortMs: 160_000 },
        { treeId: TOUR.treeId, shortMs: 5_000 },
      ],
    })
  })

  it("says one page's own shortfall, never a total of the rows", () => {
    expect(goalSkimSentence(stay.skims, (treeId) => `/${treeId}`)).toBe(
      `Skimmed on 2 of the 3 pages it is counted on: “/${PRICING.treeId}” and “/${TOUR.treeId}”. Start with “/${PRICING.treeId}”: its readers were short of 3 minutes between them.`
    )
  })

  it("names the pages even where the pooled figure has a verdict of its own", () => {
    expect(stay).toMatchObject({ kind: "read" })
  })
})

describe("goalSkimSentence", () => {
  const nameOf = (treeId: string) => treeId.toUpperCase()
  const skims = (counted: number, ...shorts: readonly number[]): GoalSkims => ({
    counted,
    skimmed: shorts.map((shortMs, index) => ({ treeId: `p${index + 1}`, shortMs })),
  })

  it("says nothing where the part is skimmed nowhere", () => {
    expect(goalSkimSentence(skims(4), nameOf)).toBeUndefined()
  })

  it("names the one page of a goal on one page", () => {
    expect(goalSkimSentence(skims(1, 4_500), nameOf)).toBe(
      "Skimmed on “P1”. Its readers there were short of 4.5 seconds between them."
    )
  })

  it("counts one skimmed page out of several", () => {
    expect(goalSkimSentence(skims(5, 1_560_000), nameOf)).toBe(
      "Skimmed on 1 of the 5 pages it is counted on: “P1”. Its readers there were short of 26 minutes between them."
    )
  })

  it("names three pages and counts the rest", () => {
    expect(goalSkimSentence(skims(9, 30_000_000, 4, 3, 2, 1), nameOf)).toBe(
      "Skimmed on 5 of the 9 pages it is counted on: “P1”, “P2”, “P3” and 2 more. Start with “P1”: its readers were short of 8 hours between them."
    )
  })
})
