import { readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { PALETTE_SLOTS, type ElementNode, type LoomNode } from "@jam-overture/loom"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ASKS } from "../adapt/asks"
import { BAND } from "../bands"
import { PALETTE_SWITCHER_LABEL, READ_NEXT_EYEBROW } from "../chrome"
import { PLACEHOLDER_STRINGS } from "../copy"
import { unhonored } from "../frames"
import { SHORT_ANSWERS } from "./how-it-works"
import { pageTreeFor, renderTree, SITE_PAGES, treeFor } from "../render"
import {
  DEFAULT_THEME,
  DEMO,
  HOME,
  HOW_IT_WORKS,
  internalHref,
  PRODUCT_SURFACES,
  readingNeighbors,
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
 * re-theme touches nothing below the root, that no color is named anywhere in
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
    it("renders with nothing the runtime could not honor", () => {
      expect(unhonored(rendered(route, theme).diagnostics)).toEqual([])
    })

    it("resolves the theme its root names", () => {
      expect(rendered(route, theme).theme).toBeDefined()
    })

    it("mounts every palette slot on the root", () => {
      const style = rootStyle(markupOf(route, theme))

      for (const slot of PALETTE_SLOTS) expect(style).toContain(`--loom-${slot}:`)
    })

    it("names no color of its own, anywhere below the root", () => {
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
    const { before, after, onward } = readingNeighbors(route)
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

    for (const neighbor of [before, after]) {
      if (neighbor === undefined) continue

      expect(markup).toContain(`href="${internalHref(ORIGIN, neighbor.path, DEFAULT_THEME)}"`)
      expect(markup).toContain(`>${neighbor.label}<`)
    }

    /**
     * The hand-off names the surface and stops there, as of 30 September.
     *
     * It carried the surface's blurb until then and was the only card in the
     * band that carried anything — so the card beside it, holding two words,
     * was stretched to its height and photographed with the difference as empty
     * space. `chrome.ts` has the reasoning and `balance.test.ts` has the rule;
     * what is asserted here is the half that is this band's own job, which is
     * that the way onward is offered at all.
     */
    if (onward !== undefined) {
      expect(markup).toContain(`href="${surfaceHref(ORIGIN, onward)}"`)
      expect(markup).toContain(`>${onward.label}<`)
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

  /**
   * **There are none left, as of 27 September.**
   *
   * The count is asserted so that adding placeholder copy is a deliberate act
   * with a test to change, rather than something that accumulates unnoticed
   * between reviews. It went 8 → 1 on 21 August, when the maintainer took
   * pricing off the front door, and 1 → 0 today, when he settled licensing as
   * MIT — the one thing `docs/rollout.md` had as a hard gate on Phase 4.
   *
   * The mechanism stays at zero rather than being deleted with its last entry.
   * The next question this site cannot answer for itself will want it, and a
   * site that has forgotten how to mark an unanswered question is a site that
   * answers one quietly instead.
   */
  it("is down to nothing, now that licensing is settled", () => {
    expect(PLACEHOLDER_STRINGS).toHaveLength(0)
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
  /**
   * **The demonstration is a link now, not a band.**
   *
   * Three assertions stood here until 1 October: that the band which
   * demonstrates offered a fragment link onward, that something on the page
   * held that anchor, and that the band below framed `/demo` rather than
   * pointing at it — §4d's *embeds the demonstration rather than describing
   * it*, which was the reason the demonstration is public at all (0056).
   *
   * The maintainer removed the frame: *"get rid of the demo injected into the
   * main landing page. If people want to get to the demo, they can click the
   * demo link."* So what replaces them is the property that instruction
   * actually asks for — **the demonstration is still one click from the front
   * door** — which is the thing that would quietly stop being true if the link
   * went the way the frame did.
   *
   * It is deliberately not pinned to a band. The bar, the footer's map, the
   * band of ways in and this band all offer it, and a test naming one of them
   * would fail the day the page is rearranged while a reader could still get
   * there perfectly well.
   */
  it("still offers the demonstration, from somewhere on the front door", () => {
    const tree = treeFor(HOME, { origin: ORIGIN, theme: DEFAULT_THEME })

    expect(hrefsIn(tree.root)).toContain(DEMO_HREF)
  })

  it("frames nothing, now that the demonstration is a link", () => {
    const tree = treeFor(HOME, { origin: ORIGIN, theme: DEFAULT_THEME })

    expect(bandWith(tree.root, (found) => found.type === "loom.embed")).toHaveLength(0)
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
 * The mechanism page's bands, held against the page the route serves.
 *
 * This block used to assert the raw record panel — seven `loom.code` panels and
 * the treeId of the front door printed inside one of them. The maintainer
 * retired that panel on 26 September: 341 lines of JSON on the first page of the
 * reading order, in a vocabulary a visitor does not have.
 *
 * What the block protected is still worth protecting and is not about the
 * panel: **a page whose central bands quietly vanish when a caller forgets
 * something is the failure mode this site keeps finding, and it is silent every
 * time.** So the same question is asked of the page as it is now — the four
 * short answers that replaced four pages, each of which is the whole of what
 * this site says about its subject.
 */
describe("the mechanism page's short answers", () => {
  const served = async (theme: SiteThemeName) =>
    renderTree(await pageTreeFor(HOW_IT_WORKS, { origin: ORIGIN, theme }), { origin: ORIGIN })

  const eyebrowsOf = async (): Promise<readonly string[]> => {
    const tree = await pageTreeFor(HOW_IT_WORKS, { origin: ORIGIN, theme: DEFAULT_THEME })

    return tree.root.children.flatMap((child) =>
      child.kind === "element" && typeof child.props["eyebrow"] === "string"
        ? [child.props["eyebrow"]]
        : []
    )
  }

  it("carries every answer that replaced a page", async () => {
    const eyebrows = await eyebrowsOf()

    for (const answer of SHORT_ANSWERS) {
      expect({ eyebrow: answer.eyebrow, onThePage: eyebrows.includes(answer.eyebrow) }).toEqual({
        eyebrow: answer.eyebrow,
        onThePage: true,
      })
    }
  })

  /**
   * The length rule, which is the maintainer's instruction made checkable.
   *
   * Each of these bands replaced a page of between 951 and 1,382 words. The
   * thing that would undo the day's work is not a band disappearing — it is a
   * band growing a third paragraph, then a fourth, until the page is the four
   * pages again with different headings. A band is one answer and one example.
   */
  it.each(SHORT_ANSWERS)("keeps $eyebrow to one answer and one example", (answer) => {
    expect(answer.body.split(/\s+/).length).toBeLessThanOrEqual(60)
    expect(answer.example.split(/\s+/).length).toBeLessThanOrEqual(30)
  })

  describe.each(THEMES)("wearing %s", (theme) => {
    it("renders with nothing the runtime could not honor", async () => {
      expect(unhonored((await served(theme)).diagnostics)).toEqual([])
    })

    it("names no color of its own, anywhere below the root", async () => {
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
 * **This site now serves none of them**, and that is the 26 September cut
 * rather than a regression: seven were the mechanism page's raw record and the
 * eighth was the front door's *how this page is put together* band, and the
 * maintainer's direction retired the lot. The rule is kept rather than deleted
 * with them, written so it holds whatever the count is — vacuous today, and
 * waiting for the day somebody adds a panel back.
 */
describe("the panels that print data", () => {
  const everyPanel = async (): Promise<readonly ElementNode[]> => {
    const found = (node: LoomNode): readonly ElementNode[] =>
      node.kind === "text"
        ? []
        : [
            ...(node.kind === "element" && node.type === "loom.code" ? [node] : []),
            ...node.children.flatMap(found),
          ]

    const trees = await Promise.all(
      SITE_ROUTES.map((route) => pageTreeFor(route, { origin: ORIGIN, theme: DEFAULT_THEME }))
    )

    return trees.flatMap((tree) => found(tree.root))
  }

  /**
   * Pinned so the sweep cannot quietly stop covering anything. A panel added to
   * a page this test forgot to walk would otherwise read as the same green as a
   * panel that wraps — which is exactly how the eight went unset for three
   * weeks.
   */
  it("is none of them today, counted rather than assumed", async () => {
    expect((await everyPanel()).length).toBe(0)
  })

  /**
   * `wrap` is optional on the primitive and absent means `false`, which is right
   * for a library that does not know what it is holding. This site does know: it
   * has never printed a command. So a panel here either wraps or says out loud
   * that it does not, and the day one arrives without an answer this fails.
   */
  it("each say whether they wrap, rather than leaving it to the default", async () => {
    for (const panel of await everyPanel()) {
      expect(typeof panel.props["wrap"]).toBe("boolean")
    }
  })
})

/**
 * The plate the house theme cannot draw, held against every band of the site.
 *
 * `loom.section`'s `surface` tone is a fill and a radius and `space(5)` of
 * inline padding, and **no border** — where `loom.card`'s tone of the same name
 * is the same fill plus `1px solid border-subtle`. `minimal` sets `bg-surface`
 * to its own `bg-canvas` deliberately, so that a component there is defined by
 * its outline; a card collects on that and a section does not. What a reader on
 * the house theme gets from `tone: "surface"` is therefore an inset with no edge
 * around it, and six bands were stepped in from the left rule the rest of the
 * site sits on.
 *
 * The full reasoning, with the measurement and both palettes, is on `section` in
 * `nodes.ts`. This is the guard, and it is worth having rather than trusting the
 * six call sites because the tone is the obvious thing to reach for the next
 * time a band wants to look like a region — it is named for exactly that, it is
 * correct on two of the three palettes, and the one it is wrong on is the one
 * nobody re-photographs after a copy change.
 *
 * **Reversing it is meant to be cheap.** The finding of 28 September asks
 * `Loom primitives` for the outline; the day it lands this test is what should
 * fail, and the bands that are genuinely a different kind of thing — the front
 * door's figures, its four ways on, and the stage the demonstration runs in —
 * are the ones to give it back to first.
 */
describe("the bands, and the plate the house palette draws as padding", () => {
  const everySection = async (): Promise<readonly ElementNode[]> => {
    const found = (node: LoomNode): readonly ElementNode[] =>
      node.kind === "text"
        ? []
        : [
            ...(node.kind === "element" && node.type === "loom.section" ? [node] : []),
            ...node.children.flatMap(found),
          ]

    const trees = await Promise.all(
      SITE_ROUTES.map((route) => pageTreeFor(route, { origin: ORIGIN, theme: DEFAULT_THEME }))
    )

    return trees.flatMap((tree) => found(tree.root))
  }

  /**
   * Counted rather than assumed, for the reason the panel sweep above is: a
   * sweep that silently walks nothing passes forever. Held as a floor rather
   * than an exact number so that adding a band to a page is not a test edit.
   */
  it("walks every band on the site", async () => {
    expect((await everySection()).length).toBeGreaterThanOrEqual(12)
  })

  it("asks none of them for a tone the house palette renders as bare padding", async () => {
    const plated = (await everySection()).filter((band) => band.props["tone"] === "surface")

    expect(plated.map((band) => band.props["eyebrow"])).toEqual([])
  })
})
