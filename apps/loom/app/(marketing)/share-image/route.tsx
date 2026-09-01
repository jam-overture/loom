import { ImageResponse } from "next/og"

import { shareImageFor } from "@/app/(marketing)/_lib/share-image"
import { SHARE_IMAGE_SIZE, shareCardImage } from "@/app/(marketing)/_lib/share-card"
import { siteOrigin } from "@/app/(marketing)/_lib/site"

/**
 * The picture a shared link unfurls as.
 *
 * A route handler rather than Next's `opengraph-image` file, and the reason is
 * the only reason: the file convention is handed the route's own params and
 * never the query string, and every arrangement of this site a visitor can send
 * somebody lives in the query string. `opengraph-image.tsx` could draw the front
 * door; it could not draw the front door as somebody left it, which is the half
 * worth having.
 *
 * No font is fetched. `ImageResponse` draws with the renderer's own face, so
 * this route makes no network call, needs no allowlisted domain, and cannot fail
 * because somebody else's CDN is down — which for the one asset that is fetched
 * by other people's servers is worth more than matching the site's typeface.
 * The palette it wears is the registered one the address names; the typeface is
 * the only part of the theme this medium cannot carry, and it is stated in the
 * report rather than papered over.
 */
export const GET = async (request: Request): Promise<Response> => {
  const { card, theme } = await shareImageFor(
    new URL(request.url).searchParams,
    siteOrigin()
  )

  return new ImageResponse(shareCardImage(card, theme), SHARE_IMAGE_SIZE)
}
