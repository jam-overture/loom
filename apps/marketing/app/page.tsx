import type { Metadata } from "next"

import { renderSitePage } from "@/lib/render"
import { HOME, readThemeName, siteOrigin } from "@/lib/site"

export const metadata: Metadata = { title: HOME.title, description: HOME.description }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/**
 * The landing page: one tree, rendered.
 *
 * The palette a visitor sees comes off the query string, which is what makes
 * the footer's re-theme link an ordinary navigation rather than client state —
 * and what makes it the same claim the tests check, that the two palettes
 * differ in the root's variables and nowhere below it.
 */
const HomePage = async ({ searchParams }: { readonly searchParams: SearchParams }) => {
  const params = await searchParams
  const rendered = renderSitePage(HOME, {
    origin: siteOrigin(),
    theme: readThemeName(params["theme"]),
  })

  return rendered.element
}

export default HomePage
