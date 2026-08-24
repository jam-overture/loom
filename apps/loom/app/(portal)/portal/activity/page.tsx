import Link from "next/link"
import { notFound } from "next/navigation"

import { treeIdSchema } from "@loom/runtime"
import { describeTelemetryError, episodesOf, tallyEpisodes } from "@loom/runtime/telemetry"

import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { unattributedNote } from "@/app/(portal)/_lib/episode-view"
import { portalTelemetry } from "@/app/(portal)/_lib/telemetry"
import { storeIsDurable } from "@/app/(portal)/_lib/store"

import { EpisodeCard } from "./_components/episode-card"
import { TallyBar } from "./_components/tally-bar"

/**
 * What Loom has been asked to do, and what became of it.
 *
 * This is §6's first reader, and it deliberately reads the journal the same way
 * anyone else would — through `TelemetryJournal` and `episodesOf`, with no
 * privileged access to how records are stored. 0018 said the portal is a
 * consumer of the framework rather than an insider, and a view that reached past
 * the fold into the rows would be the first place that stopped being true.
 *
 * The page is taken from the *newest* end. A journal only grows, so "what
 * happened recently" is the question, and paging forward from the beginning
 * would answer it only after reading everything that ever happened.
 *
 * The heading used to be the word `activity`, lowercase, which named the route
 * rather than the thing. The route keeps its name — it is already a person's
 * word — and the heading now says what a reader is looking at, because the one
 * thing this screen has that nothing else does is the asks that left no trace:
 * a refusal, or a request the AI never understood, changes nothing and so
 * appears in no diff, no log and no page.
 */
const ActivityPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ tree?: string; older?: string }>
}) => {
  const { tree, older } = await searchParams
  await requireActor("/portal/activity")

  const scope = tree === undefined ? undefined : treeIdSchema.safeParse(tree)
  if (scope && !scope.success) notFound()

  const page = await portalTelemetry.read({
    direction: "older",
    ...(scope?.success ? { treeId: scope.data } : {}),
    ...(older === undefined ? {} : { cursor: older }),
  })

  if (!page.ok) {
    return (
      <div className="flex max-w-3xl flex-col gap-4 p-8">
        <h1 className="text-2xl tracking-tight">Activity</h1>
        <StateNotice tone="failure" title="We couldn't read the record.">
          <p>
            Nothing has been lost and nothing has changed — this is a screen that could not load,
            not a record that went missing. Your pages are unaffected.
          </p>
          <p>
            If you came here to check whether something was recorded, this page cannot answer that
            until the read works. An empty record says so in different words.
          </p>
          <TechnicalDetail summary="What went wrong">
            <p className="font-mono">{describeTelemetryError(page.error)}</p>
          </TechnicalDetail>
        </StateNotice>
      </div>
    )
  }

  const { episodes, unattributed } = episodesOf(page.value.records)
  const tally = tallyEpisodes(episodes)
  const newestFirst = [...episodes].reverse()
  const scopeQuery = scope?.success ? `tree=${encodeURIComponent(scope.data)}&` : ""

  return (
    <div className="flex max-w-3xl flex-col gap-6 p-8">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl tracking-tight">Activity</h1>
          {scope?.success && (
            <Link href="/portal/activity" className="text-xs">
              Show every page →
            </Link>
          )}
        </div>
        <p className="text-ink-muted text-sm">
          Everything anyone has asked Loom to change, newest first — including the changes it
          wasn&rsquo;t allowed to make and the requests it didn&rsquo;t understand. Those leave no
          other trace anywhere.
        </p>
      </div>

      {episodes.length === 0 ? (
        <StateNotice
          tone="empty"
          title="Nothing has been asked for yet."
          action={
            scope?.success ? (
              <Link href="/portal/activity">Show every page →</Link>
            ) : (
              <Link href="/portal/pages">Open one of your pages →</Link>
            )
          }
        >
          <p>
            Open a page, click any part of it, and ask for a change. Whatever happens next lands
            here — whether Loom makes the change, stops to ask you first, or turns it down.
          </p>
          <p>
            An empty list means nobody has asked for anything. It never means something was asked
            for and not kept.
          </p>
        </StateNotice>
      ) : (
        <>
          <TallyBar tally={tally} />

          <ul className="flex flex-col gap-3">
            {newestFirst.map((episode) => (
              <EpisodeCard key={episode.intentId} episode={episode} />
            ))}
          </ul>
        </>
      )}

      {/*
       * The fold reports what it could not attribute rather than dropping it, so
       * the page says so too. A count computed over a silently shrunk denominator
       * is worse than no count.
       */}
      {unattributed.length > 0 && (
        <p className="text-ink-muted text-xs">{unattributedNote(unattributed.length)}</p>
      )}

      <div className="flex gap-4">
        {page.value.older !== null && (
          <Link
            href={`/portal/activity?${scopeQuery}older=${encodeURIComponent(page.value.older)}`}
            className="text-xs"
          >
            ← Show older
          </Link>
        )}
        {older !== undefined && (
          <Link href={`/portal/activity?${scopeQuery}`} className="text-xs">
            Back to newest →
          </Link>
        )}
      </div>

      {storeIsDurable ? null : (
        <StateNotice tone="notice">
          <p>
            This record is being kept in memory rather than in a database, so it holds only what
            has happened since this server last started and it will be empty again after a
            restart. Everything on this page is real; there is just less of it than there will be
            once a database is connected.
          </p>
          <TechnicalDetail summary="How to make it permanent">
            <p>
              {/*
               * The space is explicit because the implicit one did not survive:
               * this rendered as `DATABASE_URLin this deployment's` in a
               * production build, and a screenshot is what caught it. Not a rule
               * worth deducing — a rule worth writing down.
               */}
              Set <span className="font-mono">DATABASE_URL</span>{" "}
              in this deployment&rsquo;s environment and restart. Nothing already written is
              migrated — the record starts from the moment the database is connected.
            </p>
          </TechnicalDetail>
        </StateNotice>
      )}
    </div>
  )
}

export default ActivityPage
