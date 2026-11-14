import type { LoomTree } from "@jam-overture/loom"
import type { ServedPage } from "@jam-overture/loom/live"
import { renderLoomTree, type RenderOutput } from "@jam-overture/loom/react"

import { siteFrameOrigins } from "./frames"
import { servedPageOf, type ServedSitePage, type SiteLive } from "./live"
import { readersCountedHere } from "./readers/counting"
import { siteRegistry, siteThemes } from "./registry"
import { treeFor, type SitePageContext } from "./builders"
import { asRequested } from "./requested"

import { readerContext } from "./serving"
import { siteOrigin, type SiteRoute } from "./site"

/**
 * Route → tree → rendered page, in one place.
 *
 * Every route resolves through here, so the two things a page needs to be
 * correct — the registry that validates its props, and the theme registry that
 * resolves what its root is wearing — cannot be passed on one route and
 * forgotten on the next.
 */

/**
 * Everything a page of this site can be handed.
 *
 * One type rather than one per page, because the map below is keyed by path and
 * a builder is looked up rather than called by name. Every field past the origin
 * and the palette is optional — what the visitor asked `ASKED_ROUTE` for, and
 * the record of the run the mechanism page prints — so a page that does not read
 * a field cannot be broken by one arriving.
 *
 * It was an intersection of six context types until 26 September, one per page
 * that wanted a field of its own. Five of those pages are gone and what is left
 * is the single field the mechanism page adds.
 */
/**
 * The map and the builder lookup moved to `./builders.ts` on 12 October, and are
 * re-exported here under the names every caller already used.
 *
 * They moved to break a cycle rather than to tidy anything: `./stored.ts`
 * builds each page once to read its id off it, and `pageTreeFor` below read
 * the store through `./stored.ts` until 7 November. Two modules importing each
 * other would leave whichever loaded second holding an undefined map while it
 * initialised — a crash on the first request, in a file that is about neither
 * of them.
 */
export type { PageBuilder, SitePageContext } from "./builders"
export { SITE_PAGES, treeFor } from "./builders"

/**
 * The page as its code authors it, and nothing else: what a reader is served
 * when Loom has no live version of it (`servedPageFor` below).
 *
 * **As of 7 November the store is not read on this path**
 * ([0363](../../../../../decisions/0363-the-marketing-site-is-served-from-its-code-and-a-stored-row-is-not-a-second-version-of-it.md)).
 * From 12 October to then it served the stored row and fell back to the
 * builder when the store was slow, which made two pages one route: the row
 * `db:push` seeded once and never overwrote, and the code as it is now. Which
 * one a reader got depended on whether the database answered within 1.5
 * seconds, so the front door changed headline between two requests a minute
 * apart with nothing merged in between.
 *
 * A change accepted in the portal reaches readers through the live-page pull
 * ([0361](../../../../../decisions/0361-the-site-pulls-into-its-own-process-and-a-host-wires-the-live-page-in-two-calls.md)),
 * layered over this tree by `servedPageFor` with the built page as its
 * fallback, so the page served without it is this one by construction rather
 * than by timing.
 *
 * `asRequested` puts the reader's palette back on the root and on the site's
 * own links, which is the whole of what a request decides here.
 */
export const pageTreeFor = (route: SiteRoute, context: SitePageContext): LoomTree =>
  asRequested(treeFor(route, context), { theme: context.theme })

/**
 * The page a reader is served, with what was accepted on it in the portal
 * ([0370](../../../../../decisions/0370-loomjs-org-serves-its-live-pages-and-pulls-them-like-a-customers-site.md)).
 *
 * `pageTreeFor` with one step between the builder and the palette: the built
 * page is swapped for Loom's live version of it when this deployment pulls and
 * Loom has one, and is served as built otherwise. The palette goes on after,
 * so an accepted change is served in whichever palette the reader asked for.
 */
export const servedPageFor = async (
  route: SiteRoute,
  context: SitePageContext,
  live?: SiteLive
): Promise<ServedSitePage> => {
  const served = await servedPageOf(
    treeFor(route, context),
    /**
     * Read here rather than taken as an argument, because this is the function
     * that needs it and a context threaded through callers is a context a
     * caller can forget. It is safe outside a request — `readerContext`
     * answers the palette alone — so the one path through here is the one path
     * whether a browser is on the other end or a test is.
     *
     * **Nothing injects a context on this path and nothing should.** What a
     * reader's segment is decided from is `servedPageOf`, which takes the
     * context explicitly and is where that behaviour is stated; this is the
     * wiring between it and the request, and wiring with an override is wiring
     * that can disagree with itself.
     */
    await readerContext(context.theme),
    live
  )

  return { tree: asRequested(served.tree, { theme: context.theme }), audience: served.audience }
}

/**
 * A page, rendered.
 *
 * Separate from the route lookup so that the two pages whose shape depends on
 * what the visitor asked for do not make every other page's rendering
 * asynchronous. The registry that validates the props and the theme registry
 * that resolves the root are passed here and only here, so a page cannot be
 * rendered without both.
 *
 * **`addressed` writes each node's id and type onto the markup**, and the root's
 * tree id and revision, which are the addresses a reader signal carries (0136).
 * It is off unless this deployment is collecting, for two reasons that point the
 * same way: the attributes are bytes in every response and nothing would read
 * them, and a page carrying the addresses while nothing broadcasts is a page
 * that looks instrumented and is not. Off, the markup is byte-identical to what
 * this site served yesterday.
 *
 * **It defaults to off rather than to a lookup, as of 20 October.** It read
 * `readersCountedHere()` here until today, and that was the line the 19 October
 * finding was about: whether this deployment counts anybody is the switch *and*
 * a key it has to be given (0298), the key is a row in a table, and a row is a
 * read. A synchronous default could only ever ask the half of the question that
 * is an environment variable, which is how three pages came to ship 16 KB of
 * addresses on a deployment with nowhere to post them.
 *
 * So the question is asked once, by `renderSitePage`, which can wait for the
 * answer — and a tree rendered by anything else is not addressed, which is the
 * safe way round: an unaddressed page costs a signal nobody was listening for,
 * and an addressed one makes a claim about the deployment that `layout.tsx` may
 * be about to contradict.
 */
export type SiteRenderOptions = {
  /** Whether the markup carries the addresses a reader signal names. */
  readonly addressed?: boolean
  /**
   * The segment this page was drawn for, written on the root so the page's
   * signals are filed under it (0284).
   *
   * It is an option for `origin`'s reason rather than `addressed`'s: the caller
   * has it and this function cannot look it up. Which segment a reader is in is
   * decided while the page is being *composed* — `servedPageOf` answers it out
   * of the rules and the reader's context — so by the time there is a tree to
   * render the answer already exists and asking again would be asking a second
   * time with less to go on.
   *
   * **Absent is the honest default and the safe one.** A tree rendered by
   * anything but `renderSitePage` was not composed for a reader, so it names no
   * segment; the framework drops `aud_everyone` to `undefined` itself
   * (`src/render/render.ts`), which is the same answer by the same reasoning.
   * An unsegmented page costs a figure nobody was comparing, and a page
   * labelled with a segment it was not drawn for makes every comparison
   * between two segments wrong.
   */
  readonly audience?: ServedPage["audience"]
  /**
   * The origin this page is being served from, which is the one origin it
   * frames.
   *
   * It is here rather than read from the environment inside because the caller
   * has it: a deployment answers on several hosts, `serving.ts` knows which one
   * this request arrived at, and `siteOrigin()` knows only what the environment
   * was configured with. A render that consulted the environment for the
   * allowlist while the request came in somewhere else would refuse the site's
   * own frame and tell the reader the content cannot be shown.
   *
   * **It used to come off the page context, and that was the last thing the
   * context carried that the address did not say.** The reason given here was
   * that *"the tree already carries absolute URLs built from the origin its
   * builder was given"*, which stopped being true on 12 October when every link
   * in a tree became a path (0259) — except one control on `/how-it-works`,
   * which was a link to the address it was drawn on. That control is gone, so
   * no builder needs an origin and none is handed one; the only thing left that
   * an origin decides is this, and this is a render option. `counting` made the
   * same move on 21 October for the same reason.
   */
  readonly origin?: string
}

export const renderTree = (page: LoomTree, options: SiteRenderOptions = {}): RenderOutput => {
  const origins = siteFrameOrigins(options.origin ?? siteOrigin())
  const { audience } = options

  return renderLoomTree(page, {
    resolver: siteRegistry,
    validator: siteRegistry,
    themes: siteThemes,
    addressed: options.addressed ?? false,
    /**
     * Omitted rather than passed as `undefined`, for the reason given below
     * about `origins`: the seam has always been handed this object shape by a
     * deployment serving every reader the base, and a key holding `undefined`
     * is a different object that happens to behave the same.
     */
    ...(audience === undefined ? {} : { audience }),
    /**
     * Omitted rather than passed as `undefined` when the origin could not be
     * registered, so a render with no allowlist is the same object shape the
     * seam has always been handed by a deployment that frames nothing.
     */
    ...(origins === undefined ? {} : { origins }),
  })
}

/**
 * The page, and whether its markup carries the addresses a reader signal names.
 *
 * **This is the only place the question is asked on a render path**, and it is
 * asked once per request rather than once per tree. `renderTree` above takes
 * the answer; it does not look it up, because looking it up means reading a
 * row.
 *
 * **It is asked of the deployment and never of the page, as of 21 October.**
 * The answer used to travel as `counting` on the page context: the tree was
 * built with it, `home.ts` handed it to a `ChromeContext`, and nothing read it
 * at the other end — a setting threaded through three types for a footer line
 * that came off the site on 12 October. What it decides is which attributes
 * the renderer writes, so it belongs where the renderer's other options are.
 *
 * `addressed` is for a caller that already knows — the tests that render both
 * halves without an environment variable and a key table, and anything that
 * has asked `readerSignalUrl` for the same answer. Given one, this asks the
 * deployment nothing, which is the behaviour `counting.test.ts` counts the
 * reads for.
 */
export const renderSitePage = async (
  route: SiteRoute,
  context: SitePageContext,
  options: SiteRenderOptions = {},
  live?: SiteLive
): Promise<RenderOutput> => {
  const [served, addressed] = await Promise.all([
    servedPageFor(route, context, live),
    options.addressed ?? readersCountedHere(),
  ])

  const audience = options.audience ?? served.audience

  return renderTree(served.tree, {
    addressed,
    /**
     * The segment the page was composed for, unless the caller named one. The
     * override is for the same readers `addressed`' is: a test that renders
     * both halves without a deployment to compose against.
     */
    ...(audience === undefined ? {} : { audience }),
    /**
     * Omitted rather than passed as `undefined`, so a caller that does not know
     * which host it is answering on gets `renderTree`'s own fallback to the
     * configured origin rather than an explicit nothing. It read
     * `context.origin` until today; see `SiteRenderOptions.origin`.
     */
    ...(options.origin === undefined ? {} : { origin: options.origin }),
  })
}
