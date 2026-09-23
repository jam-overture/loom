import { ImageResponse } from "next/og"

import { shareCardImage } from "@/app/(demo)/_lib/share-card"
import { demoShareCard, SHARE_IMAGE_SIZE } from "@/app/(demo)/_lib/share"

/**
 * The picture a link to the demo unfurls as.
 *
 * Next's file convention rather than a route handler, which is the opposite of
 * the choice the marketing lane made and for the opposite reason: that site's
 * cards differ by query string — an arrangement a visitor left the front door
 * in — and the convention is never handed one. The demo has exactly one address
 * and one card, so the convention is the version with nothing to get wrong: the
 * framework fills `og:image`, its dimensions and its alt text off the exports
 * below, and none of them can go stale by being written down twice.
 *
 * No font is fetched. `ImageResponse` draws with the renderer's own face, so
 * this makes no network call, needs no allowlisted domain, and cannot fail
 * because somebody else's CDN is down — which for the one asset fetched by
 * other people's servers is worth more than matching the rail's typeface. The
 * typeface is the only part of this surface the medium cannot carry, and it is
 * said here rather than papered over.
 */
const card = demoShareCard()

export const size = SHARE_IMAGE_SIZE

export const contentType = "image/png"

/**
 * What somebody using a screen reader is told the picture is, and it has to be
 * a description rather than a title: an unfurled card in a channel is read out
 * beside the link's own title, so repeating it says nothing twice.
 */
export const alt = `A clinic's page with its figures ringed and marked “${card.markLabel}”, and Loom's record beside it: “${card.badge}”. ${card.verdict}`

const DemoOpenGraphImage = (): Response => new ImageResponse(shareCardImage(card), size)

export default DemoOpenGraphImage
