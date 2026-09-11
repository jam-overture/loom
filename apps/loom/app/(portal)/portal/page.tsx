import Link from "next/link"

import { describeStoreError } from "@loom/runtime/store"

import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { WaitingCard } from "@/app/(portal)/_components/waiting-card"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { ensureSeeded, portalStore } from "@/app/(portal)/_lib/store"
import {
  inQueueOrder,
  sweepIsPartial,
  waitingChange,
  waitingSummary,
} from "@/app/(portal)/_lib/waiting"
import { holdsAreDurable, portalHolds } from "@/app/(portal)/_lib/write"

/**
 * The portal's front door.
 *
 * It was seven lines and a `redirect` to the page list, which meant the first
 * screen of a review tool was a list of things to review *on*, sorted by
 * nothing, with the actual queue a click and a scroll inside each one. A
 * developer wanting to know whether anything needed them had to open every page
 * to find out that the answer was no.
 *
 * So this screen has one subject and it is the one thing in Loom that is
 * genuinely urgent: **the changes waiting for an answer, wherever they are.**
 * A hold exists because the Gate declined to decide alone (0019); it lives in
 * the runtime's hold store and nowhere else, so no repository, no build log and
 * no `git log` has ever seen one. It is the only thing on this deployment that
 * is waiting on a human being.
 *
 * The holds are read per listed page rather than in one call, because the hold
 * store's contract is per-tree — the same trade `/portal/pages` already makes,
 * bounded the same way, by one page of trees. A page whose holds cannot be read
 * is counted as unreadable and said out loud rather than dropped: a queue that
 * quietly under-reports is worse than one that admits a gap, on the one screen
 * whose whole claim is that it is where you find out whether anything needs you.
 */
const PortalHome = async () => {
  await requireActor("/portal")
  await ensureSeeded()

  const listed = await portalStore.list({})

  if (!listed.ok) {
    return (
      <div className="flex max-w-2xl flex-col gap-4 p-8">
        <h1 className="text-2xl tracking-tight">Waiting on you</h1>
        <StateNotice tone="failure" title="We couldn't check what's waiting.">
          <p>
            Nothing has been lost, and nothing has been decided without you — looking for waiting
            changes only reads them. Try again in a moment.
          </p>
          <TechnicalDetail>
            <p className="font-mono">{describeStoreError(listed.error)}</p>
            <p>
              This is the store that holds your pages declining to list them, not a deployment
              with nothing in it. The two look alike on screen and are opposites.
            </p>
          </TechnicalDetail>
        </StateNotice>
      </div>
    )
  }

  const { trees, cursor } = listed.value

  const perPage = await Promise.all(
    trees.map(async (listing) => await portalHolds.forTree(listing.treeId))
  )

  const changes = inQueueOrder(
    perPage.flatMap((holds) => (holds.ok ? holds.value.map(waitingChange) : []))
  )

  /*
   * What this screen did *not* look at, carried beside what it found.
   *
   * A listing comes back with a cursor when there is another page behind it,
   * and this screen takes one listing page and fans out from it. So `complete`
   * is that cursor, read as the only thing it means here: whether "nothing is
   * waiting" is an answer about the deployment or about part of it.
   */
  const sweep = {
    unreadable: perPage.filter((holds) => !holds.ok).length,
    complete: cursor === null,
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl tracking-tight">Waiting on you</h1>
        <p className="text-ink-muted text-sm">{waitingSummary(changes, sweep)}</p>
      </header>

      {/*
       * Said once, near the top, and only when it is true.
       *
       * The summary above already carries the short version, because a reader
       * who reads nothing else must not be misled by the count. This is the rest
       * of it: what the limit is, and the one thing a person can actually do
       * about it today — open the page they are worried about rather than trust
       * this screen about it.
       */}
      {sweepIsPartial(sweep) && (
        <StateNotice tone="notice" title="This screen hasn't checked everything.">
          {/*
           * No link out of this paragraph, deliberately. The one thing to do
           * about a partial sweep is to open the page you are worried about,
           * and "Your pages →" is already in the strip at the foot of this
           * screen — the caught-up state shipped that same destination twice,
           * six lines apart, and it read as a mistake rather than as emphasis.
           * A second copy of it inside a warning would read worse.
           */}
          <p>
            What is listed below really is waiting for you. What is <em>not</em> listed is not a
            promise that nothing else is — so if a page you are expecting is missing here, open
            it from your pages and look at it directly rather than taking this screen&rsquo;s
            word for it.
          </p>
          <TechnicalDetail summary="Why a queue over every page has a limit">
            <p>
              Changes waiting for an answer are kept per page, and there is no way to ask for
              all of them at once — so this screen lists your pages and then asks each one in
              turn. A listing comes back a page at a time by design, and a page whose read fails
              is counted rather than skipped.
            </p>
            <p>
              {sweep.unreadable > 0
                ? `${sweep.unreadable} of the pages this screen reached could not be read.`
                : "Every page this screen reached was read successfully."}{" "}
              {sweep.complete ? "It reached all of them." : "There are more pages than it reached."}
            </p>
          </TechnicalDetail>
        </StateNotice>
      )}

      {trees.length === 0 ? (
        /*
         * The first screen a new deployment shows, and the one a person is most
         * likely to be looking at when they decide whether this is worth their
         * afternoon. It gets the strongest action on the surface.
         */
        <StateNotice
          tone="empty"
          title="You don't have any pages yet, so nothing can be waiting."
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
            watch Loom decide whether to do it, ask you first, or turn it down — which is exactly
            what this screen is for once you have pages of your own.
          </p>
          <TechnicalDetail summary="Why this deployment has no pages">
            <p>
              A tree arrives one of two ways: a host calls <span className="font-mono">create</span>{" "}
              on a store handle, or this portal seeds one on first read. Seeing nothing here means
              neither has happened against the store this deployment is pointed at.
            </p>
          </TechnicalDetail>
        </StateNotice>
      ) : changes.length === 0 ? (
        <StateNotice
          tone="empty"
          title="You're all caught up."
          /*
           * Not "Your pages", which is two lines below in the strip and again
           * in the rail — the first screenshot of this state had the same link
           * twice, six lines apart, which reads as a mistake rather than as
           * emphasis. When nothing needs answering, the standing question is
           * whether the changes Loom made *without* asking were sound, and
           * that is a different screen.
           */
          action={
            <Link href="/portal/trust" className="no-underline">
              Has the AI been getting it right? →
            </Link>
          }
        >
          <p>
            When Loom is unsure about a change, it stops and asks you here instead of guessing.
            Nothing has stopped for you on any page.
          </p>
          <TechnicalDetail summary="What an empty queue does and doesn't mean">
            <p>
              Changes the Gate accepts are written without asking, and ones it refuses outright
              never reach you — a hold is the middle case, where the stakes were high enough that
              the Gate declined to decide alone. An empty queue is the Gate having decided, not
              having stalled.
            </p>
          </TechnicalDetail>
        </StateNotice>
      ) : (
        <ul className="flex flex-col gap-3">
          {changes.map((change) => (
            <WaitingCard key={change.proposalId} change={change} />
          ))}
        </ul>
      )}

      {/*
        * Every screen in the portal is a view of the same deployment, and this
        * one is where somebody arrives. The two links out say what the other
        * questions are: which pages there are, and everything that has ever
        * been asked of them.
        *
        * Withheld when there are no pages, because both of them lead to an
        * empty screen and a strip of dead ends under an empty state is worse
        * than no strip. The one thing to do then is the empty state's own
        * action.
        */}
      {trees.length > 0 && (
        <nav className="text-ink-muted flex flex-wrap gap-4 text-xs">
          <Link href="/portal/pages">Your pages →</Link>
          <Link href="/portal/activity">Everything anyone has asked for →</Link>
        </nav>
      )}

      {holdsAreDurable ? null : (
        <StateNotice tone="notice">
          <p>
            <strong className="font-medium">
              Changes waiting here won&rsquo;t survive a restart.
            </strong>{" "}
            No database is set up, so this queue lives in the server&rsquo;s memory.
          </p>
          <TechnicalDetail summary="Why a waiting change is the most fragile thing in Loom">
            <p>
              A change that has been applied is in the page&rsquo;s log and can be replayed. A
              change that is waiting for you has not been accepted into anything yet, so it exists
              in one place only. On a serverless deployment that is sharper than it sounds: the
              next request can be served by a different instance, so a change waiting for you may
              simply not be there when you come back to answer it. Set{" "}
              <span className="font-mono">DATABASE_URL</span>, then run{" "}
              <span className="font-mono">pnpm db:push</span>, and this queue is kept in the
              database with everything else.
            </p>
          </TechnicalDetail>
        </StateNotice>
      )}
    </div>
  )
}

export default PortalHome
