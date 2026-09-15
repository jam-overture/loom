import { renderSitePage } from "@/app/(marketing)/_lib/render"
import { type PageSearchParams as SearchParams, routeMetadata } from "@/app/(marketing)/_lib/share"
import { readThemeName, siteOrigin, WHEN_IT_GOES_WRONG } from "@/app/(marketing)/_lib/site"

export const generateMetadata = routeMetadata(WHEN_IT_GOES_WRONG)

/**
 * The page that says what happens the other four times.
 *
 * The palette is the only thing it reads off the address. The refusal its
 * middle band prints is not a function of what the visitor asked for — it is
 * one fixed request, put to the front door as this site publishes it, so every
 * reader of this page is looking at the same refusal and can check it against
 * the button on `/` that runs the same one.
 */
const WhenItGoesWrongPage = async ({ searchParams }: { readonly searchParams: SearchParams }) => {
  const params = await searchParams
  const rendered = await renderSitePage(WHEN_IT_GOES_WRONG, {
    origin: siteOrigin(),
    theme: readThemeName(params["theme"]),
  })

  return rendered.element
}

export default WhenItGoesWrongPage
