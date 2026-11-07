import Link from "next/link"
import { notFound } from "next/navigation"

import { treeIdSchema, type TreeId } from "@jam-overture/loom"
import { projectIdSchema } from "@jam-overture/loom/store"

import { Screen } from "@/app/(portal)/_components/screen"
import { FilterChips } from "@/app/(portal)/_components/filter-chips"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import {
  readDailyChart,
  readMeasurement,
  readSides,
} from "@/app/(portal)/_lib/accepted/measurement"
import { readAccepted, type AcceptedReading } from "@/app/(portal)/_lib/accepted/reading"
import { requireActor, requireRole } from "@/app/(portal)/_lib/auth/identity"
import type { Goal } from "@/app/(portal)/_lib/goals/goal"
import {
  boundsAround,
  changedAtOf,
  goalNameOf,
  sentencesOf,
  servedOf,
} from "@/app/(portal)/_lib/going-live"
import { goalsFor } from "@/app/(portal)/_lib/goals/stores"
import { goalForPage, goalsOnPage, measuredOnFor } from "@/app/(portal)/_lib/goals/serving"
import {
  historyOf,
  keyOf,
  loomOutcomeOf,
  marksOf,
  originOf,
  siteOutcomeOf,
  type Mark,
  type SiteFigures,
  type Version,
} from "@/app/(portal)/_lib/page-history"
import { single, type Query } from "@/app/(portal)/_lib/query"
import { PORTAL_READ_BUDGET_MS } from "@/app/_lib/app/bounded"
import { readWithin, unavailable } from "@/app/_lib/app/bounded-store"
import { publishedPagesFor } from "@/app/_lib/pages/store"

import { DailyChart } from "../_components/daily-chart"
import { PageTabs } from "../_components/page-tabs"
import { VersionCard } from "../_components/version-card"

type Read = Extract<AcceptedReading, { readonly kind: "read" }>

/**
 * A page's *History* (8c; `docs/portal-wireframes.md`, *5 · Pages ·
 * History*): did the changes we shipped work?
 *
 * On top, the goal's daily rate over the last 8 weeks, coloured by where each
 * version came from, under a *Measured on* picker of the goals on the page
 * (`?on=`, the goal a change to the page serves when none is named). The
 * picked goal is the one the chart and the site's own edits are read on; a
 * Loom change is always judged on the goal it served.
 *
 * Then one card per version, newest first. A Loom change says where it came from
 * and gives the verdict its own timeline gives, on the goal it served, by the
 * maintainer's rules of 5 November (14 days a side, 1,000 page views a side,
 * a two-proportion test at 95%). The site's own edit shows its before and
 * after on the page's goal for context and says it is not a Loom change. A
 * change accepted and not yet taken by the site sits on top, dashed.
 *
 * A store that does not answer says so, and counters that do not answer cost
 * only the figures on the card they were for.
 */

/** The goals on the page and the one picked to measure it on, or that they could not be read. */
type MeasuredOn =
  | { readonly kind: "unreadable" }
  | { readonly kind: "no-goal" }
  | {
      readonly kind: "picked"
      /** Every goal on the page, the primary first. */
      readonly on: readonly Goal[]
      /** The goal a change to the page serves, which the picker starts on. */
      readonly serving: Goal
      readonly picked: Goal
    }

const readMeasuredOn = async (
  reading: Read,
  pageId: TreeId,
  asked: string | undefined
): Promise<MeasuredOn> => {
  const [goals, published] = await Promise.all([
    readWithin(() => goalsFor(reading.application).list(), unavailable, PORTAL_READ_BUDGET_MS),
    readWithin(
      () => publishedPagesFor(reading.application).list(),
      unavailable,
      PORTAL_READ_BUDGET_MS
    ),
  ])

  if (!goals.ok || !published.ok) return { kind: "unreadable" }

  const page = published.value.find((held) => held.tree.treeId === pageId)

  if (page === undefined) return { kind: "no-goal" }

  const serving = goalForPage(goals.value, page.tree)
  const picked = measuredOnFor(goals.value, page.tree, asked)

  return serving === undefined || picked === undefined
    ? { kind: "no-goal" }
    : { kind: "picked", on: goalsOnPage(goals.value, page.tree), serving, picked }
}

/**
 * The figures around the site's own edits: on the goal picked, each side
 * ending where the page changed again.
 */
const siteFiguresOf =
  (reading: Read, pageId: TreeId, measuredOn: MeasuredOn) =>
  async (at: number): Promise<SiteFigures> => {
    if (measuredOn.kind !== "picked") return { kind: measuredOn.kind }

    const goal = measuredOn.picked

    const changedAt = changedAtOf(
      pageId,
      reading.changes,
      reading.copyStarts.get(pageId) ?? [],
      reading.reach
    )

    return {
      kind: "measured",
      goal: goal.name,
      measurement: await readSides(
        reading.application,
        pageId,
        goal,
        at,
        boundsAround(at, changedAt)
      ),
    }
  }

/** The history measured on `goal`, the address left bare for the goal it starts on. */
const historyAddress = (projectId: string, pageId: TreeId, goal: Goal, serving: Goal): string =>
  `/portal/${projectId}/pages/${pageId}/history${
    goal.goalId === serving.goalId ? "" : `?on=${goal.goalId}`
  }`

/** The *Measured on* picker and the chart under it, or what stands in their place. */
const Trend = async ({
  reading,
  projectId,
  pageId,
  measuredOn,
  marks,
  now,
}: {
  reading: Read
  projectId: string
  pageId: TreeId
  measuredOn: MeasuredOn
  marks: readonly Mark[]
  now: number
}) => {
  if (measuredOn.kind === "unreadable") {
    return (
      <p className="text-ink-muted m-0 text-xs">
        The goals could not be read, so there is no chart. Try again in a moment.
      </p>
    )
  }

  if (measuredOn.kind === "no-goal") {
    return (
      <p className="text-ink-muted m-0 text-xs">
        No goal is on this page, so there is nothing to chart.{" "}
        <Link href={`/portal/${projectId}/goals`} className="text-ink">
          Set a goal
        </Link>
      </p>
    )
  }

  const { on, serving, picked } = measuredOn
  const chart = await readDailyChart(reading.application, pageId, picked, marks, now)

  return (
    <section aria-label="The goal by day" className="flex flex-col gap-3">
      <FilterChips
        label="Measured on"
        choices={on.map((goal) => ({
          label: goal.name,
          href: historyAddress(projectId, pageId, goal, serving),
          selected: goal.goalId === picked.goalId,
        }))}
      />
      {chart.kind === "unreadable" ? (
        <p className="text-ink-muted m-0 text-xs">
          The page&apos;s figures by day could not be read. The versions below stand; try again in a
          moment.
        </p>
      ) : (
        <DailyChart chart={chart.chart} />
      )}
      <p className="text-ink-muted m-0 max-w-prose text-xs">
        The chart and your site&apos;s own edits are read on {picked.name}. Each Loom change is
        judged on the goal it served.
      </p>
    </section>
  )
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
  searchParams,
}: {
  params: Promise<{ project: string; tree: string }>
  searchParams: Promise<Query>
}) => {
  const route = await params
  const query = await searchParams
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
  const measuredOn = await readMeasuredOn(reading, pageId, single(query.on))
  const figuresAt = siteFiguresOf(reading, pageId, measuredOn)

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

      <Trend
        reading={reading}
        projectId={projectId}
        pageId={pageId}
        measuredOn={measuredOn}
        marks={marksOf(history.versions)}
        now={now}
      />

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
