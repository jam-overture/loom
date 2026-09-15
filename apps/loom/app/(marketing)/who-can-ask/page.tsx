import { renderSitePage } from "@/app/(marketing)/_lib/render"
import { type PageSearchParams as SearchParams, routeMetadata } from "@/app/(marketing)/_lib/share"
import { readThemeName, siteOrigin, WHO_CAN_ASK } from "@/app/(marketing)/_lib/site"

export const generateMetadata = routeMetadata(WHO_CAN_ASK)

/**
 * The page that says who a change may come from, and what that changes.
 *
 * The palette is the only thing it reads off the address. The sixteen answers
 * in its comparison are not a function of what any visitor asked for — they are
 * four fixed requests put to the front door as this site publishes it, so every
 * reader of this page is looking at the same sixteen, and each of the four is a
 * button they can go and press on `/` themselves.
 */
const WhoCanAskPage = async ({ searchParams }: { readonly searchParams: SearchParams }) => {
  const params = await searchParams
  const rendered = await renderSitePage(WHO_CAN_ASK, {
    origin: siteOrigin(),
    theme: readThemeName(params["theme"]),
  })

  return rendered.element
}

export default WhoCanAskPage
