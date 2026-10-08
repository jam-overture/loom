import { readAskId } from "@/app/(marketing)/_lib/adapt/asks"
import { renderSitePage } from "@/app/(marketing)/_lib/render"
import { servedOrigin } from "@/app/(marketing)/_lib/serving"
import { type PageSearchParams as SearchParams, routeMetadata } from "@/app/(marketing)/_lib/share"
import { HOW_IT_WORKS, readThemeName, siteOrigin } from "@/app/(marketing)/_lib/site"
import { BrowserBar } from "@/app/(marketing)/_components/browser-bar"
import { StructuredData } from "@/app/(marketing)/_components/structured-data"

export const generateMetadata = routeMetadata(HOW_IT_WORKS)

/**
 * The mechanism page, and which request it prints the record of.
 *
 * Read exactly as the front door reads them, off the same two parameters, so a
 * visitor who followed the panel's link is shown the record of the change they
 * just watched rather than of the one this page was written around. An
 * unrecognised value is the default rather than an error, for the same reason it
 * is on the front door: a page reached with a mangled address should be a page.
 */
const HowItWorksPage = async ({ searchParams }: { readonly searchParams: SearchParams }) => {
  const params = await searchParams
  const ask = readAskId(params["ask"])
  const rendered = await renderSitePage(HOW_IT_WORKS, {
    origin: await servedOrigin(),
    theme: readThemeName(params["theme"]),
    ...(ask === undefined ? {} : { ask, approve: params["approve"] === "1" }),
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
