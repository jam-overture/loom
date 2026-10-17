import { docsHref, writtenDocsSections } from "../nav"
import { readPageHeadings } from "../search/headings"

/**
 * Which addresses have a contents list, decided before the browser is involved.
 *
 * ## The plain version
 *
 * The bar above a narrow page offers *On this page*, and seventeen of the
 * site's forty-eight pages have nothing to offer there. Until now the only way
 * to find that out was to render the page and look, which happens in the
 * browser — so the server sent every page without the control and the browser
 * added it a moment later, and the prose a reader had already started reading
 * moved down under them.
 *
 * This is the list that stops that: the addresses whose pages have sections,
 * worked out while the site is being built, so the bar is the right height in
 * the HTML the server sends.
 *
 * ## It says whether there is a list and never what is in it
 *
 * That line is the whole of why this is safe, and it is worth stating because
 * the obvious objection is right: `on-this-page.ts` argues at length that the
 * rows have to come out of the rendered document, because two *Architecture*
 * pages get most of their headings from a component rather than from their own
 * markdown, and a list compiled from the source would show five rows for a page
 * with thirteen places to land.
 *
 * All of that is still true and none of it is weakened here, because **this is
 * not a list of rows.** It is a set of addresses, and the only question asked
 * of a page is *does it have at least one section*. A page whose markdown holds
 * one `##` has at least one section however many more a component adds, so
 * reading the markdown gives the right answer for a question about zero or
 * more — which is the only question the layout needs to reserve a height.
 *
 * The rows a reader presses still come from the document walk, on every page,
 * unchanged.
 *
 * ## What would make it wrong, and what fails when it does
 *
 * One page shape would break it: a written page with no `##` of its own whose
 * headings all come from a component. There is no such page today, and
 * `pages.test.ts` holds that there is not — so the day somebody writes one it
 * fails on that branch, with a sentence naming the page, rather than quietly
 * costing that page its contents control.
 *
 * A **generated** page is simply not in the set, and that is not an
 * approximation either: the `id` on one of those pages is on the `<section>`
 * around the heading rather than on the heading, so nothing the walk looks for
 * matches, and those pages carry a contents list of their own shaped for sixty
 * module names.
 *
 * ## Read at build time, like everything else that reads the pages
 *
 * `search/headings.ts` already reads every written page's source to build the
 * index, and this borrows that reader rather than opening the files a second
 * time with a second idea of what a heading is. It runs in `next build` and in
 * the tests, never in a browser: what reaches a reader is the one boolean the
 * layout turned it into.
 */
export const HREFS_WITH_SECTIONS: readonly string[] = writtenDocsSections.flatMap((section) =>
  section.pages.flatMap((page) =>
    readPageHeadings(section.slug, page.slug).length === 0
      ? []
      : [docsHref(section.slug, page.slug)]
  )
)
