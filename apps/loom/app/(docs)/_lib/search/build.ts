import { apiAnchorFor, apiSlugFor } from "../api/model"
import { apiEntries } from "../api/reference"
import { docsHref, docsSections, writtenDocsSections } from "../nav"

import { readPageHeadings } from "./headings"
import type { SearchEntry, SearchIndex } from "./model"

/**
 * The index, assembled from what the site already knows.
 *
 * Nothing here is typed by hand, which is the same rule the rest of this
 * section runs on. The pages come from `nav.ts`, which is already the one
 * statement of what the documentation contains. The headings come from the
 * pages themselves. The exports come from the generated reference, which comes
 * from the runtime's own declaration files. So a page that is renamed, a
 * heading that is rewritten and an export that is removed all change what is
 * findable **in the same commit that changes the thing**, with nobody
 * remembering to update a list.
 *
 * Built on the server and served as one static file. `build.test.ts` holds the
 * result against the site — every href it offers is a page that exists, every
 * anchor is a heading that is really there — because a search box that sends
 * people to a 404 is worse than no search box.
 */

const pageEntries = (): readonly SearchEntry[] =>
  docsSections.flatMap((section) =>
    section.pages.map((page) => ({
      href: docsHref(section.slug, page.slug),
      title: page.heading ?? page.title,
      context: section.title,
      kind: "page" as const,
      summary: page.summary,
    }))
  )

/**
 * Every `##` and `###` on a written page.
 *
 * A generated section has none to read: the API pages are built from data, and
 * what a reader wants to find on one is an export rather than a module heading
 * — which is the next list down.
 */
const headingEntries = (): readonly SearchEntry[] =>
  writtenDocsSections.flatMap((section) =>
    section.pages.flatMap((page) =>
      readPageHeadings(section.slug, page.slug).map((heading) => ({
        href: `${docsHref(section.slug, page.slug)}#${heading.anchor}`,
        title: heading.text,
        context: page.title,
        kind: "heading" as const,
        summary: "",
      }))
    )
  )

/**
 * Every published export, by name, and deliberately without its summary.
 *
 * A name is what somebody searches for — they have read `planReverts` in a
 * stack trace or in a colleague's branch and want the page it is on. The
 * summary is what they want *once they are there*, and there are seven hundred
 * and fifty of them; carrying all of that into the browser to improve the
 * ranking of a query that already matches on the name would cost every reader
 * of the site for the benefit of almost none of them. The import specifier goes
 * in `context` instead, so `store` narrows a name that appears in two entry
 * points.
 */
const exportEntries = (): readonly SearchEntry[] =>
  apiEntries.flatMap((entry) =>
    entry.groups.flatMap((group) =>
      group.symbols.map((symbol) => ({
        href: `/docs/api-reference/${apiSlugFor(entry.specifier)}#${apiAnchorFor(symbol.name)}`,
        title: symbol.name,
        context: entry.specifier,
        kind: "export" as const,
        summary: "",
      }))
    )
  )

export const buildSearchIndex = (): SearchIndex => ({
  entries: [...pageEntries(), ...headingEntries(), ...exportEntries()],
})
