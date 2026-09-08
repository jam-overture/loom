import type { Metadata } from "next"

import { renderSitePage } from "@/app/(marketing)/_lib/render"
import { readThemeName, siteOrigin, YOUR_COMPONENTS } from "@/app/(marketing)/_lib/site"

export const metadata: Metadata = {
  title: YOUR_COMPONENTS.title,
  description: YOUR_COMPONENTS.description,
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/**
 * The components page: what a host hands over, what this site handed over for
 * one of its own cards, and the three things no request gets past.
 *
 * The palette is the only thing it reads off the address. Nothing on it is a
 * function of a request — the specimen comes off the library the site is served
 * with, and the count in the reconciliation band is the same derived one the
 * front door prints — so it is as cheap to serve as the rules page.
 */
const YourComponentsPage = async ({ searchParams }: { readonly searchParams: SearchParams }) => {
  const params = await searchParams
  const rendered = await renderSitePage(YOUR_COMPONENTS, {
    origin: siteOrigin(),
    theme: readThemeName(params["theme"]),
  })

  return rendered.element
}

export default YourComponentsPage
