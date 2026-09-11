import { searchIndexWithoutText } from "@/app/(docs)/_lib/search/build"

/**
 * The search index, as one static file.
 *
 * `force-static` is the whole design in one line: the index is assembled once
 * by `next build` — reading `nav.ts`, the pages on disk and the generated
 * reference — and what is deployed is a JSON file. No request ever runs this,
 * nothing touches the filesystem at serving time, and the browser gets bytes
 * from a CDN.
 *
 * It carries everything but the prose and the code under each entry, which are
 * two more files at `prose/` and `code/` — see `SEARCH_PROSE_PATH` and
 * `SEARCH_CODE_PATH`. A reader waits for this one and does not wait for those.
 *
 * It is a route rather than something the layout hands the dialog as a prop,
 * because a prop would put the whole index in the payload of **every page on
 * the site** for the sake of the readers who open the search box. This way it
 * is fetched once, on the first open, by the readers who asked for it.
 */
export const dynamic = "force-static"

export const GET = (): Response =>
  Response.json(searchIndexWithoutText(), {
    headers: { "cache-control": "public, max-age=0, must-revalidate" },
  })
