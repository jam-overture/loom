import Link from "next/link"

import { docsHref, docsPagesIn, docsSectionAt } from "@/app/(docs)/_lib/nav"

/**
 * The pages inside a section, listed on the section's own page.
 *
 * **The plain version.** Four addresses on this site used to serve nothing.
 * `/docs/api-reference` was a page; `/docs/getting-started` was a 404, and so
 * were the other three written sections. A reader who shortens an address — or
 * who is handed *the Architecture section* as a place rather than as a page —
 * arrived nowhere. Each section now has a page of its own, and this is the one
 * thing all four of them show.
 *
 * It is **navigation furniture** in the sense 0067 uses, the same family as the
 * rail and the pager: a list of the site's own addresses, arranged. It composes
 * no primitives and is not a component library growing inside a surface,
 * because nothing here is content — every title and every sentence below is
 * read out of `nav.ts`, which is the list the rail, the pager, the search index
 * and the page metadata all already read.
 *
 * That is the whole reason it is generated rather than written. A section's
 * landing page that typed its own list would be a second copy of the reading
 * order, and the first time a page moved the two would disagree with nothing
 * going red. The rail would say one order and the section's own page another.
 */

/**
 * One page: what it is called, and the one sentence that says whether you want
 * it.
 *
 * Rows rather than cards. A summary here is a full sentence — the shortest is
 * eleven words and the longest is forty-four — and a grid of cards sized for
 * the shortest clips the longest or sets every card to the height of it. A row
 * that stacks reads the same at 390 pixels and at 1280.
 *
 * The same shape as `api-doors.tsx` deliberately: these are the two pages on
 * this site whose subject is *a list of its own addresses*, and a reader who
 * has met one should recognize the other.
 */
const PageRow = ({
  href,
  title,
  summary,
}: {
  readonly href: string
  readonly title: string
  readonly summary: string
}) => (
  <li className="border-edge border-b py-3 last:border-b-0">
    <Link
      href={href}
      className="text-ink font-medium underline underline-offset-2 hover:no-underline"
    >
      {title}
    </Link>

    <p className="text-ink-muted mt-1 text-sm leading-relaxed">{summary}</p>
  </li>
)

/**
 * How many pages are under this one, as a sentence.
 *
 * Counted rather than typed: *seven pages* is a true sentence until somebody
 * adds an eighth, and nothing would go red the morning it stopped being one.
 * Exported, and a function of the number alone, so that the singular is a test
 * rather than a branch nothing has ever run — no section of this site has one
 * page, and one could.
 */
export const pagesInReadingOrder = (count: number): string =>
  `${count} ${count === 1 ? "page" : "pages"}, in reading order.`

/**
 * The section named by slug, in reading order.
 *
 * It throws on a slug no section has, which is `pageMetadata`'s idiom and is
 * there for the same reason: a landing page naming a section that does not
 * exist should fail the build while somebody is looking at the file, rather
 * than serve an empty list to a reader.
 */
export const PagesInThisSection = ({ section }: { readonly section: string }) => {
  const found = docsSectionAt(section)

  if (found === undefined) {
    throw new Error(`loom: no section of the documentation is called "${section}"`)
  }

  const pages = docsPagesIn(found)

  return (
    <div className="not-prose mt-6">
      <p className="text-ink-faint text-sm">{pagesInReadingOrder(pages.length)}</p>

      <ul className="mt-3 list-none pl-0">
        {pages.map((page) => (
          <PageRow
            key={page.slug}
            href={docsHref(found.slug, page.slug)}
            title={page.title}
            summary={page.summary}
          />
        ))}
      </ul>
    </div>
  )
}
