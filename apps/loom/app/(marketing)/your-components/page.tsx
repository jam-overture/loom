import { renderSitePage } from "@/app/(marketing)/_lib/render"
import { type PageSearchParams as SearchParams, routeMetadata } from "@/app/(marketing)/_lib/share"
import { readThemeName, siteOrigin, YOUR_COMPONENTS } from "@/app/(marketing)/_lib/site"

export const generateMetadata = routeMetadata(YOUR_COMPONENTS)

/**
 * The components page: what a host hands over, what this site handed over for
 * one of its own cards, and the three things no request gets past.
 *
 * The palette is the only thing it reads off the address. Nothing on it is a
 * function of a request — the specimen comes off the library the site is served
 * with, and the count in the reconciliation band is the same derived one the
 * front door prints — so it is as cheap to serve as the rules page.
 */
const YourComponentsPage = async ({ searchParams }: { readonly searchParams: SearchParams }) => {
  const params = await searchParams
  const rendered = await renderSitePage(YOUR_COMPONENTS, {
    origin: siteOrigin(),
    theme: readThemeName(params["theme"]),
  })

  return rendered.element
}

export default YourComponentsPage
