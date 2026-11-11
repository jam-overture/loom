import { describe, expect, it } from "vitest"

import {
  buildElement,
  buildSlot,
  buildText,
  createTree,
  nodeIdSchema,
  sequentialIdFactory,
} from "@jam-overture/loom"

import { pageFixture } from "@/app/_lib/pages/fixtures"

import { elementIdsOf, pageViewsOf, tallyOf } from "../proposing/fixtures"
import { goalIdSchema, type Goal } from "./goal"
import {
  countsWhen,
  goalReadingOf,
  goalReadingsByPage,
  outlinePageOf,
  pageChoicesOf,
  partsByPageOf,
  partsOf,
  per100Of,
  readingSentence,
  whereSentence,
} from "./goal-view"

const HOME = pageFixture("home", "Welcome home")
const PRICING = pageFixture("pricing", "Plans and prices")
const headingOf = (tree: typeof HOME) => {
  const heading = elementIdsOf(tree)[1]

  if (heading === undefined) throw new Error(`no heading on ${tree.treeId}`)

  return heading
}

const homeHeading = headingOf(HOME)
const pricingHeading = headingOf(PRICING)

const pages = pageChoicesOf([
  { tree: PRICING, receivedAt: 1 },
  { tree: HOME, receivedAt: 1 },
])

const goal = (overrides: Partial<Goal> = {}): Goal => ({
  goalId: goalIdSchema.parse(`g_${"0".repeat(32)}`),
  name: "Reads on",
  kind: "activated",
  nodeId: homeHeading,
  pages: null,
  primarySince: 1,
  createdAt: 1,
  createdBy: null,
  ...overrides,
})

describe("pageChoicesOf", () => {
  it("offers each published page by its heading, with its parts and never the page itself", () => {
    expect(pages.map((page) => [page.name, page.parts.map((part) => part.nodeId)])).toEqual([
      ["Plans and prices", [pricingHeading]],
      ["Welcome home", [homeHeading]],
    ])
  })

  it("knows which parts each page has", () => {
    expect(partsByPageOf(pages).get(HOME.treeId)?.has(homeHeading)).toBe(true)
  })
})

describe("partsOf", () => {
  it("lists a page's parts in reading order, each with how many parts it sits inside", () => {
    const ids = sequentialIdFactory("nest")
    const tree = createTree(
      buildElement(ids, {
        type: "loom.stack",
        children: [
          buildElement(ids, {
            type: "loom.card",
            children: [
              buildElement(ids, { type: "loom.heading", children: [buildText(ids, "Plans")] }),
              buildSlot(ids, "actions", [
                buildElement(ids, { type: "loom.button", children: [buildText(ids, "Start")] }),
              ]),
            ],
          }),
          buildElement(ids, { type: "loom.text", children: [buildText(ids, "Footnote")] }),
        ],
      }),
      ids
    )

    expect(partsOf(tree).map((part) => [part.name, part.depth])).toEqual([
      ["the card “Plans”", 0],
      ["the heading “Plans”", 1],
      ["the button “Start”", 1],
      ["the text “Footnote”", 0],
    ])
  })
})

describe("outlinePageOf", () => {
  it("draws the page chosen, else the first with the part picked, else the first", () => {
    expect(outlinePageOf(pages, HOME.treeId, pricingHeading)?.treeId).toBe(HOME.treeId)
    expect(outlinePageOf(pages, undefined, homeHeading)?.treeId).toBe(HOME.treeId)
    expect(outlinePageOf(pages, "t_gone", "")?.treeId).toBe(PRICING.treeId)
    expect(outlinePageOf([], undefined, "")).toBeUndefined()
  })
})

describe("goalReadingOf", () => {
  const readings = {
    pageViews: [pageViewsOf(HOME, 200), pageViewsOf(PRICING, 50)],
    tallies: [
      tallyOf(HOME, homeHeading, { activations: 7, completions: 2, opens: 3 }),
      tallyOf(PRICING, pricingHeading, { activations: 40 }),
    ],
    parts: partsByPageOf(pages),
  }

  it("counts its kind on its part over page views of the pages that have the part", () => {
    expect(goalReadingOf(goal(), readings)).toEqual({
      count: 7,
      pageViews: 200,
    })
    expect(goalReadingOf(goal({ kind: "completed" }), readings).count).toBe(2)
    expect(goalReadingOf(goal({ kind: "disclosed" }), readings).count).toBe(3)
  })

  it("counts only the pages chosen", () => {
    expect(goalReadingOf(goal({ pages: [PRICING.treeId] }), readings)).toEqual({
      count: 0,
      pageViews: 50,
    })
  })
})

describe("goalReadingsByPage", () => {
  const readings = {
    pageViews: [pageViewsOf(HOME, 200), pageViewsOf(PRICING, 50)],
    tallies: [tallyOf(HOME, homeHeading, { activations: 7 })],
    parts: partsByPageOf(pages),
  }

  it("measures each page the goal covers on that page's own page views, and no other page", () => {
    expect([...goalReadingsByPage(goal(), readings)]).toEqual([
      [HOME.treeId, { count: 7, pageViews: 200 }],
    ])
  })

  it("covers a page the goal names even where nothing on it was done yet", () => {
    expect(new Map(goalReadingsByPage(goal({ pages: [PRICING.treeId] }), readings))).toEqual(
      new Map([[PRICING.treeId, { count: 0, pageViews: 50 }]])
    )
  })

  it("adds up to what the goal counted across its pages", () => {
    const both = goal({ pages: [HOME.treeId, PRICING.treeId] })

    expect(goalReadingOf(both, readings)).toEqual({ count: 7, pageViews: 250 })
  })
})

describe("the sentences", () => {
  it("says the rate per hundred to one place, and nothing with no page views", () => {
    expect(per100Of({ count: 7, pageViews: 200 })).toBe("3.5")
    expect(per100Of({ count: 1, pageViews: 3 })).toBe("33.3")
    expect(per100Of({ count: 0, pageViews: 0 })).toBeUndefined()
  })

  it("says the count, the page views and the rate per hundred", () => {
    expect(readingSentence("activated", { count: 7, pageViews: 200 })).toBe(
      "7 presses in 200 page views, 3.5 per 100."
    )
    expect(readingSentence("completed", { count: 1, pageViews: 1 })).toBe(
      "1 form sent in 1 page view, 100 per 100."
    )
    expect(readingSentence("disclosed", { count: 0, pageViews: 0 })).toBe(
      "Nothing counted yet on the pages it covers."
    )
  })

  it("names the part and where it is counted in words", () => {
    expect(countsWhen(goal(), pages)).toMatch(/^A reader presses the heading/u)
    expect(countsWhen(goal({ nodeId: nodeIdSchema.parse("n_gone") }), pages)).toBe(
      "A reader presses a part no published page has any more"
    )
    expect(whereSentence(goal(), pages)).toBe("Every page that has it")
    expect(whereSentence(goal({ pages: [HOME.treeId] }), pages)).toBe("Welcome home")
  })
})
