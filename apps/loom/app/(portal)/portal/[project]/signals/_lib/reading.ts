import {
  readReaderArrivals,
  type ArrivalReading,
  type StoredPageViews,
} from "@jam-overture/loom/signals"
import { treeIdSchema } from "@jam-overture/loom"
import type { Application, AudienceId, Project, ProjectId } from "@jam-overture/loom/store"

import { arrivalsOf, type Arrivals } from "@/app/(portal)/_lib/arrivals"
import { readGoalCounters } from "@/app/(portal)/_lib/goal-counters"
import { goalRangeOf, goalSpanOf, type PrimaryGoalReading } from "@/app/(portal)/_lib/goal-range"
import { primaryOf, type Goal } from "@/app/(portal)/_lib/goals/goal"
import { pageChoicesOf, partsByPageOf } from "@/app/(portal)/_lib/goals/goal-view"
import type { PageHourly } from "@/app/(portal)/_lib/page-range"
import { goalsFor } from "@/app/(portal)/_lib/goals/stores"
import { arrivalRangeFor, type SignalsRange } from "@/app/(portal)/_lib/signals-range"
import {
  audienceRulesFor,
  readSegmentWords,
  rulesPagesOf,
} from "@/app/(portal)/_lib/segments/rules"
import type { SegmentWord } from "@/app/(portal)/_lib/segments/segment"
import { audienceOfPick, type SegmentPick } from "@/app/(portal)/_lib/segments/segment-pick"
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
 * **A segment** (`?segment=`, unit 9 piece 3) narrows every counter read
 * here to its audience (0371 clause 6): the page views, the hours, the
 * primary goal's figure, and the drawer's range on *By page*. The journal's
 * newest delivery is not read for one, because a delivery of any reader would
 * say when *someone* last arrived: the last arrival is then the segment's own
 * last counted page view. What the door turned away is never filed under an
 * audience, so it stays the project's and the frame says so. The segments
 * offered are read from the rules after the published pages, and a failure to
 * read them costs the picker's offer alone.
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
      readonly segment: SegmentPick
    }

type Tallies = ReturnType<typeof boundedReaderTallyStore>

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
  now: number,
  audience: AudienceId | undefined
): Promise<PrimaryGoalReading> => {
  if (goals === undefined) return { kind: "unreadable" }

  const goal = primaryOf(goals)

  if (goal === undefined) return { kind: "none" }

  const asked = arrivalRangeFor(range, now)
  const counters = await readGoalCounters(tallies, goalSpanOf(asked), {
    nodeId: goal.nodeId,
    ...(audience === undefined ? {} : { audience }),
  })

  return counters === undefined
    ? { kind: "unreadable" }
    : {
        kind: "read",
        goal,
        range: goalRangeOf(goal, asked, {
          ...counters,
          parts: partsByPageOf(pageChoicesOf(published)),
        }),
      }
}

export const readSignals = async (
  projectId: ProjectId,
  range: SignalsRange,
  now: number,
  segment: SegmentWord | undefined
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
  const audience = audienceOfPick(segment)
  const narrowed = audience === undefined ? {} : { audience }

  const [pageViews, newest, hourly, refusals, published, goals] = await Promise.all([
    tallies.pageViews(narrowed),
    audience === undefined
      ? boundedReaderSignalJournal(readings.journal).read({ direction: "older", limit: 1 })
      : ({ ok: true, value: { batches: [] } } as const),
    readReaderArrivals(tallies, { range: arrivalRangeFor(range, now), now, ...narrowed }),
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
  const [goal, offered] = await Promise.all([
    readPrimaryGoal(tallies, goals.ok ? goals.value : undefined, pages, range, now, audience),
    published.ok
      ? readSegmentWords(audienceRulesFor(application.applicationId), rulesPagesOf(pages))
      : undefined,
  ])

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
    goal,
    segment: { word: segment, offered },
  }
}

/**
 * One page's hourly counters over the range and the period before it, for the
 * drawer on *By page*: its page views, what readers did to any part of it, and
 * when the project first counted anything readers did, for the segment's
 * audience where one is picked. Read only when a
 * drawer is open, and a figure the drawer can do without: counters that do
 * not answer, or a page id they could not be asked about, cost the range's
 * figures alone.
 */
export const readPageHourly = async (
  readings: Readings,
  page: string,
  range: SignalsRange,
  now: number,
  audience: AudienceId | undefined
): Promise<PageHourly> => {
  const treeId = treeIdSchema.safeParse(page)

  if (!treeId.success) return { kind: "unreadable" }

  const asked = arrivalRangeFor(range, now)
  const counters = await readGoalCounters(
    boundedReaderTallyStore(readings.tallies),
    goalSpanOf(asked),
    { treeId: treeId.data, ...(audience === undefined ? {} : { audience }) }
  )

  return counters === undefined ? { kind: "unreadable" } : { kind: "read", range: asked, counters }
}
