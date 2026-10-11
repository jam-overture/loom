import type { ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeAll, describe, expect, it, vi } from "vitest"

import { askedFor, type AddressParams } from "./addressed"
import { renderSitePage } from "./render"
import { ASK_STATES } from "./served"
import {
  ADDRESS_PARAMS,
  askHref,
  DEFAULT_THEME,
  HOME,
  HOW_IT_WORKS,
  SITE_ROUTES,
  SITE_THEME_NAMES,
  siteOrigin,
  WHAT_YOU_RUN,
  type AskedFor,
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
 * `servedOrigin` reads the forwarded host, so a preview deployment frames itself
 * rather than production, and `next/headers` throws outside a request. It is
 * stubbed empty below, which is a case the function already answers: it falls
 * back to `siteOrigin()`, and that is the origin everything here compares
 * against. A route cannot be asked what it reads without being called, and this
 * is the whole of what calling one needs.
 */

vi.mock("next/headers", () => ({ headers: async () => new Headers() }))

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
  "/how-it-works": () => import("../how-it-works/page"),
  "/what-you-run": () => import("../what-you-run/page"),
}

const ORIGIN = siteOrigin()

/** An address, as the parameters a route is handed. */
const paramsOf = (href: string): AddressParams =>
  Object.fromEntries(new URL(href).searchParams.entries())

/** A state as the query string a visitor would see, which is this file's label for one. */
const queryOf = (state: AskedFor): string => new URL(askHref(ORIGIN, state)).search.slice(1)

/** The address of a state, and the parameters it arrives as. */
const addressOf = (state: AskedFor): AddressParams => paramsOf(askHref(ORIGIN, state))

/**
 * The two tags a route sends beside the tree, taken back off.
 *
 * Neither draws anything a visitor sees — one is the graph a crawler reads and
 * the other is the colour of the strip of browser above the page — and React
 * hoists them *between* the library's stylesheet and the page, so what is left
 * after removing them is exactly the markup the library produced. Written as
 * the two literals rather than built from the components' own constants, which
 * keeps this from being a comparison of a name against itself.
 */
const withoutTheTagsBeside = (markup: string): string =>
  markup
    .replace(/<meta name="theme-color"[^>]*\/>/, "")
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, "")

/** What a route serves for an address, as the markup a visitor is sent. */
const servedFor = async (route: SiteRoute, params: AddressParams): Promise<string> => {
  const module = await PAGE_MODULES[route.path]!()

  return renderToStaticMarkup(await module.default({ searchParams: Promise.resolve(params) }))
}

/** And what this lane's own library says that address should produce. */
const libraryFor = async (route: SiteRoute, params: AddressParams): Promise<string> => {
  const rendered = await renderSitePage(route, { origin: ORIGIN, ...askedFor(params) })

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
const WRITTEN: readonly AskedFor[] = SITE_THEME_NAMES.flatMap((theme) =>
  ASK_STATES.map((state) => ({ theme, ...state }))
)

/**
 * And the ones a page is actually rendered for, which is one palette's worth.
 *
 * A palette is a colour and a typeface; what an address *says* is the other four
 * parameters, and every one of them is in here. Sweeping three palettes as well
 * would triple the slowest assertions in this route group to re-ask a question
 * `browser-bar.test.ts` and the register sweep already ask per palette.
 */
const SERVED: readonly AskedFor[] = ASK_STATES.map((state) => ({
  theme: DEFAULT_THEME,
  ...state,
}))

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
  it("are these five and no others", () => {
    expect(Object.values(ADDRESS_PARAMS).sort()).toEqual([
      "approve",
      "ask",
      "back",
      "back-yes",
      "theme",
    ])
  })
})

describe("an address written and read back", () => {
  it.each(WRITTEN.map((state) => [queryOf(state), askHref(ORIGIN, state)] as const))(
    "?%s",
    (_query, href) => {
    /**
     * Compared as an address rather than as an object, which is the one form
     * with no normalisation in it: `askedHref` leaves a `false` out and the
     * reader hands one back, so comparing the two states needs a rule about
     * which absences count — and a rule like that is where a parameter goes
     * missing.
     */
      expect(askHref(ORIGIN, askedFor(paramsOf(href)))).toBe(href)
    }
  )

  /**
   * There is nothing to approve, to reverse, or to approve the reversal of until
   * a visitor has asked for something, so an address saying only *put it back*
   * says nothing.
   */
  it("drops the three answers from an address that asked for nothing", () => {
    expect(askedFor({ back: "1", "back-yes": "1", approve: "1" })).toEqual({
      theme: DEFAULT_THEME,
    })
  })

  /** A mangled address is a page, which is the rule every route used to state for itself. */
  it.each([
    ["an unknown palette", { theme: "nonsense" }],
    ["an unknown request", { ask: "nonsense" }],
    ["a yes that is not one", { ask: "shorter", approve: "yes" }],
  ])("reads %s as the default", (_what, params) => {
    expect(askedFor(params).theme).toBe(DEFAULT_THEME)
    expect(askedFor(params).approve ?? false).toBe(false)
  })

  /**
   * A query string may carry one parameter twice, because a link is built from a
   * link built from a link. The first value counts, which is `readThemeName`'s
   * rule and `readAskId`'s, and is now the three answers' as well.
   */
  it("takes the first of a repeated answer, as the other two readers do", () => {
    expect(askedFor({ ask: ["shorter", "calmer"], approve: ["1", "0"] })).toEqual({
      theme: DEFAULT_THEME,
      ask: "shorter",
      approve: true,
      back: false,
      backApprove: false,
    })
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
 * The defect itself, as the assertion that would have gone red on 1 October.
 *
 * The sweep above would also have caught it, and this is here because a sweep
 * going red says *a page and a library disagree* where these three say what a
 * visitor lost. `shorter` is the request whose change the rules hold, so this
 * address is the whole sequence: ask for it, say yes, put it back.
 */
describe("put it back, on the page that carries the button", () => {
  const asked: AskedFor = { theme: DEFAULT_THEME, ask: "shorter", approve: true }
  const UNDO_ENTRY = "And what it wrote down when you put it back"
  let before = ""
  let after = ""

  beforeAll(async () => {
    before = await servedFor(HOW_IT_WORKS, addressOf(asked))
    after = await servedFor(HOW_IT_WORKS, addressOf({ ...asked, back: true }))
  })

  it("changes the page, which is what the eight days did not", () => {
    expect(after).not.toBe(before)
  })

  it("adds the undo's own entry to the record beside it", () => {
    expect(before).not.toContain(UNDO_ENTRY)
    expect(after).toContain(UNDO_ENTRY)
  })

  /**
   * The sentence the whole band is arguing towards, and nothing could reach it.
   * `RESTORED` in `pages/see-it-happen.ts` is the claim that an undo carries the
   * pieces back rather than rebuilding them, and it is printed only under a
   * record of a change that was put back.
   */
  it("prints the restoration, which no address could reach", () => {
    expect(before).not.toContain("Nothing here was rebuilt")
    expect(after).toContain("Nothing here was rebuilt")
  })
})

/**
 * The two pages with no band on them, which is the half of this that is a
 * judgement rather than a defect.
 *
 * They read the whole address and serve the same page either way. That is worth
 * having and worth measuring: a route reading a parameter it has no use for
 * costs nothing, and *which half of an address is worth reading* is precisely
 * the decision that went stale when the band moved. These two assertions are
 * also the measurement that says the front door is now one of them — until
 * 1 October it was the page a request rearranged, and it still reads a request
 * and still announces one in its card.
 */
describe("the pages with nothing to rearrange", () => {
  const asked: AskedFor = { theme: DEFAULT_THEME, ask: "shorter", approve: true, back: true }

  it.each([HOME, WHAT_YOU_RUN])("$path serves the same page, asked or not", async (route) => {
    expect(await servedFor(route, addressOf(asked))).toBe(
      await servedFor(route, addressOf({ theme: DEFAULT_THEME }))
    )
  })

  /** And the page that does carry it is not one of them, which is what makes the pair a measurement. */
  it("is a pair, because the mechanism page is a function of its address", async () => {
    expect(await servedFor(HOW_IT_WORKS, addressOf(asked))).not.toBe(
      await servedFor(HOW_IT_WORKS, addressOf({ theme: DEFAULT_THEME }))
    )
  })
})
