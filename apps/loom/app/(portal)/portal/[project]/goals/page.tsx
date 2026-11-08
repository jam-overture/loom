import Link from "next/link"
import { notFound } from "next/navigation"

import { projectIdSchema } from "@jam-overture/loom/store"

import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { requireActor, requireRole } from "@/app/(portal)/_lib/auth/identity"
import { mayAdminister } from "@/app/(portal)/_lib/auth/roles"
import type { Goal, GoalId } from "@/app/(portal)/_lib/goals/goal"
import {
  countsWhen,
  goalReadingOf,
  pageChoicesOf,
  partsByPageOf,
  readingSentence,
  whereSentence,
  type PageChoice,
} from "@/app/(portal)/_lib/goals/goal-view"
import { waitingByGoalOf } from "@/app/(portal)/_lib/goals/serving"
import { goalsFor, proposalGoalsFor } from "@/app/(portal)/_lib/goals/stores"
import { readGoalCounters } from "@/app/(portal)/_lib/goal-counters"
import { goalRangeOf, goalRangeWordsOf, goalSpanOf } from "@/app/(portal)/_lib/goal-range"
import {
  arrivalRangeFor,
  type RangeFigure,
  type SignalsRange,
} from "@/app/(portal)/_lib/signals-range"
import { EVERY_CHANGE, reviewHrefOf } from "@/app/(portal)/_lib/review-filter"
import { portalApplications, portalProjects } from "@/app/(portal)/_lib/store"
import { plainMoment } from "@/app/(portal)/_lib/when"
import { holdsFor } from "@/app/(portal)/_lib/write"
import { PORTAL_READ_BUDGET_MS } from "@/app/_lib/app/bounded"
import { boundedReaderTallyStore, readWithin, unavailable } from "@/app/_lib/app/bounded-store"
import { soleApplicationOf } from "@/app/_lib/app/sole-application"
import { publishedPagesFor } from "@/app/_lib/pages/store"
import { readingsFor } from "@/app/_lib/reader-signals/intake"

import { GoalControls } from "./_components/goal-controls"
import { GoalForm } from "./_components/goal-form"

/**
 * *Goals* (8b of `docs/portal.md`, *3 · Goals* of the wireframes, 0350): what
 * the project is trying to get its readers to do.
 *
 * A goal is one kind of thing a reader does to one part of a page, on every
 * page that has the part or on the pages chosen, and one goal is primary. The
 * list says what each counts, where, and what it has counted since counting
 * began, read off the tallies `Signals` reads. `?goal=new` opens the drawer
 * an owner adds one in; everybody else reads the list.
 *
 * **Changes for it** counts the changes waiting on *For review* that were
 * raised for each goal (0352), and links to them there.
 *
 * **The last 7 days** are each goal's rate over the last 168 hours on the
 * pages it covers, with its change on the 7 days before, from the hourly
 * counters (page views, 0356; what readers did, 0362) read once for every
 * goal, in the words *Signals* uses for the primary goal's figure. Counters
 * that do not answer cost that figure alone; what each goal counted since
 * counting began stays beneath it.
 *
 * **What it does not say yet:** how many changes for a goal were shipped.
 */

/** The range *Goals* measures each goal over: the wireframe's *7-day rate with its trend*. */
const GOALS_RANGE: SignalsRange = "7d"

type Readings = {
  readonly goals: readonly Goal[]
  readonly pages: readonly PageChoice[]
  readonly reading: (goal: Goal) => string
  /** The goal over the last 7 days, `undefined` where the hourly counters could not be read. */
  readonly week: (goal: Goal) => Omit<RangeFigure, "label"> | undefined
  /** Changes waiting for each goal, `undefined` where they could not be read. */
  readonly waiting: ReadonlyMap<GoalId, number> | undefined
}

const ChangesFor = ({
  goal,
  readings,
  projectId,
}: {
  goal: Goal
  readings: Readings
  projectId: string
}) => {
  if (readings.waiting === undefined) return <>Cannot be read just now.</>

  const count = readings.waiting.get(goal.goalId) ?? 0

  return count === 0 ? (
    <>None waiting</>
  ) : (
    <Link
      href={reviewHrefOf(projectId, { ...EVERY_CHANGE, goal: goal.goalId })}
      className="text-ink"
    >
      {count} waiting
    </Link>
  )
}

/** The goal's rate over the last 7 days and its trend, and what it counted since counting began beneath. */
const LastSevenDays = ({ goal, readings }: { goal: Goal; readings: Readings }) => {
  const week = readings.week(goal)
  const since = (
    <span className="text-ink-muted block text-[11px]">
      Since counting began: {readings.reading(goal)}
    </span>
  )

  return week === undefined ? (
    <>
      <span className="text-ink-muted block text-xs">
        The last 7 days could not be read just now.
      </span>
      {since}
    </>
  ) : (
    <>
      <span className="block text-sm">{week.value}</span>
      <span className="block text-xs">{week.note}</span>
      {since}
    </>
  )
}

const GoalRow = ({
  goal,
  readings,
  projectId,
  owner,
}: {
  goal: Goal
  readings: Readings
  projectId: string
  owner: boolean
}) => (
  <tr className="border-edge-subtle border-t align-top">
    <td className="py-2 pr-3">
      <span className="text-sm">{goal.name}</span>
      {goal.primarySince !== null && (
        <span className="text-ink-muted block text-[11px]">
          <span className="bg-affirm text-affirm-ink border-affirm-edge mr-1.5 inline-block rounded border px-1.5 py-px">
            Primary
          </span>
          since {plainMoment(new Date(goal.primarySince).toISOString())}
        </span>
      )}
    </td>
    <td className="py-2 pr-3 text-xs">
      {countsWhen(goal, readings.pages)}
      <span className="text-ink-muted block font-mono text-[11px]">{goal.nodeId}</span>
    </td>
    <td className="py-2 pr-3 text-xs">{whereSentence(goal, readings.pages)}</td>
    <td className="py-2 pr-3">
      <LastSevenDays goal={goal} readings={readings} />
    </td>
    <td className="py-2 pr-3 text-xs">
      <ChangesFor goal={goal} readings={readings} projectId={projectId} />
    </td>
    {owner && (
      <td className="py-2 text-right">
        <GoalControls
          projectId={projectId}
          goalId={goal.goalId}
          primary={goal.primarySince !== null}
        />
      </td>
    )}
  </tr>
)

const GoalList = ({
  readings,
  projectId,
  owner,
}: {
  readings: Readings
  projectId: string
  owner: boolean
}) =>
  readings.goals.length === 0 ? (
    <p className="text-ink-muted text-sm">
      No goal is set for this project yet.{" "}
      {owner ? "Add one, and it will be the primary goal." : "An owner of the project adds them."}
    </p>
  ) : (
    <table className="w-full text-left">
      <thead className="text-ink-muted text-xs">
        <tr>
          <th className="py-1.5 font-normal">Goal</th>
          <th className="py-1.5 font-normal">What counts</th>
          <th className="py-1.5 font-normal">Where</th>
          <th className="py-1.5 font-normal">Last 7 days</th>
          <th className="py-1.5 font-normal">Changes for it</th>
          {owner && <th className="py-1.5 font-normal" />}
        </tr>
      </thead>
      <tbody>
        {readings.goals.map((goal) => (
          <GoalRow
            key={goal.goalId}
            goal={goal}
            readings={readings}
            projectId={projectId}
            owner={owner}
          />
        ))}
      </tbody>
    </table>
  )

const NewGoalDrawer = ({
  projectId,
  pages,
  first,
}: {
  projectId: string
  pages: readonly PageChoice[]
  first: boolean
}) => (
  <aside
    aria-label="New goal"
    className="border-edge-subtle bg-surface-base flex w-full shrink-0 flex-col self-start rounded-lg border lg:w-[440px]"
  >
    <div className="border-edge-subtle flex items-start justify-between gap-3 border-b px-4 py-3">
      <h2 className="m-0 text-sm font-medium">New goal</h2>
      <Link
        href={`/portal/${projectId}/goals`}
        className="text-ink-muted text-xs no-underline"
        aria-label="Close"
      >
        ✕
      </Link>
    </div>
    <div className="px-4 py-3">
      {pages.length === 0 ? (
        <StateNotice
          tone="empty"
          title="No page has been published yet"
          action={
            <Link href={`/portal/${projectId}/connect`} className="text-ink underline">
              Connect your site
            </Link>
          }
        >
          A goal is built on a part of a page, so your site publishes its pages first.
        </StateNotice>
      ) : (
        <GoalForm projectId={projectId} pages={pages} first={first} />
      )}
    </div>
  </aside>
)

const GoalsPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ project: string }>
  searchParams: Promise<Readonly<Record<string, string | readonly string[] | undefined>>>
}) => {
  const asked = projectIdSchema.safeParse((await params).project)
  const query = await searchParams

  if (!asked.success) notFound()

  const projectId = asked.data

  /** Signed in first, with this address to come back to — the Connect screen's reason. */
  await requireActor(`/portal/${projectId}/goals`)

  const role = await requireRole(projectId)

  const [project, applications] = await Promise.all([
    portalProjects.get(projectId),
    portalApplications.list({ closed: "all" }),
  ])

  const application = applications.ok ? soleApplicationOf(applications.value, projectId) : undefined
  const signals = application === undefined ? undefined : readingsFor(application.applicationId)

  const week = arrivalRangeFor(GOALS_RANGE, Date.now())

  const [goals, published, pageViews, tallies, held, hourly] =
    application === undefined || signals === undefined
      ? [undefined, undefined, undefined, undefined, undefined, undefined]
      : await Promise.all([
          readWithin(
            () => goalsFor(application.applicationId).list(),
            unavailable,
            PORTAL_READ_BUDGET_MS
          ),
          readWithin(
            () => publishedPagesFor(application.applicationId).list(),
            unavailable,
            PORTAL_READ_BUDGET_MS
          ),
          boundedReaderTallyStore(signals.tallies).pageViews(),
          boundedReaderTallyStore(signals.tallies).tallies(),
          holdsFor(application.applicationId).waiting(),
          readGoalCounters(boundedReaderTallyStore(signals.tallies), goalSpanOf(week)),
        ])

  const waitingIntents =
    held?.ok === true ? held.value.held.map((change) => change.intent.intentId) : undefined
  const served =
    application === undefined || waitingIntents === undefined
      ? undefined
      : await readWithin(
          () => proposalGoalsFor(application.applicationId).forIntents(waitingIntents),
          unavailable,
          PORTAL_READ_BUDGET_MS
        )

  const closed =
    project.ok && (project.value.closedAt !== undefined || application?.closedAt !== undefined)
  const owner = mayAdminister(role) && !closed
  const adding = owner && query.goal === "new"

  const body = (() => {
    if (!project.ok || !applications.ok) {
      return (
        <StateNotice tone="failure" title="The store did not answer">
          Nothing here is a statement about this project&rsquo;s goals. Try again in a moment.
        </StateNotice>
      )
    }

    if (application === undefined || goals === undefined) {
      return (
        <StateNotice tone="failure" title="There is no single site to set goals for">
          This project does not hold exactly one site, so there is nothing to measure. Tell whoever
          runs this deployment.
        </StateNotice>
      )
    }

    if (!goals.ok) {
      return (
        <StateNotice tone="failure" title="Goals cannot be read here">
          This deployment could not read its goals. If goals are new to it, whoever runs it has to
          run <code>pnpm db:push</code> once; otherwise try again in a moment.
        </StateNotice>
      )
    }

    const pages = published?.ok === true ? pageChoicesOf(published.value) : []
    const parts = partsByPageOf(pages)
    const counted =
      pageViews?.ok === true && tallies?.ok === true
        ? {
            pageViews: pageViews.value,
            tallies: tallies.value,
            parts,
          }
        : undefined

    const readings: Readings = {
      goals: goals.value,
      pages,
      week: (goal) =>
        hourly === undefined
          ? undefined
          : goalRangeWordsOf(
              goal,
              goalRangeOf(goal, week, { ...hourly, parts }),
              GOALS_RANGE,
              "covered"
            ),
      reading: (goal) =>
        counted === undefined
          ? "could not be read just now."
          : readingSentence(goal.kind, goalReadingOf(goal, counted)),
      waiting:
        waitingIntents !== undefined && served?.ok === true
          ? waitingByGoalOf(waitingIntents, served.value)
          : undefined,
    }

    return (
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <GoalList readings={readings} projectId={projectId} owner={owner} />
          <p className="text-ink-muted m-0 text-xs">
            Each rate is per 100 page views on the pages the goal covers, over the last 7 days
            against the 7 days before, and since this project&rsquo;s pages were first counted,
            across every version. Loom proposes each change toward one goal, and the changes counted
            here are those waiting for review; how many went live follows once an accepted change
            goes live on your site.
          </p>
        </div>
        {adding && (
          <NewGoalDrawer projectId={projectId} pages={pages} first={goals.value.length === 0} />
        )}
      </div>
    )
  })()

  return (
    <Screen>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl tracking-tight">Goals</h1>
          {project.ok && <p className="text-ink-muted text-sm">{project.value.name}</p>}
        </div>
        {owner && !adding && (
          <Link
            href={`/portal/${projectId}/goals?goal=new`}
            className="bg-ink text-surface-base rounded-md px-3 py-1.5 text-sm no-underline"
          >
            New goal
          </Link>
        )}
      </div>

      {body}
    </Screen>
  )
}

export default GoalsPage
