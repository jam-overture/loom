import type { Metadata } from "next"

import { docsEntryAt, docsHref } from "./nav"

/**
 * A page's title and description, taken from the navigation rather than typed
 * again beside it.
 *
 * The one line an MDX page writes is `export const metadata = pageMetadata(…)`,
 * and it throws when the page is not in `docsSections` — so a page that exists
 * on disk and nowhere in the navigation fails the build rather than becoming an
 * orphan nobody can reach. That is the same lockstep `content.test.ts` checks
 * from the other direction, enforced at the only moment a writer is looking.
 */
export const pageMetadata = (sectionSlug: string, pageSlug: string): Metadata => {
  const entry = docsEntryAt(docsHref(sectionSlug, pageSlug))

  if (entry === undefined) {
    throw new Error(
      `loom: /docs/${sectionSlug}/${pageSlug} is not listed in lib/nav.ts, so nothing links to it`
    )
  }

  return { title: entry.page.title, description: entry.page.summary }
}
