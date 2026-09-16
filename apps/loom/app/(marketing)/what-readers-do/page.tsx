import { renderSitePage } from "@/app/(marketing)/_lib/render"
import { type PageSearchParams as SearchParams, routeMetadata } from "@/app/(marketing)/_lib/share"
import { readThemeName, siteOrigin, WHAT_READERS_DO } from "@/app/(marketing)/_lib/site"

export const generateMetadata = routeMetadata(WHAT_READERS_DO)

/**
 * The readers page: what Loom counts about the people reading a page, what it
 * refuses to know about them, and twelve scripted visits put through the real
 * arithmetic.
 *
 * The palette is the only thing it reads off the address. Nothing on it is a
 * function of a request — the bars are folded from visits written down in the
 * page's own module, so they are the same on every load — which makes it as
 * cheap to serve as the rules page.
 */
const WhatReadersDoPage = async ({ searchParams }: { readonly searchParams: SearchParams }) => {
  const params = await searchParams
  const rendered = await renderSitePage(WHAT_READERS_DO, {
    origin: siteOrigin(),
    theme: readThemeName(params["theme"]),
  })

  return rendered.element
}

export default WhatReadersDoPage
