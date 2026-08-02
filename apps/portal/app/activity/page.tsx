import Link from "next/link"
import { notFound } from "next/navigation"

import { treeIdSchema } from "@loom/runtime"
import { describeTelemetryError, episodesOf, tallyEpisodes } from "@loom/runtime/telemetry"

import { portalTelemetry } from "@/lib/telemetry"
import { storeIsDurable } from "@/lib/store"

import { EpisodeCard } from "./_components/episode-card"
import { TallyBar } from "./_components/tally-bar"

/**
 * What the runtime has been asked to do, and what became of it.
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
 */
const ActivityPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ tree?: string; older?: string }>
}) => {
  const { tree, older } = await searchParams

  const scope = tree === undefined ? undefined : treeIdSchema.safeParse(tree)
  if (scope && !scope.success) notFound()

  const page = await portalTelemetry.read({
    direction: "older",
    ...(scope?.success ? { treeId: scope.data } : {}),
    ...(older === undefined ? {} : { cursor: older }),
  })

  if (!page.ok) {
    return (
      <div className="flex max-w-3xl flex-col gap-3 p-8">
        <h1 className="text-2xl tracking-tight">activity</h1>
        <p className="text-ink-muted text-sm">{describeTelemetryError(page.error)}</p>
      </div>
    )
  }

  const { episodes, unattributed } = episodesOf(page.value.records)
  const tally = tallyEpisodes(episodes)
  const newestFirst = [...episodes].reverse()
  const scopeQuery = scope?.success ? `tree=${encodeURIComponent(scope.data)}&` : ""

  return (
    <div className="flex max-w-3xl flex-col gap-6 p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl tracking-tight">activity</h1>
        {scope?.success && (
          <Link href="/activity" className="text-xs">
            every tree →
          </Link>
        )}
      </div>

      {episodes.length === 0 ? (
        <p className="text-ink-muted text-sm">
          Nothing has been recorded here. Every ask the runtime interprets lands in this
          journal — including the ones it refused — so an empty page means nothing has been
          asked, not that nothing was kept.
        </p>
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
        <p className="text-ink-muted text-xs">
          {unattributed.length} {unattributed.length === 1 ? "record" : "records"} on this page
          belong to an ask that began before it. They are counted in nothing above; page back to
          see them in context.
        </p>
      )}

      <div className="flex gap-4">
        {page.value.older !== null && (
          <Link
            href={`/activity?${scopeQuery}older=${encodeURIComponent(page.value.older)}`}
            className="text-xs"
          >
            ← older
          </Link>
        )}
        {older !== undefined && (
          <Link href={`/activity?${scopeQuery}`} className="text-xs">
            newest →
          </Link>
        )}
      </div>

      {storeIsDurable ? null : (
        <p className="text-ink-muted text-xs">
          No database is configured, so this journal lives in the server process and holds only
          what this instance has seen. Set <span className="font-mono">DATABASE_URL</span> to make
          it durable.
        </p>
      )}
    </div>
  )
}

export default ActivityPage
