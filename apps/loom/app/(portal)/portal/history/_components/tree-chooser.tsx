import Link from "next/link"

import { describeStoreError } from "@jam-overture/loom/store"

import { ListOrder } from "@/app/(portal)/_components/list-order"
import { PageName } from "@/app/(portal)/_components/page-name"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { nameFrom, namesOf } from "@/app/(portal)/_lib/page-name"
import { inPageOrder, mostChangedRank } from "@/app/(portal)/_lib/page-order"
import { portalStore } from "@/app/(portal)/_lib/store"

/**
 * Which tree's log to read.
 *
 * A revision log belongs to one tree — the store's own read takes a tree id,
 * because a cursor over several logs at once would need a total order across
 * them and the store holds no such thing (0020). So the unscoped route asks
 * rather than guessing, and says how long each log is, which is the only thing
 * worth knowing before opening one.
 */
export const TreeChooser = async () => {
  const page = await portalStore.list()

  if (!page.ok) {
    return (
      <StateNotice tone="failure" title="We couldn&rsquo;t list your pages.">
        <p>
          There may well be history to read; this screen could not find out which pages have any.
          Nothing has been lost &mdash; a list that would not load is not a page that went missing.
        </p>
        <TechnicalDetail summary="What went wrong">
          <p className="font-mono">{describeStoreError(page.error)}</p>
        </TechnicalDetail>
      </StateNotice>
    )
  }

  const { trees } = page.value
  /**
   * Named before the rows are drawn, so a chooser lists pages a person
   * recognises rather than a column of ids. One bounded read per listed page,
   * and a page whose name will not read is still offered — with its id, as
   * every row carries anyway.
   */
  const names = await namesOf(
    portalStore,
    trees.map((listing) => listing.treeId)
  )

  if (trees.length === 0) {
    return (
      <StateNotice
        tone="empty"
        title="You don&rsquo;t have any pages yet, so there is no history to read."
        action={<Link href="/portal/pages">Your pages →</Link>}
      >
        {/*
         * The reason is 0016 — the log is the truth and the tree is a view of it
         * — and the record number used to be printed at the reader, on a screen
         * whose whole test is whether somebody who has read no decision record
         * can follow it. The fact survives; the citation belongs here.
         */}
        <p>
          There is nothing to switch on. A page&rsquo;s history starts the moment the page does, so
          the first page you make already has one.
        </p>
      </StateNotice>
    )
  }

  /*
   * The longest history first, and not the order the store listed them in.
   *
   * This is a chooser in front of a log reader, so a page with nothing in its
   * history has nothing to open — and it could sit above one with forty changes
   * in it. `revision` is on every listing already and is printed on every row
   * here, so the order costs no read. The sentence above the list says *most
   * changes* rather than *most recent*, because that is what this number is: a
   * listing carries no time at all. See `_lib/page-order.ts`.
   */
  const ordered = inPageOrder(trees, (listing) => ({
    rank: mostChangedRank(listing),
    page: nameFrom(names, listing.treeId),
  }))

  return (
    <div className="flex flex-col gap-3">
      <p className="text-ink-muted text-sm">
        Each page keeps its own history. Pick one to read what has been changed on it.
      </p>

      <ListOrder order="most-changed-first" />

      <ul className="flex flex-col gap-2">
        {ordered.map((listing) => (
          <li key={listing.treeId}>
            <Link
              href={`/portal/history?tree=${encodeURIComponent(listing.treeId)}`}
              className="border-edge-subtle bg-surface-base hover:bg-surface-hover block rounded-md border p-4 no-underline"
            >
              <PageName page={nameFrom(names, listing.treeId)} />
              <span className="text-ink-muted mt-1 block text-xs">
                {listing.revision === 0
                  ? "No changes yet"
                  : `${listing.revision} ${listing.revision === 1 ? "change" : "changes"} so far`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
