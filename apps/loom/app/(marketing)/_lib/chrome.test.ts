import { sequentialIdFactory, type ElementNode, type LoomNode } from "@loom/runtime"
import { describe, expect, it } from "vitest"

import { siteFooter, siteHeader, type ChromeContext } from "./chrome"
import {
  DEFAULT_THEME,
  HOME,
  HOW_IT_WORKS,
  internalHref,
  PORTAL,
  PRODUCT_SURFACES,
  SITE_ROUTES,
  surfaceHref,
} from "./site"

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

const context = (current = HOME): ChromeContext => ({
  origin: ORIGIN,
  theme: DEFAULT_THEME,
  current,
})

const header = (current = HOME): LoomNode => siteHeader(sequentialIdFactory("t"), context(current))
const footer = (current = HOME): LoomNode => siteFooter(sequentialIdFactory("t"), context(current))

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
    expect(ofType(header(), "loom.link").length).toBeGreaterThanOrEqual(SITE_ROUTES.length)
    expect(ofType(slot(header(), "actions") as LoomNode, "loom.link")).toHaveLength(0)
  })

  it("offers every page of this site, and the surfaces a visitor can read without an account", () => {
    const hrefs = hrefsIn(header())

    for (const route of SITE_ROUTES) {
      expect(hrefs).toContain(internalHref(ORIGIN, route.path, DEFAULT_THEME))
    }

    for (const surface of PRODUCT_SURFACES.filter((one) => !one.guarded)) {
      expect(hrefs).toContain(surfaceHref(ORIGIN, surface))
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

  it("marks the page the reader is on, and keeps it in the menu", () => {
    const open = PRODUCT_SURFACES.filter((surface) => !surface.guarded).length

    for (const route of SITE_ROUTES) {
      const menu = ofType(header(route), "loom.link")
      const marked = menu.filter((item) => item.props["current"] === true)

      expect(marked).toHaveLength(1)
      expect(labelOf(marked[0] as LoomNode)).toBe(route.label)
      /** The menu is the same length on every page: marked, never dropped. */
      expect(menu).toHaveLength(SITE_ROUTES.length + open)
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
    expect(labelOf(footer())).toContain("Same tree, another palette:")
  })
})
