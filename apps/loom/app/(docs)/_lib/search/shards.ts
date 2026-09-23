import type { SearchIndex } from "./model"

/**
 * Which file of words an address belongs to, and in what order a reader should
 * be sent them.
 *
 * **The plain version first.** The site's words are one download today. They
 * are the biggest thing the search box fetches, they grow every time anybody
 * writes a paragraph, and a reader standing on a page about the runtime waits
 * for the marketing-length prose of every other section before the words of the
 * one they are standing in arrive. So the words are cut into one file per
 * section, and the reader's own section is asked for first.
 *
 * **What that buys, precisely.** Two things, and they are different:
 *
 * - **Ordering.** The fourth band of the ranking — find a sentence, not just a
 *   heading — turns on for the section a reader is reading before it turns on
 *   for the rest of the site. That is the band most likely to answer them,
 *   because somebody searching from *The runtime* is usually searching the
 *   runtime.
 * - **A number that means something.** The cap on the words was one number over
 *   the whole site, so it moved for four unrelated reasons and told nobody
 *   which. It is now one number per section plus a bill, and each has its own
 *   remedy when it fires. `build.test.ts` carries both.
 *
 * **What it does not buy: fewer bytes.** A reader who leaves the box open still
 * receives every section's words, and receives slightly *more* of them —
 * compression works on one file at a time, so four files of the same text cost
 * about 6% more than one. That is the price of the ordering, it is measured
 * rather than assumed (`build.test.ts` holds it under 10%), and it is the same
 * trade the first split made.
 *
 * Nothing here touches the filesystem, because the browser runs both functions
 * below: the builder decides which body goes in which file, and the browser
 * decides which file to ask for, **from one statement of what a docs address
 * looks like** rather than two that could drift into a search box whose every
 * prose fetch 404s.
 */

/**
 * The section slug in a docs address, or nothing where there is not one.
 *
 * The inverse of `docsHref`, and the only one. A page's address is
 * `/docs/<section>/<page>`, a heading's is that with a fragment, and an
 * export's is a reference page — which is a docs address like any other and
 * whose section is `api-reference`.
 *
 * Anything else — the docs root, a fragment alone, some other surface's path —
 * has no section, and a reader standing on one simply has no section of their
 * own to be sent first. `shards.test.ts` holds this against every real address
 * `docsHref` builds rather than against examples.
 */
export const docsSectionOfPath = (path: string): string | undefined => {
  const [, docs, section] = path.split("#")[0]?.split("/") ?? []

  return docs === "docs" && section !== undefined && section !== "" ? section : undefined
}

/**
 * Every section the table of contents mentions, in reading order.
 *
 * Read off the contents file rather than from `nav.ts`, and that is deliberate
 * rather than convenient: `nav.ts` reaches the generated API reference, and
 * importing it into the search box would put the runtime's whole published
 * surface in the bundle of every page on this site. The contents file is
 * already in the browser's hands, it is already in reading order, and it is
 * already the site's one statement of what it contains.
 *
 * A section with nothing written in it — the API reference, whose pages are
 * built from data — is included and answers with an empty file. Leaving it out
 * would mean the browser holding a second idea of which sections are written,
 * which is the drift this module exists to avoid, and an empty file costs
 * thirteen bytes.
 *
 * **In reading order, and nothing depends on that.** The reader's own section
 * is asked for on its own, before this list is even known; what is left has no
 * order worth choosing between, and the alternative — sending for them one at a
 * time to honour one — would make the rest of the site's words arrive much
 * later to settle a question nobody is asking.
 */
export const proseSectionsIn = (index: SearchIndex): readonly string[] =>
  index.entries.reduce<readonly string[]>((sections, entry) => {
    const section = docsSectionOfPath(entry.href)

    return section === undefined || sections.includes(section) ? sections : [...sections, section]
  }, [])
