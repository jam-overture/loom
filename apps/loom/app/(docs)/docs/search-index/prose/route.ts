import { buildSearchProse } from "@/app/(docs)/_lib/search/build"

/**
 * The words under every heading, as a second static file.
 *
 * Split from the index itself on 11 September, when the single file reached
 * 47,501 bytes gzipped against a 48,000 cap that exists because this ships to
 * every reader who opens the box. The prose is most of that and the least
 * urgent part of it: a reader who has typed two letters wants headings, and
 * only wants sentences once they have typed enough to be looking for one.
 *
 * Same `force-static` bargain as the index — assembled by `next build`, served
 * from a CDN, no request ever runs this.
 */
export const dynamic = "force-static"

export const GET = (): Response =>
  Response.json(buildSearchProse(), {
    headers: { "cache-control": "public, max-age=0, must-revalidate" },
  })
