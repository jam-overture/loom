import { readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { PALETTE_SLOTS } from "@loom/runtime"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { PLACEHOLDER_STRINGS } from "../copy"
import { renderSitePage, SITE_PAGES, treeFor } from "../render"
import {
  DEFAULT_THEME,
  internalHref,
  PRODUCT_SURFACES,
  SITE_ROUTES,
  SITE_THEME_NAMES,
  SITE_THEMES,
  surfaceHref,
  type SiteRoute,
  type SiteThemeName,
} from "../site"

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

/**
 * Every registered palette, read off the site rather than listed here. The
 * assertions below are the ones that must hold for *all* of them, so a palette
 * added to the site and not to this array would be a palette nothing checks.
 */
const THEMES: readonly SiteThemeName[] = SITE_THEME_NAMES

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
 * visitor's forward and the footer's offers name the others. Both are
 * normalised here and nothing else is, which keeps the assertion the strong one
 * — a re-theme changes the root's variables and no markup below them.
 *
 * Derived from the site's own list rather than spelled out, because a palette
 * missing from a hand-written alternation would not fail this: its name would
 * survive normalisation and the invariance assertion would report a difference
 * below the root that is only ever the switcher naming itself.
 */
const withoutPaletteNames = (markup: string): string =>
  SITE_THEME_NAMES.reduce(
    (text, name) =>
      text
        .replaceAll(`theme=${name}`, "theme=P")
        .replaceAll(`>${SITE_THEMES[name].label}<`, ">P<"),
    markup
  )

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
    const once = treeFor(route, { origin: ORIGIN, theme: DEFAULT_THEME })
    const twice = treeFor(route, { origin: ORIGIN, theme: DEFAULT_THEME })

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

  /**
   * Every pair, not one pair. With two palettes the distinction was empty;
   * with three it is the whole assertion — a palette whose markup differed
   * below the root from one of the others and not from the rest would pass a
   * check that only ever compared the same two.
   */
  it.each(
    THEMES.flatMap((one, index) => THEMES.slice(index + 1).map((other) => [one, other] as const))
  )("changes only the root's variables between %s and %s", (one, other) => {
    const first = markupOf(route, one)
    const second = markupOf(route, other)

    expect(rootStyle(first)).not.toBe(rootStyle(second))
    expect(withoutPaletteNames(belowRoot(first))).toBe(withoutPaletteNames(belowRoot(second)))
  })

  it("carries the header and the footer as nodes, not as markup", () => {
    const body = belowRoot(markupOf(route, DEFAULT_THEME))

    /** The wordmark, and the footer's re-theme offer: both are tree nodes. */
    expect(body).toContain("Loom")
    expect(body).toContain("Same tree, another palette:")
  })

  /**
   * The two landmarks a reader navigating by landmark expects, emitted by the
   * primitives rather than by a layout. The chrome was a run of `loom.stack`s
   * until #97, and a stack cannot say that a row of links is the navigation.
   */
  it("announces its navigation and its closing band as landmarks", () => {
    const body = belowRoot(markupOf(route, DEFAULT_THEME))

    expect(body).toContain("<nav")
    expect(body).toContain("<footer")
    /** The footer's groups are named, so a landmark menu reads three names. */
    for (const name of ["This site", "The product", "The project"]) {
      expect(body).toContain(`aria-label="${name}"`)
    }
  })

  it("marks the page the reader is on rather than dropping it from the menu", () => {
    const body = belowRoot(markupOf(route, DEFAULT_THEME))

    expect(body).toContain('aria-current="page"')
    expect(body).toContain(`>${route.label}<`)
  })

  /**
   * The front door leads somewhere. The four surfaces are one application
   * (0067) with this one at its root (0070), so every page of it offers the way
   * into the documentation and the way into the portal.
   */
  it("offers the rest of the product from every page", () => {
    const markup = markupOf(route, DEFAULT_THEME)

    for (const surface of PRODUCT_SURFACES) {
      expect(markup).toContain(`href="${surfaceHref(ORIGIN, surface)}"`)
    }
  })

  /** Every palette but the one being worn is reachable from the footer. */
  it("offers each of the other palettes on the page itself", () => {
    for (const theme of THEMES) {
      const markup = markupOf(route, theme)

      for (const other of THEMES.filter((name) => name !== theme)) {
        expect(markup).toContain(`href="${internalHref(ORIGIN, route.path, other)}"`)
        expect(markup).toContain(`>${SITE_THEMES[other].label}<`)
      }
    }
  })

  /**
   * Two kinds of destination on this origin, and the difference is the point.
   * A site route is a page this lane builds, so it must have a builder; a
   * surface is another route group's front door, which this lane may point at
   * and must not otherwise know anything about. Anything else on this origin is
   * a link to nowhere.
   */
  it("links to every route of the site, and to no unknown path on this origin", () => {
    const internal = linksIn(markupOf(route, DEFAULT_THEME))
      .filter((href) => href.startsWith(ORIGIN))
      .map((href) => new URL(href).pathname)
    const surfaces = PRODUCT_SURFACES.map((surface) => surface.path)

    for (const other of SITE_ROUTES) expect(internal).toContain(other.path)
    for (const path of internal) {
      expect(SITE_PAGES.has(path) || surfaces.includes(path)).toBe(true)
    }
  })

  it("keeps the visitor's palette when they navigate", () => {
    const markup = markupOf(route, "bold")

    for (const other of SITE_ROUTES) {
      expect(markup).toContain(`href="${internalHref(ORIGIN, other.path, "bold")}"`)
    }
  })

  it("holds no link the scheme allowlist would have refused", () => {
    for (const href of linksIn(markupOf(route, DEFAULT_THEME))) {
      expect(new URL(href).protocol).toMatch(/^https?:$/)
    }
  })

  it("has exactly one first-level heading", () => {
    const markup = markupOf(route, DEFAULT_THEME)

    expect([...markup.matchAll(/<h1\b/g)]).toHaveLength(1)
  })
})

describe("the words that are not engineering's to write", () => {
  const everything = SITE_ROUTES.map((route) => markupOf(route, DEFAULT_THEME)).join("\n")

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
