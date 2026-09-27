import Link from "next/link"

import { describeStoreError } from "@jam-overture/loom/store"

import { PageName } from "@/app/(portal)/_components/page-name"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { nameFrom, namesOf } from "@/app/(portal)/_lib/page-name"
import { ensureSeeded, portalStore, storeIsDurable } from "@/app/(portal)/_lib/store"
import { portalHolds } from "@/app/(portal)/_lib/write"
import { pagesWaitingSummary, unreadableMark } from "@/app/(portal)/_lib/unreadable-change"

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

  /**
   * The names, read alongside the holds rather than after them.
   *
   * A listing gives an id and a revision and nothing a person recognises, so
   * each row's name comes from the page itself — one bounded read each, the same
   * trade this screen already makes for the waiting count. A name that cannot be
   * read costs the name only: the row still lists, still links, and still shows
   * its id.
   */
  const names = await namesOf(
    portalStore,
    trees.map((listing) => listing.treeId)
  )

  const summaries = await Promise.all(
    trees.map(async (listing) => {
      const holds = await portalHolds.forTree(listing.treeId)

      return {
        page: nameFrom(names, listing.treeId),
        treeId: listing.treeId,
        revision: listing.revision,
        waiting: holds.ok ? holds.value.held.length : null,
        /*
         * The rows this build could place and could not read, counted but never
         * folded into `waiting`.
         *
         * 0175's listing answers both halves and this screen took `.held` and
         * dropped the rest, so a page whose only waiting change was one of
         * these listed with no mark on it at all — indistinguishable from a
         * page with nothing happening on it. The count beside it stays a count
         * of what somebody can actually answer; see `pagesWaitingSummary`.
         */
        unreadable: holds.ok ? holds.value.unreadable.length : 0,
      }
    })
  )

  return (
    <div className="flex max-w-xl flex-col gap-4 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl tracking-tight">Your pages</h1>
        <p className="text-ink-muted text-sm">
          {summaries.length === 0
            ? "Pages that Loom is looking after will show up here."
            : pagesWaitingSummary(summaries)}
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
                  <PageName page={page.page} />
                  <span className="text-ink-muted text-xs">
                    {page.revision} {page.revision === 1 ? "change" : "changes"} applied
                  </span>
                </span>

                {/*
                 * Two marks, never one number covering both.
                 *
                 * A page with four answerable changes and one row from a later
                 * build reads "4 waiting on you · 1 can't be read", and a page
                 * whose only row is the second one gets the second mark alone.
                 * That last case is the one worth the second element: before
                 * this it was a row with no mark on it, which on an index whose
                 * whole job is "which of these needs me" reads as *nothing is
                 * happening here*.
                 */}
                <span className="flex shrink-0 items-center gap-1.5">
                  {page.waiting !== null && page.waiting > 0 && (
                    <span className="bg-awaiting text-awaiting-ink rounded-sm px-2 py-1 text-xs">
                      {page.waiting} waiting on you
                    </span>
                  )}
                  {page.unreadable > 0 && (
                    <span className="border-edge-subtle text-ink-muted rounded-sm border border-dashed px-2 py-1 text-xs">
                      {unreadableMark(page.unreadable)}
                    </span>
                  )}
                </span>
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
            No database is set up, so anything you accept lives only until the server restarts
            &mdash; and a change waiting for your answer can disappear before you get to it.
          </p>
          <TechnicalDetail summary="What to set, and why it matters more than it sounds">
            <p>
              Trees and held proposals both live in the server process. Locally that lasts as
              long as <span className="font-mono">pnpm dev</span>; on a serverless deployment an
              accepted change may not be there when you reload, because the next request can be
              served by a different instance. Set{" "}
              <span className="font-mono">DATABASE_URL</span> to make writes durable.
            </p>
            <p>
              A hold is the worse half of it, and the one nothing on screen would give away. The
              instance that judged a change is usually gone before a reviewer opens the queue, so
              a confirmation arrives somewhere that has never heard of the proposal and comes
              back as <span className="font-mono">not-held</span> &mdash; which reads as
              &ldquo;already answered&rdquo; and is not.
            </p>
          </TechnicalDetail>
        </StateNotice>
      )}
    </div>
  )
}

export default PagesPage
