import Link from "next/link"

import { PageName } from "@/app/(portal)/_components/page-name"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { nameFrom, type PageName as PageNameValue } from "@/app/(portal)/_lib/page-name"
import type { UnreadablePage } from "@/app/(portal)/_lib/waiting"

/**
 * The pages the front door asked and could not get an answer out of.
 *
 * The screen has always known these. The queue is one hold read per listed
 * page, so a failure arrives beside the page it belongs to — and everything
 * except the *number* of them was being dropped on the floor. What a reader got
 * was *"One page couldn't be checked."* above a notice telling them to **open
 * the page you are worried about**, with no way to know which page that was.
 *
 * So this is not a new reading and it is not a warning being made louder. It is
 * the same warning stopping short of the one fact that makes it actionable.
 *
 * ## Why each row is a link and the count never was
 *
 * A reader meeting this has exactly one move: go and look at the page itself,
 * because the page screen reads that page's queue directly rather than through
 * this fan-out, and it will either show what is waiting or fail in front of
 * them with the same honesty. A count cannot be followed. A named page can.
 *
 * ## What is on the surface and what is one click down
 *
 * The name, the id and the plain sentence are unasked, because they are what
 * decides whether a reader goes and looks. The store's own account of the
 * failure — *"the holding store is unavailable: …"* — is under one disclosure
 * for the whole list rather than one per row, for the reason the checkup's
 * difference list gives: the plain sentence for a code is the same sentence
 * every time, so a per-row disclosure hides the only thing that tells two rows
 * apart behind as many clicks as there are rows.
 *
 * ## The name comes from outside
 *
 * A page is named by reading its head, and the screen above has already done
 * that for every page it lists. Reading it again here would be a second query
 * for a string already in hand, and a row carrying its own copy would be a
 * second source for something `page-name.ts` keeps in one. `nameFrom` answers
 * for a page that would not read, which is exactly the page most likely to be
 * in this list.
 */
export const UnreadablePages = ({
  pages,
  names,
}: {
  readonly pages: readonly UnreadablePage[]
  readonly names: ReadonlyMap<string, PageNameValue>
}) => (
  <div className="flex flex-col gap-3">
    <ul className="flex flex-col gap-3">
      {pages.map((page) => (
        <li key={page.treeId} className="border-edge-subtle flex flex-col gap-1 border-l-2 pl-3">
          <PageName page={nameFrom(names, page.treeId)} />
          <span className="text-ink-muted">{page.why}</span>
          <Link href={page.href} className="w-fit">
            Open this page →
          </Link>
        </li>
      ))}
    </ul>

    <TechnicalDetail summary="What the store said about each of them">
      <ul className="flex flex-col gap-2">
        {pages.map((page) => (
          <li key={page.treeId}>
            <span className="font-mono">{page.treeId}</span>
            <span className="text-ink-muted mt-1 block font-mono">{page.technical}</span>
          </li>
        ))}
      </ul>
      {/*
       * The thing this screen cannot tell a reader, said where the codes are.
       *
       * A hold store answers one error code for every reason a read can fail, so
       * a database that did not respond and a change record this deployment
       * cannot read arrive here identically — and those want opposite next
       * moves. Saying so is better than a plain sentence that guesses, and it
       * belongs beside the account rather than on the surface, because it is a
       * fact about the runtime rather than about the reader's page.
       */}
      <p className="text-ink-muted">
        This does not say whether the page could not be reached or whether Loom could not read
        something it holds. Those want different things from you and the store reports them the
        same way; a read that failed for either reason is the account above.
      </p>
    </TechnicalDetail>
  </div>
)
