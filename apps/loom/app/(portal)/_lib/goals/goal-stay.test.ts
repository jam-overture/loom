import { describe, expect, it } from "vitest"

import { pageReadingOf, type PageReading } from "@jam-overture/loom/signals"

import { pageFixture } from "@/app/_lib/pages/fixtures"

import { elementIdsOf, NOTHING_DECLARED, pageViewsOf, tallyOf } from "../proposing/fixtures"
import { goalStayOf, goalStaySentence } from "./goal-stay"

const HOME = pageFixture("home", "Welcome home")
const PRICING = pageFixture("pricing", "Plans and prices")

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
    expect(stay).toEqual({ kind: "read", spentMs: 4500, standing: "lingered" })
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

    expect(stay).toEqual({ kind: "silent", silence: "unread" })
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

    expect(stay).toEqual({ kind: "silent", silence: "unplaced" })
  })
})
