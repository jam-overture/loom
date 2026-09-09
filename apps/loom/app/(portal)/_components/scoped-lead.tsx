import { PageName } from "@/app/(portal)/_components/page-name"
import type { PageName as PageNameValue } from "@/app/(portal)/_lib/page-name"
import { scopedLead, type ScopedView } from "@/app/(portal)/_lib/page-views"

/**
 * The sentence a screen leads with when it is showing one page rather than all
 * of them, with the page named in the middle of it.
 *
 * `PlainSentence` renders a `PlainLine` whose subject is a single monospace
 * name, which is right for a node id or a rule code and wrong for a page: a
 * page is two things a reader needs at once — what it is called, and what it is
 * called by the runtime — and the portal has rendered that pair as
 * `<PageName>` since 6 September everywhere except here.
 *
 * So this takes the view and the page rather than a line and a page. The line
 * is derived from them, which is what makes it impossible to render one page's
 * name inside another page's sentence — the failure that a component taking
 * both a `PlainLine` and a `PageName` would allow, and which no test written
 * about either one would see.
 */
export const ScopedLead = ({
  view,
  page,
}: {
  readonly view: ScopedView
  readonly page: PageNameValue
}) => {
  const line = scopedLead(view, page)

  return (
    <>
      {line.before}
      <PageName page={page} layout="inline" />
      {line.after}
    </>
  )
}
