import Link from "next/link"

import { describeStoreError } from "@loom/runtime/store"

import { portalStore } from "@/lib/store"

/**
 * Every tree the store can see — which is now a question the framework answers,
 * rather than one the portal worked around by remembering what it had seeded.
 *
 * The cursor is passed straight back through the URL without being read. That is
 * the contract: a cursor is opaque to whoever holds it, so a consumer that parsed
 * one would be depending on an implementation detail of whichever store it
 * happened to be talking to.
 */
const TreesPage = async ({ searchParams }: { searchParams: Promise<{ after?: string }> }) => {
  const { after } = await searchParams
  const page = await portalStore.list(after === undefined ? {} : { cursor: after })

  if (!page.ok) {
    return (
      <div className="p-8">
        <h1 className="text-2xl tracking-tight">trees</h1>
        <p className="text-ink-muted mt-2 text-sm">{describeStoreError(page.error)}</p>
      </div>
    )
  }

  const { trees, cursor } = page.value

  return (
    <div className="flex max-w-xl flex-col gap-4 p-8">
      <h1 className="text-2xl tracking-tight">trees</h1>

      {trees.length === 0 ? (
        <p className="text-ink-muted text-sm">No trees stored.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {trees.map((listing) => (
            <li key={listing.treeId}>
              <Link
                href={`/trees/${listing.treeId}`}
                className="border-edge-subtle bg-surface-base hover:bg-surface-hover block rounded-md border p-4 no-underline"
              >
                <span className="font-mono text-sm">{listing.treeId}</span>
                <span className="text-ink-muted mt-1 block text-xs">
                  revision {listing.revision} · {listing.revision}{" "}
                  {listing.revision === 1 ? "accepted change" : "accepted changes"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {cursor !== null && (
        <Link href={`/trees?after=${encodeURIComponent(cursor)}`} className="text-xs">
          next page →
        </Link>
      )}
    </div>
  )
}

export default TreesPage
