import type { LoomTree } from "@jam-overture/loom"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ANCHOR } from "./bands"
import { elementsIn } from "./measure"
import { anchorsIn as anchorsDeclaredIn } from "./naming"
import { pageTreeFor, renderTree } from "./render"
import { HOME, SITE_PATHS, SITE_ROUTES, type SiteRoute } from "./site"

/**
 * A link that stays on the page, held to the one thing that can make it fail.
 *
 * Every other control on this site is a path, and a path that has gone wrong
 * announces itself: the route is missing, the build says so, `pnpm verify` goes
 * red. **A fragment fails silently.** `#see-it-happen` pointing at a band that
 * no longer declares that anchor is a button a visitor presses and nothing
 * happens — no error, no console line, no failing test, and a page that still
 * renders perfectly. It is the one class of broken link this repository could
 * not previously have reported, and the site now has two of them.
 *
 * So the assertion is not "the anchor is declared". It is **the id is in the
 * document a browser receives**, in every state the page can be in, which is
 * the only version of the claim a visitor's press depends on.
 */

const ORIGIN = "https://loom.example"

/**
 * Every state the front door can be read in, which is what makes this a sweep
 * rather than one example.
 *
 * The notice carrying the link exists only once a visitor has asked for
 * something, and what it offers changes four times after that — the ask, the
 * yes to a hold, the undo, and the yes to a hold on the undo. A link correct on
 * arrival and dropped from the approved page would pass any test that looked at
 * one of them.
 */
/**
 * Every page of this site, which is every state one has.
 *
 * It was the mechanism page crossed with each pre-written request and each
 * answer a visitor could give it — the band's controls appear and change as a
 * change is asked for, approved and put back, so the anchors they point at had
 * to be checked in each. [0328](../../../../../decisions/0328-the-marketing-site-has-no-demonstration-and-no-mechanism-page.md)
 * removed the band, so a page has one state and the sweep is over the routes.
 */
const STATES: readonly (readonly [string, SiteRoute])[] = SITE_ROUTES.map((route) => [
  route.path,
  route,
])

const pageFor = (route: SiteRoute): LoomTree => pageTreeFor(route, { theme: "minimal" })

const markupFor = (page: LoomTree): string =>
  renderToStaticMarkup(renderTree(page, { origin: ORIGIN }).element)

/**
 * Every anchor declared in a tree, in document order and including repeats.
 *
 * The walk and the read of it both moved out on 4 October — the walk to
 * `measure.ts`, which nine test files in this route group had each written for
 * themselves, and the read to `naming.ts`, which needed the same list to check
 * that a link from one page of this site to a place on another lands on
 * something. Two readings of *where can a fragment land* would eventually
 * disagree, and the one that disagreed would be whichever was not looked at.
 */
const anchorsIn = (page: LoomTree): readonly string[] => anchorsDeclaredIn(page.root)

/**
 * Every fragment a control on this page points at, on this page.
 *
 * A fragment on another surface's address — `/docs#something` — is their page's
 * promise to keep, and a test here that checked it would be this lane asserting
 * over another lane's chrome. That is still out of scope, by the rule that put
 * the way back into a finding rather than into a commit.
 *
 * **A fragment on another page of this site is not**, and `crossPageFragments`
 * below is the sweep that says so.
 */
const resolved = (href: string): URL | undefined => {
  try {
    return new URL(href, `${ORIGIN}/`)
  } catch {
    return undefined
  }
}

const samePageFragmentsIn = (page: LoomTree, route: SiteRoute): readonly string[] =>
  elementsIn(page.root).flatMap((element) => {
    const href = element.props["href"]

    if (typeof href !== "string") return []

    const url = resolved(href)

    if (url === undefined || url.origin !== ORIGIN) return []
    if (url.pathname !== route.path) return []

    return url.hash === "" ? [] : [url.hash.slice(1)]
  })

/**
 * Every fragment a control on this page points at on **another page of this
 * site**, with the page it is aimed at.
 *
 * ## The gap this closes, and it was opened by this run
 *
 * The sweep above is same-page by a decision of 4 October, which is right about
 * another surface's anchors and was never right about this site's own. Three
 * pages that link to each other's bands are three pages this lane writes, and a
 * fragment pointing at a band on the next one is its promise in exactly the way
 * a same-page fragment is.
 *
 * What covered them until today was an accident of `chain.test.ts`: the chain
 * had destinations on two pages, so its per-destination sweep happened to
 * assert that `/what-you-run` still declared `what-we-count`. The fourth rung
 * moved to `/why-use-it` in this change and every destination is now on one
 * page — so that sweep stopped reading the other page, and the footer's link to
 * the disclosure band on every page of this site was left held by nothing.
 *
 * **A check that covers something by accident uncovers it by accident too.**
 * So the property is stated for itself, over every control rather than over the
 * chain's five, and it is the anchor half of what `routes.ts` did for paths.
 *
 * ## It resolves against the page that serves the address
 *
 * Not against a list of expected pairs. A link is a path and a fragment, and
 * the question is whether the page at that path declares that id — which is
 * answerable by rendering it, and is the same question the same-page sweep asks
 * with the path held fixed.
 */
const crossPageFragments = (
  page: LoomTree,
  route: SiteRoute
): readonly (readonly [string, string])[] =>
  elementsIn(page.root).flatMap((element) => {
    const href = element.props["href"]

    if (typeof href !== "string") return []

    const url = resolved(href)

    if (url === undefined || url.origin !== ORIGIN) return []
    if (url.pathname === route.path || url.hash === "") return []
    if (!SITE_PATHS.includes(url.pathname)) return []

    return [[url.pathname, url.hash.slice(1)] as const]
  })

describe("the anchors this site links to", () => {
  it.each(STATES)("%s renders every anchor it declares as an id", async (_name, route) => {
    const page = pageFor(route)
    const markup = markupFor(page)

    for (const anchor of anchorsIn(page)) {
      expect({ anchor, inDocument: markup.includes(`id="${anchor}"`) }).toEqual({
        anchor,
        inDocument: true,
      })
    }
  })

  /**
   * The assertion the site was missing, stated in the direction that fails.
   *
   * A link and an anchor drifting apart breaks the link, not the anchor, so the
   * useful question is asked of the link: whatever a control on this page points
   * at on this page, is it there? It fails the day a band is renamed, a band
   * stops being rendered in one of the states, or a new control is written
   * against a fragment nobody declared.
   */
  it.each(STATES)("%s can reach every fragment it points at", async (_name, route) => {
    const page = pageFor(route)
    const declared = anchorsIn(page)

    for (const fragment of samePageFragmentsIn(page, route)) {
      expect({ fragment, declared: declared.includes(fragment) }).toEqual({
        fragment,
        declared: true,
      })
    }
  })

  /**
   * Two elements answering to one name is a link that lands on whichever the
   * browser met first, which is a page-order dependency nobody writes down.
   */
  it.each(STATES)("%s answers to each of its anchors once", async (_name, route) => {
    const declared = anchorsIn(pageFor(route))

    expect(declared).toEqual([...new Set(declared)])
  })

  /**
   * The same question across this site's own pages. `crossPageFragments` above
   * carries why it exists and why it is not the chain's business.
   */
  it.each(STATES)("%s reaches every band it points at on another page", async (_name, route) => {
    const aimed = crossPageFragments(pageFor(route), route)

    for (const [path, fragment] of aimed) {
      const target = SITE_ROUTES.find((candidate) => candidate.path === path)

      if (target === undefined) throw new Error(`loom: ${route.path} points at ${path}, which is not a page of this site`)

      const declared = anchorsIn(pageFor(target))

      expect({ from: route.path, path, fragment, declared: declared.includes(fragment) }).toEqual({
        from: route.path,
        path,
        fragment,
        declared: true,
      })
    }
  })

  /**
   * And the sweep is reading something, or it would pass as three empty loops —
   * the shape `routines.md` asks a guard for, and a failure this lane has filed
   * once already.
   *
   * **A floor over the site rather than a claim about each page**, and the
   * reason is `/what-you-run` itself: the footer's link to its disclosure band
   * is a cross-page fragment from the other two pages and a *same*-page one
   * there, where the sweep above already reads it. A rule requiring one on every
   * page would be asking each page to point away from itself, which is not a
   * property this site has or wants.
   */
  it("has cross-page fragments to read", async () => {
    const aimed = STATES.map(([, route]) => crossPageFragments(pageFor(route), route))

    expect(aimed.flat().length).toBeGreaterThanOrEqual(SITE_PATHS.length - 1)
  })

  /**
   * The list in `bands.ts` is the vocabulary, so a name that has quietly left
   * the page is caught here rather than at the control pointing at it — which
   * is the same check one layer earlier, and the one that says *which* band
   * went.
   */
  it.each(Object.entries(ANCHOR) as readonly (readonly [string, string])[])(
    "%s is on the front door",
    async (_band, anchor) => {
      const declared = anchorsIn(pageFor(HOME))

      expect({ anchor, onThePage: declared.includes(anchor) }).toEqual({ anchor, onThePage: true })
    }
  )
})
