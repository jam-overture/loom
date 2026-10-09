import type { Metadata } from "next"

import { askById, readAskId } from "@/app/(marketing)/_lib/adapt/asks"
import { askedFor } from "@/app/(marketing)/_lib/addressed"
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
 * Everything a visitor can do to this site is in the address, which is what
 * makes the footer's re-theme link an ordinary navigation rather than client
 * state, and what lets a rearranged page be copied, bookmarked and shared
 * without two readers moving the site under each other. It is read here through
 * `askedFor`, the one reader, and read whole.
 *
 * **The palette is the only part of it this page is a function of**, and that is
 * a change of 1 October rather than a property: the band a request rearranges
 * moved to `/how-it-works`, and `pageTreeFor` runs a request for that page and
 * for no other. `addressed.test.ts` measures it — this page serves the same
 * markup asked or not — and it reads the rest of the address anyway, because the
 * last time a page here decided for itself which half of an address was worth
 * reading, the half it dropped was the half the band needed.
 *
 * The card is the one thing still drawn from the request: `generateMetadata`
 * above announces a rearranged address as the request that made it.
 */
const HomePage = async ({ searchParams }: { readonly searchParams: SearchParams }) => {
  const rendered = await renderSitePage(HOME, {
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
      <StructuredData route={HOME} origin={siteOrigin()} />
      <BrowserBar theme={rendered.theme} />
      {rendered.element}
    </>
  )
}

export default HomePage
