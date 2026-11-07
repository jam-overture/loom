import Link from "next/link"
import { notFound } from "next/navigation"

import { treeIdSchema, type TreeId } from "@jam-overture/loom"
import { projectIdSchema } from "@jam-overture/loom/store"

import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { readMeasurement, readSides } from "@/app/(portal)/_lib/accepted/measurement"
import { readAccepted, type AcceptedReading } from "@/app/(portal)/_lib/accepted/reading"
import { requireActor, requireRole } from "@/app/(portal)/_lib/auth/identity"
import {
  boundsAround,
  changedAtOf,
  goalNameOf,
  sentencesOf,
  servedOf,
} from "@/app/(portal)/_lib/going-live"
import { goalsFor } from "@/app/(portal)/_lib/goals/stores"
import { goalForPage } from "@/app/(portal)/_lib/goals/serving"
import {
  historyOf,
  keyOf,
  loomOutcomeOf,
  originOf,
  siteOutcomeOf,
  type SiteFigures,
  type Version,
} from "@/app/(portal)/_lib/page-history"
import { PORTAL_READ_BUDGET_MS } from "@/app/_lib/app/bounded"
import { readWithin, unavailable } from "@/app/_lib/app/bounded-store"
import { publishedPagesFor } from "@/app/_lib/pages/store"

import { PageTabs } from "../_components/page-tabs"
import { VersionCard } from "../_components/version-card"

type Read = Extract<AcceptedReading, { readonly kind: "read" }>

/**
 * A page's *History* (8c; `docs/portal-wireframes.md`, *5 · Pages ·
 * History*): did the changes we shipped work?
 *
 * One card per version, newest first. A Loom change says where it came from
 * and gives the verdict its own timeline gives, on the goal it served, by the
 * maintainer's rules of 5 November (14 days a side, 1,000 page views a side,
 * a two-proportion test at 95%). The site's own edit shows its before and
 * after on the page's goal for context and says it is not a Loom change. A
 * change accepted and not yet taken by the site sits on top, dashed.
 *
 * A store that does not answer says so, and counters that do not answer cost
 * only the figures on the card they were for.
 */

/**
 * The figures around the site's own edits: on the goal on the page now, each
 * side ending where the page changed again. Read only where the page has such
 * an edit.
 */
const siteFiguresOf = async (
  reading: Read,
  pageId: TreeId
): Promise<(at: number) => Promise<SiteFigures>> => {
  const [goals, published] = await Promise.all([
    readWithin(() => goalsFor(reading.application).list(), unavailable, PORTAL_READ_BUDGET_MS),
    readWithin(
      () => publishedPagesFor(reading.application).list(),
      unavailable,
      PORTAL_READ_BUDGET_MS
    ),
  ])

  if (!goals.ok || !published.ok) return async () => ({ kind: "unreadable" })

  const page = published.value.find((held) => held.tree.treeId === pageId)
  const goal = page === undefined ? undefined : goalForPage(goals.value, page.tree)

  if (goal === undefined) return async () => ({ kind: "no-goal" })

  const changedAt = changedAtOf(
    pageId,
    reading.changes,
    reading.copyStarts.get(pageId) ?? [],
    reading.reach
  )

  return async (at) => ({
    kind: "measured",
    goal: goal.name,
    measurement: await readSides(
      reading.application,
      pageId,
      goal,
      at,
      boundsAround(at, changedAt)
    ),
  })
}

const Card = async ({
  reading,
  version,
  figuresAt,
  projectId,
  now,
  dashed,
}: {
  reading: Read
  version: Version
  figuresAt: (at: number) => Promise<SiteFigures>
  projectId: string
  now: number
  dashed: boolean
}) => {
  if (version.kind === "site") {
    return (
      <VersionCard
        heading="Your site published a newer version of this page"
        lines={[]}
        origin={originOf(version)}
        outcome={siteOutcomeOf(await figuresAt(version.at), now)}
        dashed={false}
      />
    )
  }

  const { change } = version
  const served = servedOf(change.proposalId, reading.origins)
  const [heading = "A change Loom made", ...lines] = sentencesOf(change, reading.parts)

  return (
    <VersionCard
      heading={`Version ${change.accepted.revision}: ${heading}`}
      lines={lines}
      origin={originOf(version)}
      {...(served.kind === "recorded" ? { goal: goalNameOf(served) } : {})}
      outcome={loomOutcomeOf(
        change,
        reading.reach,
        await readMeasurement(reading, change, served),
        now
      )}
      timeline={`/portal/${projectId}/review/accepted/${change.proposalId}`}
      dashed={dashed}
    />
  )
}

const HistoryScreen = async ({
  params,
}: {
  params: Promise<{ project: string; tree: string }>
}) => {
  const route = await params
  const asked = projectIdSchema.safeParse(route.project)
  const treeId = treeIdSchema.safeParse(route.tree)

  if (!asked.success || !treeId.success) notFound()

  const projectId = asked.data
  const pageId = treeId.data

  /** Signed in first, with this address to come back to — the Connect screen's reason. */
  await requireActor(`/portal/${projectId}/pages/${pageId}/history`)
  await requireRole(projectId)

  const now = Date.now()
  const reading = await readAccepted(projectId, now)

  if (reading.kind !== "read") {
    return (
      <Screen>
        <StateNotice tone="failure" title="The store did not answer">
          Nothing here is a statement about this page. Try again in a moment.
        </StateNotice>
      </Screen>
    )
  }

  const name = reading.pages.get(pageId)

  if (!reading.parts.has(pageId)) notFound()

  const history = historyOf(
    pageId,
    reading.changes,
    reading.copyStarts.get(pageId) ?? [],
    reading.reach
  )
  const figuresAt: (at: number) => Promise<SiteFigures> = history.versions.some(
    (version) => version.kind === "site"
  )
    ? await siteFiguresOf(reading, pageId)
    : async () => ({ kind: "no-goal" })

  return (
    <Screen>
      <div className="flex flex-col gap-2">
        <Link
          href={`/portal/${projectId}/pages`}
          className="text-ink-muted self-start text-xs no-underline hover:underline"
        >
          ← Pages
        </Link>
        <h1
          className={
            name === undefined ? "text-ink-muted text-2xl italic" : "text-2xl tracking-tight"
          }
        >
          {name ?? pageId}
        </h1>
        <p className="text-ink-muted font-mono text-xs">{pageId}</p>
      </div>

      <PageTabs projectId={projectId} treeId={pageId} current="history" />

      {history.pending.length === 0 && history.versions.length === 0 ? (
        <StateNotice
          tone="empty"
          title="Nothing has changed on this page yet"
          action={<Link href={`/portal/${projectId}/review`}>See what is waiting for review</Link>}
        >
          A version appears here when a change accepted on it goes live, or when your site publishes
          a newer version of it.
        </StateNotice>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {[
            ...history.pending.map((version) => ({ version, dashed: true })),
            ...history.versions.map((version) => ({ version, dashed: false })),
          ].map(({ version, dashed }) => (
            <Card
              key={keyOf(version)}
              reading={reading}
              version={version}
              figuresAt={figuresAt}
              projectId={projectId}
              now={now}
              dashed={dashed}
            />
          ))}
        </ol>
      )}
    </Screen>
  )
}

export default HistoryScreen
