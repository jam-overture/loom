import type { LoomTree } from "@loom/runtime"
import { renderLoomTree, type RenderOutput } from "@loom/runtime/react"

import { askById } from "./adapt/asks"
import { runHistory, type ChangeHistory } from "./adapt/history"
import { runAsk, type AskRun } from "./adapt/run"
import { homePageTree } from "./pages/home"
import { howItWorksPageTree } from "./pages/how-it-works"
import { theRecordPageTree, type RecordContext } from "./pages/the-record"
import { siteRegistry, siteThemes } from "./registry"
import { HOME, HOW_IT_WORKS, THE_RECORD, type SiteRoute } from "./site"

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
 * and the palette is optional and belongs to one page — what the visitor asked
 * the front door for, and the run of changes the record page is reporting on —
 * so a page that does not read a field cannot be broken by one arriving.
 */
export type SitePageContext = RecordContext

export type PageBuilder = (context: SitePageContext) => LoomTree

export const SITE_PAGES: ReadonlyMap<string, PageBuilder> = new Map<string, PageBuilder>([
  [HOME.path, homePageTree],
  [HOW_IT_WORKS.path, howItWorksPageTree],
  [THE_RECORD.path, theRecordPageTree],
])

/** The page as it is written, before anything the visitor asked for. */
export const treeFor = (route: SiteRoute, context: SitePageContext): LoomTree => {
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
export const askRunFor = async (context: SitePageContext): Promise<AskRun | undefined> => {
  const ask = askById(context.ask)
  if (ask === undefined) return undefined

  const probe = await runAsk(treeFor(HOME, context), ask, context.approve === true)
  const staged = treeFor(HOME, { ...context, record: probe.record })

  return runAsk(staged, ask, context.approve === true)
}

/**
 * The run of changes the record page is reporting on, replayed from the front
 * door as it is published.
 *
 * The record page is *about* the front door, so the sequence starts from the
 * page this site publishes rather than from anything the record page contains.
 * Nothing is kept between requests: a history is a list in the address, run
 * again from scratch every time it is read (0081), which is what lets one be
 * sent to somebody else.
 */
export const historyFor = async (context: SitePageContext): Promise<ChangeHistory | undefined> => {
  const tokens = context.changes ?? []

  if (tokens.length === 0) return undefined

  return runHistory(treeFor(HOME, { origin: context.origin, theme: context.theme }), tokens)
}

export const pageTreeFor = async (
  route: SiteRoute,
  context: SitePageContext
): Promise<LoomTree> => {
  if (route.path === HOME.path) {
    const run = await askRunFor(context)

    return run === undefined ? treeFor(route, context) : run.page
  }

  if (route.path === THE_RECORD.path) {
    const history = await historyFor(context)

    return history === undefined ? treeFor(route, context) : treeFor(route, { ...context, history })
  }

  return treeFor(route, context)
}

/**
 * A page, rendered.
 *
 * Separate from the route lookup so that the two pages whose shape depends on
 * what the visitor asked for do not make every other page's rendering
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
  context: SitePageContext
): Promise<RenderOutput> => renderTree(await pageTreeFor(route, context))
