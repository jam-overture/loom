import { docsSections } from "@/app/(docs)/_lib/nav"
import { searchProseFor } from "@/app/(docs)/_lib/search/build"

/**
 * The site's words, as one static file per section.
 *
 * Everything the route two levels up says applies here — built once by
 * `next build`, served from a CDN, never touching the filesystem for a request.
 * What is different is who waits for it: **nobody**. The search box opens on
 * the table of contents and answers by title, section and summary while these
 * are still in flight, and each one turns on the fourth ranking band for the
 * section it carries as it lands.
 *
 * **One address per section rather than one for the lot**, since 21 September.
 * The words were 54 KB compressed under a 60 KB cap — two more written pages
 * for the whole site — and a section is the line they actually grow on. The
 * browser asks for the section the reader is standing in first; `shards.ts`
 * carries the argument, including the 6% more total bytes it costs.
 *
 * `dynamicParams` is off, and `generateStaticParams` offers **every** section
 * rather than only the written ones. A section built from data has no words and
 * answers `{"bodies":[]}`, which is thirteen bytes and one fewer place for the
 * browser to keep its own idea of which sections somebody has written in.
 */

export const dynamic = "force-static"

export const dynamicParams = false

/** Next asks for a mutable array here, which is why this one is not `readonly`. */
export const generateStaticParams = (): { readonly section: string }[] =>
  docsSections.map((section) => ({ section: section.slug }))

export const GET = async (
  _request: Request,
  { params }: { readonly params: Promise<{ readonly section: string }> }
): Promise<Response> => {
  const { section } = await params

  return Response.json(searchProseFor(section), {
    headers: { "cache-control": "public, max-age=0, must-revalidate" },
  })
}
