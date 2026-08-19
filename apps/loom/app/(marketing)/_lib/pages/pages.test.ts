import { readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { PALETTE_SLOTS } from "@loom/runtime"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { PLACEHOLDER_STRINGS } from "../copy"
import { renderSitePage, SITE_PAGES, treeFor } from "../render"
import { internalHref, SITE_ROUTES, type SiteRoute, type SiteThemeName } from "../site"

/**
 * What has to be true of every page on this site, asked of every page.
 *
 * The site's whole claim is that it is composed rather than written, so the
 * assertions worth making are the ones a hand-written page would fail: that a
 * re-theme touches nothing below the root, that no colour is named anywhere in
 * the markup, and that the pages and the navigation between them cannot drift
 * apart.
 */

const ORIGIN = "https://loom.example"
const THEMES: readonly SiteThemeName[] = ["editorial", "bold"]

const rendered = (route: SiteRoute, theme: SiteThemeName) =>
  renderSitePage(route, { origin: ORIGIN, theme })

const markupOf = (route: SiteRoute, theme: SiteThemeName): string =>
  renderToStaticMarkup(rendered(route, theme).element)

/**
 * The rendered page splits in three, and two of the three matter here.
 *
 * React 19 hoists the library's `<style>` — it carries an `href` and a
 * `precedence`, which is what makes twenty animated primitives on one page emit
 * one stylesheet — so the markup opens with that rather than with the root
 * node. The root is the first `<div`; its opening tag is where the theme's
 * variables are mounted, and everything after it is the page itself.
 */
const rootAt = (markup: string): number => markup.indexOf("<div")

const rootStyle = (markup: string): string =>
  markup.slice(rootAt(markup), markup.indexOf(">", rootAt(markup)))

const belowRoot = (markup: string): string => markup.slice(markup.indexOf(">", rootAt(markup)))

/**
 * The two places the palette's *name* legitimately reaches the markup.
 *
 * This site keeps the palette in the URL, so every internal link carries the
 * visitor's forward and the footer's offer names the other one. Both are
 * normalised here and nothing else is, which keeps the assertion the strong one
 * — a re-theme changes the root's variables and no markup below them.
 */
const withoutPaletteNames = (markup: string): string =>
  markup.replace(/theme=(editorial|bold)/g, "theme=P").replace(/>(Editorial|Bold)</g, ">P<")

/** Every link the page offers a visitor. Not the stylesheet's own `href`. */
const linksIn = (markup: string): readonly string[] =>
  [...markup.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((match) => match[1] ?? "")

describe.each(SITE_ROUTES)("$path", (route) => {
  it("has a page on disk at its route", () => {
    /**
     * The route group, not the application's `app/`. A route group contributes
     * nothing to a URL, so `(marketing)/how-it-works/page.tsx` *is* the page at
     * `/how-it-works` — and this surface owning `/` is what makes that true
     * (0067).
     */
    const group = fileURLToPath(new URL("../../", import.meta.url)).replace(/\/$/, "")
    const directory = route.path === "/" ? group : `${group}${route.path}`

    expect(readdirSync(directory)).toContain("page.tsx")
  })

  it("has a tree builder registered for it", () => {
    expect(SITE_PAGES.has(route.path)).toBe(true)
  })

  it("builds the same tree twice, byte for byte", () => {
    const once = treeFor(route, { origin: ORIGIN, theme: "editorial" })
    const twice = treeFor(route, { origin: ORIGIN, theme: "editorial" })

    expect(JSON.stringify(twice)).toBe(JSON.stringify(once))
  })

  describe.each(THEMES)("wearing %s", (theme) => {
    it("renders with nothing the runtime could not honour", () => {
      expect(rendered(route, theme).diagnostics).toEqual([])
    })

    it("resolves the theme its root names", () => {
      expect(rendered(route, theme).theme).toBeDefined()
    })

    it("mounts every palette slot on the root", () => {
      const style = rootStyle(markupOf(route, theme))

      for (const slot of PALETTE_SLOTS) expect(style).toContain(`--loom-${slot}:`)
    })

    it("names no colour of its own, anywhere below the root", () => {
      const body = belowRoot(markupOf(route, theme))

      expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
      expect(body).not.toMatch(/\b(rgba?|hsla?)\(/)
    })
  })

  it("changes only the root's variables when the palette changes", () => {
    const editorial = markupOf(route, "editorial")
    const bold = markupOf(route, "bold")

    expect(rootStyle(editorial)).not.toBe(rootStyle(bold))
    expect(withoutPaletteNames(belowRoot(editorial))).toBe(withoutPaletteNames(belowRoot(bold)))
  })

  it("carries the header and the footer as nodes, not as markup", () => {
    const body = belowRoot(markupOf(route, "editorial"))

    /** The wordmark, and the footer's re-theme offer: both are tree nodes. */
    expect(body).toContain("Loom")
    expect(body).toContain("Same tree, other palette:")
  })

  it("links to every route of the site, and to no unknown one", () => {
    const internal = linksIn(markupOf(route, "editorial"))
      .filter((href) => href.startsWith(ORIGIN))
      .map((href) => new URL(href).pathname)

    for (const other of SITE_ROUTES) expect(internal).toContain(other.path)
    for (const path of internal) expect(SITE_PAGES.has(path)).toBe(true)
  })

  it("keeps the visitor's palette when they navigate", () => {
    const markup = markupOf(route, "bold")

    for (const other of SITE_ROUTES) {
      expect(markup).toContain(`href="${internalHref(ORIGIN, other.path, "bold")}"`)
    }
  })

  it("holds no link the scheme allowlist would have refused", () => {
    for (const href of linksIn(markupOf(route, "editorial"))) {
      expect(new URL(href).protocol).toMatch(/^https?:$/)
    }
  })

  it("has exactly one first-level heading", () => {
    const markup = markupOf(route, "editorial")

    expect([...markup.matchAll(/<h1\b/g)]).toHaveLength(1)
  })
})

describe("the words that are not engineering's to write", () => {
  const everything = SITE_ROUTES.map((route) => markupOf(route, "editorial")).join("\n")

  it("appears on the page, marked, rather than being invented quietly", () => {
    for (const placeholder of PLACEHOLDER_STRINGS) {
      expect(everything).toContain(placeholder)
    }
  })

  it("is confined to the pricing band and the footer's licence line", () => {
    /**
     * The count is asserted so that adding placeholder copy is a deliberate act
     * with a test to change, rather than something that accumulates unnoticed
     * between reviews.
     */
    expect(PLACEHOLDER_STRINGS).toHaveLength(8)
  })
})
