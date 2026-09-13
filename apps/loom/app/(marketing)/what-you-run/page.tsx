import type { Metadata } from "next"

import { renderSitePage } from "@/app/(marketing)/_lib/render"
import { readThemeName, siteOrigin, WHAT_YOU_RUN } from "@/app/(marketing)/_lib/site"

export const metadata: Metadata = {
  title: WHAT_YOU_RUN.title,
  description: WHAT_YOU_RUN.description,
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/**
 * The page that says what the thing on your own machine would be.
 *
 * The palette is the only thing it reads off the address. Nothing on it is a
 * function of a request — the measurement is taken against the front door as
 * this site publishes it, with the library and the palettes it renders with — so
 * it is as cheap to serve as the rules page.
 */
const WhatYouRunPage = async ({ searchParams }: { readonly searchParams: SearchParams }) => {
  const params = await searchParams
  const rendered = await renderSitePage(WHAT_YOU_RUN, {
    origin: siteOrigin(),
    theme: readThemeName(params["theme"]),
  })

  return rendered.element
}

export default WhatYouRunPage
