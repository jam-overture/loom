import type { LoomTree } from "@jam-overture/loom"

import type { AddressedState } from "./addressed"

import { homePageTree } from "./pages/home"
import { whatYouRunPageTree } from "./pages/what-you-run"
import { whyUseItPageTree } from "./pages/why-use-it"
import { HOME, WHAT_YOU_RUN, WHY_USE_IT, type SiteRoute } from "./site"

/**
 * Which builder makes which page, and nothing else.
 *
 * ## Why it is not in `render.ts`, and not called `pages.ts`
 *
 * Split out on 12 October so that `./stored.ts` can build a page to read its id
 * without importing the module that reads the store. `render.ts` imports
 * `./stored.ts`; if `./stored.ts` imported `render.ts` back, whichever loaded
 * second would see an undefined map while initialising — a crash on the first
 * request, in a file that is about neither of them.
 *
 * `builders.ts` rather than `pages.ts` because `./pages` is already a
 * **directory** here. A module beside a directory of the same name resolves to
 * the directory, so the import silently fails to find the file and every type
 * that came through it degrades to `any` — which surfaced as four implicit-any
 * errors in two test files that have nothing to do with any of this.
 *
 * `render.ts` re-exports all three names, so nothing that used them moved.
 */
/**
 * What a page builder is handed.
 *
 * It was `MechanismContext` — the demonstration page's own context, carrying
 * the four parameters that named a change in progress — because that page had
 * the widest context and every other builder took a subset of it. With the
 * demonstration removed
 * ([0328](../../../../../decisions/0328-the-marketing-site-has-no-demonstration-and-no-mechanism-page.md))
 * there is one field left and no page needs more, so this is the address
 * itself rather than an alias for whichever page happened to read the most of
 * it.
 */
export type SitePageContext = AddressedState

export type PageBuilder = (context: SitePageContext) => LoomTree

export const SITE_PAGES: ReadonlyMap<string, PageBuilder> = new Map<string, PageBuilder>([
  [HOME.path, homePageTree],
  [WHAT_YOU_RUN.path, whatYouRunPageTree],
  [WHY_USE_IT.path, whyUseItPageTree],
])

/** The page as it is written, before anything the visitor asked for. */
export const treeFor = (route: SiteRoute, context: SitePageContext): LoomTree => {
  const build = SITE_PAGES.get(route.path)

  if (build === undefined) {
    throw new Error(`loom: no page is built for ${route.path}`)
  }

  return build(context)
}
