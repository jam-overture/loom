import Link from "next/link"

import { describeStoreError } from "@loom/runtime/store"

import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { ensureSeeded, portalStore, storeIsDurable } from "@/app/(portal)/_lib/store"

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
  await requireActor("/portal/trees")
  await ensureSeeded()
  const page = await portalStore.list(after === undefined ? {} : { cursor: after })

  if (!page.ok) {
    return (
      <div className="flex max-w-xl flex-col gap-4 p-8">
        <h1 className="text-2xl tracking-tight">trees</h1>
        <StateNotice tone="failure" title="The store could not be listed.">
          <p>{describeStoreError(page.error)}</p>
          <p>
            This is not an empty store — it is a store that did not answer. Nothing has been
            lost by this page; a listing is a read.
          </p>
        </StateNotice>
      </div>
    )
  }

  const { trees, cursor } = page.value

  return (
    <div className="flex max-w-xl flex-col gap-4 p-8">
      <h1 className="text-2xl tracking-tight">trees</h1>

      {trees.length === 0 ? (
        <StateNotice
          tone="empty"
          title="The store has no trees in it."
          action={<Link href="/portal/demo">try the demo →</Link>}
        >
          <p>
            A tree arrives one of two ways: a host calls{" "}
            <span className="font-mono">create</span> on a store handle, or this portal seeds
            one on first read. Seeing nothing here means neither has happened against the
            store this deployment is pointed at.
          </p>
          <p>
            The demo needs no store and no account — it runs a tree in memory so you can watch
            a change be proposed, weighed and recorded before committing a database to it.
          </p>
        </StateNotice>
      ) : (
        <ul className="flex flex-col gap-2">
          {trees.map((listing) => (
            <li key={listing.treeId}>
              <Link
                href={`/portal/trees/${listing.treeId}`}
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
        <Link href={`/portal/trees?after=${encodeURIComponent(cursor)}`} className="text-xs">
          next page →
        </Link>
      )}

      {storeIsDurable ? null : (
        <StateNotice tone="notice">
          <p>
            No database is configured, so trees live in the server process. Locally that lasts
            as long as `pnpm dev`; on a serverless deployment an accepted change may not be
            there when you reload, because the next request can be served by a different
            instance. Set <span className="font-mono">DATABASE_URL</span> to make writes
            durable.
          </p>
        </StateNotice>
      )}
    </div>
  )
}

export default TreesPage
