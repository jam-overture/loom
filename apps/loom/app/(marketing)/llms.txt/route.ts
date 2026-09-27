import { siteQuestions } from "@/app/(marketing)/_lib/questions"
import { WORDMARK } from "@/app/(marketing)/_lib/share"
import {
  HOME,
  internalHref,
  PRODUCT_SURFACES,
  REPOSITORY_URL,
  SITE_ROUTES,
  siteOrigin,
  surfaceHref,
} from "@/app/(marketing)/_lib/site"

/**
 * `/llms.txt` — the map for something that arrived to read rather than to
 * crawl.
 *
 * Asked for on 27 September, alongside the structured data, and it answers the
 * other half of the same question. The sitemap says *these addresses exist*,
 * which is what a crawler needs. This says **what is at them and in what
 * order**, in the one format a language model reads without a parser, which is
 * what an assistant needs when somebody asks it what this product is.
 *
 * It is a convention rather than a standard — there is no specification to
 * conform to and no consumer obliged to fetch it — and that is worth saying
 * plainly rather than implying otherwise. It costs one route, it cannot go
 * stale (see below), and if nothing ever reads it the site has lost nothing.
 *
 * ## Composed, like every other map on this site
 *
 * Nothing here holds a path, a title or an answer of its own. The pages are
 * `SITE_ROUTES` in reading order, the surfaces are `PRODUCT_SURFACES` filtered
 * on `guarded`, and the questions are `questions.ts` — the same three lists the
 * header, the footer, the sitemap and the structured data are built from. A
 * page added to the site is in this the moment it is added.
 *
 * That property is the whole argument for the file existing at all. A
 * hand-written summary of a site is wrong within a fortnight and never says so,
 * and a stale summary read by an assistant is worse than no summary: it is this
 * site telling somebody, confidently, about a page that is gone.
 *
 * ## Why the questions are in it
 *
 * They are the only text on this site written to be lifted away from the page
 * and still be true, which is exactly what happens to anything an assistant
 * quotes. Everything else here is a pointer; these are answers.
 */

/** The surfaces something reading this may follow, which is the unguarded ones. */
const openSurfaces = PRODUCT_SURFACES.filter((surface) => !surface.guarded)

const lines = (origin: string): readonly string[] => [
  `# ${WORDMARK}`,
  "",
  `> ${HOME.description}`,
  "",
  "This file is a map of this site for language models. Everything in it is",
  "generated from the same lists the site's own navigation is built from.",
  "",
  "## Pages",
  "",
  ...SITE_ROUTES.map(
    (route) => `- [${route.label}](${internalHref(origin, route.path)}): ${route.description}`
  ),
  "",
  "## The rest of the product",
  "",
  ...openSurfaces.map(
    (surface) => `- [${surface.label}](${surfaceHref(origin, surface)}): ${surface.blurb}`
  ),
  "",
  "## Questions this site answers",
  "",
  ...siteQuestions().flatMap((entry) => [`### ${entry.question}`, "", entry.answer, ""]),
  "## Source",
  "",
  `- [Repository](${REPOSITORY_URL}): every claim on this site is checkable here.`,
  "",
]

/**
 * Served as `text/plain`, which is what the convention asks for and what makes
 * it readable in a browser.
 *
 * `charset=utf-8` is stated rather than left to a default, because the copy
 * contains em dashes and typographic quotes and a consumer guessing Latin-1
 * would mangle every one of them.
 */
export const GET = (): Response =>
  new Response(lines(siteOrigin()).join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  })
