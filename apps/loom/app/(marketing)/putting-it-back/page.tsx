import type { Metadata } from "next"

import { renderSitePage } from "@/app/(marketing)/_lib/render"
import { pageMetadata } from "@/app/(marketing)/_lib/share"
import { PUTTING_IT_BACK, readThemeName, siteOrigin } from "@/app/(marketing)/_lib/site"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export const generateMetadata = async ({
  searchParams,
}: {
  readonly searchParams: SearchParams
}): Promise<Metadata> => {
  const params = await searchParams

  return pageMetadata(PUTTING_IT_BACK, {
    origin: siteOrigin(),
    theme: readThemeName(params["theme"]),
  })
}

/**
 * The page that puts every change on the front door back.
 *
 * The palette is the only thing it reads off the address. The round trips it
 * prints are not a function of what any visitor asked for — they are the front
 * door's own buttons, pressed and then reversed against the page this site
 * publishes — so every reader of this page is looking at the same ones, and each
 * is a button they can go and press on `/` themselves.
 */
const PuttingItBackPage = async ({ searchParams }: { readonly searchParams: SearchParams }) => {
  const params = await searchParams
  const rendered = await renderSitePage(PUTTING_IT_BACK, {
    origin: siteOrigin(),
    theme: readThemeName(params["theme"]),
  })

  return rendered.element
}

export default PuttingItBackPage
