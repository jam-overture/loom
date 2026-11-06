import {
  readReaderArrivals,
  type ArrivalReading,
  type StoredPageViews,
} from "@jam-overture/loom/signals"
import type { Application, Project, ProjectId } from "@jam-overture/loom/store"

import { arrivalsOf, type Arrivals } from "@/app/(portal)/_lib/arrivals"
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

  const [pageViews, newest, hourly, refusals, published] = await Promise.all([
    tallies.pageViews(),
    boundedReaderSignalJournal(readings.journal).read({ direction: "older", limit: 1 }),
    readReaderArrivals(tallies, { range: arrivalRangeFor(range, now), now }),
    readWithin(() => readings.refusals.read(), unavailable, PORTAL_READ_BUDGET_MS),
    readWithin(
      () => publishedPagesFor(application.applicationId).list(),
      unavailable,
      PORTAL_READ_BUDGET_MS
    ),
  ])

  if (!pageViews.ok || !newest.ok) return { state: "failed", project: project.value }

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
    published: published.ok ? published.value : [],
  }
}
