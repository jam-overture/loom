import {
  readReaderArrivals,
  type ArrivalReading,
  type StoredPageViews,
} from "@jam-overture/loom/signals"
import { treeIdSchema } from "@jam-overture/loom"
import type { Application, Project, ProjectId } from "@jam-overture/loom/store"

import { arrivalsOf, type Arrivals } from "@/app/(portal)/_lib/arrivals"
import { goalRangeOf, goalSpanOf, type PrimaryGoalReading } from "@/app/(portal)/_lib/goal-range"
import { primaryOf, type Goal } from "@/app/(portal)/_lib/goals/goal"
import { pageChoicesOf, partsByPageOf } from "@/app/(portal)/_lib/goals/goal-view"
import type { PageHourly } from "@/app/(portal)/_lib/page-range"
import { goalsFor } from "@/app/(portal)/_lib/goals/stores"
import { arrivalRangeFor, type SignalsRange } from "@/app/(portal)/_lib/signals-range"
import { portalApplications, portalProjects } from "@/app/(portal)/_lib/store"
import { turnedAwayOf, type TurnedAway } from "@/app/(portal)/_lib/turned-away"
import { PORTAL_READ_BUDGET_MS } from "@/app/_lib/app/bounded"
import {
  boundedReaderSignalJournal,
  boundedReaderTallyStore,
  readWithin,
  unavailable,
} from "@/app/_lib/app/bounded-store"
import { soleApplicationOf } from "@/app/_lib/app/sole-application"
import type { PublishedPage } from "@/app/_lib/pages/published"
import { publishedPagesFor } from "@/app/_lib/pages/store"
import { readingsFor, type Readings } from "@/app/_lib/reader-signals/intake"

/**
 * What both *Signals* tabs read before their own list: the project, its one
 * site, the figures at the top and the pages it published.
 *
 * It reads the project's own stores, the same scoped ones the door writes
 * to, so what it shows is exactly what the door filed under this project's key
 * and nothing filed under anybody else's (0298 clause 5).
 *
 * **What the door turned away** (0311) and **the published pages** (0312)
 * are each a figure the screen can do without, so a failure to read either
 * costs that figure alone: a deployment that has not run `db:push` since the
 * table arrived still shows everything that was kept.
 *
 * **Page views by hour** (0356) are read over the range the address names and
 * the period of the same length before it, in one call. They are the figure
 * and chart at the top, and the screen can do without them too: a deployment
 * whose database predates the hourly counter shows the total it always showed
 * and says the hours could not be read.
 *
 * **The primary goal's figure for the range** (0350, 0362) is read the same
 * way, after the goals and the published pages it needs: a project without a
 * goal draws no figure, and goals or counters that do not answer cost that
 * figure alone.
 *
 * The journal is read on the portal's budget here rather than in `intake.ts`,
 * because the door writes through the same handles and a write cut off by a
 * screen's budget would lose a reader's batch.
 */
export type SignalsReading =
  | { readonly state: "failed"; readonly project: Project | undefined }
  | { readonly state: "no-site"; readonly project: Project }
  | {
      readonly state: "read"
      readonly project: Project
      readonly application: Application
      readonly readings: Readings
      readonly pageViews: readonly StoredPageViews[]
      readonly arrivals: Arrivals
      readonly range: SignalsRange
      /** `undefined` where the hourly counts could not be read, which the screen says. */
      readonly hourly: ArrivalReading | undefined
      /** `undefined` where the refusals could not be read, which is said rather than drawn as a nought. */
      readonly turnedAway: TurnedAway | undefined
      readonly published: readonly PublishedPage[]
      readonly goal: PrimaryGoalReading
    }

type Tallies = ReturnType<typeof boundedReaderTallyStore>

/**
 * When the project first counted anything readers did, on any part: a read of
 * one empty instant, whose answer carries the first hour whatever was asked.
 */
const actedBeginsOf = (tallies: Tallies, at: number) => tallies.acted({ from: at, to: at })

/**
 * The primary goal over the range and the period before it: the project's
 * page views by page, what readers did to the goal's part on every page, and
 * when the project first counted anything readers did, in one read of each.
 */
const readPrimaryGoal = async (
  tallies: Tallies,
  /** `undefined` where the goals could not be read. */
  goals: readonly Goal[] | undefined,
  published: readonly PublishedPage[],
  range: SignalsRange,
  now: number
): Promise<PrimaryGoalReading> => {
  if (goals === undefined) return { kind: "unreadable" }

  const goal = primaryOf(goals)

  if (goal === undefined) return { kind: "none" }

  const asked = arrivalRangeFor(range, now)
  const span = goalSpanOf(asked)
  const [arrivals, acted, actedBegins] = await Promise.all([
    tallies.arrivals(span),
    tallies.acted({ nodeId: goal.nodeId, ...span }),
    actedBeginsOf(tallies, span.from),
  ])

  if (!arrivals.ok || !acted.ok || !actedBegins.ok) return { kind: "unreadable" }

  return {
    kind: "read",
    goal,
    range: goalRangeOf(goal, asked, {
      arrivals: arrivals.value,
      acted: acted.value,
      actedBegins: actedBegins.value.begins,
      parts: partsByPageOf(pageChoicesOf(published)),
    }),
  }
}

export const readSignals = async (
  projectId: ProjectId,
  range: SignalsRange,
  now: number
): Promise<SignalsReading> => {
  const [project, applications] = await Promise.all([
    portalProjects.get(projectId),
    portalApplications.list({ closed: "all" }),
  ])

  if (!project.ok || !applications.ok) {
    return { state: "failed", project: project.ok ? project.value : undefined }
  }

  const application = soleApplicationOf(applications.value, projectId)

  if (application === undefined) return { state: "no-site", project: project.value }

  const readings = readingsFor(application.applicationId)
  const tallies = boundedReaderTallyStore(readings.tallies)

  const [pageViews, newest, hourly, refusals, published, goals] = await Promise.all([
    tallies.pageViews(),
    boundedReaderSignalJournal(readings.journal).read({ direction: "older", limit: 1 }),
    readReaderArrivals(tallies, { range: arrivalRangeFor(range, now), now }),
    readWithin(() => readings.refusals.read(), unavailable, PORTAL_READ_BUDGET_MS),
    readWithin(
      () => publishedPagesFor(application.applicationId).list(),
      unavailable,
      PORTAL_READ_BUDGET_MS
    ),
    readWithin(
      () => goalsFor(application.applicationId).list(),
      unavailable,
      PORTAL_READ_BUDGET_MS
    ),
  ])

  if (!pageViews.ok || !newest.ok) return { state: "failed", project: project.value }

  const pages = published.ok ? published.value : []

  return {
    state: "read",
    project: project.value,
    application,
    readings,
    pageViews: pageViews.value,
    arrivals: arrivalsOf(pageViews.value, newest.value.batches),
    range,
    hourly: hourly.ok ? hourly.value : undefined,
    turnedAway: refusals.ok ? turnedAwayOf(refusals.value) : undefined,
    published: pages,
    goal: await readPrimaryGoal(tallies, goals.ok ? goals.value : undefined, pages, range, now),
  }
}

/**
 * One page's hourly counters over the range and the period before it, for the
 * drawer on *By page*: its page views, what readers did to any part of it, and
 * when the project first counted anything readers did. Read only when a
 * drawer is open, and a figure the drawer can do without: counters that do
 * not answer, or a page id they could not be asked about, cost the range's
 * figures alone.
 */
export const readPageHourly = async (
  readings: Readings,
  page: string,
  range: SignalsRange,
  now: number
): Promise<PageHourly> => {
  const treeId = treeIdSchema.safeParse(page)

  if (!treeId.success) return { kind: "unreadable" }

  const tallies = boundedReaderTallyStore(readings.tallies)
  const asked = arrivalRangeFor(range, now)
  const span = goalSpanOf(asked)
  const [arrivals, acted, actedBegins] = await Promise.all([
    tallies.arrivals({ treeId: treeId.data, ...span }),
    tallies.acted({ treeId: treeId.data, ...span }),
    actedBeginsOf(tallies, span.from),
  ])

  return arrivals.ok && acted.ok && actedBegins.ok
    ? {
        kind: "read",
        range: asked,
        counters: {
          arrivals: arrivals.value,
          acted: acted.value,
          actedBegins: actedBegins.value.begins,
        },
      }
    : { kind: "unreadable" }
}
