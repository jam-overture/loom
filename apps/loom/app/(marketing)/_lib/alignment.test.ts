import type { ElementNode, LoomNode, LoomTree } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { treeFor } from "./render"
import { SITE_ROUTES, SITE_THEME_NAMES, type SiteRoute, type SiteThemeName } from "./site"

/**
 * Where a band stands, and whether the words inside it stand there too.
 *
 * Every band on this site is laid out by a primitive and every word in it is
 * written by a different node, so *centred* is two facts rather than one: the
 * band centres the boxes it lays out, and each box centres the text it holds.
 * A composition that states the first and forgets the second gets a band whose
 * eyebrow, paragraph and buttons are centred and whose **heading is ranged
 * left** — which is not a subtle difference when the heading is the largest
 * words on the page.
 *
 * That is exactly what the front door shipped with. `loom.hero`'s
 * `align: "center"` is `alignItems` on the column it lays out; the headline in
 * its heading slot set `balance` and nothing else, so `loom.heading` fell back
 * to its own default of `start`. Measured on a production build before the fix:
 *
 * | | the headline | everything around it |
 * | --- | --- | --- |
 * | 1280 × 900 | `text-align: start`, block 984px wide starting at x=148 | centred |
 * | 390 × 844 | `text-align: start`, five hard-left lines in 254px | centred |
 *
 * Nothing was red and nothing could have been. Both alignments are valid props
 * with valid values, the page renders, the schema passes, the markup carries no
 * color and measures no overflow. The only instrument that could see it is a
 * camera — which is this lane's third finding of that shape in five days, and
 * the reason this file exists rather than a one-line fix on its own.
 *
 * **The rule is stated over the tree, so it holds for pages nobody has written
 * yet.** It is not a snapshot of the three pages this site has today: it reads
 * the routes off `SITE_ROUTES` and the palettes off `SITE_THEME_NAMES`, so a
 * fourth page with a centred band is checked the day it is added.
 */

/** A node's `align`, with each primitive's own default written out. */
const ALIGN_DEFAULT = "start"

type Align = "start" | "center"

const alignOf = (node: ElementNode): Align =>
  node.props["align"] === "center" ? "center" : ALIGN_DEFAULT

/**
 * The two band primitives this site composes pages out of.
 *
 * `loom.hero` states where it stands as a prop of its own; `loom.section` does
 * not, and the difference is why the two are checked by different rules below.
 */
const HERO = "loom.hero"
const SECTION = "loom.section"

const isElement = (node: LoomNode): node is ElementNode => node.kind === "element"

const elementsOf = (node: LoomNode): readonly ElementNode[] => [
  ...(isElement(node) ? [node] : []),
  ...(node.kind === "text" ? [] : node.children.flatMap(elementsOf)),
]

const bandsOf = (page: LoomTree): readonly ElementNode[] =>
  elementsOf(page.root).filter((node) => node.type === HERO || node.type === SECTION)

/**
 * The heading a band is given, through the region the band places it in (0051).
 *
 * A band's heading is never an ordinary child — `section()` and every hero on
 * this site put it in a `heading` slot — so looking for the first `loom.heading`
 * anywhere under the band would find a heading belonging to a card inside it
 * and hold the band to that one's alignment.
 */
const headingOf = (band: ElementNode): ElementNode | undefined => {
  const slot = band.children.find((child) => child.kind === "slot" && child.name === "heading")

  if (slot === undefined || slot.kind === "text") return undefined

  return slot.children.filter(isElement).find((child) => child.type === "loom.heading")
}

/**
 * The paragraphs the band itself is speaking, and not the ones its contents are.
 *
 * Direct children only, and deliberately: a `loom.prose` inside a card, a
 * comparison row or a framed excerpt is aligned by the thing holding it, and a
 * rule that reached into those would be asserting that a card in a centred band
 * has centred body copy — which is false and is not what a reader sees.
 */
const spokenProseOf = (band: ElementNode): readonly ElementNode[] =>
  band.children.filter(isElement).filter((child) => child.type === "loom.prose")

const describeBand = (band: ElementNode): string =>
  `${band.type}${typeof band.props["eyebrow"] === "string" ? ` (${band.props["eyebrow"]})` : ""}`

const PAGES: readonly SiteRoute[] = SITE_ROUTES
const THEMES: readonly SiteThemeName[] = SITE_THEME_NAMES
const ORIGIN = "https://loom.example"

describe("a band and the words in it stand in the same place", () => {
  /**
   * The front-door defect, stated as the smallest thing that would have caught
   * it, and kept separate from the sweep below so that a failure names the page
   * rather than a count.
   */
  it.each(PAGES.map((route) => [route.path, route] as const))(
    "%s: a hero's heading is aligned the way the hero is",
    (_path, route) => {
      const page = treeFor(route, { origin: ORIGIN, theme: "minimal" })

      for (const hero of bandsOf(page).filter((band) => band.type === HERO)) {
        const heading = headingOf(hero)

        expect(heading, `${describeBand(hero)} has no heading`).toBeDefined()
        expect(heading === undefined ? undefined : alignOf(heading), describeBand(hero)).toBe(
          alignOf(hero)
        )
      }
    }
  )

  it.each(PAGES.map((route) => [route.path, route] as const))(
    "%s: a hero's own paragraphs are aligned the way the hero is",
    (_path, route) => {
      const page = treeFor(route, { origin: ORIGIN, theme: "minimal" })

      for (const hero of bandsOf(page).filter((band) => band.type === HERO)) {
        for (const prose of spokenProseOf(hero)) {
          expect(alignOf(prose), describeBand(hero)).toBe(alignOf(hero))
        }
      }
    }
  )

  /**
   * `loom.section` has no `align` of its own, so the band's heading is what
   * says where the band stands. The rule is the same one either way: a reader
   * meets a heading and the sentences under it as one block, and a block with
   * two alignments in it reads as a mistake whichever half was intended.
   */
  it.each(PAGES.map((route) => [route.path, route] as const))(
    "%s: a section's own paragraphs are aligned the way its heading is",
    (_path, route) => {
      const page = treeFor(route, { origin: ORIGIN, theme: "minimal" })

      for (const section of bandsOf(page).filter((band) => band.type === SECTION)) {
        const heading = headingOf(section)

        if (heading === undefined) continue

        for (const prose of spokenProseOf(section)) {
          expect(alignOf(prose), describeBand(section)).toBe(alignOf(heading))
        }
      }
    }
  )

  /**
   * The palette cannot move any of this — a re-theme touches the root and
   * nothing below it (0049) — and saying so here is what makes that a checked
   * property of alignment rather than a thing believed about it.
   */
  it.each(THEMES)("every band agrees with itself under %s", (theme) => {
    for (const route of PAGES) {
      const page = treeFor(route, { origin: ORIGIN, theme })

      for (const band of bandsOf(page)) {
        const heading = headingOf(band)
        const expected = band.type === HERO ? alignOf(band) : heading && alignOf(heading)

        if (expected === undefined) continue

        if (heading !== undefined) {
          expect(alignOf(heading), `${route.path} ${describeBand(band)}`).toBe(expected)
        }

        for (const prose of spokenProseOf(band)) {
          expect(alignOf(prose), `${route.path} ${describeBand(band)}`).toBe(expected)
        }
      }
    }
  })

  /**
   * The sweep above passes vacuously on a site with no centred band, and this
   * site has exactly one. Without this, deleting the front door's `align` twice
   * over — from the hero and from every node in it — would leave every
   * assertion green and the page it was written for unchecked.
   */
  it("the front door still has a centred band, so the sweep is not empty", () => {
    const home = PAGES.find((route) => route.path === "/")

    expect(home).toBeDefined()

    const page = treeFor(home as SiteRoute, { origin: ORIGIN, theme: "minimal" })
    const centred = bandsOf(page).filter((band) => {
      const heading = headingOf(band)

      return band.type === HERO ? alignOf(band) === "center" : heading && alignOf(heading) === "center"
    })

    expect(centred.length).toBeGreaterThan(0)
  })
})
