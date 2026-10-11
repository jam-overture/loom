import { askedFor } from "@/app/(marketing)/_lib/addressed"
import { renderSitePage } from "@/app/(marketing)/_lib/render"
import { servedOrigin } from "@/app/(marketing)/_lib/serving"
import { type PageSearchParams as SearchParams, routeMetadata } from "@/app/(marketing)/_lib/share"
import { siteOrigin, WHAT_YOU_RUN } from "@/app/(marketing)/_lib/site"
import { BrowserBar } from "@/app/(marketing)/_components/browser-bar"
import { StructuredData } from "@/app/(marketing)/_components/structured-data"

export const generateMetadata = routeMetadata(WHAT_YOU_RUN)

/**
 * The page that says what the thing on your own machine would be.
 *
 * The palette is the only thing on it that an address changes. It still reads
 * the whole address, through the same reader as the other two: nothing on this
 * page is a function of a request, `pageTreeFor` runs one for the page carrying
 * the band and for no other, and so the rest of what comes back is inert and
 * this page is as cheap to serve as it was. What it buys is that no page of this
 * site decides for itself which half of an address is worth reading, which is
 * the decision that went stale when the band moved (`_lib/addressed.ts`).
 */
const WhatYouRunPage = async ({ searchParams }: { readonly searchParams: SearchParams }) => {
  const rendered = await renderSitePage(WHAT_YOU_RUN, {
    origin: await servedOrigin(),
    ...askedFor(await searchParams),
  })

  /**
   * The two tags beside the tree: the graph a crawler and an assistant read,
   * and the colour the strip of browser above the page is told to be.
   *
   * A fragment rather than a wrapper, so the page's own markup is unchanged and
   * the tree is still the whole of what a visitor *sees* — neither of these
   * draws anything. See `_components/structured-data.tsx` for why this surface
   * renders a tag of its own at all, and `_components/browser-bar.tsx` for the
   * one thing on this site that is allowed to name a colour, and why the page
   * rather than the layout is where it can be named.
   */
  return (
    <>
      <StructuredData route={WHAT_YOU_RUN} origin={siteOrigin()} />
      <BrowserBar theme={rendered.theme} />
      {rendered.element}
    </>
  )
}

export default WhatYouRunPage
