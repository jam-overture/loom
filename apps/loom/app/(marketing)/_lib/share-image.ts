import type { ResolvedTheme } from "@loom/runtime"

import { readAskId } from "./adapt/asks"
import { siteThemes } from "./registry"
import { askRunFor } from "./render"
import { askedCard, publishedCard, type ShareCard } from "./share"
import { HOME, SITE_ROUTES, readThemeName, SITE_THEMES, type SiteRoute } from "./site"

/**
 * An address, turned into the card that address should unfurl as.
 *
 * The picture is a function of the query string and of nothing else, which is
 * the same property the pages have and it is here for the same reason: a crawler
 * fetches the image minutes or weeks after the page, from a different machine,
 * with no session and nothing shared between the two requests. Anything the card
 * knew that the address did not would be a card that stopped being true.
 *
 * **A request in the address is run for real.** The card does not describe what
 * would happen; it reports what did — the same interpreter, the same rules and
 * the same verdict the page reaches, because it is the same call the page makes.
 * That is what the run costs: five prepared requests, no model, everything
 * decided in process. A card that guessed the verdict would be this site
 * inventing a record on the one artefact built to be forwarded.
 */

const routeFor = (given: string | null): SiteRoute =>
  SITE_ROUTES.find((route) => route.path === given) ?? HOME

const themeFor = (given: string | null): ResolvedTheme => {
  const name = readThemeName(given ?? undefined)
  const resolved = siteThemes.resolve(SITE_THEMES[name].selection)

  if (!resolved.ok) {
    throw new Error(`loom: the ${name} palette is not registered on this deployment`)
  }

  return resolved.value
}

export type ShareImageRequest = {
  readonly route: SiteRoute
  readonly card: ShareCard
  readonly theme: ResolvedTheme
}

/**
 * Anything unrecognised is the published front door rather than an error, which
 * is the rule the pages already follow: an address a person mangled while
 * pasting it should still unfurl as this site, not as a broken picture in
 * somebody's channel.
 */
export const shareImageFor = async (
  params: URLSearchParams,
  origin: string
): Promise<ShareImageRequest> => {
  const route = routeFor(params.get("page"))
  const theme = themeFor(params.get("theme"))
  const ask = route.path === HOME.path ? readAskId(params.get("ask") ?? undefined) : undefined

  if (ask === undefined) {
    return { route, card: publishedCard(route, origin), theme }
  }

  const run = await askRunFor({
    origin,
    theme: readThemeName(params.get("theme") ?? undefined),
    ask,
    approve: params.get("approve") === "1",
  })

  return {
    route,
    card: run === undefined ? publishedCard(route, origin) : askedCard(run.record, origin),
    theme,
  }
}
