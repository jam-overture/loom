import type { Metadata } from "next"

import { renderSitePage } from "@/app/(marketing)/_lib/render"
import { pageMetadata } from "@/app/(marketing)/_lib/share"
import { HOW_IT_WORKS, readThemeName, siteOrigin } from "@/app/(marketing)/_lib/site"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export const generateMetadata = async ({
  searchParams,
}: {
  readonly searchParams: SearchParams
}): Promise<Metadata> => {
  const params = await searchParams

  return pageMetadata(HOW_IT_WORKS, {
    origin: siteOrigin(),
    theme: readThemeName(params["theme"]),
  })
}

const HowItWorksPage = async ({ searchParams }: { readonly searchParams: SearchParams }) => {
  const params = await searchParams
  const rendered = await renderSitePage(HOW_IT_WORKS, {
    origin: siteOrigin(),
    theme: readThemeName(params["theme"]),
  })

  return rendered.element
}

export default HowItWorksPage
