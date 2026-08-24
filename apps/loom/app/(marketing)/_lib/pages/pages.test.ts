import { readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { PALETTE_SLOTS, type ElementNode, type LoomNode } from "@loom/runtime"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ASKS } from "../adapt/asks"
import { BAND } from "../bands"
import { PALETTE_SWITCHER_LABEL } from "../chrome"
import { PLACEHOLDER_STRINGS } from "../copy"
import { pageTreeFor, renderTree, SITE_PAGES, treeFor } from "../render"
import {
  DEFAULT_THEME,
  DEMO,
  HOME,
  HOW_IT_WORKS,
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
  renderTree(treeFor(route, { origin: ORIGIN, theme }))

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
    expect(body).toContain(PALETTE_SWITCHER_LABEL)
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

  it("is down to the footer's licence line, and nothing else", () => {
    /**
     * The count is asserted so that adding placeholder copy is a deliberate act
     * with a test to change, rather than something that accumulates unnoticed
     * between reviews. It went 8 → 1 on 21 August: seven of the eight were the
     * pricing band, and the maintainer took pricing off the front door.
     *
     * One is the right number to still be here. Licensing is genuinely
     * undecided, it gates whether this repository can be public at all, and the
     * footer is the one place a reader looks for it — so the line stays, marked,
     * rather than the page quietly implying an answer by omission.
     */
    expect(PLACEHOLDER_STRINGS).toHaveLength(1)
  })
})

/**
 * The front door offers every surface in all three of the places it offers
 * anything: the menu, the footer's map, and the band that invites.
 *
 * The band enumerated its cards by hand until 21 August, when a merge added the
 * lessons course to `PRODUCT_SURFACES` and it appeared in the header and the
 * footer and silently not in the band — in a page whose own comment promised
 * that could not happen. A surface added by another run is not a run that will
 * think to look here, so the assertion is the thing that has to.
 */
/**
 * Where the site sends someone who wants to *try* it, rather than read about it.
 *
 * The demonstration is the one surface that is the product working, and until
 * 22 August nothing under this route group linked to it from anywhere — it sat
 * at `/portal/demo`, a public page behind the one path that reads as private,
 * and the front door had no route to the artifact that exists to convince
 * people. `Loom demo` moved it to a public `/demo` and filed exactly that.
 *
 * Three placements, and each is a different reader, which is why all three are
 * held rather than one being taken as enough:
 *
 * - **The opening band of the front door**, for the reader who is not going to
 *   scroll. The sentence above the button promises they can ask for a change in
 *   their own words, and this is the only place on the site that keeps it.
 * - **The band that demonstrates**, for the reader who just watched the
 *   sequence run and wants a turn.
 * - **The foot of the mechanism page**, for the reader who has read all five
 *   steps and wants to see one.
 *
 * Each is asserted where the link *is* rather than that the page contains the
 * href somewhere: the chrome links every surface from every page, so a check of
 * the whole markup would pass with all three of these deleted.
 */
describe("the way to the demonstration", () => {
  const DEMO_HREF = surfaceHref(ORIGIN, DEMO)

  const bandWith = (node: LoomNode, holds: (found: ElementNode) => boolean): ElementNode[] => [
    ...(node.kind === "element" && holds(node) ? [node] : []),
    ...(node.kind === "text" ? [] : node.children.flatMap((child) => bandWith(child, holds))),
  ]

  const hrefsIn = (node: LoomNode): readonly string[] =>
    bandWith(node, () => true).flatMap((found) =>
      typeof found.props["href"] === "string" ? [found.props["href"]] : []
    )

  const bandOf = (route: SiteRoute, holds: (found: ElementNode) => boolean): ElementNode => {
    const found = bandWith(treeFor(route, { origin: ORIGIN, theme: DEFAULT_THEME }).root, holds)[0]

    if (found === undefined) throw new Error(`loom: ${route.path} has no such band`)

    return found
  }

  it("is offered in the front door's opening band, before anything is scrolled", () => {
    const hero = bandOf(HOME, (found) => found.type === "loom.hero")

    expect(hrefsIn(hero)).toContain(DEMO_HREF)
  })

  it("is offered by the band that demonstrates, which is where the typing is missing", () => {
    const band = bandOf(HOME, (found) => found.props["eyebrow"] === BAND.seeItHappen)

    expect(hrefsIn(band)).toContain(DEMO_HREF)
  })

  /**
   * Every state of that band, not the untouched one. The band is rebuilt for
   * each choice and again when a held change is approved, and a link that
   * survived only the state nobody arrives at having used would be worse than
   * no link — the reader likeliest to want a turn is the one who has just had
   * a change happen in front of them.
   */
  it.each([undefined, ...ASKS.map((ask) => ask.id)])(
    "survives the front door being asked for %s",
    async (ask) => {
      const page = await pageTreeFor(HOME, {
        origin: ORIGIN,
        theme: DEFAULT_THEME,
        ...(ask === undefined ? {} : { ask }),
      })

      expect(hrefsIn(page.root)).toContain(DEMO_HREF)
    }
  )

  it("closes the mechanism page, for the reader who has read all five steps", () => {
    const closing = bandOf(HOW_IT_WORKS, (found) => found.props["tone"] === "accent")

    expect(hrefsIn(closing)).toContain(DEMO_HREF)
  })
})

describe("a surface added to the product", () => {
  const home = markupOf(HOME, DEFAULT_THEME)

  it.each(PRODUCT_SURFACES)("$label is invited on the front door, not only linked", (surface) => {
    /**
     * Three occurrences of the href: the menu (open surfaces only), the
     * footer's map, and the card. The guarded one is the bar's action rather
     * than a menu item, so two is its floor and the card is what this checks.
     */
    const offers = home.split(`href="${surfaceHref(ORIGIN, surface)}"`).length - 1

    expect(offers).toBeGreaterThanOrEqual(2)
    expect(home).toContain(surface.blurb)
  })

  /**
   * And the band is the surfaces exactly, rather than the surfaces plus
   * whatever else has accumulated in it.
   *
   * It carried a fifth card pointing at the repository, which was fine while
   * there were three surfaces and wrong once the demo made it four: the grid
   * wraps at four, so the odd card sat alone on a second row — and it was the
   * only card in the band that was not a page of this product. Removed on
   * 22 August, and asserted so that the next thing tempted into "Where to go
   * from here" has to be a surface or has to change this test.
   */
  it("is the whole of the band that invites, and nothing else is", () => {
    const inviting = treeFor(HOME, { origin: ORIGIN, theme: DEFAULT_THEME })
      .root.children.find(
        (child) => child.kind === "element" && child.props["eyebrow"] === BAND.waysIn
      )

    expect(inviting).toBeDefined()

    const offered = [...(inviting as ElementNode).children]
      .flatMap(function hrefs(node: LoomNode): readonly string[] {
        return [
          ...(node.kind === "element" && typeof node.props["href"] === "string"
            ? [node.props["href"]]
            : []),
          ...(node.kind === "text" ? [] : node.children.flatMap(hrefs)),
        ]
      })

    expect([...offered].sort()).toEqual(
      PRODUCT_SURFACES.map((surface) => surfaceHref(ORIGIN, surface)).sort()
    )
  })
})

/**
 * The mechanism page as it is *served*, which is the only form of it a reader
 * meets.
 *
 * Every assertion above is made against `treeFor`, the page before the route
 * supplies what it gathers per request — and the record this page prints is
 * gathered per request, so none of them see it. That is the gap this block
 * closes: the same properties, plus the one that matters most here, which is
 * that the band is there at all. A page whose central band quietly vanishes
 * when a caller forgets to supply it is the failure mode this site keeps
 * finding, and it is silent every time.
 */
describe("the record on the mechanism page", () => {
  const served = async (theme: SiteThemeName) =>
    renderTree(await pageTreeFor(HOW_IT_WORKS, { origin: ORIGIN, theme }))

  it("is on the page the route serves, whether or not the builder was given one", async () => {
    const tree = await pageTreeFor(HOW_IT_WORKS, { origin: ORIGIN, theme: DEFAULT_THEME })
    const eyebrows = tree.root.children.flatMap((child) =>
      child.kind === "element" && typeof child.props["eyebrow"] === "string"
        ? [child.props["eyebrow"]]
        : []
    )

    expect(eyebrows).toContain("The record itself")
    expect(eyebrows).toContain("And when the answer is no")
  })

  /**
   * Six for the run and one for the refusal. Counted rather than looked for,
   * because a stage the page stopped printing would otherwise show up as a
   * slightly shorter page and nothing else.
   */
  it("prints one panel per line of the run, and one for the refusal", async () => {
    const tree = await pageTreeFor(HOW_IT_WORKS, { origin: ORIGIN, theme: DEFAULT_THEME })
    const count = (node: LoomNode): number =>
      (node.kind === "element" && node.type === "loom.code" ? 1 : 0) +
      (node.kind === "text" ? 0 : node.children.reduce((total, child) => total + count(child), 0))

    expect(count(tree.root)).toBe(7)
  })

  it("is a record of the page this site publishes, not of a fixture", async () => {
    const tree = await pageTreeFor(HOW_IT_WORKS, { origin: ORIGIN, theme: DEFAULT_THEME })
    const front = treeFor(HOME, { origin: ORIGIN, theme: DEFAULT_THEME })
    const words = (node: LoomNode): string =>
      node.kind === "text" ? node.value : node.children.map(words).join(" ")

    expect(words(tree.root)).toContain(`"treeId": "${front.treeId}"`)
  })

  describe.each(THEMES)("wearing %s", (theme) => {
    it("renders with nothing the runtime could not honour", async () => {
      expect((await served(theme)).diagnostics).toEqual([])
    })

    it("names no colour of its own, anywhere below the root", async () => {
      const body = belowRoot(renderToStaticMarkup((await served(theme)).element))

      expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
      expect(body).not.toMatch(/\b(rgba?|hsla?)\(/)
    })
  })
})
