import Link from "next/link"
import { notFound } from "next/navigation"

import {
  readReaderWindow,
  treesIn,
  windowReadingsOf,
  type PageReading,
  type StoredPageViews,
} from "@jam-overture/loom/signals"
import { projectIdSchema } from "@jam-overture/loom/store"

import { Screen } from "@/app/(portal)/_components/screen"
import { SegmentPicker, SegmentUncounted } from "@/app/(portal)/_components/segment-picker"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { readAccepted } from "@/app/(portal)/_lib/accepted/reading"
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
import { shippedByGoalOf } from "@/app/(portal)/_lib/going-live"
import { goalStayOf, goalStaySentence, type GoalStay } from "@/app/(portal)/_lib/goals/goal-stay"
import { waitingByGoalOf } from "@/app/(portal)/_lib/goals/serving"
import { goalsFor, proposalGoalsFor } from "@/app/(portal)/_lib/goals/stores"
import { readGoalCounters } from "@/app/(portal)/_lib/goal-counters"
import {
  goalRangeOf,
  goalRangeWordsOf,
  goalSpanOf,
  rangeTotalsOf,
} from "@/app/(portal)/_lib/goal-range"
import type { RangeTotals } from "@/app/(portal)/_lib/goals/goal-preview"
import {
  arrivalRangeFor,
  type RangeFigure,
  type SignalsRange,
} from "@/app/(portal)/_lib/signals-range"
import { single } from "@/app/(portal)/_lib/query"
import { portalRegistry } from "@/app/(portal)/_lib/registry"
import { EVERY_CHANGE, reviewHrefOf } from "@/app/(portal)/_lib/review-filter"
import {
  audienceRulesFor,
  readSegmentWords,
  rulesPagesOf,
} from "@/app/(portal)/_lib/segments/rules"
import {
  audienceOfPick,
  SEGMENT_PARAM,
  segmentAsked,
} from "@/app/(portal)/_lib/segments/segment-pick"
import { portalApplications, portalProjects } from "@/app/(portal)/_lib/store"
import { plainPace } from "@/app/(portal)/_lib/vocabulary"
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
 * raised for each goal (0352), and links to them there, then how many of the
 * changes accepted for it went live (unit 8, 0358): given to the site's
 * readers, at once on this deployment's own site and otherwise on the site's
 * first pull after *Accept*. Either count that cannot be read says so, and the
 * other stands.
 *
 * **The last 7 days** are each goal's rate over the last 168 hours on the
 * pages it covers, with its change on the 7 days before, from the hourly
 * counters (page views, 0356; what readers did, 0362) read once for every
 * goal, in the words *Signals* uses for the primary goal's figure. Counters
 * that do not answer cost that figure alone; what each goal counted since
 * counting began stays beneath it.
 *
 * **The *New goal* drawer previews** what the goal being made would have
 * counted over the same 7 days, from those counters folded into totals by page
 * and part, worked out in the browser as the owner picks.
 *
 * **How long readers stay on it** sits under what each goal counts: the time
 * the typical reader who reached its part kept it on screen, pooled across the
 * pages it covers (`partPaceOf`, 0381), on the version each page serves now
 * since that version was first counted. It is a figure beside the goal, not
 * the wireframe's *Stays on it* kind, which 0350 leaves unoffered; a part
 * nobody was seen on says so rather than reading nought.
 *
 * **A segment** (`?segment=`, unit 9 piece 3) narrows both figures to its
 * readers (0371 clause 6), and a segment nothing has been counted under says
 * so in place of the list. The changes waiting and shipped stay the project's,
 * since no change is for one segment until piece 4. *New goal* reads every
 * reader: a goal is the project's, whichever readers the list was showing.
 */

/**
 * How long readers stay on each goal's part, from the readings of the
 * versions the site publishes now; `undefined` for every goal where the
 * counters or the pages could not be read.
 */
const staysOf =
  (readings: readonly PageReading[] | undefined, rows: readonly StoredPageViews[] | undefined) =>
  (goal: Goal): GoalStay | undefined =>
    readings === undefined || rows === undefined ? undefined : goalStayOf(goal, readings, rows)

/** The range *Goals* measures each goal over: the wireframe's *7-day rate with its trend*. */
const GOALS_RANGE: SignalsRange = "7d"

type Readings = {
  readonly goals: readonly Goal[]
  readonly pages: readonly PageChoice[]
  readonly reading: (goal: Goal) => string
  /** How long readers stay on the goal's part, `undefined` where the counters could not be read. */
  readonly stay: (goal: Goal) => GoalStay | undefined
  /** The goal over the last 7 days, `undefined` where the hourly counters could not be read. */
  readonly week: (goal: Goal) => Omit<RangeFigure, "label"> | undefined
  /** Changes waiting for each goal, `undefined` where they could not be read. */
  readonly waiting: ReadonlyMap<GoalId, number> | undefined
  /** Accepted changes for each goal that went live, `undefined` where they could not be read. */
  readonly shipped: ReadonlyMap<GoalId, number> | undefined
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
  const waiting = readings.waiting?.get(goal.goalId) ?? 0
  const shipped = readings.shipped?.get(goal.goalId) ?? 0

  return (
    <>
      <span className="block">
        {readings.waiting === undefined ? (
          <>Waiting cannot be read just now</>
        ) : waiting === 0 ? (
          <>None waiting</>
        ) : (
          <Link
            href={reviewHrefOf(projectId, { ...EVERY_CHANGE, goal: goal.goalId })}
            className="text-ink"
          >
            {waiting} waiting
          </Link>
        )}
      </span>
      <span className="block">
        {readings.shipped === undefined ? (
          <>Shipped cannot be read just now</>
        ) : (
          <>{shipped} shipped</>
        )}
      </span>
    </>
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

/** How long readers who reached the goal's part kept it on screen, and what that time means. */
const TimeOnIt = ({ stay }: { stay: GoalStay | undefined }) => {
  if (stay === undefined) {
    return (
      <span className="text-ink-muted mt-1 block text-[11px]">
        Time on screen could not be read just now.
      </span>
    )
  }

  const verdict =
    stay.kind === "read" && stay.standing !== "unknown" ? plainPace(stay.standing) : undefined

  return (
    <span className="text-ink-muted mt-1 block text-[11px]">
      {goalStaySentence(stay)}
      {verdict !== undefined && (
        <span className="block" title={verdict.meaning}>
          {verdict.label}
        </span>
      )}
    </span>
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
      <TimeOnIt stay={readings.stay(goal)} />
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
  totals,
}: {
  projectId: string
  pages: readonly PageChoice[]
  first: boolean
  totals: RangeTotals
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
        <GoalForm projectId={projectId} pages={pages} first={first} totals={totals} />
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

  const now = Date.now()
  const week = arrivalRangeFor(GOALS_RANGE, now)
  const closed =
    project.ok && (project.value.closedAt !== undefined || application?.closedAt !== undefined)
  const owner = mayAdminister(role) && !closed
  const adding = owner && query.goal === "new"
  const segment = adding ? undefined : segmentAsked(single(query[SEGMENT_PARAM]))
  const audience = audienceOfPick(segment)
  const narrowed = audience === undefined ? {} : { audience }

  const [goals, published, readerWindow, held, hourly, accepted] =
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
          readReaderWindow({ tallies: boundedReaderTallyStore(signals.tallies) }, narrowed),
          holdsFor(application.applicationId).waiting(),
          readGoalCounters(boundedReaderTallyStore(signals.tallies), goalSpanOf(week), narrowed),
          readAccepted(projectId, now),
        ])

  const offered =
    application === undefined || published?.ok !== true
      ? undefined
      : await readSegmentWords(
          audienceRulesFor(application.applicationId),
          rulesPagesOf(published.value)
        )

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

  const segmentHref = (word: string | undefined) => {
    const asked = segmentAsked(word)

    return asked === undefined
      ? `/portal/${projectId}/goals`
      : `/portal/${projectId}/goals?${SEGMENT_PARAM}=${asked}`
  }

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
      readerWindow?.ok === true
        ? {
            pageViews: readerWindow.value.pageViews,
            tallies: readerWindow.value.tallies,
            parts,
          }
        : undefined
    const stays = staysOf(
      readerWindow?.ok === true && published?.ok === true
        ? windowReadingsOf(
            readerWindow.value,
            treesIn(published.value.map(({ tree }) => tree)),
            portalRegistry
          ).pages
        : undefined,
      counted?.pageViews
    )

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
      stay: stays,
      waiting:
        waitingIntents !== undefined && served?.ok === true
          ? waitingByGoalOf(waitingIntents, served.value)
          : undefined,
      shipped:
        accepted?.kind === "read"
          ? shippedByGoalOf(accepted.changes, accepted.reach, accepted.origins)
          : undefined,
    }

    const picker = adding ? null : (
      <SegmentPicker pick={{ word: segment, offered }} hrefOf={segmentHref} />
    )

    if (
      segment !== undefined &&
      readerWindow?.ok === true &&
      readerWindow.value.pageViews.length === 0
    ) {
      return (
        <div className="flex flex-col gap-4">
          {picker}
          <SegmentUncounted
            word={segment}
            projectId={projectId}
            everyoneHref={segmentHref(undefined)}
          />
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {picker}
          <GoalList readings={readings} projectId={projectId} owner={owner} />
          <p className="text-ink-muted m-0 text-xs">
            Each rate is per 100 page views on the pages the goal covers, over the last 7 days
            against the 7 days before, and since this project&rsquo;s pages were first counted,
            across every version
            {segment === undefined ? "" : `, among the readers your site sorts into ${segment}`}.
            Loom proposes each change toward one goal: the changes counted here are those waiting
            for review, and those accepted that went live on your site. Time on screen is per page
            view that reached the goal&rsquo;s part, on the version each page serves now, since that
            version was first counted.
          </p>
          {accepted?.kind === "read" && accepted.reach.kind === "never" && (
            <p className="text-ink-muted m-0 text-xs">
              Your site is not pulling its pages yet, so no accepted change has reached its readers.{" "}
              <Link href={`/portal/${projectId}/connect`} className="text-ink underline">
                Connect your site
              </Link>{" "}
              says how.
            </p>
          )}
        </div>
        {adding && (
          <NewGoalDrawer
            projectId={projectId}
            pages={pages}
            first={goals.value.length === 0}
            totals={hourly === undefined ? { kind: "unreadable" } : rangeTotalsOf(hourly, week)}
          />
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
