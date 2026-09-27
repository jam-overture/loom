import { readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { PALETTE_SLOTS, type ElementNode, type LoomNode } from "@jam-overture/loom"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ASKS } from "../adapt/asks"
import { BAND } from "../bands"
import { PALETTE_SWITCHER_LABEL, READ_NEXT_EYEBROW } from "../chrome"
import { PLACEHOLDER_STRINGS } from "../copy"
import { unhonoured } from "../frames"
import { YOUR_TURN_ANCHOR } from "./in-your-own-words"
import { pageTreeFor, renderTree, SITE_PAGES, treeFor } from "../render"
import {
  DEFAULT_THEME,
  DEMO,
  HOME,
  HOW_IT_WORKS,
  internalHref,
  PRODUCT_SURFACES,
  readingNeighbours,
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
  renderTree(treeFor(route, { origin: ORIGIN, theme }), { origin: ORIGIN })

const markupOf = (route: SiteRoute, theme: SiteThemeName): string =>
  renderToStaticMarkup(rendered(route, theme).element)

/**
 * A sentence as the markup will spell it.
 *
 * Looking for authored copy inside rendered markup is looking for a string
 * React has escaped, and until 25 August no sentence on this site contained a
 * character it escapes — so every such search compared the two directly and
 * happened to be right. The demo's blurb now reads *a small business's page*
 * and the apostrophe comes out as `&#x27;`, which failed the assertion while
 * the page was correct.
 *
 * Escaping here rather than relaxing the assertion to a fragment: a test that
 * looks for the first half of a sentence passes a page that lost the second
 * half, and the whole point of holding the markup against `Surface` is that a
 * visitor reads every word of it.
 */
const asRendered = (text: string): string =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;")

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
      expect(unhonoured(rendered(route, theme).diagnostics)).toEqual([])
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

  /**
   * The band, on the page rather than in a function nobody called.
   *
   * `chrome.test.ts` asks whether the band offers the right two pages;
   * this asks whether the builder put it on the page at all — which is the
   * failure a band assembled correctly and wired into nine of ten builders
   * would have, and the one nothing else here would see.
   */
  it("says which page comes next, on the page itself", () => {
    const { before, after, onward } = readingNeighbours(route)
    const markup = markupOf(route, DEFAULT_THEME)

    /**
     * The front door is the one page without the band, because it is the one
     * page with nothing before it — `chrome.ts` has the reasoning and
     * `chrome.test.ts` holds it to being exactly one page.
     */
    if (before === undefined) {
      expect(markup).not.toContain(READ_NEXT_EYEBROW)
      return
    }

    expect(markup).toContain(READ_NEXT_EYEBROW)

    for (const neighbour of [before, after]) {
      if (neighbour === undefined) continue

      expect(markup).toContain(`href="${internalHref(ORIGIN, neighbour.path, DEFAULT_THEME)}"`)
      expect(markup).toContain(`>${neighbour.label}<`)
    }

    if (onward !== undefined) {
      expect(markup).toContain(`href="${surfaceHref(ORIGIN, onward)}"`)
      /** The hand-off says what is behind the door, which no other card does. */
      expect(markup).toContain(asRendered(onward.blurb))
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

  /**
   * The band that demonstrates points at the band that *is* the demonstration,
   * and this asserts the two halves of that separately.
   *
   * It used to point at `/demo`, and the site pointing at the demonstration is
   * exactly what §4d says it should stop doing. So the link is now a fragment on
   * this same page, and a fragment link is the one shape that can be wrong while
   * looking perfectly right: a band renamed on one side leaves a control that
   * silently does nothing, and nothing else on the page would say so. Checking
   * that some band *holds* the anchor is therefore the assertion that matters,
   * not that the href was spelled.
   */
  it("is offered by the band that demonstrates, which is where the typing is missing", () => {
    const band = bandOf(HOME, (found) => found.props["eyebrow"] === BAND.seeItHappen)

    expect(hrefsIn(band).some((href) => href.endsWith(`#${YOUR_TURN_ANCHOR}`))).toBe(true)
  })

  it("lands on a band that is actually there to be landed on", () => {
    const held = bandWith(
      treeFor(HOME, { origin: ORIGIN, theme: DEFAULT_THEME }).root,
      (found) => found.props["anchor"] === YOUR_TURN_ANCHOR
    )

    expect(held).toHaveLength(1)
  })

  /**
   * And the demonstration itself is on the page rather than linked from it —
   * §4d's *embeds the demonstration rather than describing it*, which is the
   * reason the demonstration is public at all (0056). The frame's `src` is the
   * demonstration's own address, so the band is not a second copy of anything.
   */
  it("is framed by the band below it, rather than pointed at", () => {
    const band = bandOf(HOME, (found) => found.props["eyebrow"] === BAND.inYourOwnWords)
    const frames = bandWith(band, (found) => found.type === "loom.embed")

    expect(frames).toHaveLength(1)
    expect(frames[0]?.props["src"]).toBe(DEMO_HREF)
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
    expect(home).toContain(asRendered(surface.blurb))
    expect(home).toContain(asRendered(surface.cost))
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

  /**
   * The costs are on the cards, in the order the cards are in.
   *
   * `PRODUCT_SURFACES` is ordered by ascending cost to the visitor and always
   * has been, and until today that was a rule stated in a comment and checked
   * by nobody. Now it is the line a reader compares the four destinations
   * along, so a surface slotted into the wrong place puts *costs you an
   * account* second and reads as a price list somebody shuffled.
   *
   * The order is asserted as *the tree's order against the list's order*
   * rather than against four expected words: this test's job is that the page
   * agrees with `site.ts`, not that anybody's phrasing survives review.
   */
  it("says what each destination costs, in the order they are offered", () => {
    const inviting = treeFor(HOME, { origin: ORIGIN, theme: DEFAULT_THEME })
      .root.children.find(
        (child) => child.kind === "element" && child.props["eyebrow"] === BAND.waysIn
      )

    const said = [...(inviting as ElementNode).children].flatMap(function text(
      node: LoomNode
    ): readonly string[] {
      return node.kind === "text" ? [node.value] : node.children.flatMap(text)
    })

    const costs = PRODUCT_SURFACES.map((surface) => surface.cost)

    expect(said.filter((line) => costs.includes(line))).toEqual(costs)
  })
})

/**
 * The band whose cells are not all the same width, and the copy that has to
 * know it.
 *
 * `loom.mosaic`'s `alternating` rhythm is wide, narrow, narrow, wide, and the
 * spans belong to the container — a child is never told which it landed in
 * (0062). That is the right split and it leaves the tree holding one job: a
 * wide cell is twice a narrow cell's column width, so four bodies of roughly
 * equal length render as two full cells and two cells better than a third
 * empty. The band looked exactly like that until 25 August.
 *
 * The ratio is what is held, not the wording, because copy on this page is
 * rewritten often and by whoever is nearest the sentence.
 *
 * **What it catches is drift back toward four equal paragraphs**, which is the
 * state the band was actually in — restoring all four of the bodies it shipped
 * with fails this. It is a floor and not a guarantee: shortening one wide body
 * by a little still clears 1.6, and the threshold is deliberately not tightened
 * to the current margin, because a test that fails on every ordinary edit is a
 * test people learn to change rather than to read.
 */
describe("the band that says what this is for", () => {
  const rhythm = treeFor(HOME, { origin: ORIGIN, theme: DEFAULT_THEME })
    .root.children.find(
      (child) => child.kind === "element" && child.props["eyebrow"] === BAND.problems
    )

  const cells = ((rhythm as ElementNode).children.find(
    (child) => child.kind === "element" && child.type === "loom.mosaic"
  ) as ElementNode | undefined)?.children.filter(
    (child): child is ElementNode => child.kind === "element"
  )

  it("fills its wide cells, which means writing to the rhythm", () => {
    expect(cells).toHaveLength(4)

    const lengths = (cells ?? []).map((cell) => String(cell.props["body"] ?? "").length)
    const [first, second, third, fourth] = lengths as [number, number, number, number]

    /** Wide, narrow, narrow, wide — and a wide cell is two narrow ones across. */
    for (const wide of [first, fourth]) {
      for (const narrow of [second, third]) {
        expect(wide / narrow).toBeGreaterThan(1.6)
      }
    }
  })

  /**
   * `loom.feature` caps a body at 280 characters, and writing to the rhythm
   * pushes the wide cells at it deliberately. A body over the cap is a
   * validation diagnostic rather than a thrown render, so it would reach the
   * page as a cell that quietly did not draw.
   */
  it("stays inside what the primitive accepts", () => {
    for (const cell of cells ?? []) {
      expect(String(cell.props["body"] ?? "").length).toBeLessThanOrEqual(280)
    }
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
    renderTree(await pageTreeFor(HOW_IT_WORKS, { origin: ORIGIN, theme }), { origin: ORIGIN })

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
      expect(unhonoured((await served(theme)).diagnostics)).toEqual([])
    })

    it("names no colour of its own, anywhere below the root", async () => {
      const body = belowRoot(renderToStaticMarkup((await served(theme)).element))

      expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
      expect(body).not.toMatch(/\b(rgba?|hsla?)\(/)
    })
  })
})

/**
 * Every panel of data on this site, swept as one.
 *
 * `loom.code` scrolls sideways by default, which is right for a command and
 * wrong for everything this site has ever put in one. The primitive gained
 * `wrap` on 12 September answering a finding this lane filed on the 3rd, and
 * three weeks later not one panel here set it — because nothing said it had to,
 * and a panel whose right-hand end is behind a gesture renders cleanly, emits
 * no diagnostic, measures no overflow and passes every test on this page.
 *
 * The one instrument that found it was a picture, and a picture cannot be
 * asserted. What *can* be asserted is the decision: a panel either wraps or
 * says out loud that it does not. So this is the rule written where a panel
 * added tomorrow meets it, rather than a prop nine call sites have to remember.
 *
 * It sweeps the trees the **routes** serve rather than the ones the builders
 * return, because the panels this is about are the mechanism page's, and those
 * arrive from a request made outside the builder. A sweep over `treeFor` would
 * have found one panel and reported eight-eighths green.
 */
describe("the panels that print data", () => {
  const panelsOn = async (route: SiteRoute): Promise<readonly ElementNode[]> => {
    const tree = await pageTreeFor(route, { origin: ORIGIN, theme: DEFAULT_THEME })
    const found = (node: LoomNode): readonly ElementNode[] =>
      node.kind === "text"
        ? []
        : [
            ...(node.kind === "element" && node.type === "loom.code" ? [node] : []),
            ...node.children.flatMap(found),
          ]

    return found(tree.root)
  }

  const everyPanel = async (): Promise<readonly ElementNode[]> =>
    (await Promise.all(SITE_ROUTES.map(panelsOn))).flat()

  /**
   * Counted, so that the sweep below cannot quietly stop covering anything. A
   * panel added to a page this test forgot to walk would otherwise show up as
   * the same green as a panel that wraps.
   */
  it("is every loom.code this site serves, and there are eight of them", async () => {
    expect((await everyPanel()).length).toBe(8)
  })

  /**
   * `wrap` is optional on the primitive and absent means `false`, which is the
   * right default for a library that does not know what it is holding. This
   * site does know, so absent is the one answer no panel here may give: a
   * command panel is welcome and says `wrap: false`.
   */
  it("each say whether they wrap, rather than leaving it to the default", async () => {
    for (const panel of await everyPanel()) {
      expect(typeof panel.props["wrap"]).toBe("boolean")
    }
  })

  /**
   * The premise of the rule, asserted rather than assumed. `wrap: true` is
   * right here because nothing on this site is a thing you type — the moment
   * one of these is a terminal, the answer for *that* panel changes and this
   * test is where the change gets argued.
   */
  it("hold data and not commands, which is why they wrap", async () => {
    for (const panel of await everyPanel()) {
      expect(panel.props["tone"]).not.toBe("terminal")
      expect(panel.props["wrap"]).toBe(true)
    }
  })

  /**
   * The three lines this is actually about: the only ones in the whole record
   * written in English rather than in keys and ids, and — before this — the
   * only three a reader could not finish. The threshold is well under what a
   * 1280 panel shows, so this fails when the record stops carrying a sentence,
   * not when a laptop gets wider.
   */
  it("carry the sentences the record is worth reading for", async () => {
    const text = (node: LoomNode): string =>
      node.kind === "text" ? node.value : node.children.map(text).join("\n")
    const lines = (await panelsOn(HOW_IT_WORKS)).flatMap((panel) => text(panel).split("\n"))
    const long = lines.filter((line) => line.length > 110)

    expect(long.length).toBeGreaterThan(0)
    for (const line of long) {
      expect(line).toMatch(/"(rationale|detail)":/)
    }
  })
})
