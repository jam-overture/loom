import { searchNames } from "@/app/(docs)/_lib/search/build"

/**
 * The runtime's published names, as the fourth static file.
 *
 * Everything the route two directories up says applies here — built once by
 * `next build`, served from a CDN, never touching the filesystem for a request.
 * What is different is who waits for it: **nobody**. The box opens on the
 * site's own table of contents and answers with pages and sections while this
 * is still in flight, and the thousand published names turn on underneath them
 * when it lands.
 *
 * This file is the one that had to leave the first one. It grows when any lane
 * in the repository exports something — which this surface does not do and
 * cannot see coming — and it was 78% of the payload a reader waited for, 60% of
 * it after compression.
 */
export const dynamic = "force-static"

export const GET = (): Response =>
  Response.json(searchNames(), {
    headers: { "cache-control": "public, max-age=0, must-revalidate" },
  })
