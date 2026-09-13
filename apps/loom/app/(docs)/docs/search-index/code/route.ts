import { searchCode } from "@/app/(docs)/_lib/search/build"

/**
 * The site's code blocks, as the third static file.
 *
 * Everything the route two directories up says applies here — built once by
 * `next build`, served from a CDN, never touching the filesystem for a request
 * — and everything the prose route says about who waits for it applies too:
 * **nobody**. The box answers by title, section and summary from the moment it
 * opens, and this turns on the last band of the ranking when it lands.
 *
 * It is the third file rather than more of the second because the two grow for
 * unrelated reasons: the words grow whenever anybody writes a paragraph, and
 * the blocks grow when somebody adds a snippet. One number over both would move
 * for either and tell nobody which.
 */
export const dynamic = "force-static"

export const GET = (): Response =>
  Response.json(searchCode(), {
    headers: { "cache-control": "public, max-age=0, must-revalidate" },
  })
