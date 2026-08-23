import Link from "next/link"

import { describeStoreError } from "@loom/runtime/store"

import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { ensureSeeded, portalStore, storeIsDurable } from "@/app/(portal)/_lib/store"
import { portalHolds } from "@/app/(portal)/_lib/write"

/**
 * Every page this deployment holds, and the one number that decides whether a
 * developer opens the portal tomorrow.
 *
 * This was `/portal/trees`, and it listed a tree id and a revision number. Both
 * are true and neither is a reason to come back: a revision number tells you
 * the log is longer than it was, which `git log` also tells you. What nothing
 * else in the ecosystem can tell you is **how many changes are sitting waiting
 * for your answer, and on which page** — a hold exists only because the Gate
 * declined to decide alone (0019), it lives in the runtime's hold store, and no
 * repository, log or build output has ever seen one.
 *
 * So the count of waiting changes leads, and the revision count follows it. The
 * screen's question is "what do I do now", and its answer is a page with a
 * number beside it.
 *
 * The holds are read per listed page rather than in one call, because the hold
 * store's contract is per-tree. One bounded read each, on a page that lists at
 * most a page of trees — the same trade 0041 already made for attribution. A
 * hold read that fails costs the count and nothing else: a page whose waiting
 * changes cannot be counted still lists, and still opens.
 */
const PagesPage = async ({ searchParams }: { searchParams: Promise<{ after?: string }> }) => {
  const { after } = await searchParams
  await requireActor("/portal/pages")
  await ensureSeeded()
  /**
   * The cursor is passed straight back through the URL without being read. That
   * is the contract: a cursor is opaque to whoever holds it, so a consumer that
   * parsed one would be depending on an implementation detail of whichever
   * store it happened to be talking to.
   */
  const listed = await portalStore.list(after === undefined ? {} : { cursor: after })

  if (!listed.ok) {
    return (
      <div className="flex max-w-xl flex-col gap-4 p-8">
        <h1 className="text-2xl tracking-tight">Your pages</h1>
        <StateNotice tone="failure" title="We couldn't load your pages.">
          <p>
            Nothing has been lost — listing your pages only reads them, so whatever is stored is
            still stored. Try again in a moment.
          </p>
          <TechnicalDetail>
            <p className="font-mono">{describeStoreError(listed.error)}</p>
            <p>
              This is a store that did not answer, not a store with nothing in it. The two look
              alike on screen and are opposites: one is a database to go and look at, the other
              is a deployment nobody has written to yet.
            </p>
          </TechnicalDetail>
        </StateNotice>
      </div>
    )
  }

  const { trees, cursor } = listed.value

  const summaries = await Promise.all(
    trees.map(async (listing) => {
      const holds = await portalHolds.forTree(listing.treeId)

      return {
        treeId: listing.treeId,
        revision: listing.revision,
        waiting: holds.ok ? holds.value.length : null,
      }
    })
  )

  const waitingTotal = summaries.reduce((total, page) => total + (page.waiting ?? 0), 0)

  return (
    <div className="flex max-w-xl flex-col gap-4 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl tracking-tight">Your pages</h1>
        <p className="text-ink-muted text-sm">
          {summaries.length === 0
            ? "Pages that Loom is looking after will show up here."
            : waitingTotal === 0
              ? "Nothing is waiting for you. Open a page to see it or to ask for a change."
              : `${waitingTotal} ${waitingTotal === 1 ? "change is" : "changes are"} waiting for your answer.`}
        </p>
      </header>

      {summaries.length === 0 ? (
        <StateNotice
          tone="empty"
          title="You don't have any pages yet."
          action={
            <Link
              href="/demo"
              className="bg-affirm text-affirm-ink border-affirm-edge rounded-md border px-3 py-1.5 no-underline"
            >
              Try the demo →
            </Link>
          }
        >
          <p>
            The demo needs no account and no database. You type what you want changed, and you
            watch Loom decide whether to do it, ask you first, or turn it down — which is the
            whole of what this portal is for.
          </p>
          <TechnicalDetail summary="Why this deployment has no pages">
            <p>
              A tree arrives one of two ways: a host calls{" "}
              <span className="font-mono">create</span> on a store handle, or this portal seeds
              one on first read. Seeing nothing here means neither has happened against the
              store this deployment is pointed at.
            </p>
          </TechnicalDetail>
        </StateNotice>
      ) : (
        <ul className="flex flex-col gap-2">
          {summaries.map((page) => (
            <li key={page.treeId}>
              <Link
                href={`/portal/pages/${page.treeId}`}
                className="border-edge-subtle bg-surface-base hover:bg-surface-hover flex items-center justify-between gap-3 rounded-md border p-4 no-underline"
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-mono text-sm">{page.treeId}</span>
                  <span className="text-ink-muted text-xs">
                    {page.revision} {page.revision === 1 ? "change" : "changes"} applied
                  </span>
                </span>

                {page.waiting !== null && page.waiting > 0 && (
                  <span className="bg-awaiting text-awaiting-ink shrink-0 rounded-sm px-2 py-1 text-xs">
                    {page.waiting} waiting on you
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {cursor !== null && (
        <Link href={`/portal/pages?after=${encodeURIComponent(cursor)}`} className="text-xs">
          Next page →
        </Link>
      )}

      {storeIsDurable ? null : (
        <StateNotice tone="notice">
          <p>
            <strong className="font-medium">Changes here won&rsquo;t be kept.</strong>{" "}
            No
            database is set up, so anything you accept lives only until the server restarts.
          </p>
          <TechnicalDetail summary="What to set, and why it matters more than it sounds">
            <p>
              Trees live in the server process. Locally that lasts as long as{" "}
              <span className="font-mono">pnpm dev</span>; on a serverless deployment an accepted
              change may not be there when you reload, because the next request can be served by
              a different instance. Set <span className="font-mono">DATABASE_URL</span> to make
              writes durable.
            </p>
          </TechnicalDetail>
        </StateNotice>
      )}
    </div>
  )
}

export default PagesPage
