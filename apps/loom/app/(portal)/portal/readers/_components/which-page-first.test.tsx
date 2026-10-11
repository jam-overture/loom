import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { nodeIdSchema, treeIdSchema, type NodeId, type TreeId } from "@jam-overture/loom"
import { RANK_STANDINGS, type DeploymentReading, type RankedPage, type RankStanding } from "@jam-overture/loom/signals"

import { fixFirstOf, type FixFirst } from "@/app/(portal)/_lib/fix-first"
import { portalFile, screenSource } from "@/app/(portal)/_lib/screen-source"
import type { PageName } from "@/app/(portal)/_lib/page-name"
import type { PartName } from "@/app/(portal)/_lib/part-name"
import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"
import { recordOf, surfaceOf } from "@/app/(portal)/_test/rendered"

import { WhichPageFirst } from "./which-page-first"

const tree = (id: string): TreeId => treeIdSchema.parse(id)
const node = (id: string): NodeId => nodeIdSchema.parse(id)

const PAGES: ReadonlyMap<string, PageName> = new Map([
  ["t_shop", { name: "Autumn arrivals", treeId: "t_shop", derived: true }],
  ["t_about", { name: "About us", treeId: "t_about", derived: true }],
])

const PARTS: ReadonlyMap<string, PartName> = new Map<string, PartName>([
  ["n_price", { name: "the card “What it costs”", nodeId: "n_price" }],
  ["n_ask", { name: "the card “Questions”", nodeId: "n_ask" }],
])

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

const outside = (treeId: string, standing: RankStanding): RankedPage => ({
  treeId: tree(treeId),
  revision: 2,
  standing,
  views: 12,
  opened: standing === "unscaled" ? null : 40,
  inflation: standing === "unscaled" ? null : 0.1,
  at: null,
  lost: null,
  readers: null,
  share: null,
})

const read = (rows: readonly RankedPage[], unjoined = 0): FixFirst => {
  const inOrder = rows.filter((row) => row.standing === "ranked")
  const standings = Object.fromEntries(RANK_STANDINGS.map((one) => [one, 0])) as Record<
    RankStanding,
    number
  >

  for (const row of rows) standings[row.standing] += 1

  const reading: DeploymentReading = {
    ranked: inOrder,
    unranked: rows.filter((row) => row.standing !== "ranked"),
    worst: inOrder[0] ?? null,
    standings,
    trees: new Set(rows.map((row) => row.treeId)).size,
    arrivals: rows.reduce((sum, row) => sum + (row.opened ?? 0), 0),
    duplicated: 0,
    duplicatedRows: 0,
  }

  return fixFirstOf(reading, PAGES, PARTS, unjoined)
}

const shown = (fix: FixFirst) => {
  const { container } = render(<WhichPageFirst fix={fix} />)

  return { surface: surfaceOf(container), record: recordOf(container), container }
}

describe("which page to fix first", () => {
  it("asks the reader's question as the heading", () => {
    const { container } = render(<WhichPageFirst fix={read([ranked({ treeId: "t_shop" })])} />)

    expect(container.querySelector("h2")?.textContent).toBe("Which page should I fix first?")
  })

  it("names the page to start with, and where on it readers leave", () => {
    const { surface } = shown(read([ranked({ treeId: "t_shop" })]))

    expect(surface).toContain("Start with Autumn arrivals")
    expect(surface).toContain("the card “What it costs”")
    expect(surface).toContain("never went on to")
    expect(surface).toContain("the card “Questions”")
  })

  /**
   * **The pair, and the whole care this component exists to take.**
   *
   * `readers` is the loss on the door's scale and `lost` is what the counters
   * say. They are different numbers for a good reason, so the surface carries
   * one of them and the record carries both — and the record carries the
   * straddle rate between them, which is the sentence that makes the difference
   * readable rather than alarming.
   */
  it("prints the loss at the door's scale on the surface and the counters' own figure one click down", () => {
    const { surface, record } = shown(read([ranked({ treeId: "t_shop" })]))

    expect(surface).toContain("about 340 of the 1200 readers who arrived")
    expect(surface).not.toContain("510")

    expect(record).toContain("510")
    expect(record).toContain("inflation")
    expect(record).toContain("0.500")
  })

  it("sends the reader to the page it told them to start with", () => {
    const { container } = render(<WhichPageFirst fix={read([ranked({ treeId: "t_shop" })])} />)
    const link = container.querySelector('a[href="/portal/pages/t_shop"]')

    expect(link?.textContent).toContain("Open Autumn arrivals")
  })

  /**
   * A fall whose parts are no longer on the page cannot be named, and a
   * sentence with an identifier in the middle of it is the one thing this
   * surface may not print unasked. The row says which half it is missing
   * instead of going quiet.
   */
  it("says the drop cannot be named rather than naming it with an identifier", () => {
    const { surface } = shown(
      read([
        ranked({
          treeId: "t_shop",
          at: { after: node("n_gone"), before: node("n_ask"), reached: 800, lost: 510, share: 0.6 },
        }),
      ])
    )

    expect(surface).toContain("no longer on the page")
    expect(surface).not.toContain("n_gone")
    expect(surface).toContain("about 340 of the 1200 readers who arrived")
  })

  it("counts the pages out of the order without ranking them against each other", () => {
    const { surface } = shown(
      read([ranked({ treeId: "t_shop" }), outside("t_about", "unscaled")])
    )

    expect(surface).toContain("1 of these 2 pages is not in the order")
    expect(surface).toContain("Nothing is wrong with it")
  })

  it("says nothing about pages out of the order when there are none", () => {
    expect(shown(read([ranked({ treeId: "t_shop" })])).surface).not.toContain("not in the order")
  })

  it("says which pages are not in the order yet, and that nothing needs doing", () => {
    const { surface } = shown(read([ranked({ treeId: "t_shop" })], 2))

    expect(surface).toContain("2 pages are not in this order yet")
    expect(surface).toContain("nothing to do about it")
  })

  /**
   * The governing principle, as a property rather than as taste: no sentence a
   * reader meets unasked contains a word from the runtime's vocabulary, and the
   * record beside it does.
   */
  it("meets a reader in plain words, with the runtime's own one click down", () => {
    const { surface, record } = shown(
      read([ranked({ treeId: "t_shop" }), outside("t_about", "unscaled")], 1)
    )

    expect(runtimeWordsIn(surface)).toEqual([])
    expect(record).toContain("deploymentReadingOf")
    expect(record).toContain("unscaled")
    expect(record).toContain("revision 4")
  })

  /**
   * Every standing with a page in it gets its plain name, its meaning and the
   * runtime's own line — and a standing with nobody in it is not listed, so the
   * legend is about this deployment rather than about the type.
   */
  it("explains every standing a page of this deployment is in, and no others", () => {
    const { record } = shown(read([ranked({ treeId: "t_shop" }), outside("t_about", "unscaled")]))

    expect(record).toContain("not comparable yet")
    expect(record).toContain("in the order")
    expect(record).not.toContain("the numbers disagree")
    expect(record).toContain("no page views counted at the door")
  })

  it("adds the arrivals and says why that one may be added", () => {
    const { record } = shown(
      read([ranked({ treeId: "t_shop", opened: 1200 }), ranked({ treeId: "t_about", opened: 300 })])
    )

    expect(record).toContain("1500")
    expect(record).toContain("counted once")
  })

  /**
   * Four answers where three are not an order, and all three are a sentence
   * rather than an empty section. A deployment losing nobody is good news and
   * must not read as a failure to measure.
   */
  it("says so when there is no order to draw, in each of the three ways there is not", () => {
    expect(shown(read([outside("t_about", "unbroken")])).surface).toContain("No page here")
    expect(shown(read([outside("t_about", "unscaled")])).surface).toContain(
      "Nothing has counted how many readers arrived"
    )
    expect(shown(read([outside("t_about", "unread")])).surface).toContain(
      "nothing to put in an order yet"
    )
  })

  it("offers nothing to press, because an order is not a control", () => {
    const { container } = render(<WhichPageFirst fix={read([ranked({ treeId: "t_shop" })])} />)

    expect(container.querySelector("button")).toBeNull()
    expect(container.querySelector("form")).toBeNull()
  })

  /**
   * **A space this file's own rendered tests cannot see.**
   *
   * `<span>…</span> off its own row` keeps the space under the transform the
   * tests run through and loses it under the one the application is built with,
   * so the browser printed `openedoff` while every assertion above passed. The
   * screen is server-rendered on demand, so `prerender:check` — which exists to
   * catch exactly this — never walks it either, and the photograph is what
   * found it.
   *
   * So the guard is on the source: a word may not follow an element on the same
   * line without `{" "}` between them. Punctuation may and does, because a comma
   * hard against the thing it follows is correct.
   */
  it("never leaves a word against an element without an explicit space", () => {
    const source = screenSource(
      portalFile("portal", "readers", "_components", "which-page-first.tsx")
    )

    expect(source.match(/<\/span>\s+[A-Za-z]/gu)).toBeNull()
  })
})
