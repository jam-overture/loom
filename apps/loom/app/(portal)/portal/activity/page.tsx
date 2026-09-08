import Link from "next/link"
import { notFound } from "next/navigation"

import { treeIdSchema } from "@loom/runtime"
import { describeTelemetryError, episodesOf, tallyEpisodes } from "@loom/runtime/telemetry"

import { ElsewhereNote } from "@/app/(portal)/_components/elsewhere-note"
import { PageViews } from "@/app/(portal)/_components/page-views"
import { PlainSentence } from "@/app/(portal)/_components/plain-sentence"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { requireActor } from "@/app/(portal)/_lib/auth/identity"
import { unattributedNote } from "@/app/(portal)/_lib/episode-view"
import { scopedLead } from "@/app/(portal)/_lib/page-views"
import { screenName } from "@/app/(portal)/_lib/screen-names"
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
 * The heading was the word `activity`, lowercase, which named the route rather
 * than the thing; then `Activity`, which named it in the right case and still
 * said nothing. It is `What's been asked` now, and it is not written here — the
 * strip on every scoped screen has called this destination that since 29 August
 * while the rail and this heading said `Activity`, so the name is read from
 * `_lib/screen-names.ts` and there is one of it.
 *
 * The route keeps its name. A route is an address rather than a label, and
 * `/portal/activity` is already a person's word — renaming it would cost every
 * link written to it for the sake of a string no reader is shown.
 *
 * What this screen has that nothing else does is the asks that left no trace: a
 * refusal, or a request the AI never understood, changes nothing and so appears
 * in no diff, no log and no page. That is also exactly what separates it from
 * `What's changed`, which is why the two screens name each other.
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
        <h1 className="text-2xl tracking-tight">{screenName("/portal/activity")}</h1>
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
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl tracking-tight">{screenName("/portal/activity")}</h1>
        {/*
         * Scoped, this screen used to make the deployment's claim over one
         * page's rows: the heading said `Activity`, the sentence said
         * "Everything anyone has asked Loom to change", and the only thing that
         * said otherwise was a link in the corner. The sentence names the page
         * now, and the corner link has become the strip below.
         */}
        <p className="text-ink-muted text-sm">
          {scope?.success ? (
            <PlainSentence line={scopedLead("asked", scope.data)} />
          ) : (
            <>
              Everything anyone has asked Loom to change, newest first — including the changes it
              wasn&rsquo;t allowed to make and the requests it didn&rsquo;t understand. Those leave
              no other trace anywhere.
            </>
          )}
        </p>
      </header>

      {scope?.success && <PageViews treeId={scope.data} current="asked" />}

      {/*
       * Under the strip rather than in the header: a reader who already knows
       * which of the two screens they want should not have to read past the
       * difference between them to reach the list.
       */}
      <ElsewhereNote
        from="/portal/activity"
        {...(scope?.success ? { treeId: scope.data } : {})}
      />

      {episodes.length === 0 ? (
        <StateNotice
          tone="empty"
          title="Nothing has been asked for yet."
          action={
            scope?.success ? (
              /*
               * Scoped and empty, the answer to "what do I do now" is not
               * "look at every page" — it is to open this one and ask it for
               * something, which is what puts the first row here.
               */
              <Link href={`/portal/pages/${scope.data}`}>Open this page →</Link>
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
              <EpisodeCard
                key={episode.intentId}
                episode={episode}
                scoped={scope?.success === true}
              />
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
