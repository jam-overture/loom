import { sequentialIdFactory, type ElementNode, type LoomNode } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import {
  BEFORE_LABEL,
  NEXT_LABEL,
  PALETTE_SWITCHER_LABEL,
  READ_NEXT_EYEBROW,
  siteFooter,
  siteHeader,
  siteReadingBand,
  type ChromeContext,
} from "./chrome"
import {
  DEFAULT_THEME,
  DOCS,
  HOME,
  HOW_IT_WORKS,
  internalHref,
  PORTAL,
  PRODUCT_SURFACES,
  readingNeighbours,
  SITE_ROUTES,
  surfaceHref,
  WHAT_READERS_DO,
  type SiteRoute,
} from "./site"
import { wordsOf } from "./words"

/**
 * The chrome, as a tree rather than as markup.
 *
 * `pages.test.ts` asks what a visitor ends up seeing; this file asks what the
 * header and the footer *are*, and the two are different questions. The first
 * version of both was nested `loom.stack`s holding quiet buttons, and it
 * rendered a page that looked entirely correct while announcing no navigation
 * landmark, marking no current page and naming no footer group. Every one of
 * those failures is invisible to an assertion about the words on the page, so
 * the assertions here are about the nodes.
 */

const ORIGIN = "https://loom.example"

/** The pages the bar carries, and the ones it deliberately does not. */
const IN_MENU = SITE_ROUTES.filter((route) => route.inMenu)
const OFF_MENU = SITE_ROUTES.filter((route) => !route.inMenu)

const context = (current = HOME): ChromeContext => ({
  origin: ORIGIN,
  theme: DEFAULT_THEME,
  current,
})

const header = (current = HOME): LoomNode => siteHeader(sequentialIdFactory("t"), context(current))
const footer = (current = HOME): LoomNode => siteFooter(sequentialIdFactory("t"), context(current))

/** The same footer, on a deployment that is counting its readers. */
const counting = (current = HOME): LoomNode =>
  siteFooter(sequentialIdFactory("t"), { ...context(current), counting: true })

/** The band, or nothing at all on the one page that does not carry it. */
const readingBand = (current: SiteRoute): readonly LoomNode[] =>
  siteReadingBand(sequentialIdFactory("t"), context(current))

/** The band on a page that has one, asserted rather than assumed. */
const bandOn = (current: SiteRoute): LoomNode => {
  const [band] = readingBand(current)

  if (band === undefined) throw new Error(`${current.path} carries no reading band`)

  return band
}

/** Every element node in the subtree, in document order. */
const elements = (node: LoomNode): readonly ElementNode[] => [
  ...(node.kind === "element" ? [node] : []),
  ...(node.kind === "text" ? [] : node.children.flatMap(elements)),
]

const ofType = (node: LoomNode, type: string): readonly ElementNode[] =>
  elements(node).filter((found) => found.type === type)

const slot = (node: LoomNode, name: string): LoomNode | undefined =>
  node.kind === "element"
    ? node.children.find((child) => child.kind === "slot" && child.name === name)
    : undefined

const hrefsIn = (node: LoomNode): readonly string[] =>
  elements(node).flatMap((found) =>
    typeof found.props["href"] === "string" ? [found.props["href"]] : []
  )

/** Every word in the subtree, slots included — a slot's contents are words too. */
const labelOf = (node: LoomNode): string =>
  node.kind === "text" ? node.value : node.children.map(labelOf).join("")

describe("the header", () => {
  it("is a navigation bar and not a row of things", () => {
    expect(header().kind).toBe("element")
    expect(header()).toMatchObject({ type: "loom.nav" })
  })

  it("puts the wordmark in the region the bar reserves for it", () => {
    const brand = slot(header(), "brand")

    expect(brand).toBeDefined()
    expect(ofType(brand as LoomNode, "loom.logo")).toHaveLength(1)
  })

  /**
   * The distinction the site spent two weeks without. A menu item is a link and
   * the way in is a button, and five quiet buttons in a row are neither.
   */
  it("builds its menu out of links, not buttons", () => {
    expect(ofType(header(), "loom.link").length).toBeGreaterThanOrEqual(IN_MENU.length)
    expect(ofType(slot(header(), "actions") as LoomNode, "loom.link")).toHaveLength(0)
  })

  it("offers the pages and the surfaces the bar is meant to carry", () => {
    const hrefs = hrefsIn(header())

    for (const route of IN_MENU) {
      expect(hrefs).toContain(internalHref(ORIGIN, route.path, DEFAULT_THEME))
    }

    for (const surface of PRODUCT_SURFACES.filter((one) => one.inMenu)) {
      expect(hrefs).toContain(surfaceHref(ORIGIN, surface))
    }
  })

  /**
   * The bar was *every unguarded surface* until 28 August, and this pair is what
   * replaced that with a decision.
   *
   * The old rule was a permission answering a question about attention, and it
   * grew the bar by one every time another lane shipped a front door — eight
   * items by the time the maintainer asked on #166 whether that was too many.
   * `inMenu` in `site.ts` carries the choice now, with the reasoning beside it.
   *
   * Two assertions rather than one, and the second is the one that matters. A
   * surface kept out of the bar must still be reachable, and the footer's map is
   * where it is reachable from — so *not in the menu* is held to mean exactly
   * that and never *not on the page*. Without it, `inMenu: false` would be a
   * quiet way to delete a surface from the site.
   *
   * The **menu** rather than the whole bar, because the portal is `inMenu:
   * false` and is nonetheless in the header — as the action, under the word a
   * stranger recognises. That is the distinction the flag is drawing, so a check
   * that could not see it would be checking the wrong thing.
   */
  it("leaves a surface out of the menu only by that decision, never by accident", () => {
    const menu = ofType(header(), "loom.link").flatMap((item) =>
      typeof item.props["href"] === "string" ? [item.props["href"]] : []
    )

    for (const surface of PRODUCT_SURFACES) {
      expect(menu.includes(surfaceHref(ORIGIN, surface))).toBe(surface.inMenu)
    }
  })

  /**
   * The same pair, for the pages — as of 8 September, when `inMenu` stopped
   * governing only half of what the bar carries.
   *
   * The flag answered #166 for the surfaces and the bar was back to eight items
   * within a week, because a route group growing a fourth page could not use it.
   * The guarantee is the surfaces' guarantee and it is the reason the flag is
   * safe: whatever the bar leaves out, the footer's map carries. Without the
   * second assertion, `inMenu: false` would be a quiet way to delete a page.
   */
  it("leaves a page of this site out of the menu only by that decision", () => {
    const menu = ofType(header(), "loom.link").flatMap((item) =>
      typeof item.props["href"] === "string" ? [item.props["href"]] : []
    )

    for (const route of SITE_ROUTES) {
      expect(menu.includes(internalHref(ORIGIN, route.path, DEFAULT_THEME))).toBe(route.inMenu)
    }
  })

  it("still reaches every surface and page it left out, from the foot", () => {
    const foot = hrefsIn(footer())

    for (const surface of PRODUCT_SURFACES.filter((one) => !one.inMenu)) {
      expect(foot).toContain(surfaceHref(ORIGIN, surface))
    }

    for (const route of OFF_MENU) {
      expect(foot).toContain(internalHref(ORIGIN, route.path, DEFAULT_THEME))
    }
  })

  /**
   * The portal is the bar's action rather than one of its menu items, and its
   * word is the one a stranger knows. "Portal" is a name for something they
   * have never seen; "Sign in" is where every site they have used puts the way
   * in.
   */
  it("makes signing in the bar's action, under a word a stranger recognises", () => {
    const actions = slot(header(), "actions") as LoomNode
    const buttons = ofType(actions, "loom.action")

    expect(buttons).toHaveLength(1)
    expect(labelOf(buttons[0] as LoomNode)).toBe("Sign in")
    expect(hrefsIn(actions)).toEqual([surfaceHref(ORIGIN, PORTAL)])
  })

  /**
   * Marked wherever it is carried, and carried somewhere on every page.
   *
   * The bar marking the current page was the whole of this assertion until a
   * page could be off the bar. The property worth keeping is not *the bar marks
   * it* — it is that **the site always says where the reader is**, and for a
   * page the bar does not carry, the footer's map is where it says so. So the
   * bar is held to marking exactly what it carries and nothing else, and the map
   * is held to marking every page without exception.
   */
  it("marks the page the reader is on wherever it carries it, and never drops it", () => {
    const carried = PRODUCT_SURFACES.filter((surface) => surface.inMenu).length

    for (const route of SITE_ROUTES) {
      const menu = ofType(header(route), "loom.link")
      const inBar = menu.filter((item) => item.props["current"] === true)
      const inMap = ofType(footer(route), "loom.link").filter(
        (item) => item.props["current"] === true
      )

      expect(inBar).toHaveLength(route.inMenu ? 1 : 0)
      if (route.inMenu) expect(labelOf(inBar[0] as LoomNode)).toBe(route.label)

      expect(inMap).toHaveLength(1)
      expect(labelOf(inMap[0] as LoomNode)).toBe(route.label)

      /** The menu is the same length on every page: marked, never dropped. */
      expect(menu).toHaveLength(IN_MENU.length + carried)
    }
  })

  it("carries the visitor's palette on its own links and not into another surface", () => {
    const bar = siteHeader(sequentialIdFactory("t"), { ...context(), theme: "bold" })
    const hrefs = hrefsIn(bar)

    expect(hrefs).toContain(internalHref(ORIGIN, HOW_IT_WORKS.path, "bold"))

    for (const surface of PRODUCT_SURFACES) {
      for (const href of hrefs.filter((one) => new URL(one).pathname === surface.path)) {
        expect(href).not.toContain("theme=")
      }
    }
  })
})

describe("the footer", () => {
  it("is the band that closes a page, and says so to a reader", () => {
    expect(footer()).toMatchObject({ type: "loom.footer" })
  })

  /**
   * Named groups, not a run of links that happen to be arranged in columns.
   * `loom.link-list` makes the visible heading and the landmark's accessible
   * name one string, so what a screen reader announces is what the page shows.
   */
  it("groups its links under names", () => {
    const groups = ofType(footer(), "loom.link-list")

    expect(groups).toHaveLength(3)
    for (const group of groups) {
      expect(typeof group.props["label"]).toBe("string")
      expect(ofType(group, "loom.link").length).toBeGreaterThan(0)
    }
  })

  it("is the complete map: every page of this site, and every other surface", () => {
    const hrefs = hrefsIn(footer())

    for (const route of SITE_ROUTES) {
      expect(hrefs).toContain(internalHref(ORIGIN, route.path, DEFAULT_THEME))
    }
    for (const surface of PRODUCT_SURFACES) {
      expect(hrefs).toContain(surfaceHref(ORIGIN, surface))
    }
  })

  it("keeps the palette switcher, which is the site's claim made checkable", () => {
    expect(labelOf(footer())).toContain(PALETTE_SWITCHER_LABEL)
  })

  /**
   * The disclosure, which is in the chrome because the counting is: a
   * broadcaster is started by the layout, so the page somebody landed on is not
   * the page that decides whether they are counted.
   *
   * Asserted in both directions. A note that appeared on a deployment counting
   * nobody would be a false statement about this site, and a note that failed to
   * appear on one that is counting would be the thing the note exists to
   * prevent.
   */
  it("says what is being counted, on a deployment that is counting", () => {
    const words = wordsOf(counting())

    expect(words).toContain("This page counts which of its parts you reach")
    expect(words).toContain("never who you are")
  })

  it("says nothing about counting on a deployment that counts nobody", () => {
    expect(wordsOf(footer())).not.toContain("counts which of its parts")
  })

  it("points the disclosure at the page that says the rest of it", () => {
    expect(hrefsIn(counting())).toContain(
      internalHref(ORIGIN, WHAT_READERS_DO.path, DEFAULT_THEME)
    )
  })
})

/**
 * The band that walks a reader along the site's argument.
 *
 * `site.test.ts` asks whether the order is a sequence; this asks whether the
 * band says so in nodes. The two are different questions and the second is the
 * one a reader meets: a correct `readingNeighbours` rendered into a region
 * nothing draws would be a page that quietly offers nothing.
 */
describe("the band that says what to read next", () => {
  it("names itself, so the outline has a row for it rather than a hole", () => {
    const band = bandOn(HOW_IT_WORKS)

    expect(band.kind === "element" ? band.type : "").toBe("loom.section")
    expect(band.kind === "element" ? band.props["eyebrow"] : "").toBe(READ_NEXT_EYEBROW)
  })

  /**
   * A card apiece, in a grid. The shape this band wanted was
   * `loom.link-pager`, and the two reasons it could not have it are filed for
   * `Loom primitives` — pinned here so a run that reaches for the pager meets
   * the measurement rather than repeating it.
   */
  it("gives each way on a card of its own, in a grid that gives it a width", () => {
    const band = bandOn(HOW_IT_WORKS)

    expect(ofType(band, "loom.grid")).toHaveLength(1)
    expect(ofType(band, "loom.card")).toHaveLength(2)
    /** The whole card is the link, so nothing inside it may be one. */
    expect(ofType(band, "loom.link")).toHaveLength(0)
  })

  const CARRIED = SITE_ROUTES.filter((route) => route.path !== HOME.path)

  it.each(CARRIED)("$path offers the page before it and the page after it", (route) => {
    const { before, after, onward } = readingNeighbours(route)
    const band = bandOn(route)
    const cards = ofType(band, "loom.card")

    expect(cards).toHaveLength(
      [before, after, onward].filter((way) => way !== undefined).length
    )

    for (const neighbour of [before, after]) {
      if (neighbour === undefined) continue

      const href = internalHref(ORIGIN, neighbour.path, DEFAULT_THEME)
      const card = cards.find((found) => found.props["href"] === href)

      expect(card, `${route.path} should offer ${neighbour.path}`).toBeDefined()
      expect(labelOf(card as LoomNode)).toContain(neighbour.label)
    }

    if (onward !== undefined) {
      expect(hrefsIn(band)).toContain(surfaceHref(ORIGIN, onward))
    }
  })

  it("says which way each card goes, in words rather than in a glyph", () => {
    const words = wordsOf(bandOn(HOW_IT_WORKS))

    expect(words).toContain(BEFORE_LABEL)
    expect(words).toContain(NEXT_LABEL)
  })

  /**
   * The front door does not carry one, and it is the only page that does not.
   * `chrome.ts` has the reasoning; what matters here is that it is exactly one
   * page and that the decision is read off the order rather than off the path.
   */
  it("is on every page of the site except the front door", () => {
    const without = SITE_ROUTES.filter((route) => readingBand(route).length === 0)

    expect(without.map((route) => route.path)).toEqual([HOME.path])
  })

  /**
   * The guarantee, as a reader meets it: **every page of this site is offered
   * by the body of another page.** On `main` two of the ten were offered by no
   * page's body at all, and both are off the bar as well — so the footer's map
   * was the only way to either.
   */
  it("leaves no page of this site reachable only from the footer's map", () => {
    const offered = new Set(SITE_ROUTES.flatMap((route) => readingBand(route).flatMap(hrefsIn)))

    for (const route of SITE_ROUTES) {
      expect(offered.has(internalHref(ORIGIN, route.path, DEFAULT_THEME)), route.path).toBe(true)
    }
  })

  /**
   * The palette travels between pages of this site and stops at its edge — the
   * rule the header's links and the footer's map already follow, and the reason
   * is that `?theme=bold` arriving at a surface that does not read it is a
   * parameter that means nothing and looks like it means something.
   */
  it("carries the visitor's palette along the site and not into another surface", () => {
    const along = hrefsIn(bandOn(HOW_IT_WORKS))

    expect(along.every((href) => href.includes(`theme=${DEFAULT_THEME}`))).toBe(true)

    const last = SITE_ROUTES[SITE_ROUTES.length - 1]

    expect(last).toBeDefined()
    expect(hrefsIn(bandOn(last as SiteRoute))).toContain(surfaceHref(ORIGIN, DOCS))
  })
})
