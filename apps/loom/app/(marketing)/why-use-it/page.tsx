import { askedFor } from "@/app/(marketing)/_lib/addressed"
import { renderSitePage } from "@/app/(marketing)/_lib/render"
import { servedOrigin } from "@/app/(marketing)/_lib/serving"
import { type PageSearchParams as SearchParams, routeMetadata } from "@/app/(marketing)/_lib/share"
import { siteOrigin, WHY_USE_IT } from "@/app/(marketing)/_lib/site"
import { BrowserBar } from "@/app/(marketing)/_components/browser-bar"
import { StructuredData } from "@/app/(marketing)/_components/structured-data"

/**
 * Served per request, because the page is a stored tree the portal governs
 * (0259). Prerendering it would read the row once at build time and serve that
 * copy until the next deployment.
 *
 * Until 1 November nothing declared this: the palette's `searchParams` read
 * here and in `generateMetadata` was the whole of why Next.js served it on
 * demand, and removing both turns the route `○` with no test going red.
 * `_lib/governed.ts` has the measurement and the argument; 0331 records it.
 */
export const dynamic = "force-dynamic"

export const generateMetadata = routeMetadata(WHY_USE_IT)

/**
 * The page that says why you would reach for Loom rather than write the same
 * thing yourself.
 *
 * It reads the whole address through the same reader as the other three, and
 * the palette is the only thing on it an address changes: nothing on this page
 * is a function of a request, so what comes back for the rest of an address is
 * inert and this page is as cheap to serve as `/what-you-run`. What that buys
 * is in `_lib/addressed.ts` — no page of this site decides for itself which
 * half of an address is worth reading, which is the decision that went stale
 * when a band moved.
 */
const WhyUseItPage = async ({ searchParams }: { readonly searchParams: SearchParams }) => {
  const rendered = await renderSitePage(WHY_USE_IT, askedFor(await searchParams), {
    origin: await servedOrigin(),
  })

  return (
    <>
      <StructuredData route={WHY_USE_IT} origin={siteOrigin()} />
      <BrowserBar theme={rendered.theme} />
      {rendered.element}
    </>
  )
}

export default WhyUseItPage
