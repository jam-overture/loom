import { readChangeSequence } from "@/app/(marketing)/_lib/adapt/history"
import { renderSitePage } from "@/app/(marketing)/_lib/render"
import { type PageSearchParams as SearchParams, routeMetadata } from "@/app/(marketing)/_lib/share"
import { readThemeName, siteOrigin, THE_RECORD } from "@/app/(marketing)/_lib/site"

export const generateMetadata = routeMetadata(THE_RECORD)

/**
 * The record page: a run of changes, replayed from the published front door.
 *
 * The whole history is in the address, which is what makes it shareable and
 * what makes this page hold nothing between one visitor and the next. Anything
 * unrecognised in it is dropped rather than refused, and a request for more
 * changes than the page will follow is capped — a mangled address should be a
 * page, not a 400 and not an afternoon of work.
 */
const TheRecordPage = async ({ searchParams }: { readonly searchParams: SearchParams }) => {
  const params = await searchParams
  const rendered = await renderSitePage(THE_RECORD, {
    origin: siteOrigin(),
    theme: readThemeName(params["theme"]),
    changes: readChangeSequence(params["changes"]),
  })

  return rendered.element
}

export default TheRecordPage
