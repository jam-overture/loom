import type { LoomTree } from "@jam-overture/loom"
import { renderLoomTree, type RenderOutput } from "@jam-overture/loom/react"

import { siteFrameOrigins } from "./frames"
import { readersCountedHere } from "./readers/counting"
import { siteRegistry, siteThemes } from "./registry"
import { treeFor, type SitePageContext } from "./builders"
import { asRequested } from "./requested"
import { storedPageFor } from "./stored"

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
 * They moved to break a cycle rather than to tidy anything: `pageTreeFor` below
 * reads the store through `./stored.ts`, and `./stored.ts` builds each page
 * once to read its id off it. Two modules importing each other would leave
 * whichever loaded second holding an undefined map while it initialised — a
 * crash on the first request, in a file that is about neither of them.
 */
export type { PageBuilder, SitePageContext } from "./builders"
export { SITE_PAGES, treeFor } from "./builders"

export const pageTreeFor = async (
  route: SiteRoute,
  context: SitePageContext
): Promise<LoomTree> => {
  /**
   * **The published page comes from the store as of 12 October**
   * ([0259](../../../../../decisions/0259-a-surface-the-portal-governs-renders-from-the-store-and-a-page-built-at-render-time-is-not-one.md)
   * condition 1), and from the builder only when the store has nothing.
   *
   * The builder is the seed and the fallback, in that order. A store that has
   * not been written yet, or one that cannot be read, serves the authored page
   * rather than nothing — a site that refuses to load because a database is
   * down would be a worse product than one that serves what it was written as,
   * and the portal is where somebody finds out the store is unreachable.
   *
   * What comes back is stored **theme-free and origin-free**, because one row
   * is served from every host this deployment answers on. `asRequested` puts
   * the reader's palette back on the root and on the site's own links, which is
   * the whole of what a request decides here. `./requested.ts` has the
   * argument for where that line falls.
   *
   * **Every page of this site takes this path, as of 31 October.** One route
   * used to branch before it: the page carrying the demonstration built itself
   * twice when a visitor had asked it for something, because a panel written
   * from the record of a change just run against the page is not a thing a
   * store can hold. [0328](../../../../../decisions/0328-the-marketing-site-has-no-demonstration-and-no-mechanism-page.md)
   * removed the demonstration, so there is no page whose shape depends on
   * anything but its own stored row and the palette.
   */
  const published = (await storedPageFor(route)) ?? treeFor(route, context)

  return asRequested(published, { theme: context.theme })
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

  return renderLoomTree(page, {
    resolver: siteRegistry,
    validator: siteRegistry,
    themes: siteThemes,
    addressed: options.addressed ?? false,
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
  options: SiteRenderOptions = {}
): Promise<RenderOutput> =>
  renderTree(await pageTreeFor(route, context), {
    addressed: options.addressed ?? (await readersCountedHere()),
    /**
     * Omitted rather than passed as `undefined`, so a caller that does not know
     * which host it is answering on gets `renderTree`'s own fallback to the
     * configured origin rather than an explicit nothing. It read
     * `context.origin` until today; see `SiteRenderOptions.origin`.
     */
    ...(options.origin === undefined ? {} : { origin: options.origin }),
  })
