import { searchProse } from "@/app/(docs)/_lib/search/build"

/**
 * The site's words, as the second static file.
 *
 * Everything the route beside this one says applies here — built once by
 * `next build`, served from a CDN, never touching the filesystem for a request.
 * What is different is who waits for it: **nobody**. The search box opens on the
 * index and answers by title, section and summary while this is still in flight,
 * and the words turn on the fourth ranking band when they land.
 *
 * That is the whole reason for two files. This half is 35 KB compressed against
 * the index's 14.6, and it is the half that grows every time anybody writes a
 * paragraph.
 */
export const dynamic = "force-static"

export const GET = (): Response =>
  Response.json(searchProse(), {
    headers: { "cache-control": "public, max-age=0, must-revalidate" },
  })
