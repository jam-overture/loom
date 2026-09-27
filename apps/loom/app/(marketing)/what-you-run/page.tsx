import { renderSitePage } from "@/app/(marketing)/_lib/render"
import { type PageSearchParams as SearchParams, routeMetadata } from "@/app/(marketing)/_lib/share"
import { readThemeName, siteOrigin, WHAT_YOU_RUN } from "@/app/(marketing)/_lib/site"
import { StructuredData } from "@/app/(marketing)/_components/structured-data"

export const generateMetadata = routeMetadata(WHAT_YOU_RUN)

/**
 * The page that says what the thing on your own machine would be.
 *
 * The palette is the only thing it reads off the address. Nothing on it is a
 * function of a request — the measurement is taken against the front door as
 * this site publishes it, with the library and the palettes it renders with — so
 * it is as cheap to serve as the rules page.
 */
const WhatYouRunPage = async ({ searchParams }: { readonly searchParams: SearchParams }) => {
  const params = await searchParams
  const rendered = await renderSitePage(WHAT_YOU_RUN, {
    origin: siteOrigin(),
    theme: readThemeName(params["theme"]),
  })

  /**
   * The graph beside the tree, which is what a crawler and an assistant read.
   *
   * A fragment rather than a wrapper, so the page's own markup is unchanged and
   * the tree is still the whole of what a visitor sees. See
   * `_components/structured-data.tsx` for why this surface renders a tag of its
   * own at all.
   */
  return (
    <>
      <StructuredData route={WHAT_YOU_RUN} origin={siteOrigin()} />
      {rendered.element}
    </>
  )
}

export default WhatYouRunPage
