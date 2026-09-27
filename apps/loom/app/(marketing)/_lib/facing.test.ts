import { type ElementNode, type LoomNode, type LoomTree, sequentialIdFactory } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { splitSection } from "./nodes"
import { pageTreeFor } from "./render"
import { DEFAULT_THEME, HOW_IT_WORKS, type SiteRoute, WHAT_YOU_RUN } from "./site"

/**
 * The rule that keeps a band from being a headline over a half-empty page.
 *
 * `loom.section` stacks — eyebrow, heading, content — and a `loom.prose` is
 * capped at the reading measure while the band it sits in is not. A band whose
 * content is nothing but paragraphs is therefore a full-width heading above a
 * 544px column inside a 1120px band, with **half of it empty**, and the two
 * interior pages were nine of those in a row.
 *
 * **Nothing in this repository could report it.** Each band renders correctly
 * and emits no diagnostic; the register sweep reads words rather than layout;
 * the only automated visual instrument here is the overflow measurement, and it
 * reports a page that is too *wide*. A page with too much room is the opposite
 * failure and it has no alarm. This file is the alarm.
 *
 * It is written as a **prohibition over the served trees** rather than as a
 * count of the bands that were converted, because a count is satisfied by the
 * bands that already pass and says nothing about the tenth one somebody adds.
 * The question it asks of every band is the one a reviewer would: *is this band
 * only paragraphs, and if so, is its heading beside them?*
 */

const ORIGIN = "https://loom.example"

/** The two pages the rule is stated over: the site's interior, where prose-only bands live. */
const INTERIOR: readonly (readonly [string, SiteRoute])[] = [
  ["how it works", HOW_IT_WORKS],
  ["what you run", WHAT_YOU_RUN],
]

const isElement = (node: LoomNode): node is ElementNode => node.kind === "element"

const descendants = (node: LoomNode): readonly LoomNode[] =>
  node.kind === "text" ? [node] : [node, ...node.children.flatMap(descendants)]

const elementsOfType = (node: LoomNode, type: string): readonly ElementNode[] =>
  descendants(node).filter((child): child is ElementNode => isElement(child) && child.type === type)

/** The bands of a page: the `loom.section` children the page root holds directly. */
const bandsOf = (tree: LoomTree): readonly ElementNode[] =>
  tree.root.children.filter(
    (child): child is ElementNode => isElement(child) && child.type === "loom.section"
  )

/**
 * What a band puts on the page, ignoring how it is arranged.
 *
 * A slot is a region rather than a thing rendered, so `heading` and `start` and
 * `end` are walked through rather than counted. What is left is the primitives
 * a reader actually meets, which is what decides whether a band is prose-only.
 */
const rendersOnly = (band: ElementNode, types: readonly string[]): boolean =>
  descendants(band)
    .filter(isElement)
    .filter((node) => node.type !== "loom.section")
    .every((node) => types.includes(node.type))

/** The first words of a paragraph, which is how a failure names one a reader can find. */
const opening = (node: ElementNode): string => {
  const [text] = descendants(node).filter((child) => child.kind === "text")
  const words = text === undefined ? "" : text.value

  return words.length > 60 ? `${words.slice(0, 60)}…` : words
}

const eyebrowOf = (band: ElementNode): string =>
  typeof band.props["eyebrow"] === "string" ? band.props["eyebrow"] : "(no eyebrow)"

const served = async (route: SiteRoute): Promise<LoomTree> =>
  pageTreeFor(route, { origin: ORIGIN, theme: DEFAULT_THEME })

describe("a band of nothing but paragraphs faces its heading", () => {
  describe.each(INTERIOR)("on %s", (_name, route) => {
    /**
     * The prohibition itself.
     *
     * The failure message names the band's eyebrow rather than its index,
     * because the person who trips this will have just written that eyebrow and
     * an index into a tree tells them nothing.
     */
    it("leaves no prose-only band with its heading stacked above it", async () => {
      const stacked = bandsOf(await served(route))
        .filter((band) => rendersOnly(band, ["loom.heading", "loom.prose"]))
        .filter((band) => elementsOfType(band, "loom.split").length === 0)
        .map(eyebrowOf)

      expect(stacked).toEqual([])
    })

    /**
     * The other half, and the reason the first half is not enough on its own: a
     * band could satisfy it by dropping its heading altogether.
     */
    it("keeps the heading and the answer in opposite regions of the split", async () => {
      const facing = bandsOf(await served(route)).filter(
        (band) => elementsOfType(band, "loom.split").length > 0
      )

      expect(facing.length).toBeGreaterThan(0)

      for (const band of facing) {
        const [split] = elementsOfType(band, "loom.split")
        const regions = (split?.children ?? []).filter((child) => child.kind === "slot")

        expect({
          band: eyebrowOf(band),
          headings: elementsOfType(band, "loom.heading").length,
          regions: regions.length,
        }).toEqual({ band: eyebrowOf(band), headings: 1, regions: 2 })
      }
    })

    /**
     * **The column is the measure, so nothing inside one asks for a second.**
     *
     * Each half of an even split inside a `wide` band is ≈ 540px against a
     * reading measure of 68ch ≈ 544px, so `measured` there is at best a no-op
     * and at worst a second opinion about line length that has to agree with
     * the first. `loom.prose`'s own schema says a paragraph in a narrow column
     * is already measured; this holds the site to it.
     */
    it("lets the column measure the paragraphs inside it", async () => {
      const asking = bandsOf(await served(route))
        .filter((band) => elementsOfType(band, "loom.split").length > 0)
        .flatMap((band) => elementsOfType(band, "loom.prose"))
        .filter((node) => node.props["measured"] === true)
        .map(opening)

      expect(asking).toEqual([])
    })
  })
})

/**
 * The constructor on its own, away from any page.
 *
 * The sweep above says the pages obey the rule; this says what the thing they
 * obey it with is, so a change to `splitSection` that quietly stopped producing
 * two regions would fail here with a readable diff rather than four routes
 * away.
 */
describe("splitSection", () => {
  const built = (): ElementNode => {
    const node = splitSection(
      sequentialIdFactory("facing"),
      { width: "wide", eyebrow: "An eyebrow" },
      "A heading",
      []
    )

    if (node.kind !== "element") {
      throw new Error("splitSection must build an element")
    }

    return node
  }

  it("keeps the eyebrow on the band rather than moving it into a column", () => {
    expect(built().props["eyebrow"]).toBe("An eyebrow")
  })

  /**
   * The section's own `heading` region stays **empty**, and that is the whole
   * mechanism: a section renders that region above its content, so a heading
   * left in it would be drawn a second time above the split.
   */
  it("fills no heading region on the section", () => {
    const regions = built().children.filter((child) => child.kind === "slot")

    expect(regions).toEqual([])
  })

  it("puts a level-two heading in the start region", () => {
    const [split] = elementsOfType(built(), "loom.split")
    const start = (split?.children ?? []).find(
      (child) => child.kind === "slot" && child.name === "start"
    )
    const headings = start === undefined ? [] : elementsOfType(start, "loom.heading")

    expect(headings.map((node) => node.props["level"])).toEqual([2])
  })
})
