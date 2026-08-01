import Link from "next/link"

import { describeStoreError } from "@loom/runtime/store"

import { portalStore } from "@/lib/store"

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

  if (!page.ok) return <p className="text-ink-muted text-sm">{describeStoreError(page.error)}</p>

  const { trees } = page.value

  if (trees.length === 0) {
    return <p className="text-ink-muted text-sm">No trees stored, so there is nothing to read.</p>
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
              href={`/history?tree=${encodeURIComponent(listing.treeId)}`}
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
