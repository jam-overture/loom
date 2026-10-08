import type { Metadata } from "next"

import { askById, readAskId } from "@/app/(marketing)/_lib/adapt/asks"
import { renderSitePage } from "@/app/(marketing)/_lib/render"
import { servedOrigin } from "@/app/(marketing)/_lib/serving"
import { type PageSearchParams as SearchParams, pageMetadata } from "@/app/(marketing)/_lib/share"
import { HOME, readThemeName, siteOrigin } from "@/app/(marketing)/_lib/site"
import { BrowserBar } from "@/app/(marketing)/_components/browser-bar"
import { StructuredData } from "@/app/(marketing)/_components/structured-data"

/**
 * What this address unfurls as when somebody sends it to somebody else.
 *
 * A function rather than the constant it was, because the front door is not one
 * page: `/?ask=problem&approve=1` is the front door with a band lifted under the
 * headline, and the one thing this site can show that nothing else can is that
 * the arrangement has an address. A card that showed the published page for both
 * would be silent at exactly the moment the claim is being made.
 *
 * The rules are run to draw it, so the verdict on the card is the verdict on the
 * page rather than a description of one — but not here. `generateMetadata` only
 * writes the address of the picture; the run happens once, inside the route that
 * answers it, and only if somebody actually asks for the image.
 */
export const generateMetadata = async ({
  searchParams,
}: {
  readonly searchParams: SearchParams
}): Promise<Metadata> => {
  const params = await searchParams
  const ask = askById(readAskId(params["ask"]))

  return pageMetadata(HOME, {
    origin: siteOrigin(),
    theme: readThemeName(params["theme"]),
    ...(ask === undefined ? {} : { ask, approve: params["approve"] === "1" }),
  })
}

/**
 * The landing page: one tree, rendered.
 *
 * Everything a visitor can do to this page is in its address. The palette comes
 * off the query string, which is what makes the footer's re-theme link an
 * ordinary navigation rather than client state — and what the visitor has asked
 * the page for arrives the same way, so a rearranged page can be copied,
 * bookmarked and shared, and two people reading the site cannot move it under
 * each other.
 *
 * An unrecognised value in either is the default rather than an error. A
 * landing page reached with a mangled address should be a page, not a 400.
 */
const HomePage = async ({ searchParams }: { readonly searchParams: SearchParams }) => {
  const params = await searchParams
  const ask = readAskId(params["ask"])
  const rendered = await renderSitePage(HOME, {
    origin: await servedOrigin(),
    theme: readThemeName(params["theme"]),
    ...(ask === undefined
      ? {}
      : {
          ask,
          approve: params["approve"] === "1",
          /**
           * Putting it back is the visitor's second decision, so it is the
           * address's second pair of answers. Both are ignored without an `ask`,
           * because there is nothing to reverse — a mangled address should be a
           * page rather than a 400, here as everywhere else on this site.
           */
          back: params["back"] === "1",
          backApprove: params["back-yes"] === "1",
        }),
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
      <StructuredData route={HOME} origin={siteOrigin()} />
      <BrowserBar theme={rendered.theme} />
      {rendered.element}
    </>
  )
}

export default HomePage
