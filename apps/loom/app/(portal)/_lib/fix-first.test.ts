import { describe, expect, it } from "vitest"

import { nodeIdSchema, treeIdSchema, type NodeId, type TreeId } from "@jam-overture/loom"
import {
  describeRankStanding,
  RANK_STANDINGS,
  type DeploymentReading,
  type RankedPage,
  type RankStanding,
} from "@jam-overture/loom/signals"

import {
  fallOnRow,
  fixFirstOf,
  fixFirstRanks,
  fixFirstSummary,
  NOT_IN_THE_ORDER,
  notYetInTheOrder,
  ONE_PER_PAGE,
  outOfTheOrder,
  pagesCount,
  RANK_STANDINGS_PLAIN,
  standingsHeld,
  whoItLoses,
} from "./fix-first"
import { unnamed, type PageName } from "./page-name"
import type { PartName } from "./part-name"
import { runtimeWordsIn } from "../_test/plain-language"

const tree = (id: string): TreeId => treeIdSchema.parse(id)
const node = (id: string): NodeId => nodeIdSchema.parse(id)

const page = (name: string, id: string): PageName => ({ name, treeId: id, derived: true })

const part = (name: string, id: string): PartName => ({ name, nodeId: id })

const PAGES: ReadonlyMap<string, PageName> = new Map([
  ["t_shop", page("Autumn arrivals", "t_shop")],
  ["t_about", page("About us", "t_about")],
  ["t_help", page("Help", "t_help")],
])

const PARTS: ReadonlyMap<string, PartName> = new Map([
  ["n_price", part("the card “What it costs”", "n_price")],
  ["n_ask", part("the card “Questions”", "n_ask")],
  ["n_top", part("the heading “About us”", "n_top")],
  ["n_team", part("the card “The team”", "n_team")],
])

/** One row of the order, with every figure the runtime puts on a ranked page. */
const ranked = ({
  treeId,
  ...over
}: Omit<Partial<RankedPage>, "treeId"> & { readonly treeId: string }): RankedPage => ({
  revision: 4,
  standing: "ranked",
  views: 90,
  opened: 1200,
  inflation: 0.5,
  at: { after: node("n_price"), before: node("n_ask"), reached: 800, lost: 510, share: 0.6375 },
  lost: 510,
  readers: 340,
  share: 0.6375,
  ...over,
  treeId: tree(treeId),
})

/** A page out of the order, with every figure withheld as the runtime withholds them. */
const outside = (treeId: string, standing: RankStanding): RankedPage => ({
  treeId: tree(treeId),
  revision: 2,
  standing,
  views: standing === "unread" ? 0 : 12,
  opened: standing === "unscaled" ? null : standing === "unopened" ? 0 : 40,
  inflation: standing === "unscaled" || standing === "unopened" ? null : 0.1,
  at: null,
  lost: null,
  readers: null,
  share: null,
})

const countOf = (rows: readonly RankedPage[]): Readonly<Record<RankStanding, number>> => {
  const standings = Object.fromEntries(RANK_STANDINGS.map((one) => [one, 0])) as Record<
    RankStanding,
    number
  >

  for (const row of rows) standings[row.standing] += 1

  return standings
}

const reading = (
  rows: readonly RankedPage[],
  over: Partial<DeploymentReading> = {}
): DeploymentReading => {
  const inOrder = rows.filter((row) => row.standing === "ranked")
  const rest = rows.filter((row) => row.standing !== "ranked")

  return {
    ranked: inOrder,
    unranked: rest,
    worst: inOrder[0] ?? null,
    standings: countOf(rows),
    trees: new Set(rows.map((row) => row.treeId)).size,
    arrivals: rows.reduce((sum, row) => sum + (row.opened ?? 0), 0),
    duplicated: 0,
    duplicatedRows: 0,
    ...over,
  }
}

const read = (rows: readonly RankedPage[], unjoined = 0) =>
  fixFirstOf(reading(rows), PAGES, PARTS, unjoined)

describe("which page to fix first", () => {
  it("leads with the page at the head of the runtime's order", () => {
    const fix = read([
      ranked({ treeId: "t_shop" }),
      ranked({ treeId: "t_about", readers: 12, lost: 18, share: 0.2 }),
    ])

    expect(fix.worst?.page.name).toBe("Autumn arrivals")
    expect(fix.ranked.map((row) => row.page.name)).toEqual(["Autumn arrivals", "About us"])
  })

  /**
   * The head of the section and the first row of the list are one object, so
   * the page the reader is told to start with cannot be named one thing above
   * the list and another inside it.
   */
  it("names the page at the top from the same row the list leads with", () => {
    const fix = read([ranked({ treeId: "t_shop" }), ranked({ treeId: "t_about" })])

    expect(fix.worst).toBe(fix.ranked[0])
  })

  it("has no page to lead with when nothing is in the order", () => {
    expect(read([outside("t_about", "unbroken")]).worst).toBeUndefined()
  })

  it("names the fall from the page's own words for its parts", () => {
    const fix = read([ranked({ treeId: "t_shop" })])

    expect(fallOnRow(fix.ranked[0]!)).toBe(
      "6 in 10 of the people who got as far as the card “What it costs” n_price never went on to the card “Questions” n_ask."
    )
  })

  /**
   * The runtime's fall carries two identifiers and nothing else. A part removed
   * from the page since the window was counted therefore has no name here, and
   * a sentence with an identifier in the middle of it is the one thing this
   * surface may not print unasked — so the sentence is withheld and the row
   * keeps every figure it had.
   */
  it("withholds the sentence rather than printing an identifier inside one", () => {
    const fix = read([
      ranked({
        treeId: "t_shop",
        at: { after: node("n_gone"), before: node("n_ask"), reached: 800, lost: 510, share: 0.6 },
      }),
    ])

    expect(fix.ranked[0]!.fall).toBeUndefined()
    expect(fallOnRow(fix.ranked[0]!)).toBeUndefined()
    expect(fix.ranked[0]!.readers).toBe(340)
    expect(fix.ranked[0]!.share).toBe(0.6375)
  })

  it("names a page whose own read did not come back by its identifier", () => {
    const fix = read([ranked({ treeId: "t_gone" })])

    expect(fix.ranked[0]!.page).toEqual(unnamed("t_gone"))
  })

  /**
   * **The pair, and the one place it may be said.**
   *
   * The loss at the door's scale against the door's own exact count. Both
   * halves are in the same units, which is the whole reason this sentence is
   * available here and nowhere else in this subsystem.
   */
  it("says the loss at the door's scale against the readers the door counted", () => {
    expect(whoItLoses(read([ranked({ treeId: "t_shop" })]).ranked[0]!)).toBe(
      "about 340 of the 1200 readers who arrived"
    )
  })

  it("says nothing rather than half of it when either figure is missing", () => {
    expect(whoItLoses(read([ranked({ treeId: "t_shop", opened: null })]).ranked[0]!)).toBeUndefined()
    expect(
      whoItLoses(read([ranked({ treeId: "t_shop", readers: null })]).ranked[0]!)
    ).toBeUndefined()
  })

  it("keeps the counters' own figure, for the record and not for the surface", () => {
    const row = read([ranked({ treeId: "t_shop" })]).ranked[0]!

    expect(row.lost).toBe(510)
    expect(row.inflation).toBe(0.5)
    expect(whoItLoses(row)).not.toContain("510")
  })

  /** Every standing has a plain name, a meaning and the runtime's own word. */
  it("has plain words for every standing the runtime can return", () => {
    for (const standing of RANK_STANDINGS) {
      const plain = RANK_STANDINGS_PLAIN[standing]

      expect([standing, plain.technical]).toEqual([standing, standing])
      expect([standing, runtimeWordsIn(plain.label)]).toEqual([standing, []])
      expect([standing, runtimeWordsIn(plain.meaning)]).toEqual([standing, []])
      expect([standing, plain.meaning.endsWith(".")]).toEqual([standing, true])
    }
  })

  /**
   * The runtime's own line is the record and is deliberately not the plain one.
   * Two of the six use *page views* and *the door*, which are the words a
   * reader checking the portal against the counters needs and nobody else does.
   */
  it("keeps the runtime's line for a standing on the row, unchanged", () => {
    const fix = read([outside("t_about", "unscaled")])

    expect(fix.unranked[0]!.onTheRecord).toBe(describeRankStanding("unscaled"))
  })

  it("reports only the standings that have a page in them", () => {
    const fix = read([
      ranked({ treeId: "t_shop" }),
      outside("t_about", "unbroken"),
      outside("t_help", "unbroken"),
    ])

    expect(standingsHeld(fix)).toEqual(["ranked", "unbroken"])
    expect(fix.standings.unbroken).toBe(2)
  })

  it("adds the arrivals and nothing else", () => {
    const fix = read([
      ranked({ treeId: "t_shop", opened: 1200 }),
      ranked({ treeId: "t_about", opened: 300 }),
    ])

    expect(fix.arrivals).toBe(1500)
  })
})

describe("the sentence above the order", () => {
  it("says how many pages are losing readers, and that they lead", () => {
    expect(fixFirstSummary(read([ranked({ treeId: "t_shop" }), ranked({ treeId: "t_about" })]))).toBe(
      "2 pages are losing readers partway through. They are at the top of this list, worst first."
    )
  })

  it("says one page without saying 1 pages", () => {
    expect(fixFirstSummary(read([ranked({ treeId: "t_shop" })]))).toContain("One of your pages")
    expect(pagesCount(1)).toBe("1 page")
  })

  /**
   * The three answers that are not an order, which render identically as
   * silence and are three different pieces of news. Only one of them is about
   * anybody's pages.
   */
  it("tells losing nobody, cannot be compared and nothing counted apart", () => {
    expect(fixFirstSummary(read([outside("t_about", "unbroken")]))).toContain("losing readers")
    expect(fixFirstSummary(read([outside("t_about", "unbroken")]))).toContain("No page here")

    expect(fixFirstSummary(read([outside("t_about", "unscaled")]))).toContain(
      "Nothing has counted how many readers arrived"
    )
    expect(fixFirstSummary(read([outside("t_about", "unopened")]))).toContain(
      "Nothing has counted how many readers arrived"
    )

    expect(fixFirstSummary(read([outside("t_about", "unread")]))).toContain(
      "nothing to put in an order yet"
    )
  })

  /**
   * A page losing nobody is better news than a page that cannot be compared, so
   * a deployment holding both leads with the good news rather than with the
   * diagnosis — but only once nothing is actually in the order.
   */
  it("prefers the order to any of the three, and good news to a diagnosis", () => {
    expect(
      fixFirstSummary(read([ranked({ treeId: "t_shop" }), outside("t_about", "unscaled")]))
    ).toContain("One of your pages")

    expect(
      fixFirstSummary(read([outside("t_about", "unbroken"), outside("t_help", "unscaled")]))
    ).toContain("No page here")
  })

  it("reads plainly, in every one of its four answers", () => {
    for (const fix of [
      read([ranked({ treeId: "t_shop" })]),
      read([ranked({ treeId: "t_shop" }), ranked({ treeId: "t_about" })]),
      read([outside("t_about", "unbroken")]),
      read([outside("t_about", "unscaled")]),
      read([outside("t_about", "unread")]),
    ]) {
      expect(runtimeWordsIn(fixFirstSummary(fix))).toEqual([])
    }
  })
})

describe("the pages out of the order", () => {
  it("counts them and says their own figures stand", () => {
    const said = outOfTheOrder(
      read([ranked({ treeId: "t_shop" }), outside("t_about", "unscaled"), outside("t_help", "unopened")])
    )

    expect(said).toContain("2 of these 3 pages are not in the order")
    expect(said).toContain("Nothing is wrong with them")
  })

  it("says nothing when every page is in the order", () => {
    expect(outOfTheOrder(read([ranked({ treeId: "t_shop" })]))).toBeUndefined()
  })

  /**
   * The verb, which is the half `pagesCount` cannot carry and the half the
   * rendered test caught: *1 page of these 2 are not in the order* satisfied
   * every assertion about the number and is the first sentence a reader
   * distrusts.
   */
  it("agrees its verb with its count, in both directions", () => {
    expect(
      outOfTheOrder(read([ranked({ treeId: "t_shop" }), outside("t_about", "unscaled")]))
    ).toContain("1 of these 2 pages is not in the order")

    expect(notYetInTheOrder(read([ranked({ treeId: "t_shop" })], 1))).toContain(
      "1 page is not in this order yet"
    )
    expect(notYetInTheOrder(read([ranked({ treeId: "t_shop" })], 2))).toContain(
      "2 pages are not in this order yet"
    )
  })

  /**
   * **A diagnosis and never a second league table**, which is 0250's refusal
   * and the one this reading could quietly undo. Ranking the pages the door
   * cannot scale among themselves by share is the ranking the record refused.
   */
  it("leaves them in the order the runtime handed them over in", () => {
    const fix = read([
      outside("t_help", "unscaled"),
      outside("t_about", "unscaled"),
    ])

    expect(fix.unranked.map((row) => row.treeId)).toEqual([tree("t_help"), tree("t_about")])
  })

  it("reads plainly", () => {
    expect(
      runtimeWordsIn(outOfTheOrder(read([ranked({ treeId: "t_shop" }), outside("t_about", "unscaled")])) ?? "")
    ).toEqual([])
  })
})

describe("the pages the order never saw", () => {
  /**
   * The version gap, which is this screen's limit and not the reading's: a fall
   * is a comparison between two parts of a page, so the counters have to be
   * laid over the version they were filed against.
   */
  it("says how many and that it clears itself", () => {
    const said = notYetInTheOrder(read([ranked({ treeId: "t_shop" })], 2))

    expect(said).toContain("2 pages are not in this order yet")
    expect(said).toContain("nothing to do about it")
  })

  it("says nothing when every page reached the order", () => {
    expect(notYetInTheOrder(read([ranked({ treeId: "t_shop" })], 0))).toBeUndefined()
  })

  it("reads plainly, and so does the line about one row per page", () => {
    expect(runtimeWordsIn(notYetInTheOrder(read([], 3)) ?? "")).toEqual([])
    expect(runtimeWordsIn(ONE_PER_PAGE)).toEqual([])
  })
})

describe("the positions the list is sorted by", () => {
  it("gives each ranked page its place in the order", () => {
    const fix = read([ranked({ treeId: "t_shop" }), ranked({ treeId: "t_about" })])
    const ranks = fixFirstRanks(fix)

    expect(ranks.get("t_shop")).toBe(0)
    expect(ranks.get("t_about")).toBe(1)
  })

  /**
   * One rung for every page out of the order rather than a position each, so
   * the shared tiebreak arranges them — which is the half `page-order.ts` says
   * makes two screens agree about the pages they have nothing to say about.
   */
  it("gives every unranked page one rung, below all of the ranked ones", () => {
    const fix = read([
      ranked({ treeId: "t_shop" }),
      outside("t_about", "unscaled"),
      outside("t_help", "unbroken"),
    ])
    const ranks = fixFirstRanks(fix)

    expect(ranks.get("t_about")).toBe(1)
    expect(ranks.get("t_help")).toBe(1)
  })

  it("has no rung for a page the order never saw, which sorts below every one it did", () => {
    const ranks = fixFirstRanks(read([ranked({ treeId: "t_shop" })]))

    expect(ranks.get("t_missing")).toBeUndefined()
    expect(NOT_IN_THE_ORDER).toBeGreaterThan(1_000_000)
  })
})
