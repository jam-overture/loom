import type { MetadataRoute } from "next"

import { internalHref, PRODUCT_SURFACES, SITE_ROUTES, siteOrigin, surfaceHref } from "./_lib/site"

/**
 * The map of the product, for everything that is not a person.
 *
 * Every other map on this site is drawn for somebody reading it — the bar at
 * the top, the footer's three named groups, the band that says what to read
 * next. This is the same map with the words taken out, and it is the only one a
 * search engine, a link checker or anything else arriving without a browser can
 * read.
 *
 * It lives in the marketing route group because a route group contributes
 * nothing to a URL (0067), so this serves at `/sitemap.xml` from here exactly
 * as it would from the application root — and here it is in the lane whose
 * `SITE_ROUTES` and `PRODUCT_SURFACES` it is built out of, rather than in a
 * shared file that would have to be kept true by whoever remembered.
 *
 * **It is composed from the same two lists the header and the footer read.** A
 * page added to `SITE_ROUTES` is in this the moment it is added, and a surface
 * added to `PRODUCT_SURFACES` likewise. Nothing here holds a path of its own,
 * which is the property that matters: a sitemap is the one map nobody looks at,
 * so a sitemap that had to be updated by hand is a sitemap that would be wrong
 * within a fortnight and would never say so.
 */

/**
 * What this does **not** say about a page, and why saying nothing is the
 * honest answer rather than the lazy one.
 *
 * A sitemap entry may carry three optional things beside its address, and each
 * of them is a claim this deployment cannot make truthfully:
 *
 * - **`lastModified`.** There is nothing at serve time that knows when a page
 *   last changed. Every page of this site is composed by a builder in
 *   `_lib/pages/`, and the only timestamp available to a function running in
 *   the deployment is *now* — so stamping the ten of them would say that all
 *   ten changed at the same instant, and would say it again, differently, on
 *   every deploy. Google uses `lastmod` only where it is consistently accurate
 *   and ignores it everywhere else, so the choice is between a number that is
 *   false and no number at all.
 * - **`changeFrequency`.** A guess about the future, in a file with no way to
 *   check it later.
 * - **`priority`.** A ranking of our own pages against each other, which the
 *   consumers of this file have ignored for a decade.
 *
 * So each entry is its address and nothing else, which is the whole of what the
 * format requires and the whole of what this deployment knows. It is the same
 * rule the rest of this lane follows — `FACTS` counts the repository rather
 * than typing a number, and a number that cannot be counted is not written —
 * applied to a file nobody will ever read closely enough to catch.
 */
const entry = (url: string): MetadataRoute.Sitemap[number] => ({ url })

/**
 * The surfaces a crawler is pointed at, which is every surface without a door
 * on it.
 *
 * `guarded` is read rather than a list spelled out here, and that is the point:
 * the portal is behind a sign-in that whoever runs a Loom site writes the list
 * for, so a crawler sent to it reaches a door it cannot open and indexes the
 * door. Nobody reading a search result for *Loom portal* can act on it.
 *
 * Deriving it means the next guarded surface is kept out of this file by the
 * same field that already keeps it out of the header's menu and gives it a
 * `door` sentence on the front door — rather than by somebody remembering that
 * a third map exists.
 *
 * **There is no `robots.txt` beside this, and not for want of writing one.** It
 * was written, it is correct, and this application cannot serve it — measured
 * both ways and filed on 24 September for the shell. What that costs is the
 * `Sitemap:` line that would announce this file; what it does not cost is this
 * file, which every consumer of a sitemap also looks for by convention at
 * `/sitemap.xml` and which can be handed to a search console directly. The
 * disallow this would have paired with is the same `guarded` filter, so
 * whenever the shell can serve one, it is four lines and this comment is the
 * argument for them.
 */
export const crawlableSurfaces = PRODUCT_SURFACES.filter((surface) => !surface.guarded)

/**
 * The site's own pages first, in the order the site itself reads, then the rest
 * of the product.
 *
 * The order carries no weight — a sitemap is a set, and nothing consuming one
 * treats position as a ranking. It is the reading order because that is the
 * order every other list in this lane is in, and a file that sorted itself
 * differently for no reason would be one more thing to explain.
 */
const sitemap = (): MetadataRoute.Sitemap => {
  const origin = siteOrigin()

  return [
    ...SITE_ROUTES.map((route) => entry(internalHref(origin, route.path))),
    ...crawlableSurfaces.map((surface) => entry(surfaceHref(origin, surface))),
  ]
}

export default sitemap
