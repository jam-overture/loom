import { readAskId } from "@/app/(marketing)/_lib/adapt/asks"
import { renderSitePage } from "@/app/(marketing)/_lib/render"
import { servedOrigin } from "@/app/(marketing)/_lib/serving"
import { type PageSearchParams as SearchParams, routeMetadata } from "@/app/(marketing)/_lib/share"
import { HOW_IT_WORKS, readThemeName, siteOrigin } from "@/app/(marketing)/_lib/site"
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
   * The graph beside the tree, which is what a crawler and an assistant read.
   *
   * A fragment rather than a wrapper, so the page's own markup is unchanged and
   * the tree is still the whole of what a visitor sees. See
   * `_components/structured-data.tsx` for why this surface renders a tag of its
   * own at all.
   */
  return (
    <>
      <StructuredData route={HOW_IT_WORKS} origin={siteOrigin()} />
      {rendered.element}
    </>
  )
}

export default HowItWorksPage
