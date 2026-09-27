import type { MetadataRoute } from "next"

import {
  internalHref,
  isPublicDeployment,
  PRODUCT_SURFACES,
  siteOrigin,
} from "@/app/(marketing)/_lib/site"

/**
 * What a crawler is told before it reads anything, and the one metadata file in
 * this application that cannot live with the site it describes.
 *
 * Everything here is the marketing lane's — what to crawl and what to leave
 * alone is that surface's decision, argued in the comment at the head of
 * `(marketing)/sitemap.ts`, and the four lines below are the ones written
 * there. It sits at the application root because **Next honours `robots` only
 * at the application root** ([0190](../../../decisions/0190-a-route-group-may-contribute-a-sitemap-and-may-not-contribute-a-robots-txt.md)),
 * which is the shell's constraint and not a choice this file made. `pnpm
 * prerender:check` is what now says so out loud rather than leaving the next
 * surface to discover it.
 *
 * The two lists are read rather than spelled out, for the same reason the
 * sitemap reads them: the next guarded surface is kept out of the crawl by the
 * field that already keeps it out of the header's menu, rather than by somebody
 * remembering that a third map exists.
 */

/**
 * The surfaces a crawler is kept off, which is every surface with a door on it.
 *
 * `guarded` is the same field `crawlableSurfaces` filters on, taken the other
 * way round, so the two maps cannot disagree about which surface is which. A
 * crawler sent to a sign-in page indexes the door and nobody reading the search
 * result can act on it.
 *
 * **This is not what keeps the portal shut** — the portal's sign-in is
 * (`proxy.ts`, 0027). A `Disallow` is a request that well-behaved crawlers
 * honour and nothing else is bound by, and treating it as a control would be
 * the kind of mistake this project files findings about.
 */
export const disallowedPaths: readonly string[] = PRODUCT_SURFACES.filter(
  (surface) => surface.guarded
).map((surface) => surface.path)

/**
 * What a preview deployment says instead, which is *nothing here is for you*.
 *
 * Approved by the maintainer on 27 September. Every pull request gets a
 * deployment, and since #406 each one serves a `schema.org` graph naming this
 * product and an `/llms.txt` describing it — so an indexed preview is not a
 * stray copy of some HTML, it is a second thing on the internet stating, in the
 * format a machine reads as fact, that it is Loom.
 *
 * The canonical has always pointed at each deployment's own address, so a
 * preview never competed with production for one URL. That is what kept this
 * harmless and it is not the same as staying out of the index.
 *
 * **No sitemap line on a disallowed deployment.** Pointing a crawler that has
 * just been told to go away at a map of where to go is the kind of
 * contradiction a crawler resolves in whichever order it read them.
 */
const NOT_FOR_CRAWLING: MetadataRoute.Robots = {
  rules: { userAgent: "*", disallow: "/" },
}

const robots = (): MetadataRoute.Robots =>
  isPublicDeployment()
    ? {
        rules: { userAgent: "*", allow: "/", disallow: [...disallowedPaths] },
        sitemap: internalHref(siteOrigin(), "/sitemap.xml"),
      }
    : NOT_FOR_CRAWLING

export default robots
