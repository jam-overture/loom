import { sequentialIdFactory, type ElementNode, type LoomNode } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { BAR_CEILING, siteHeader, type ChromeContext } from "./chrome"
import {
  DEFAULT_THEME,
  HOME,
  PRODUCT_SURFACES,
  SITE_ROUTES,
  sitePath,
  surfacePath,
} from "./site"

/**
 * How many things the bar across the top carries, and whether any of them is
 * the same place twice.
 *
 * `chrome.test.ts` asks whether the bar carries what `inMenu` says it carries,
 * one item at a time, and it is right to: that is what the flag means. The
 * question it cannot ask is the one the maintainer actually asked on #166,
 * which is **how many**. Eight flags set one at a time are eight paragraphs
 * each arguing that this page is worth its slot, every one of them true, and
 * the ninth arrives in a run that has read none of the eight.
 *
 * That is not hypothetical here. The bar was back to eight items within a week
 * of the flag being added, and the paragraph under `WHAT_YOU_RUN` kept a page
 * off it until 12 October on the strength of a count — *the bar is the eight
 * items the maintainer asked about; a sixth page is not worth a ninth* — that
 * had been false since the site was cut to three pages on 26 September. A
 * number nobody re-reads goes wrong in both directions.
 *
 * So the ceiling is a number in one file and this is what makes it a rule. It
 * fails on the run that puts a ninth thing in the bar, before anybody has to
 * notice that the reasoning they inherited was about a different site.
 */

const context = (): ChromeContext => ({ theme: DEFAULT_THEME, current: HOME })

const header = (): LoomNode => siteHeader(sequentialIdFactory("t"), context())

const elements = (node: LoomNode): readonly ElementNode[] => [
  ...(node.kind === "element" ? [node] : []),
  ...(node.kind === "text" ? [] : node.children.flatMap(elements)),
]

/**
 * Everything in the bar a reader can press, in document order.
 *
 * Read off the tree rather than counted from the flags, because the flags are
 * the input to the thing being measured. A bar that grew an item some other way
 * — a second action, a link written into the header by hand — is exactly the
 * growth this file exists to catch, and a count of `inMenu` would not see it.
 *
 * The wordmark is not in it. It is `loom.brand` and it is the way home on every
 * site a visitor has ever used, so it costs none of the attention the ceiling
 * is rationing. Its destination is still held below, because a menu item
 * pointing where the wordmark already points is the one way the bar can offer
 * eight things and give a reader seven.
 */
const pressable = (): readonly ElementNode[] =>
  elements(header()).filter(
    (node) => node.type === "loom.link" || node.type === "loom.action"
  )

const hrefOf = (node: ElementNode): string => String(node.props["href"])

const wordmarkHref = (): string => {
  const brand = elements(header()).find((node) => node.type === "loom.brand")

  if (brand === undefined) throw new Error("loom: the bar has no wordmark")

  return String(brand.props["href"])
}

describe("how much the bar carries", () => {
  it("counts the links and the action, and nothing else in the header", () => {
    const flagged =
      SITE_ROUTES.filter((route) => route.inMenu).length +
      PRODUCT_SURFACES.filter((surface) => surface.inMenu).length

    /** The flags, plus *Sign in*, which is an item of the bar and not of a list. */
    expect(pressable()).toHaveLength(flagged + 1)
  })

  it("stays under the number the maintainer called too many", () => {
    expect(pressable().length).toBeLessThanOrEqual(BAR_CEILING)
  })

  /**
   * The ceiling has to be reachable or it is decoration. Everything this site
   * could flag into the bar — three pages, four surfaces — plus the action is
   * eight, so the bar is at its ceiling with every flag on and the next page or
   * surface is the ninth. That is the run this file is written for.
   */
  it("is a ceiling this site can actually reach, so it is a rule and not a note", () => {
    expect(SITE_ROUTES.length + PRODUCT_SURFACES.length + 1).toBeGreaterThanOrEqual(BAR_CEILING)
  })

  /**
   * The 12 September decision, as an assertion rather than as a paragraph.
   *
   * *Home* was taken out of the menu because the wordmark beside it already
   * went there: the same destination offered twice, spending one of the slots
   * this file is counting. Nothing stops a later run flagging the front door
   * back in, and nothing a reader sees would look wrong — the bar would simply
   * be one item larger and no more useful.
   */
  it("offers no destination twice, the wordmark's included", () => {
    const destinations = [wordmarkHref(), ...pressable().map(hrefOf)]

    expect(new Set(destinations).size).toBe(destinations.length)
  })

  it("sends every item of the bar somewhere this site or this product serves", () => {
    const served = [
      ...SITE_ROUTES.map((route) => sitePath(route.path)),
      ...PRODUCT_SURFACES.map(surfacePath),
    ]

    for (const node of pressable()) {
      expect(served).toContain(hrefOf(node))
    }
  })
})
