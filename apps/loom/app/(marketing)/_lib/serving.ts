import { headers } from "next/headers"

import { originFromHost, siteOrigin } from "./site"

/**
 * Where this request arrived, for the one thing that has to agree with the
 * browser's address bar.
 *
 * It is a module of its own for one reason: `site.ts` is pure — a function of
 * an environment object — and is read by tests, by the sitemap, by `llms.txt`
 * and by a tool or two. Importing `next/headers` into it would make every one
 * of those a request-scoped call. The header read belongs on this side of that
 * line, and the parsing belongs on the other, which is why `originFromHost`
 * lives in `site.ts` and takes strings.
 *
 * **What this is for, stated once**: the tree the visitor is handed carries
 * absolute addresses, and one of them is the `src` of the framed demonstration
 * on the front door. If it names a different host from the one they are on, a
 * preview deployment's protection answers that frame with a sign-in page that
 * refuses to be framed, and the band renders as the browser's broken-document
 * glyph. See `originFromHost`'s own comment for why the two hosts differ on
 * every preview.
 *
 * **What this is not for**: the canonical link, the sitemap, the share image
 * and the structured-data graph all declare where a page *lives*, and they
 * stay on `siteOrigin()`. A page that announced itself under whichever host a
 * reader reached it by would be a page telling a crawler there are three of it.
 */
export const servedOrigin = async (): Promise<string> => {
  const received = await headers()

  return (
    originFromHost(
      /**
       * `x-forwarded-host` first, because behind a proxy `host` is the proxy's
       * own name. Vercel sets both and does not forward a client's.
       */
      received.get("x-forwarded-host") ?? received.get("host"),
      received.get("x-forwarded-proto")
    ) ?? siteOrigin()
  )
}
