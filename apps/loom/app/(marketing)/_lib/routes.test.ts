import type { LoomNode } from "@jam-overture/loom"
import { beforeAll, describe, expect, it } from "vitest"

import { askedFor } from "./addressed"
import { linksIn, pathsLinkedFrom } from "./naming"
import { APP_ROUTES, segmentFor, servedBy, serves } from "./routes"
import { SERVED_STATE_COUNT, servedPages, sweepCover, type ServedPage } from "./served"
import { PAGES_AT_LEAST, PRODUCT_SURFACES, SITE_PATHS, SITE_ROUTES } from "./site"

/**
 * Every address this site sends a visitor to, held to an address this
 * application serves.
 *
 * The module says why it exists: `anchors.test.ts` left every off-page link
 * unheld on the stated grounds that *"a path that has gone wrong announces
 * itself: the route is missing, the build says so"*, and nothing in a Next
 * build reads an `href`. The front door offers four cards into the rest of the
 * product, the bar offers two of them and the footer's map offers all of them,
 * and the entire basis for believing any of those paths is the list in
 * `site.ts` that declares them — which is the same list the only existing test
 * compares them against.
 *
 * It is the September failure one lane boundary out. A sentence naming a page
 * that had moved was wrong for a day and `naming.ts` now catches it; a *link*
 * into a surface that moved would be wrong until somebody pressed it, and
 * pressing it is the thing a visitor does on the way into the product rather
 * than on the way out.
 *
 * ## The two directions, and why both are here
 *
 * The sweep says **nothing this site points at is missing**. On its own that is
 * satisfied by a resolver that answers yes to everything, which is the easiest
 * thing in this file to get wrong, so the second group holds the resolver to
 * addresses this application does not have, to private folders it must not
 * expose, and to route groups it must not spell.
 *
 * ## What it does not read, stated so nobody assumes it does
 *
 * **An off-site link.** `github.com/jam-overture/loom` is not this
 * application's to serve and nothing offline can say whether it resolves.
 * `license.test.ts` holds the one off-site link that maps back to a file in
 * this repository; the rest are checked by a person.
 *
 * **A fragment.** Whether `/docs#something` lands is the documentation lane's
 * promise, for the reason `anchors.test.ts` records. This reads the path and
 * drops the hash, so a surface link is held to the page and never to the place
 * on it — the limit this lane filed on 4 October, now true of one link class
 * rather than of all of them.
 */

const ORIGIN = "https://loom.example"

/** The chrome, which every page of this site carries and no page is about. */
const CHROME_TYPES: readonly string[] = ["loom.nav", "loom.footer"]

/** A page's own bands: everything the page is, with the furniture taken off. */
const bandsOf = (page: ServedPage): readonly LoomNode[] =>
  page.tree.root.children.filter(
    (child) => child.kind !== "element" || !CHROME_TYPES.includes(child.type)
  )

/**
 * An href read as a URL, and nothing when it is a path.
 *
 * Parsed with no base on purpose. `new URL(href)` throws on anything that does
 * not name a scheme and a host, which is exactly the question the two rules
 * about absolute links are asking, and a base would answer it for them by
 * turning every path on the site into a URL.
 */
const withAHost = (href: string): URL | undefined => {
  try {
    return new URL(href)
  } catch {
    return undefined
  }
}

/** A destination, and the first state it was found in, so a failure reads. */
type Destination = {
  readonly path: string
  readonly where: string
}

/**
 * How many distinct addresses the sweep expects to read, as a floor.
 *
 * Measured at **7** on the day this was written, out of 3,633 `href` props read
 * across the 126 states — this site's three pages and the four surfaces, which
 * is the whole of where this site can send anybody inside the product. The
 * other 508 are off-site and are the limit stated above.
 *
 * The floor is under it rather than equal to it, because a band removed by one
 * of the five choices is allowed to take a destination with it, and because a
 * number pinned to the measurement is a number another lane's run would have to
 * come and change. What it exists to catch is a sweep that read nothing, which
 * is the failure that passes.
 */
const DESTINATIONS_AT_LEAST = 5

/**
 * The same floor for the application's side of it.
 *
 * 72 routes on the day this was written, which is exactly the number of rows in
 * `next build`'s own route table once its five file conventions are set aside.
 * The floor is the four surfaces' front doors and this site's three pages,
 * doubled: a reader that lost the documentation lane's `page.mdx` would still
 * clear the first number and is the mistake this catches.
 */
const ROUTES_AT_LEAST = 14

describe("the addresses this site points at", () => {
  let pages: readonly ServedPage[] = []
  let destinations: readonly Destination[] = []

  beforeAll(async () => {
    pages = await servedPages()
    destinations = [
      ...new Map(
        pages.flatMap((page) =>
          [...pathsLinkedFrom(page.tree.root, ORIGIN)].map(
            (path): readonly [string, Destination] => [
              path,
              { path, where: `${page.route.path} (${page.state})` },
            ]
          )
        )
      ).values(),
    ]
  })

  /**
   * **This was one line and the line was green on a site with no pages.**
   *
   * `SERVED_STATE_COUNT` is `SITE_ROUTES.length * ASK_STATES.length`, so an
   * empty `SITE_ROUTES` makes the sweep return nothing and the constant zero,
   * and the rule below — *sends nobody to an address this application does not
   * serve*, which is this file's whole point — passes over no addresses at all.
   * Measured on 23 October with `SITE_ROUTES` emptied: this test green, that
   * rule green, and the file red only on `DESTINATIONS_AT_LEAST` in the test
   * underneath, which is a floor on the destinations rather than on the sweep
   * and so says nothing about which pages were read.
   *
   * `PAGES_AT_LEAST` is the half nothing computes. `sweepCover` has the
   * measurement in full.
   */
  it("sweeps every state the site can be served in", () => {
    const cover = sweepCover(pages)

    expect(cover).toEqual({ states: SERVED_STATE_COUNT, routes: SITE_PATHS })
    expect(cover.routes.length).toBeGreaterThanOrEqual(PAGES_AT_LEAST)
  })

  it("reads enough of them for the rule below to mean anything", () => {
    expect(destinations.length).toBeGreaterThanOrEqual(DESTINATIONS_AT_LEAST)
  })

  /**
   * The rule. Every path a control on this site offers, in every state it can
   * be served in, resolves to a file this application serves it from.
   *
   * Swept over the states rather than over `site.ts` because the list is the
   * thing being checked: a path typed into a band, a header or a card reaches a
   * reader whether or not it was ever declared anywhere.
   */
  it("sends nobody to an address this application does not serve", () => {
    const missing = destinations
      .filter((destination) => !serves(destination.path))
      .map((destination) => `${destination.where} points at ${destination.path}, which nothing serves`)

    expect(missing).toEqual([])
  })

  /**
   * **No link in a tree of this site carries a host**, which is 0259's
   * condition made into a rule rather than a convention.
   *
   * A page of this site is a **stored row**, written once and served from every
   * host this deployment answers on, so an href with a host in it freezes
   * whichever host happened to seed it — and every preview deployment has one
   * of its own. The site's links became paths on 12 October for exactly that
   * reason, and the invariant has been held by nothing since: it was true
   * because three builders were written carefully, which is the kind of true
   * that lasts until the fourth.
   *
   * It is structural now as well as checked. No page builder is handed an
   * origin, so the shortest way to write an absolute href is to go and find
   * one. This is the other half, because a literal is still a literal.
   *
   * The rule is about **a tree**, which is why it is swept here rather than
   * asserted of `site.ts`. `internalHref` and `surfaceHref` still build
   * absolute URLs and both are still right: the canonical link, the share card,
   * the structured data and the sitemap are obliged to say which host they
   * mean. None of them is a node. `askHref`, which was the third, has no
   * callers left and is gone with the control below.
   *
   * **A link that leaves the product is absolute and has to be**, so what is
   * swept is an absolute href whose path *this application serves*. The source
   * and the decisions on GitHub, the package on npm and the license file all
   * have paths nothing here answers on, so none of them is this rule's
   * subject — and the assertion under this one is what keeps that distinction
   * from going quiet, because an off-site link with no path of its own would
   * resolve to `/`, which this application does serve.
   */
  it("writes no link with a host in it, on any page, in any state", () => {
    const absolute = pages.flatMap((page) =>
      linksIn(page.tree.root).flatMap((control) => {
        const url = withAHost(control.href)

        return url === undefined || !serves(url.pathname)
          ? []
          : [`${page.route.path} (${page.state}) carries ${control.href}`]
      })
    )

    expect(absolute).toEqual([])
  })

  /**
   * And every link that does carry a host goes somewhere with a path on it.
   *
   * The rule above reads *leaves the product* as *this application does not
   * serve that path*, which is the right reading of every off-site link this
   * site has and would be the wrong reading of one more: a link to somebody's
   * bare front page resolves to `/`, which this application serves, and would
   * be reported as a self-link to the front door. Nothing on this site offers
   * one today. This is what says so, rather than the rule above quietly
   * becoming approximate on the day something does.
   */
  it("leaves the product only for addresses with a path of their own", () => {
    const bare = pages.flatMap((page) =>
      linksIn(page.tree.root).flatMap((control) => {
        const url = withAHost(control.href)

        return url === undefined || url.pathname !== "/"
          ? []
          : [`${page.route.path} (${page.state}) leaves for ${url.href}`]
      })
    )

    expect(bare).toEqual([])
  })

  /**
   * **No control sends a reader to the address they are already at.**
   *
   * The instance this was written for is in `pages/see-it-happen.ts`, which
   * offered *See every line the machinery wrote* under every record the panel
   * printed. It was written while that band was on the front door and the
   * mechanism page printed the runtime's own lines underneath; the band moved
   * here on 1 October and the panel it pointed at had been rewritten away on
   * 26 September. Measured over these 75 states on the morning this was
   * written: **24 of them carried it.** In the 12 with no undo in the address
   * its destination resolved to the address being served, so pressing it
   * reloaded the page. In the 12 with one it was worse than a no-op: it dropped
   * `back=1`, and a reader who had just put a change back was handed the page
   * with the change still on it.
   *
   * Nothing was red, because every instrument this surface has was looking
   * somewhere else. `routes.test.ts` asked whether the address is served, and
   * it is. `docs-pages.test.ts` holds links into the documentation, and this
   * was not one. `anchors.test.ts` holds same-page fragments, and this had
   * none. A link to the page you are on is served, is not a fragment, and goes
   * nowhere.
   *
   * **It is a rule about the page's own bands and not about the chrome**, and
   * the three links it would otherwise report are the argument for the line
   * falling there. Measured on the front door: the mark in the bar, the mark in
   * the footer and the palette the reader is already wearing all point at `/`.
   * None of them is a defect. A brand mark goes home from every page including
   * home, a menu that dropped the page you are on would change length as you
   * walked through the site (`chrome.ts` has that argument, and `current` is
   * how the tree says it instead), and the switcher offering three palettes
   * where one of them is yours is how a reader learns there are three.
   *
   * The furniture is the same on every page by design, so *where the reader is*
   * is not a question it can answer. A band's control is about this page, which
   * is why a band is where this rule looks. `loom.nav` and `loom.footer` are
   * what it steps over, and they are the two the chrome is built from.
   *
   * The `current` mark is still honoured, because the footer's map of this site
   * sits inside `loom.footer` and the bar's menu inside `loom.nav`: both are
   * already out of the sweep, and leaving the filter in costs nothing and keeps
   * the rule true of a band that ever carries one.
   *
   * ## The one band control that is allowed to point at where you are
   *
   * **A bare request**, which is what each of the six choices is: an address
   * naming a request and answering nothing about it. The row offers all six and
   * one of them is the one you made, for the reason the menu keeps the page you
   * are on — a row that dropped the choice you had taken would be six buttons
   * one visit and five the next, and the reader would have no way back to the
   * request they are reading about.
   *
   * It is an exemption rather than a mark because **`loom.action` has no
   * `current`**. `loom.link` does, and emits `aria-current`; the choices are
   * buttons, and nothing in the tree can say which one the reader took except
   * the `primary` variant they already wear, which is a paint rather than a
   * fact. Filed for `Loom primitives`. The day it exists, this exemption is
   * deleted and the six carry the mark the menu carries.
   *
   * **What the exemption costs, stated rather than left to be found:** a lone
   * control spelled `askPath({ ask })` and nothing else reads as a choice and
   * is not reported. Measured by putting the control back, both ways: spelled
   * as it was, the rule above reports all 24 and this one reports the 6 the
   * exemption does not cover; spelled as a path, the rule above is green and
   * this one still reports those 6. Either spelling is red somewhere, and the
   * day `loom.action` can say `current` the exemption goes and so does the gap.
   */
  it("sends nobody to the address they are already reading", () => {
    /**
     * Compared as the page an address asks for, rather than as the string the
     * tree carries, and both halves of that are load-bearing.
     *
     * The instance this rule was written for was spelled absolutely while the
     * address it matched is a path, so a string comparison would have read the
     * two as different places and been green on the defect that produced it.
     * And `asRequested` puts the reader's palette onto every one of this site's
     * own links at render time, so the link a page carries has a `theme` the
     * address of the reader holding it does not — two strings, one page, and
     * again a rule that would have found nothing.
     *
     * So both sides go through `askedFor`, which is this site's one reader of
     * an address, and what is compared is what it hands back. Two addresses the
     * site reads the same way are the same page to the person pressing one.
     *
     * **A fragment is a destination and is skipped.** `#see-it-happen` is how
     * the notice at the top of the page sends a reader back to the band they
     * were in, which is the same document and a different place in it.
     * `anchors.test.ts` is what holds those.
     */
    const asPage = (href: string): string | undefined => {
      let url: URL

      try {
        url = new URL(href, `${ORIGIN}/`)
      } catch {
        return undefined
      }

      if (url.origin !== ORIGIN || url.hash !== "") return undefined

      return JSON.stringify([url.pathname, askedFor(Object.fromEntries(url.searchParams))])
    }

    /** A choice: an address that names a request and answers nothing about it. */
    const isABareRequest = (href: string): boolean => {
      let url: URL

      try {
        url = new URL(href, `${ORIGIN}/`)
      } catch {
        return false
      }

      const read = askedFor(Object.fromEntries(url.searchParams))

      return (
        read.ask !== undefined &&
        read.approve !== true &&
        read.back !== true &&
        read.backApprove !== true
      )
    }

    const circular = pages.flatMap((page) => {
      const here = asPage(page.address)

      return bandsOf(page).flatMap((band) =>
        linksIn(band)
          .filter(
            (control) =>
              !control.current &&
              !isABareRequest(control.href) &&
              here !== undefined &&
              asPage(control.href) === here
          )
          .map(
            (control) =>
              `${page.route.path} (${page.state}) offers ${control.href}, which is where the reader is`
          )
      )
    })

    expect(circular).toEqual([])
  })

  /**
   * The floor under the sweep, and it is not the same assertion.
   *
   * A surface that stopped being linked to from any band would vanish from the
   * sweep and take its own check with it — the rule above would pass over a
   * site that had quietly stopped offering the documentation at all. This asks
   * the question of the list instead, so the two fail in different ways: the
   * sweep catches a link that goes nowhere, and this catches a destination that
   * is still in the product's vocabulary after its page has gone.
   */
  it.each([...SITE_ROUTES, ...PRODUCT_SURFACES])(
    "$path is a page this application has, whether or not a band links to it today",
    ({ path }) => {
      expect({ path, servedBy: servedBy(path) }).toEqual({
        path,
        servedBy: expect.stringContaining("apps/loom/app/"),
      })
    }
  )
})

describe("the route table this check reads", () => {
  it("finds enough routes to have read the application rather than a corner of it", () => {
    expect(APP_ROUTES.length).toBeGreaterThanOrEqual(ROUTES_AT_LEAST)
  })

  /**
   * The four surfaces, each resolved to the lane that keeps it.
   *
   * It is the one assertion in this file that would have been impossible in
   * August: these were four applications until 0067, and *does the product have
   * a page at `/docs`* had no answer this repository could give.
   */
  it.each([
    ["/", "apps/loom/app/(marketing)/page.tsx"],
    ["/demo", "apps/loom/app/(demo)/demo/page.tsx"],
    ["/docs", "apps/loom/app/(docs)/docs/page.tsx"],
    ["/lessons", "apps/loom/app/(lessons)/lessons/page.tsx"],
    ["/portal", "apps/loom/app/(portal)/portal/page.tsx"],
  ])("serves %s from %s", (path, file) => {
    expect(servedBy(path)).toBe(file)
  })

  /**
   * The documentation's pages are prose files, and a reader that cannot see one
   * would report a quarter of this application as missing while passing every
   * assertion above.
   */
  it("reads a page written in the extension another lane's pages are written in", () => {
    expect(servedBy("/docs/getting-started/quickstart")).toBe(
      "apps/loom/app/(docs)/docs/getting-started/quickstart/page.mdx"
    )
  })

  /**
   * The direction that makes the sweep worth running.
   *
   * A resolver that said yes to everything would pass every rule above. Each of
   * these is a plausible address — a page renamed, a surface moved, a segment
   * too many under a route that really exists — and none of them is served.
   */
  it.each([
    "/nope",
    "/doc",
    "/docs/getting-started",
    "/docs/getting-started/quickstart/deeper",
    "/lessons/01/held",
    "/portal/sign-in/again",
  ])("does not pretend to serve %s", (path) => {
    expect({ path, serves: serves(path) }).toEqual({ path, serves: false })
  })

  /**
   * A private folder holds four surfaces' components and non-route code. Read
   * as addresses they would outnumber the real ones.
   */
  it("serves nothing out of a private folder", () => {
    const leaked = APP_ROUTES.filter((route) =>
      route.segments.some((segment) => segment.kind === "literal" && segment.value.startsWith("_"))
    ).map((route) => route.file)

    expect(leaked).toEqual([])
    expect(serves("/_lib")).toBe(false)
  })

  /** A route group contributes nothing to a URL (0067), including here. */
  it("spells no route group into an address", () => {
    const spelled = APP_ROUTES.filter((route) =>
      route.segments.some((segment) => segment.kind === "literal" && segment.value.startsWith("("))
    ).map((route) => route.file)

    expect(spelled).toEqual([])
    expect(serves("/(docs)/docs")).toBe(false)
  })

  /**
   * The refusal, which is the design and not an edge case.
   *
   * Next has conventions this application does not use yet, and each of them
   * changes what an address means. Reading `@panel` as an ordinary directory
   * would make this file report a route nobody can open — and a check that
   * invents routes cannot find the one that has gone, which is the only thing
   * it was written to do.
   */
  it.each(["@panel", "(.)docs", "(..)lessons", "[bad", "a]b"])(
    "refuses %s rather than guessing what it serves",
    (name) => {
      expect(() => segmentFor(name)).toThrow(/cannot read/)
    }
  )

  it.each([
    ["(marketing)", undefined],
    ["[lesson]", { kind: "one" }],
    ["[...rest]", { kind: "many" }],
    ["[[...rest]]", { kind: "maybe-many" }],
    ["how-it-works", { kind: "literal", value: "how-it-works" }],
    ["llms.txt", { kind: "literal", value: "llms.txt" }],
  ])("reads %s as the segment it is", (name, segment) => {
    expect(segmentFor(name)).toEqual(segment)
  })
})
