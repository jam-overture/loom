import type { Metadata } from "next"

import { readAskId } from "@/app/(marketing)/_lib/adapt/asks"
import { renderSitePage } from "@/app/(marketing)/_lib/render"
import { HOW_IT_WORKS, readThemeName, siteOrigin } from "@/app/(marketing)/_lib/site"

export const metadata: Metadata = {
  title: HOW_IT_WORKS.title,
  description: HOW_IT_WORKS.description,
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

/**
 * The mechanism page, and which request it prints the record of.
 *
 * Read exactly as the front door reads them, off the same two parameters, so a
 * visitor who followed the panel's link gets the record of the change they just
 * watched rather than of the one this page was written around. An unrecognised
 * value is the default rather than an error, for the same reason it is on the
 * front door: a page reached with a mangled address should be a page.
 */
const HowItWorksPage = async ({ searchParams }: { readonly searchParams: SearchParams }) => {
  const params = await searchParams
  const ask = readAskId(params["ask"])
  const rendered = await renderSitePage(HOW_IT_WORKS, {
    origin: siteOrigin(),
    theme: readThemeName(params["theme"]),
    ...(ask === undefined ? {} : { ask, approve: params["approve"] === "1" }),
  })

  return rendered.element
}

export default HowItWorksPage
