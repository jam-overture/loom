import Link from "next/link"

import { ListOrder } from "@/app/(portal)/_components/list-order"
import { PageName } from "@/app/(portal)/_components/page-name"
import type { MissedPage } from "@/app/(portal)/_lib/calibration-misses"
import { formatRate } from "@/app/(portal)/_lib/calibration-view"
import { nameFrom, type PageName as PageNameValue } from "@/app/(portal)/_lib/page-name"
import { inPageOrder, mostWrongRank } from "@/app/(portal)/_lib/page-order"
import { pageViewHref } from "@/app/(portal)/_lib/page-views"

/**
 * Which of your pages the AI has been wrong about.
 *
 * ## Why this is the list this screen was missing
 *
 * Everything else on `/portal/trust` is about the AI. The verdict is a rate, the
 * bands are how the rate was computed, and the groups under *Where it was wrong
 * about itself* name a **kind** of change the AI keeps misjudging. All of it is
 * true and none of it names a thing a reader can open.
 *
 * `MissedClaim` has carried the page each claim was made against since the day it
 * was written, and no part of this screen rendered it. So six overconfident
 * claims all made against one page looked exactly like six made against six, and
 * those want opposite next moves: one is a page to go and look at, the other is a
 * gate floor to think about.
 *
 * ## Why the row leads to this same screen, scoped
 *
 * Not to the page. A reader who has just been told the AI is unreliable about a
 * page wants the rest of *this* question about that page — the bands, the
 * verdict, the policy breakdown, all of it narrowed — and `/portal/trust` has
 * read a `tree` parameter since it was written. Sending them to the page itself
 * would answer a question they have not asked yet, and the strip on the scoped
 * view is one press from the page anyway.
 *
 * ## The whole row is the press, which is `/portal/pages`' shape and not a new one
 *
 * A bordered row that fills on hover, with the name and both figures inside it.
 * The first draft made the name alone the link and the screenshot showed why that
 * does not work here: Tailwind's preflight sets `a { text-decoration: inherit }`,
 * so a bare link in this portal is drawn as plain text and the one pressable
 * thing on the row was indistinguishable from the two beside it. Every other list
 * of pages in this portal solves it the same way and this one now matches them,
 * which also makes the press the size of the row rather than the size of a name.
 *
 * ## What it does not claim
 *
 * A count of wrong claims is not a count of bad pages, and the sentence says so
 * rather than implying it: the AI being wrong about a page is a fact about the
 * AI. 0031 makes calibration a reader and nothing more, so this list names pages
 * and recommends nothing — a reader with it in front of them may well decide a
 * floor is in the wrong place, and that decision is theirs.
 */
export const WrongPages = ({
  pages,
  names,
}: {
  /**
   * Grouped by the fold and arranged here, which is the convention every list of
   * pages in this portal follows and the reason `every-page-list.test.ts` can
   * enforce it: the file that keys a row on a tree id is the file that has to
   * show its order, so a list cannot pass the rule by having somebody else sort
   * for it.
   */
  readonly pages: readonly MissedPage[]
  /**
   * Passed in rather than read here, the rule every list in this portal follows:
   * a component that read a store per row would turn one listing into one read
   * per page.
   */
  readonly names: ReadonlyMap<string, PageNameValue>
}) => {
  const ordered = inPageOrder(pages, (page) => ({
    rank: mostWrongRank(page),
    page: nameFrom(names, page.treeId),
  }))

  return (
  <section className="flex flex-col gap-3">
    <div className="flex flex-col gap-1">
      <h2 className="text-base tracking-tight">Which pages it was wrong about</h2>
      <p className="text-ink-muted text-xs">
        {pages.length === 1
          ? "Every one of the wrong claims above was made about the same page."
          : `The wrong claims above were spread across ${pages.length} of your pages.`}{" "}
        This says nothing about the pages themselves — a page here is one the AI
        misjudged, not one with anything wrong with it.
      </p>
    </div>

    <ListOrder order="most-wrong-first" />

    <ul className="flex flex-col gap-2">
      {ordered.map((page) => (
        <li key={page.treeId}>
          <Link
            href={pageViewHref("trust", page.treeId)}
            className="border-edge-subtle bg-surface-base hover:bg-surface-hover flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border p-4 no-underline"
          >
            {/*
              * The name and the id together, which is the pairing `PageName`
              * exists to make impossible to drop. 22 August settled that identity
              * is not technical detail: a reader who cannot see which page a row
              * is about cannot act on the row.
              */}
            <PageName page={nameFrom(names, page.treeId)} />

            <span className="text-ink-secondary text-xs">
              {page.claims.length} wrong {page.claims.length === 1 ? "claim" : "claims"}
            </span>

            {/*
              * The worst claim on the page, in the words the rows above use for
              * the same number. Two pages holding three claims each are tied on
              * the rung this list ranks by, and this is the figure a reader
              * comparing them is actually looking at — so it is on the row rather
              * than left for them to open two scopes and count.
              */}
            <span className="text-ink-muted ml-auto text-2xs">
              worst was {formatRate(page.worstSurprise)} wide of the mark
            </span>
          </Link>
        </li>
      ))}
    </ul>
  </section>
  )
}
