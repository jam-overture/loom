import type { Metadata } from "next"

import { renderSitePage } from "@/lib/render"
import { HOW_IT_WORKS, readThemeName, siteOrigin } from "@/lib/site"

export const metadata: Metadata = {
  title: HOW_IT_WORKS.title,
  description: HOW_IT_WORKS.description,
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const HowItWorksPage = async ({ searchParams }: { readonly searchParams: SearchParams }) => {
  const params = await searchParams
  const rendered = renderSitePage(HOW_IT_WORKS, {
    origin: siteOrigin(),
    theme: readThemeName(params["theme"]),
  })

  return rendered.element
}

export default HowItWorksPage
