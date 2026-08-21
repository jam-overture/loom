import type { Metadata } from "next"

import { readAskId } from "@/app/(marketing)/_lib/adapt/asks"
import { renderSitePage } from "@/app/(marketing)/_lib/render"
import { HOME, readThemeName, siteOrigin } from "@/app/(marketing)/_lib/site"

export const metadata: Metadata = { title: HOME.title, description: HOME.description }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

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
    origin: siteOrigin(),
    theme: readThemeName(params["theme"]),
    ...(ask === undefined ? {} : { ask, approve: params["approve"] === "1" }),
  })

  return rendered.element
}

export default HomePage
