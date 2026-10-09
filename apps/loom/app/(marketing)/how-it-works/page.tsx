import { askedFor } from "@/app/(marketing)/_lib/addressed"
import { renderSitePage } from "@/app/(marketing)/_lib/render"
import { servedOrigin } from "@/app/(marketing)/_lib/serving"
import { type PageSearchParams as SearchParams, routeMetadata } from "@/app/(marketing)/_lib/share"
import { HOW_IT_WORKS, siteOrigin } from "@/app/(marketing)/_lib/site"
import { BrowserBar } from "@/app/(marketing)/_components/browser-bar"
import { StructuredData } from "@/app/(marketing)/_components/structured-data"

export const generateMetadata = routeMetadata(HOW_IT_WORKS)

/**
 * The mechanism page, and which request it prints the record of.
 *
 * Read through `askedFor`, which is the one reader of an address on this site,
 * so a visitor who followed the panel's link is shown the record of the change
 * they just watched rather than of the one this page was written around. Until
 * 9 October this page read the address itself and read two of its four
 * parameters, so *Put it back* on the band below did nothing; `_lib/addressed.ts`
 * is that eight days, written down.
 */
const HowItWorksPage = async ({ searchParams }: { readonly searchParams: SearchParams }) => {
  const rendered = await renderSitePage(HOW_IT_WORKS, {
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
      <StructuredData route={HOW_IT_WORKS} origin={siteOrigin()} />
      <BrowserBar theme={rendered.theme} />
      {rendered.element}
    </>
  )
}

export default HowItWorksPage
