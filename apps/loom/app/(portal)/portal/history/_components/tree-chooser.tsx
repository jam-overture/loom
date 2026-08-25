import Link from "next/link"

import { describeStoreError } from "@loom/runtime/store"

import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
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

  return (
    <div className="flex flex-col gap-3">
      <p className="text-ink-muted text-sm">
        Each page keeps its own history. Pick one to read what has been changed on it.
      </p>

      <ul className="flex flex-col gap-2">
        {trees.map((listing) => (
          <li key={listing.treeId}>
            <Link
              href={`/portal/history?tree=${encodeURIComponent(listing.treeId)}`}
              className="border-edge-subtle bg-surface-base hover:bg-surface-hover block rounded-md border p-4 no-underline"
            >
              <span className="font-mono text-sm">{listing.treeId}</span>
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
