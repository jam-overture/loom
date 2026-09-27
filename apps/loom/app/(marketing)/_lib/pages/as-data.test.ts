import { readFileSync, readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"

import type { ElementNode, LoomNode } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { ASKS } from "../adapt/asks"
import { BAND } from "../bands"
import { outlineOf } from "../outline"
import { askRunFor, treeFor } from "../render"
import { DEFAULT_THEME, HOME } from "../site"
import { wordsOf } from "../words"

import { asJson } from "./as-data"

/**
 * The band that prints a piece of this page, held to printing *this* page.
 *
 * Everything here is asserted against the published tree rather than against
 * `as-data.ts`. A test that read the specimen out of the module and compared it
 * with itself would pass however the band was wired — including wired to a
 * second copy of the specimen, which is precisely the failure the band exists to
 * rule out. So the specimen is found by walking the page a visitor is served,
 * and the panel's text is parsed back out of it.
 */

const ORIGIN = "https://loom.example"

const home = () => treeFor(HOME, { origin: ORIGIN, theme: DEFAULT_THEME })

const elementsOf = (node: LoomNode): readonly ElementNode[] => [
  ...(node.kind === "element" ? [node] : []),
  ...(node.kind === "text" ? [] : node.children.flatMap(elementsOf)),
]

const onlyOne = <T,>(found: readonly T[], what: string): T => {
  if (found.length !== 1) {
    throw new Error(`loom: the front door holds ${found.length} ${what}, expected exactly one`)
  }

  return found[0] as T
}

/** The band, found by the one label of it that is stable and visible. */
const bandOf = (page = home()): ElementNode =>
  onlyOne(
    elementsOf(page.root).filter((element) => element.props["eyebrow"] === BAND.asData),
    `bands labelled "${BAND.asData}"`
  )

/**
 * The piece the band shows: whatever is actually sitting first in the split's
 * first region.
 *
 * By position rather than by type, deliberately. Naming `loom.callout` here
 * would let the band swap what it shows and keep the panel printing the old
 * thing while every assertion below went on passing — which is the one failure
 * this file exists to catch.
 */
const specimenOf = (page = home()): ElementNode => {
  const split = onlyOne(
    elementsOf(bandOf(page)).filter((element) => element.type === "loom.split"),
    "splits in that band"
  )
  const start = split.children.find((child) => child.kind === "slot" && child.name === "start")

  if (start === undefined || start.kind !== "slot") {
    throw new Error("loom: the band's split has nothing in its first region")
  }

  const first = start.children.find((child): child is ElementNode => child.kind === "element")

  if (first === undefined) throw new Error("loom: the band's split shows no piece at all")

  return first
}

/** A piece with every id taken out of it, so two pages can be compared by content. */
const withoutIds = (node: LoomNode): unknown =>
  JSON.parse(asJson(node), (key, value) => (key === "id" ? undefined : value))

/** What the panel prints, as text. */
const printedOf = (page = home()): string => {
  const panel = onlyOne(
    elementsOf(bandOf(page)).filter((element) => element.type === "loom.code"),
    "panels in that band"
  )
  const text = panel.children.find((child) => child.kind === "text")

  if (text === undefined || text.kind !== "text") {
    throw new Error("loom: the band's panel prints nothing")
  }

  return text.value
}

describe("the page printed beside itself", () => {
  it("prints something a reader could paste into anything that reads JSON", () => {
    expect(() => JSON.parse(printedOf())).not.toThrow()
  })

  /**
   * The assertion the band exists for. Two copies of one box would look
   * identical on the page and would be a lie about the thing the site sells, so
   * what is checked is identity and not resemblance — the printed piece is the
   * piece that is standing next to it, id and all.
   */
  it("prints the piece that is in the band, rather than a copy of it", () => {
    const page = home()

    expect(JSON.parse(printedOf(page))).toEqual(JSON.parse(JSON.stringify(specimenOf(page))))
  })

  it("prints a piece that holds another piece, because one level would not show the shape", () => {
    const printed = JSON.parse(printedOf()) as { readonly children?: readonly unknown[] }

    expect(printed.children?.length).toBeGreaterThan(0)
  })

  /**
   * The panel prints the page it is standing on, and the front door has six of
   * those: the one a stranger arrives at, and the one each choice leaves behind.
   * A request that reconfigured or removed what the panel prints would leave it
   * quietly describing a page that is no longer on the screen — on the one band
   * whose entire claim is that it cannot.
   *
   * So every choice is run against the real page and both halves are checked on
   * what comes back. This is the assertion that makes the band safe to add a
   * sixth choice beside.
   */
  it.each(ASKS.map((ask) => ask.id))("still prints its own box after %s", async (id) => {
    const run = await askRunFor({ origin: ORIGIN, theme: DEFAULT_THEME, ask: id })

    if (run === undefined) throw new Error(`loom: ${id} ran nothing`)

    expect(JSON.parse(printedOf(run.page))).toEqual(
      JSON.parse(JSON.stringify(specimenOf(run.page)))
    )
  })

  /**
   * And the box itself says the same thing it said on arrival.
   *
   * **Ids are compared out**, and the reason is worth writing down rather than
   * hiding in a helper: the front door puts the answer above the opening band
   * for a visitor who has asked for something, so every piece built after it is
   * built one step later and carries a different id. That is a fact about two
   * different published pages rather than about anything a request did — each
   * page's ids are internally consistent, which is the property the assertion
   * above checks. What must not move is the box's settings and its words.
   */
  it.each(ASKS.map((ask) => ask.id))("leaves the box saying the same thing after %s", async (id) => {
    const arrival = withoutIds(specimenOf())
    const run = await askRunFor({ origin: ORIGIN, theme: DEFAULT_THEME, ask: id })

    if (run === undefined) throw new Error(`loom: ${id} ran nothing`)

    expect(withoutIds(specimenOf(run.page))).toEqual(arrival)
  })

  it("is a band of the page rather than something inside another one, so the record lists it", () => {
    expect(outlineOf(home())).toContain(BAND.asData)
  })
})

describe("what the page says about how it is written", () => {
  /**
   * The front door claimed *"None of it was written by hand"* for fifteen days.
   * Every word on this site was written by a person; what is true is that no
   * band of it is written out as a web page. The sentence is gone and this is
   * what keeps it gone — deliberately wider than the wording, because the defect
   * was a claim rather than a phrase.
   */
  it("never tells a stranger that nobody wrote it", () => {
    expect(wordsOf(home().root)).not.toMatch(/written by hand|nobody wrote|not written by a/i)
  })

  /**
   * The band's claim, checked against the lane it is a claim about.
   *
   * `loom.code` prints a box; this prints the files. A page builder that started
   * reaching for markup would make the band false, and the site would go on
   * saying it — which is the shape of every defect this surface has found in
   * itself. The list is read off the directory rather than typed, so a page
   * added tomorrow is covered by a test written today.
   */
  it("is telling the truth: no page of this site is written out as a web page", () => {
    const lib = fileURLToPath(new URL("..", import.meta.url))
    const modules = [
      ...readdirSync(new URL(".", import.meta.url))
        .filter((entry) => entry.endsWith(".ts") && !entry.endsWith(".test.ts"))
        .map((entry) => `pages/${entry}`),
      "chrome.ts",
      "nodes.ts",
    ]

    const markup = /<\/?(?:div|span|p|section|header|footer|nav|main|article|aside|h[1-6]|ul|ol|li|a|pre|code|table|tr|td|th|img|button|form|input|label|br|hr)\b/

    for (const module of modules) {
      expect({ module, markup: markup.test(readFileSync(`${lib}${module}`, "utf8")) }).toEqual({
        module,
        markup: false,
      })
    }

    expect(modules.length).toBeGreaterThan(5)
  })

  /**
   * The band names no side, because `loom.split` puts its two regions beside
   * each other on a laptop and stacks them on a phone. *"On the left"* is a
   * sentence that is wrong on one of the two devices this page is read on, and
   * nothing on the page would say so.
   */
  it("places nothing by a side, because the two regions stack on a phone", () => {
    expect(wordsOf(bandOf())).not.toMatch(/\b(?:on the left|on the right|opposite|above this|beside this)\b/i)
  })
})
