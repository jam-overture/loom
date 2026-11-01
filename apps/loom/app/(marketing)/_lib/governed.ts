import { SITE_ROUTES, type SiteRoute } from "./site"

/**
 * Why every page of this site is served per request, and the one place that
 * says so.
 *
 * ## It is a product requirement and not a performance choice
 *
 * [0259](../../../../../decisions/0259-a-surface-the-portal-governs-renders-from-the-store-and-a-page-built-at-render-time-is-not-one.md)
 * made these pages the store's rather than their builders': `pageTreeFor`
 * reads the stored row and the builder is the seed and the fallback. A change
 * somebody accepts in the portal, or an adaptation the Gate let through, is a
 * new revision of that row, and the next reader is meant to get it.
 *
 * **A prerendered page reads that row once, at build time**, and then serves
 * the copy until the next deployment. The portal would go on governing a page
 * nobody is served, which is 0259's own sentence — *a page built at render
 * time is not one* — arriving by the other door.
 *
 * ## It was held by accident until 1 November
 *
 * Nothing declared it. Both halves of each route await `searchParams` for the
 * palette — the page and its `generateMetadata` — and that is the whole of why
 * Next.js served them on demand. So the guarantee rested on a query string
 * that nothing had connected to it, and it was one edit from gone:
 *
 * | `/what-you-run`, measured on 1 November | `next build` says |
 * | --- | --- |
 * | as it ships | `ƒ` — served per request |
 * | with the page's `searchParams` read removed | `ƒ` — the metadata still reads it |
 * | with both reads removed | **`○` — prerendered, and the row frozen** |
 *
 * That second row is why this is worth a module. The read that keeps the
 * guarantee true is in `generateMetadata`, not in the page, so a run that
 * looked at the page alone would conclude the palette was load-bearing and
 * remove it from the component without any symptom at all.
 *
 * **And the edit was recommended.** The 1 November performance finding, filed
 * by this lane, closes by naming these routes' being `ƒ` as
 * *"`Loom marketing`'s own to fix"*. It is not a fix. It is the one change on
 * this surface that would break the product while every test stayed green, and
 * [0331](../../../../../decisions/0331-a-marketing-page-is-served-per-request-because-the-store-governs-it.md)
 * records that in the place a later run would look.
 *
 * ## What this module is
 *
 * The value Next.js reads, and the list of routes that must carry it.
 * `governed.test.ts` reads the route files themselves and fails if one has
 * lost the declaration, so the guarantee is held by something that goes red
 * rather than by a reader's good intentions.
 *
 * It is not imported by the routes, and that is deliberate rather than an
 * oversight. Next.js resolves a segment's route config by static analysis of
 * the module's own exports, so `export { DYNAMIC as dynamic }` is not reliably
 * the same thing as writing the literal — the declaration has to be in the
 * file it governs. What is shared is therefore the *argument* and the *check*,
 * which are the two halves that were worth not writing three times.
 */
export const DYNAMIC = "force-dynamic"

/**
 * Every route of this site whose page is a stored tree, and so must be served
 * per request.
 *
 * It is `SITE_ROUTES` today and is written as a derivation rather than a
 * second list, so a fourth page is covered by the check on the day it is
 * added rather than on the day somebody remembers this file.
 */
export const GOVERNED_ROUTES: readonly SiteRoute[] = SITE_ROUTES
