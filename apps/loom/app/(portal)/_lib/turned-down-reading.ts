import type { ApplicationId, ProjectId } from "@jam-overture/loom/store"

import { turnedDownFor } from "./proposing/stores"
import { pageNamesOf } from "./published-view"
import { portalApplications, portalProjects } from "./store"
import {
  RECENT_LIMIT,
  recentCountOf,
  recentSince,
  turnedDownRowOf,
  type RecentCount,
  type TurnedDownRow,
} from "./turned-down-list"
import { PORTAL_READ_BUDGET_MS } from "@/app/_lib/app/bounded"
import { readWithin, unavailable } from "@/app/_lib/app/bounded-store"
import { soleApplicationOf } from "@/app/_lib/app/sole-application"
import { publishedPagesFor } from "@/app/_lib/pages/store"

/**
 * What *Turned down* reads: the changes turned down on the project's pages in
 * the last thirty days, newest first (0341 keeps them). The changes must
 * answer, or nothing is a statement about what was turned down; the page
 * names cost only the names.
 */
export type TurnedDownReading =
  | { readonly kind: "unavailable" }
  | { readonly kind: "no-site" }
  | {
      readonly kind: "read"
      readonly projectName: string
      readonly rows: readonly TurnedDownRow[]
      readonly count: RecentCount
    }

export const readTurnedDown = async (
  projectId: ProjectId,
  now: number
): Promise<TurnedDownReading> => {
  const [project, applications] = await Promise.all([
    portalProjects.get(projectId),
    portalApplications.list({ closed: "all" }),
  ])

  if (!project.ok || !applications.ok) return { kind: "unavailable" }

  const application = soleApplicationOf(applications.value, projectId)?.applicationId

  if (application === undefined) return { kind: "no-site" }

  const [turnedDown, published] = await Promise.all([
    readWithin(
      () => turnedDownFor(application).since(recentSince(now), RECENT_LIMIT),
      unavailable,
      PORTAL_READ_BUDGET_MS
    ),
    readWithin(() => publishedPagesFor(application).list(), unavailable, PORTAL_READ_BUDGET_MS),
  ])

  if (!turnedDown.ok) return { kind: "unavailable" }

  const names = published.ok ? pageNamesOf(published.value) : new Map<string, string>()

  return {
    kind: "read",
    projectName: project.value.name,
    rows: turnedDown.value.map((entry) => turnedDownRowOf(entry, names)),
    count: recentCountOf(turnedDown.value),
  }
}

/**
 * How many changes were turned down on the project's pages recently, for the
 * line under *For review*; `undefined` where they could not be read, so the
 * line is left out rather than say nought.
 */
export const readTurnedDownCount = async (
  application: ApplicationId,
  now: number
): Promise<RecentCount | undefined> => {
  const read = await readWithin(
    () => turnedDownFor(application).since(recentSince(now), RECENT_LIMIT),
    unavailable,
    PORTAL_READ_BUDGET_MS
  )

  return read.ok ? recentCountOf(read.value) : undefined
}
