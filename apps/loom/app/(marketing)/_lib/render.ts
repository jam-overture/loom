import type { LoomTree } from "@loom/runtime"
import { renderLoomTree, type RenderOutput } from "@loom/runtime/react"

import { askById } from "./adapt/asks"
import { runAsk, type AskRun } from "./adapt/run"
import { homePageTree, type PageContext } from "./pages/home"
import { howItWorksPageTree } from "./pages/how-it-works"
import { siteRegistry, siteThemes } from "./registry"
import { HOME, HOW_IT_WORKS, type SiteRoute } from "./site"

/**
 * Route → tree → rendered page, in one place.
 *
 * Every route resolves through here, so the two things a page needs to be
 * correct — the registry that validates its props, and the theme registry that
 * resolves what its root is wearing — cannot be passed on one route and
 * forgotten on the next.
 */

export type PageBuilder = (context: PageContext) => LoomTree

export const SITE_PAGES: ReadonlyMap<string, PageBuilder> = new Map<string, PageBuilder>([
  [HOME.path, homePageTree],
  [HOW_IT_WORKS.path, howItWorksPageTree],
])

/** The page as it is written, before anything the visitor asked for. */
export const treeFor = (route: SiteRoute, context: PageContext): LoomTree => {
  const build = SITE_PAGES.get(route.path)

  if (build === undefined) {
    throw new Error(`loom: no page is built for ${route.path}`)
  }

  return build(context)
}

/**
 * The page as the visitor's ask leaves it, with the record of what happened
 * standing on it.
 *
 * **Twice, and the second time is the one you see.** A change is worked out
 * against the page it is handed, and the panel that reports the change is part
 * of that page — so the first pass runs against a page whose panel is still
 * empty, purely to find out what happens. The second runs against the page with
 * that answer already written into it, and returns *its* result. What the
 * visitor reads is therefore the record of the change that produced the exact
 * page it is sitting on, rather than a record of a slightly different page that
 * nobody ever saw.
 *
 * The two passes agree because nothing the rules weigh is a function of how big
 * the page is: breadth, removal size and depth are all counted absolutely. That
 * is a property of today's rules rather than a law, so `adapt.test.ts` holds the
 * two records against each other for every choice. A stake factor that started
 * measuring a *fraction* of the page would break this, and the test is where it
 * would be found rather than on the landing page.
 */
export const askRunFor = async (context: PageContext): Promise<AskRun | undefined> => {
  const ask = askById(context.ask)
  if (ask === undefined) return undefined

  const probe = await runAsk(treeFor(HOME, context), ask, context.approve === true)
  const staged = treeFor(HOME, { ...context, record: probe.record })

  return runAsk(staged, ask, context.approve === true)
}

export const pageTreeFor = async (route: SiteRoute, context: PageContext): Promise<LoomTree> => {
  if (route.path !== HOME.path) return treeFor(route, context)

  const run = await askRunFor(context)

  return run === undefined ? treeFor(route, context) : run.page
}

/**
 * A page, rendered.
 *
 * Separate from the route lookup so that the one page whose shape depends on
 * what the visitor asked for does not make every other page's rendering
 * asynchronous. The registry that validates the props and the theme registry
 * that resolves the root are passed here and only here, so a page cannot be
 * rendered without both.
 */
export const renderTree = (page: LoomTree): RenderOutput =>
  renderLoomTree(page, {
    resolver: siteRegistry,
    validator: siteRegistry,
    themes: siteThemes,
  })

export const renderSitePage = async (
  route: SiteRoute,
  context: PageContext
): Promise<RenderOutput> => renderTree(await pageTreeFor(route, context))
