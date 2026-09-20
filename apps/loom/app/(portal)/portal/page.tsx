import Link from "next/link"

import type { TreeId } from "@loom/runtime"
import { describeStoreError } from "@loom/runtime/store"
import { describeTelemetryError, episodesOf } from "@loom/runtime/telemetry"

import { ElsewhereNote } from "@/app/(portal)/_components/elsewhere-note"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { UnattendedCard } from "@/app/(portal)/_components/unattended-card"
import { UnreadablePages } from "@/app/(portal)/_components/unreadable-pages"
import { WaitingCard } from "@/app/(portal)/_components/waiting-card"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { headsOf, nameFrom, namesIn } from "@/app/(portal)/_lib/page-name"
import { portalRegistry } from "@/app/(portal)/_lib/registry"
import { screenName } from "@/app/(portal)/_lib/screen-names"
import { ensureSeeded, portalStore } from "@/app/(portal)/_lib/store"
import { portalTelemetry } from "@/app/(portal)/_lib/telemetry"
import { unattendedIn, unattendedSummary } from "@/app/(portal)/_lib/unattended"
import {
  inQueueOrder,
  sweepIsPartial,
  unreadableIn,
  waitingChange,
  waitingSummary,
} from "@/app/(portal)/_lib/waiting"
import { triageAgainst } from "@/app/(portal)/_lib/waiting-effect"
import { holdsAreDurable, portalHolds } from "@/app/(portal)/_lib/write"

/**
 * How much of the record the second half of this screen reads.
 *
 * Smaller than the journal's own default of 200, and the reason is that this is
 * a front door rather than the record itself. An episode is a dozen or so
 * records, so this is the last handful of things that happened — which is what
 * "what has Loom been doing" means on a screen somebody opens in the morning.
 * `/portal/activity` is where the whole record is read, and this screen links
 * to it.
 *
 * The cap is on the **read** and not on a slice of what came back. A screen
 * that reads a hundred changes and shows five has hidden ninety-five; a screen
 * that reads this many has a window, and says so in the sentence above the
 * list.
 */
const RECENT_RECORDS = 120

/**
 * The portal's front door.
 *
 * It was seven lines and a `redirect` to the page list, which meant the first
 * screen of a review tool was a list of things to review *on*, sorted by
 * nothing, with the actual queue a click and a scroll inside each one. A
 * developer wanting to know whether anything needed them had to open every page
 * to find out that the answer was no.
 *
 * So this screen led with the one thing in Loom that is genuinely urgent: **the
 * changes waiting for an answer, wherever they are.** A hold exists because the
 * Gate declined to decide alone (0019); it lives in the runtime's hold store and
 * nowhere else, so no repository, no build log and no `git log` has ever seen
 * one. It is the only thing on this deployment that is waiting on a human being.
 *
 * ## The half that was missing, and why it belongs here
 *
 * Urgent is not the same as *daily*. On a deployment that is working, nothing
 * is waiting most mornings — and the caught-up state had been naming the reader's
 * actual next question for a fortnight without answering it:
 *
 * > *"When nothing needs answering, the standing question is whether the changes
 * > Loom made **without** asking were sound."*
 *
 * It sent them to `/portal/trust`, which says whether the model's self-graded
 * confidence has held up and never says what it did. Nothing in the portal said
 * what it did: `/portal/activity` lists every ask attended or not, and
 * `/portal/history` lists every accepted change without distinguishing the ones
 * a person approved from the ones nobody was asked about — deliberately, because
 * a revision cannot tell "nobody had to approve this" from "a host approved it
 * and did not say who" (0029).
 *
 * The journal can, so the second half of this screen reads the journal. See
 * `_lib/unattended.ts`. The two halves are the whole of what a person wants from
 * a front door: **what needs me, and what happened without me.**
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
        <h1 className="text-2xl tracking-tight">{screenName("/portal")}</h1>
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

  const held = perPage.flatMap((holds) => (holds.ok ? holds.value.held : []))

  /**
   * The other half: what Loom went ahead with on its own.
   *
   * One read, of the record rather than of any tree — the fan-out above is per
   * listed page because the hold store's contract is per-tree, and the journal's
   * is not. A record that will not read costs this half of the screen and
   * nothing else: the queue above is drawn from a different source and is still
   * true when this fails.
   */
  const record = await portalTelemetry.read({ direction: "older", limit: RECENT_RECORDS })
  const unattended = record.ok ? unattendedIn(episodesOf(record.value.records).episodes) : undefined

  /**
   * What each change on this screen happened *to*, in words.
   *
   * Both halves are drawn from several pages at once, so the page is the fact
   * that tells one card from the next — and it was a bare `t_seed1`. It is read
   * here rather than in a card because a card is one row and this is one read
   * per page, shared by every row that lands on it.
   *
   * The listing is not the whole set any more. A change Loom made on its own
   * can be on a page this listing never reached — the journal is not bounded by
   * the same page of trees — so the ids are the union of the two, deduplicated
   * so a page in both is read once. `nameFrom` still answers for anything that
   * is somehow in neither, which is how a hold against a page that has dropped
   * off the listing keeps its row.
   */
  const named: readonly TreeId[] = [
    ...new Set([
      ...trees.map((listing) => listing.treeId),
      ...(unattended?.changes.map((change) => change.treeId) ?? []),
    ]),
  ]

  /**
   * The pages themselves, read once and used twice.
   *
   * This read is not new — naming a page has always meant reading its head and
   * taking the leading heading off it — and until now the tree was dropped on
   * the floor immediately afterwards. The queue's account of what a change
   * would do is read against exactly that tree (`waiting-effect.ts`), so
   * keeping it is the whole cost of the sentences below: no second fan-out, no
   * extra query, and a hold whose page is in this set is described against the
   * revision the reader would land on if they followed the link.
   *
   * A page that would not read is absent from the map rather than standing in
   * for itself, and both consumers have an answer for that: the name falls back
   * to untitled beside the id, and the card says it could not read the page
   * instead of showing a change with no steps.
   */
  const heads = await headsOf(portalStore, named)
  const names = namesIn(named, heads)

  /**
   * Each waiting change, described against the page it is waiting on.
   *
   * Ordered after the reading rather than before it, because the order is by
   * how long something has waited and nothing about the reading changes it.
   * The registry is this deployment's, for the reason the page screen gives:
   * which of a part's settings a reader reads is declared by whoever wrote the
   * component, so the only honest answer available here is the one the
   * primitives this host registered gave.
   */
  const changes = inQueueOrder(
    held.map((hold) =>
      waitingChange(
        hold,
        triageAgainst(heads.get(hold.treeId), hold.proposal.delta, portalRegistry)
      )
    )
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
    /*
     * The pages that could not be asked, named rather than counted.
     *
     * `perPage` is `trees.map`, so index `i` of one is the page at index `i` of
     * the other — which is what makes this a pairing and not a second read. The
     * count this used to be threw that alignment away at the moment it was
     * free, and the notice below spent a fortnight telling readers to open a
     * page it could have named.
     *
     * Paired by `unreadableIn` rather than here, because this file is one a
     * test cannot reach and an off-by-one in it would name the wrong page in a
     * warning without anything failing.
     */
    unreadable: unreadableIn(trees, perPage),
    complete: cursor === null,
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6 p-8">
      {/*
       * The screen names both of its subjects, then takes them one at a time.
       *
       * The heading was `Waiting on you`, which was the whole screen until this
       * run and is half of it now. A heading that names one of two sections is
       * worse than either a wrong heading or a missing one: a reader who takes
       * it at face value reads the second section as more of the first, and
       * "changed without asking you" read as "waiting on you" is the one
       * misreading this screen must not cause.
       */}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl tracking-tight">{screenName("/portal")}</h1>
        <p className="text-ink-muted text-sm">
          Everything Loom stopped to ask you about, and everything it went ahead with on its own.
        </p>
      </header>

      {/*
       * The scope, said once and near the top. Both halves below are read from a
       * window on the newest end of the record, so this screen is always about
       * *lately* — and a queue that looks complete is exactly the kind of screen
       * a reader takes for the whole story.
       *
       * Outside the header rather than inside it, which is where the other two
       * screens carrying one of these put it: a `gap-1` header set it hard
       * against the screen's own sentence and the two read as one paragraph
       * arguing with itself.
       */}
      <ElsewhereNote from="/portal" />

      <section className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h2 className="text-lg tracking-tight">Waiting on you</h2>
          {/*
            * The count, and only when there is one to give.
            *
            * With an empty queue this said "Nothing is waiting for you." three
            * lines above a green box headed "You're all caught up." — the same
            * fact twice, and the second one is the one that carries the shape
            * as well as the words. It was invisible while the summary sat under
            * the screen's own heading and became a stutter the moment the
            * section got a heading of its own.
            *
            * Nothing is lost with it. The caveats it carries when a sweep is
            * partial are the short version of the notice directly below, which
            * renders whether or not anything is waiting.
            */}
          {changes.length > 0 && (
            <p className="text-ink-muted text-sm">{waitingSummary(changes, sweep)}</p>
          )}
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
            <p>
              What is listed below really is waiting for you. What is <em>not</em> listed is not a
              promise that nothing else is.
            </p>
            {/*
             * Two different gaps, said separately and only when each is real.
             *
             * They were one sentence, and it could only be written about the
             * vaguer of the two: a page that could not be read is a specific
             * page and one this screen has in hand, and a page beyond the
             * listing's bound is a page nobody here can name. Merging them cost
             * the first one its name — the reader was told to go and find a page
             * the screen already knew.
             */}
            {sweep.unreadable.length > 0 && (
              <>
                <p>
                  {sweep.unreadable.length === 1
                    ? "One of your pages couldn't tell this screen what's waiting on it. It is named below — open it and look at it directly rather than taking this screen's word for it."
                    : "Some of your pages couldn't tell this screen what's waiting on them. They are named below — open one and look at it directly rather than taking this screen's word for it."}
                </p>
                {/*
                 * The pages themselves, on the surface of the warning that is
                 * about them. Above the disclosure, because which page is
                 * identity rather than technical detail — the 22 August rule —
                 * and because the one move this notice asks for is impossible
                 * without it.
                 */}
                <UnreadablePages pages={sweep.unreadable} names={names} />
              </>
            )}
            {/*
             * No link out of this one, deliberately. A page this screen never
             * reached cannot be named, so the only destination is the list of
             * every page — and "Your pages →" is already in the strip at the
             * foot of this screen. The caught-up state shipped that same
             * destination twice, six lines apart, and it read as a mistake
             * rather than as emphasis.
             */}
            {!sweep.complete && (
              <p>
                This deployment also has more pages than this screen checks, so a page you are
                expecting may simply not have been reached. Open it from your pages.
              </p>
            )}
            <TechnicalDetail summary="Why a queue over every page has a limit">
              <p>
                Changes waiting for an answer are kept per page, and there is no way to ask for all
                of them at once — so this screen lists your pages and then asks each one in turn. A
                listing comes back a page at a time by design, and a page whose read fails is
                named rather than skipped.
              </p>
              <p>
                {sweep.unreadable.length > 0
                  ? `${sweep.unreadable.length} of the pages this screen reached could not be read.`
                  : "Every page this screen reached was read successfully."}{" "}
                {sweep.complete
                  ? "It reached all of them."
                  : "There are more pages than it reached."}
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
                A tree arrives one of two ways: a host calls{" "}
                <span className="font-mono">create</span> on a store handle, or this portal seeds
                one on first read. Seeing nothing here means neither has happened against the store
                this deployment is pointed at.
              </p>
            </TechnicalDetail>
          </StateNotice>
        ) : changes.length === 0 ? (
          <StateNotice
            tone="settled"
            title="You're all caught up."
            /*
             * Not "Your pages", which is two lines below in the strip and again
             * in the rail — the first screenshot of this state had the same link
             * twice, six lines apart, which reads as a mistake rather than as
             * emphasis.
             *
             * It used to read "Has the AI been getting it right?", justified as
             * the standing question once nothing needs answering: whether the
             * changes Loom made *without* asking were sound. Half of that question
             * is now the section directly below this notice, so the link sending a
             * reader away to answer it would send them past the answer.
             *
             * What is left over is the half `/portal/trust` genuinely owns, and
             * the wording says which half: below is *what* Loom did on its own,
             * there is whether its judgment about being sure has been worth
             * anything (0031). The two compose rather than substitute.
             */
            action={
              <Link href="/portal/trust" className="no-underline">
                Has its judgment been sound? →
              </Link>
            }
          >
            <p>
              When Loom is unsure about a change, it stops and asks you here instead of guessing.
              Nothing has stopped for you on any page.
            </p>
            <TechnicalDetail summary="What this does and doesn't mean">
              <p>
                Changes the Gate accepts are written without asking, and ones it refuses outright
                never reach you — a hold is the middle case, where the stakes were high enough that
                the Gate declined to decide alone. Nothing waiting is the Gate having decided, not
                having stalled.
              </p>
            </TechnicalDetail>
          </StateNotice>
        ) : (
          <ul className="flex flex-col gap-3">
            {changes.map((change) => (
              <WaitingCard
                key={change.proposalId}
                change={change}
                page={nameFrom(names, change.treeId)}
              />
            ))}
          </ul>
        )}
      </section>

      {/*
       * The second subject, and the one that makes this a screen somebody
       * opens on a morning when nothing is wrong.
       *
       * Withheld when there are no pages, for the reason the strip below is:
       * a deployment with no pages has had nothing changed on it either, and
       * a heading over a sentence saying so competes with the one state that
       * screen should be showing.
       *
       * No `StateNotice` when the list is empty, which is a deliberate
       * difference from the half above. "Loom asked you about every change it
       * made recently" is a good result, and the tone that says so is already
       * on this screen once — two green boxes stacked would make the caught-up
       * one mean less rather than more. Here the heading and its sentence are
       * the whole state, which is how the waiting half reads its own count.
       */}
      {trees.length > 0 && (
        <section className="flex flex-col gap-4">
          <header className="flex flex-col gap-1">
            <h2 className="text-lg tracking-tight">Changed without asking you</h2>
            <p className="text-ink-muted text-sm">
              {unattended === undefined
                ? "We couldn't read the record of what Loom has changed."
                : unattendedSummary(unattended)}
            </p>
          </header>

          {unattended === undefined ? (
            <StateNotice tone="failure" title="This half of the screen didn't load.">
              <p>
                Nothing has been lost and nothing has changed — reading the record only reads it.
                What is waiting for you above is unaffected, because it comes from somewhere else.
              </p>
              <p>
                Until this read works, this screen cannot tell you whether Loom has changed anything
                on its own. That is not the same as it having changed nothing.
              </p>
              <TechnicalDetail summary="What went wrong">
                <p className="font-mono">{record.ok ? "" : describeTelemetryError(record.error)}</p>
              </TechnicalDetail>
            </StateNotice>
          ) : (
            <ul className="flex flex-col gap-3">
              {unattended.changes.map((change) => (
                <UnattendedCard
                  key={change.proposalId}
                  change={change}
                  page={nameFrom(names, change.treeId)}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {/*
       * Every screen in the portal is a view of the same deployment, and this
       * one is where somebody arrives. The way out says what the other question
       * is: which pages there are.
       *
       * It was two links, and the second read "Everything anyone has asked for
       * →" — a fourth wording for `/portal/activity`, which the rail called
       * `Activity`, its own heading called `Activity`, and the strip called
       * "What's been asked". That destination is named once now, in the line
       * under this screen's heading, where it arrives as the scope of what a
       * reader is about to read rather than as an afterthought at the bottom.
       *
       * Withheld when there are no pages, because it leads to an empty screen
       * and a dead end under an empty state is worse than no link. The one
       * thing to do then is the empty state's own action.
       */}
      {trees.length > 0 && (
        <nav className="text-ink-muted flex flex-wrap gap-4 text-xs">
          <Link href="/portal/pages">Your pages →</Link>
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
              in one place only. On a serverless deployment that is sharper than it sounds: the next
              request can be served by a different instance, so a change waiting for you may simply
              not be there when you come back to answer it. Set{" "}
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
