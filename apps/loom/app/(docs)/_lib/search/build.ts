import { apiAnchorFor, apiSlugFor } from "../api/model"
import { apiEntries } from "../api/reference"
import { docsHref, docsSections, writtenDocsSections } from "../nav"

import { readPageCode } from "./code"
import { readPageHeadings } from "./headings"
import type { SearchCode, SearchEntry, SearchIndex, SearchProse, TravellingIndex } from "./model"
import { readPageProse } from "./prose"

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
 * remembering to update a list. The prose is read the same way, off the same
 * pages, so a paragraph that is rewritten is searchable in its new words and
 * unsearchable in its old ones from that commit onward. The code is read the
 * same way and from the same files, so a snippet that stops naming a call stops
 * being findable by it.
 *
 * Built on the server and served as one static file. `build.test.ts` holds the
 * result against the site — every href it offers is a page that exists, every
 * anchor is a heading that is really there — because a search box that sends
 * people to a 404 is worse than no search box.
 */

/**
 * The prose and the code of every written page, read once each and keyed by
 * page.
 *
 * Read here rather than inside each list below, because two of them want the
 * same files and reading a page twice to ask two questions about it is the kind
 * of thing that is free today and is not at fifty pages.
 */
const readByHref = <T>(
  read: (sectionSlug: string, pageSlug: string) => T
): ReadonlyMap<string, T> =>
  new Map(
    writtenDocsSections.flatMap((section) =>
      section.pages.map(
        (page) => [docsHref(section.slug, page.slug), read(section.slug, page.slug)] as const
      )
    )
  )

const proseByHref = readByHref(readPageProse)
const codeByHref = readByHref(readPageCode)

/** The prose under one anchor of one page, or nothing where a generated page has none. */
const bodyAt = (href: string, anchor: string): string => proseByHref.get(href)?.get(anchor) ?? ""

/** The blocks under one anchor of one page, joined as `code.ts` joins them. */
const codeAt = (href: string, anchor: string): string => codeByHref.get(href)?.get(anchor) ?? ""

/**
 * A page, carrying the paragraphs above its first heading.
 *
 * That is the page's own introduction, and it belongs to the page for the same
 * reason the rest belongs to a heading: it is the part a reader would be
 * scrolled to. A generated page has no file to read and so has none.
 */
const pageEntries = (): readonly SearchEntry[] =>
  docsSections.flatMap((section) =>
    section.pages.map((page) => {
      const href = docsHref(section.slug, page.slug)

      return {
        href,
        title: page.heading ?? page.title,
        context: section.title,
        kind: "page" as const,
        summary: page.summary,
        body: bodyAt(href, ""),
        code: codeAt(href, ""),
      }
    })
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
        body: bodyAt(docsHref(section.slug, page.slug), heading.anchor),
        code: codeAt(docsHref(section.slug, page.slug), heading.anchor),
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
        body: "",
        code: "",
      }))
    )
  )

const allEntries = (): readonly SearchEntry[] => [
  ...pageEntries(),
  ...headingEntries(),
  ...exportEntries(),
]

/**
 * The whole index, words and blocks included.
 *
 * Nothing is served from this — the three files below are — but it is the one
 * place every entry is assembled, so the split is a matter of which fields each
 * file carries rather than three walks over the site that could disagree.
 */
export const buildSearchIndex = (): SearchIndex => ({
  entries: allEntries(),
})

/**
 * The part a reader waits for: everything but the words and the blocks.
 *
 * What arrives in the browser is still a `SearchIndex` — one whose two cheapest
 * ranking bands are simply not answering yet. A reader who types before the
 * other two files land gets the same results, ranked by title, section and
 * summary, and each band turns on underneath them without the list flickering.
 *
 * The two fields are **left out** rather than emptied, and so is a summary
 * nobody wrote. They were emptied until 14 September, when the raw cap below
 * failed at 200,286 bytes against 200,000 — of which 38,156 were the three
 * fields saying, 1,172 times, that they had nothing in them. `parseSearchIndex`
 * fills an absent field with the empty string on the way in, which is the
 * tolerance `code` already had, so nothing downstream can tell the difference.
 */
export const searchIndexWithoutText = (): TravellingIndex => ({
  entries: buildSearchIndex().entries.map((entry) => ({
    href: entry.href,
    title: entry.title,
    context: entry.context,
    kind: entry.kind,
    ...(entry.summary === "" ? {} : { summary: entry.summary }),
  })),
})

/** The words nobody waits for, keyed by the entry they sit under. */
export const searchProse = (): SearchProse => ({
  bodies: buildSearchIndex()
    .entries.filter((entry) => entry.body !== "")
    .map((entry) => [entry.href, entry.body] as const),
})

/** The blocks nobody waits for, keyed the same way. */
export const searchCode = (): SearchCode => ({
  blocks: buildSearchIndex()
    .entries.filter((entry) => entry.code !== "")
    .map((entry) => [entry.href, entry.code] as const),
})
