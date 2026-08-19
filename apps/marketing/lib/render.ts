import type { LoomTree } from "@loom/runtime"
import { renderLoomTree, type RenderOutput } from "@loom/runtime/react"

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

export const treeFor = (route: SiteRoute, context: PageContext): LoomTree => {
  const build = SITE_PAGES.get(route.path)

  if (build === undefined) {
    throw new Error(`loom: no page is built for ${route.path}`)
  }

  return build(context)
}

export const renderSitePage = (route: SiteRoute, context: PageContext): RenderOutput =>
  renderLoomTree(treeFor(route, context), {
    resolver: siteRegistry,
    validator: siteRegistry,
    themes: siteThemes,
  })
