import type { ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { askedFor, type AddressedState, type AddressParams } from "./addressed"
import { renderSitePage } from "./render"
import {
  ADDRESS_PARAMS,
  DEFAULT_THEME,
  SITE_ROUTES,
  SITE_THEME_NAMES,
  type SiteRoute,
} from "./site"

/**
 * That the page a visitor is served is the page their address asked for.
 *
 * Every other test of the band that rearranges this site builds a
 * `SitePageContext` itself and asserts against the tree that comes back. That is
 * the right test of the machinery and it is blind to the one step in front of
 * it: a route turning a query string into that context. On 1 October the band
 * moved from `/` to `/how-it-works`, and two of its four parameters did not move
 * with it — so for the eight days after that, **the *Put it back* control on the
 * deployment did nothing.** The link carried `back=1`, the route never looked,
 * and the page came back identical to the page without it. Nothing was red.
 *
 * `announced.test.ts` is this file's older half, and says why it imports route
 * modules rather than the library: *"the only thing that can catch a page not
 * calling the library is a test that goes and looks at the page."* That one
 * watches `generateMetadata`, because five pages had quietly stopped drawing a
 * card for a stranger. This one watches the other export, because one page had
 * quietly stopped reading half of an address.
 *
 * ## The one thing here that is not the address
 *
 * `servedOrigin` reads the forwarded host, so a preview deployment frames
 * itself rather than production, and `next/headers` throws where there is no
 * request. **Nothing is stubbed for it.** The function answers that case for
 * itself — it falls back to `siteOrigin()`, which is the origin everything here
 * compares against — and `serving.test.ts` holds that without a mock either.
 *
 * It was stubbed here until 6 November, and the stub is why this file went red
 * on `main` on 5 November with twelve failures and green on an immediate re-run
 * of the same tree. The application suite keeps a worker warm across files
 * (`forks: { isolate: false }`, for the reason its config gives), so a mock of
 * a module an earlier file in that worker has already loaded arrives too late.
 * `announced.test.ts` imports all three page modules and stubs nothing, which
 * loads `serving.ts` holding the real `next/headers`; whichever of the two
 * files the suite happens to hand that worker first decided whether this one
 * passed. `serving.test.ts` has the reproduction and the two remedies that were
 * measured and do not hold.
 *
 * **So there is no `vi.mock` in this file, and one should not come back.** A
 * route cannot be asked what it reads without being called, and calling one now
 * needs nothing arranged at all.
 */

/** A page module of this site, of which only the body matters here. */
type PageModule = {
  readonly default: (args: {
    readonly searchParams: Promise<AddressParams>
  }) => Promise<ReactElement>
}

/**
 * Every page module, by the route it answers.
 *
 * Written out for `announced.test.ts`'s reason — a dynamic import of a computed
 * path is a glob the bundler has to guess at, and a guess that came back empty
 * would make this file pass by finding nothing — and held to `SITE_ROUTES` in
 * both directions below, so a fourth page cannot arrive without one.
 */
const PAGE_MODULES: Readonly<Record<string, () => Promise<PageModule>>> = {
  "/": () => import("../page"),
  "/what-you-run": () => import("../what-you-run/page"),
  "/why-use-it": () => import("../why-use-it/page"),
}

/** A state as the query string a visitor would see, which is this file's label for one. */
const queryOf = (state: AddressedState): string => `${ADDRESS_PARAMS.theme}=${state.theme}`

/** The address of a state, and the parameters it arrives as. */
const addressOf = (state: AddressedState): AddressParams => ({ [ADDRESS_PARAMS.theme]: state.theme })

/**
 * The three tags a route sends beside the tree, taken back off.
 *
 * None of them draws anything a visitor sees — one is the graph a crawler
 * reads, one is the colour of the strip of browser above the page, and one is
 * the rule that tells the document which way round its palette is — and React
 * hoists all three *between* the library's stylesheet and the page, so what is
 * left after removing them is exactly the markup the library produced. Written
 * as the three literals rather than built from the components' own constants,
 * which keeps this from being a comparison of a name against itself.
 *
 * The third arrived on 2 November. It is the one of the three whose *content*
 * is a palette rather than a name, which is why the pattern matches the element
 * and not what is inside it: a rule that reported the wrong palette would be
 * stripped here exactly as a correct one is, and holding it to the palette
 * served is `document-theme.test.tsx`'s whole subject.
 */
const withoutTheTagsBeside = (markup: string): string =>
  markup
    .replace(/<meta name="theme-color"[^>]*\/>/, "")
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, "")
    .replace(/<style data-precedence="default" data-href="loom-marketing-document">[\s\S]*?<\/style>/, "")

/** What a route serves for an address, as the markup a visitor is sent. */
const servedFor = async (route: SiteRoute, params: AddressParams): Promise<string> => {
  const module = await PAGE_MODULES[route.path]!()

  return renderToStaticMarkup(await module.default({ searchParams: Promise.resolve(params) }))
}

/** And what this lane's own library says that address should produce. */
const libraryFor = async (route: SiteRoute, params: AddressParams): Promise<string> => {
  const rendered = await renderSitePage(route, { ...askedFor(params) })

  return renderToStaticMarkup(rendered.element)
}

/**
 * Every address this site can write, which is every address its own links carry.
 *
 * `ASK_STATES` is the cross product `served.ts` already keeps, for its reason: a
 * sixth choice added to `asks.ts` is swept the moment it exists, and a list
 * somebody has to remember to extend is a list that describes the site of a
 * fortnight ago.
 */
/**
 * And the ones a page is actually rendered for, which is one palette's worth.
 *
 * A palette is a colour and a typeface; what an address *says* is the other four
 * parameters, and every one of them is in here. Sweeping three palettes as well
 * would triple the slowest assertions in this route group to re-ask a question
 * `browser-bar.test.ts` and the register sweep already ask per palette.
 */
/**
 * Every state a page of this site has, which is one per palette.
 *
 * It was the cross product of every pre-written request with both answers a
 * visitor could give it — 50 states a route — because the demonstration made a
 * page a function of its address
 * ([0081](../../../../../decisions/0081-the-front-door-demonstrates-statelessly-and-the-address-is-the-state.md)).
 * [0328](../../../../../decisions/0328-the-marketing-site-has-no-demonstration-and-no-mechanism-page.md)
 * removed it, and the palette is the whole of an address.
 *
 * **The check this file exists for is unchanged**, and it is the one that
 * caught a route reading two of four parameters for eight days: a route hands
 * the library the address it was given, compared as the whole page rather than
 * as a phrase looked for inside it.
 */
const SERVED: readonly AddressedState[] = SITE_THEME_NAMES.map((theme) => ({ theme }))

describe("the words an address of this site is made of", () => {
  /**
   * The spellings, written out rather than read off the record that holds them.
   *
   * `askedHref` and `askedFor` both take their names from `ADDRESS_PARAMS`, so a
   * misspelling there is a misspelling in both halves and every round trip below
   * stays green on it. That is this lane's own 8 October finding — *a test that
   * interpolates the constant it is meant to pin is green on any misspelling* —
   * so the five are typed out once, here, by hand.
   */
  it("is this one and no others", () => {
    expect(Object.values(ADDRESS_PARAMS).sort()).toEqual(["theme"])
  })
})

describe("an address read", () => {
  /** A mangled address is a page, which is the rule every route used to state for itself. */
  it.each([
    ["an unknown palette", { theme: "nonsense" }],
    ["a parameter this site no longer has", { ask: "shorter" }],
  ])("reads %s as the default", (_what, params) => {
    expect(askedFor(params)).toEqual({ theme: DEFAULT_THEME })
  })

  /**
   * A query string may carry one parameter twice, because a link is built from
   * a link built from a link. The first value counts, which is
   * `readThemeName`'s rule.
   */
  it("takes the first of a repeated palette", () => {
    expect(askedFor({ theme: ["bold", "editorial"] })).toEqual({ theme: "bold" })
  })
})

describe("this file knows about every page", () => {
  it("has a module for each of the site's routes", () => {
    expect(Object.keys(PAGE_MODULES).sort()).toEqual(SITE_ROUTES.map((route) => route.path).sort())
  })
})

describe.each(SITE_ROUTES)("$path serves what its address asked for", (route) => {
  it.each(SERVED.map((state) => [queryOf(state), state] as const))("?%s", async (_query, state) => {
    const params = addressOf(state)

    /**
     * The whole page, byte for byte, and not a phrase looked for inside it.
     * What is being asked is whether the route handed the library the address
     * it was given, and the page is the only answer that cannot be satisfied by
     * a page that is nearly right.
     */
    expect(withoutTheTagsBeside(await servedFor(route, params))).toBe(
      await libraryFor(route, params)
    )
  })
})

/**
 * **Every page of this site is now one of these**, which is the change
 * [0328](../../../../../decisions/0328-the-marketing-site-has-no-demonstration-and-no-mechanism-page.md)
 * made and the reason this describe is a sweep rather than a pair.
 *
 * It was two assertions and a measurement between them: two pages served the
 * same markup whatever an address asked for, the third did not, and the
 * contrast is what proved the third was reading its address at all. With the
 * demonstration gone there is no third, so what is left to hold is the half
 * that is still a promise to a visitor — **a parameter this site does not
 * have changes nothing**, on every page, rather than 404ing or rendering
 * differently.
 */
describe("the pages with nothing to rearrange", () => {
  it.each(SITE_ROUTES)("$path serves the same page whatever else an address carries", async (route) => {
    expect(await servedFor(route, { theme: DEFAULT_THEME, ask: "shorter", approve: "1" })).toBe(
      await servedFor(route, { theme: DEFAULT_THEME })
    )
  })
})
