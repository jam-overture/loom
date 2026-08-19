import Link from "next/link"

import { describeStoreError } from "@loom/runtime/store"

import { StateNotice } from "@/app/(portal)/_components/state-notice"
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
      <StateNotice tone="failure" title="The store could not be listed.">
        <p>{describeStoreError(page.error)}</p>
        <p>There may well be logs to read; this page could not find out which.</p>
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
        <p>
          A log is the truth and the tree is a view of it (0016), so a log begins the moment a
          tree does — there is no separate thing to switch on. Store a tree and its history is
          already here.
        </p>
      </StateNotice>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-ink-muted text-sm">
        A log belongs to a tree. Pick one to read what has been accepted into it.
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
                {listing.revision} {listing.revision === 1 ? "accepted change" : "accepted changes"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
