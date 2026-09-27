import { apiEntries } from "../api/reference"
import { DOCS_LANDING_SLUG, docsHref, docsSections, writtenDocsSections } from "../nav"

import { readPageCode } from "./code"
import { generatedPageWords } from "./generated"
import { readPageHeadings } from "./headings"
import {
  namesToEntries,
  type SearchCode,
  type SearchEntry,
  type SearchIndex,
  type SearchNames,
  type SearchProse,
  type TravellingIndex,
} from "./model"
import { readPageProse } from "./prose"
import { docsSectionOfPath } from "./shards"

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

/**
 * The words on a **generated** page, which has no file to read, under the page
 * itself.
 *
 * Read off what the page renders rather than off disk — `generated.ts` carries
 * the argument, and the anchor is the page's own for the reason it gives.
 */
const generatedByHref = generatedPageWords()

/** The prose under one anchor of one page, from whichever half of the site wrote it. */
const bodyAt = (href: string, anchor: string): string =>
  proseByHref.get(href)?.get(anchor) ?? (anchor === "" ? (generatedByHref.get(href) ?? "") : "")

/** The blocks under one anchor of one page, joined as `code.ts` joins them. */
const codeAt = (href: string, anchor: string): string => codeByHref.get(href)?.get(anchor) ?? ""

/**
 * A page, carrying the paragraphs above its first heading.
 *
 * That is the page's own introduction, and it belongs to the page for the same
 * reason the rest belongs to a heading: it is the part a reader would be
 * scrolled to. A generated page has no file to read, so what sits here for one
 * is every word it renders, in one body — `generated.ts` says why it is not cut
 * up by heading the way a written page's is.
 *
 * **And what it is one of**, where its section says its pages are variations of
 * one page. A landing page is excluded, and that exclusion is the whole of the
 * rule: `/docs/api-reference` is the section rather than one of the sixteen
 * doors inside it, it says things none of them says, and a fold that swallowed
 * it would hide the page most likely to be the right answer. `nav.ts` carries
 * the argument for the field; this line is where it stops at the front door.
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
        family: page.slug === DOCS_LANDING_SLUG ? "" : (section.family ?? ""),
      }
    })
  )

/**
 * Every `##` and `###` on a written page.
 *
 * A generated section contributes none. Its pages have no file to read their
 * headings out of, and their bands have no `id` for a result to land on — so
 * what such a page says arrives as one body under the page itself, which is the
 * trade `generated.ts` states. What a reader wants to find on one is usually an
 * export anyway, and that is the next list down.
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
        family: "",
      }))
    )
  )

/**
 * The runtime's surface, as the entry points that publish it and the names
 * under each.
 *
 * Nobody waits for this, which is the whole point of it being separate. It is
 * also the cheapest of the four files to carry a thousand of anything, because
 * what is written down is a name and not an address: `namesToEntries` rebuilds
 * the address in the browser from the same two functions the reference pages
 * use, so the scheme is stated once and the file is 20 KB instead of 138.
 */
export const searchNames = (): SearchNames => ({
  entryPoints: apiEntries.map((entry) => ({
    specifier: entry.specifier,
    names: entry.groups.flatMap((group) => group.symbols.map((symbol) => symbol.name)),
  })),
})

/**
 * Every published export, by name, and deliberately without its summary.
 *
 * A name is what somebody searches for — they have read `planReverts` in a
 * stack trace or in a colleague's branch and want the page it is on. The
 * summary is what they want *once they are there*, and there are a thousand of
 * them; carrying all of that into the browser to improve the ranking of a query
 * that already matches on the name would cost every reader of the site for the
 * benefit of almost none of them. The import specifier goes in `context`
 * instead, so `store` narrows a name that appears in two entry points.
 *
 * Assembled by expanding `searchNames()` rather than by walking the reference a
 * second time, so that the entries this file builds and the ones a browser
 * builds out of the names file are the same entries by construction.
 */
const exportEntries = (): readonly SearchEntry[] => namesToEntries(searchNames())

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
 * The part a reader waits for: **the site's own table of contents**, and
 * nothing else.
 *
 * Its pages and the headings on them — 206 entries, and every one of them is
 * something this surface wrote. What arrives in the browser is still a
 * `SearchIndex`, one whose three cheapest bands are simply not answering yet: a
 * reader who types before the other files land gets pages and sections, ranked
 * by title, section and summary, and each band turns on underneath them without
 * the list flickering.
 *
 * **The runtime's published names left this file on 19 September** and are
 * fetched beside the words and the code. They were 78% of it raw and 60% of it
 * compressed, they grow when
 * any lane in the repository exports something, and they had taken the payload
 * to 96% of its compressed budget — so the number guarding what a reader waits
 * for had stopped being a number about this site at all. `SEARCH_NAMES_PATH`
 * carries the argument; `build.test.ts` carries what each file now costs.
 *
 * **`family` travels in this file and not in the others**, which is the one
 * thing about it worth knowing here. It is not a band of the ranking; it is what
 * a row *is one of*, and the fold that uses it has to happen before the list is
 * cut to ten. So it arrives with the contents, for sixteen of the 207 entries,
 * and costs 336 raw bytes — 41 compressed, because it is one string written
 * sixteen times.
 *
 * The text fields are **left out** rather than emptied, and so is a summary
 * nobody wrote. They were emptied until 14 September, when the raw cap failed
 * at 200,286 bytes against 200,000 — of which 38,156 were the three fields
 * saying, 1,172 times, that they had nothing in them. `parseSearchIndex` fills
 * an absent field with the empty string on the way in, which is the tolerance
 * `code` already had, so nothing downstream can tell the difference.
 */
export const searchContents = (): TravellingIndex => ({
  entries: buildSearchIndex()
    .entries.filter((entry) => entry.kind !== "export")
    .map((entry) => ({
      href: entry.href,
      title: entry.title,
      context: entry.context,
      kind: entry.kind,
      ...(entry.summary === "" ? {} : { summary: entry.summary }),
      ...(entry.family === "" ? {} : { family: entry.family }),
    })),
})

/**
 * The words nobody waits for, keyed by the entry they sit under — **all of
 * them**.
 *
 * Nothing is served from this. What a browser asks for is one section of it at
 * a time (`searchProseFor`), and this is the whole that those are cut from, so
 * that the cut is a partition of one list rather than four walks over the site
 * that could disagree about which words a reader can find. It is also what the
 * caps are measured against: `build.test.ts` holds the sum of the parts against
 * this, which is the only way to tell a split that costs what a split costs
 * from one that has quietly started repeating itself.
 */
export const searchProse = (): SearchProse => ({
  bodies: buildSearchIndex()
    .entries.filter((entry) => entry.body !== "")
    .map((entry) => [entry.href, entry.body] as const),
})

/**
 * The words of one section.
 *
 * A filter over the whole rather than a walk of its own, which is what makes
 * the four files a partition: every body is in exactly one of them because
 * every address has exactly one section, and `docsSectionOfPath` is the one
 * function that says which — the same one the browser uses to decide what to
 * ask for. A section nobody has written words under answers with an empty list
 * rather than a 404, so the browser can ask for every section the table of
 * contents mentions without holding a second idea of which of them are written.
 */
export const searchProseFor = (sectionSlug: string): SearchProse => ({
  bodies: searchProse().bodies.filter(([href]) => docsSectionOfPath(href) === sectionSlug),
})

/** The blocks nobody waits for, keyed the same way. */
export const searchCode = (): SearchCode => ({
  blocks: buildSearchIndex()
    .entries.filter((entry) => entry.code !== "")
    .map((entry) => [entry.href, entry.code] as const),
})
