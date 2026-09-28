import Link from "next/link"

import type { LoomTree } from "@jam-overture/loom"

import { PageName } from "@/app/(portal)/_components/page-name"
import { PageThumbnail } from "@/app/(portal)/_components/page-thumbnail"
import type { PageName as PageNameValue } from "@/app/(portal)/_lib/page-name"
import { unreadableMark } from "@/app/(portal)/_lib/unreadable-change"

/**
 * One of a person's pages, as the front door shows it.
 *
 * ## What it is for
 *
 * `/portal` answered *what needs me* and never *what is my site*. A person
 * arriving with nothing waiting met an empty queue, which is the defect the
 * maintainer named on 27 September and `docs/portal.md` phase 1 exists to close.
 * This is the row that answers the second question, and the order of what is on
 * it is the answer to *what do I do now*:
 *
 * 1. **the page**, drawn, because it is the only thing here a person recognises
 *    at a glance and it exists nowhere else they could look at it;
 * 2. **what it is called, and its id**, because identity is not technical detail
 *    (22 August) and both halves are owed;
 * 3. **whether anything is waiting on it** — the one fact that turns looking into
 *    doing;
 * 4. **how much has happened to it**, which is the page's own history in one
 *    number.
 *
 * ## The whole card is the press
 *
 * `/portal/pages`' shape, and for the reason a screenshot established on
 * 27 September: Tailwind's preflight sets `a { text-decoration: inherit }`, so a
 * bare link in this portal draws as plain text. A name-sized target beside a
 * picture of the thing it names would be the one pressable part of a card
 * looking exactly like the parts that are not.
 *
 * ## The waiting mark is a count and a word, never a colour alone
 *
 * A page with three changes waiting and a page with none are told apart by
 * words. The tint is the palette's instruction that something changed, and it
 * carries no information a person who cannot see it would lose.
 *
 * The three states are the three `needsYouRank` distinguishes, because a card
 * that drew *nothing is waiting* and *we could not find out* identically is the
 * defect 24 September fixed on `/portal/pages` — and the fix does not transfer
 * by itself.
 */
export type PageCard = {
  readonly page: PageNameValue
  readonly treeId: string
  /** How many changes are waiting for an answer, or `null` when that could not be read. */
  readonly waiting: number | null
  /** Changes on this page this build could place and could not read. */
  readonly unreadable: number
  /** How many changes have been applied — the page's own version number. */
  readonly version: number
  /**
   * The page itself, when it could be read.
   *
   * Absent rather than a placeholder tree, and the card says so: a page that
   * would not read is a different fact from a page with nothing on it, and those
   * two drawn identically is the one confusion a dashboard must not create.
   */
  readonly tree: LoomTree | undefined
}

/**
 * The narrowest a card is allowed to get before the grid drops to fewer columns.
 *
 * A *minimum*, not a width — the card itself is fluid, and so is the picture in
 * it. The first draft made this the card's actual width and the phone shot came
 * back `scrollWidth 402 / innerWidth 390`, because a fixed picture plus the
 * card's own padding is wider than the track it sits in. A floor is the only
 * thing a grid needs to be told: below 288 a thumbnail stops being legible, so
 * the column count comes down instead.
 */
export const MIN_CARD_WIDTH = 288

export const PageCardLink = ({ card }: { readonly card: PageCard }) => (
  <Link
    href={`/portal/pages/${encodeURIComponent(card.treeId)}`}
    className="border-edge-subtle bg-surface-base hover:bg-surface-hover flex min-w-0 flex-1 flex-col overflow-hidden rounded-md border no-underline"
  >
    {card.tree === undefined ? (
      /*
       * Said, not drawn as an empty frame. An empty frame is what a page with
       * nothing on it looks like, and this is a page nobody could read.
       */
      <div
        className="border-edge-subtle text-ink-muted flex w-full items-center justify-center border-b border-dashed p-4 text-center text-2xs"
        style={{ aspectRatio: "8 / 5" }}
      >
        We couldn&rsquo;t read this page just now, so there&rsquo;s nothing to show. Open it to
        try again.
      </div>
    ) : (
      <PageThumbnail tree={card.tree} />
    )}

    <div className="border-edge-subtle flex min-w-0 flex-col gap-1.5 border-t p-3">
      <PageName page={card.page} />

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs">
        {card.waiting === null ? (
          <span className="bg-surface-hover text-ink-secondary rounded-sm px-1.5 py-0.5">
            We couldn&rsquo;t check what&rsquo;s waiting
          </span>
        ) : card.waiting > 0 ? (
          <span className="bg-awaiting text-awaiting-ink rounded-sm px-1.5 py-0.5">
            {card.waiting} {card.waiting === 1 ? "change" : "changes"} waiting for you
          </span>
        ) : (
          <span className="text-ink-muted">Nothing waiting</span>
        )}

        {card.unreadable > 0 && (
          <span className="text-ink-muted">{unreadableMark(card.unreadable)}</span>
        )}

        <span className="text-ink-muted ml-auto">
          {card.version} {card.version === 1 ? "change" : "changes"} so far
        </span>
      </div>
    </div>
  </Link>
)
