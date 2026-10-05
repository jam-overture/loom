import { beforeAll, describe, expect, it } from "vitest"

import { pathsLinkedFrom } from "./naming"
import { APP_ROUTES, segmentFor, servedBy, serves } from "./routes"
import { SERVED_STATE_COUNT, servedPages, type ServedPage } from "./served"
import { PRODUCT_SURFACES, SITE_ROUTES } from "./site"

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

  it("sweeps every state the site can be served in", () => {
    expect(pages).toHaveLength(SERVED_STATE_COUNT)
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
