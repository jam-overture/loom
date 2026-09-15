import { renderSitePage } from "@/app/(marketing)/_lib/render"
import { type PageSearchParams as SearchParams, routeMetadata } from "@/app/(marketing)/_lib/share"
import { readThemeName, siteOrigin, THE_RULES } from "@/app/(marketing)/_lib/site"

export const generateMetadata = routeMetadata(THE_RULES)

/**
 * The rules page: what a rule is, what this site's own rules say, and two
 * requests a reader can watch run into them.
 *
 * The palette is the only thing it reads off the address. Nothing on it is a
 * function of a request — the numbers come off the rules the site is served
 * with, and the two demonstrations are links to the front door rather than runs
 * made here — so it is the cheapest page on the site to serve.
 */
const TheRulesPage = async ({ searchParams }: { readonly searchParams: SearchParams }) => {
  const params = await searchParams
  const rendered = await renderSitePage(THE_RULES, {
    origin: siteOrigin(),
    theme: readThemeName(params["theme"]),
  })

  return rendered.element
}

export default TheRulesPage
