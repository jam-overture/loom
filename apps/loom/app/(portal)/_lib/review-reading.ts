import type { TreeId } from "@jam-overture/loom"
import type { ApplicationId, ProjectId } from "@jam-overture/loom/store"
import type { HeldProposal } from "@jam-overture/loom/write"

import type { Role } from "./auth/roles"
import { waitingByPage } from "./by-page"
import type { Goal } from "./goals/goal"
import { goalsFor, proposalGoalsFor } from "./goals/stores"
import { pageCopiesFor } from "./proposing/stores"
import { pageNamesOf } from "./published-view"
import { queueRowOf, type QueueRow } from "./queue"
import { portalApplications, portalProjects } from "./store"
import { holdsFor } from "./write"
import { PORTAL_READ_BUDGET_MS } from "@/app/_lib/app/bounded"
import { readWithin, unavailable } from "@/app/_lib/app/bounded-store"
import { soleApplicationOf } from "@/app/_lib/app/sole-application"
import { publishedPagesFor } from "@/app/_lib/pages/store"

/**
 * What every *For review* list reads: the project's *For review* tab and a
 * page's own (`docs/portal-wireframes.md`, *5 · Pages · History*, the tab
 * *For review (N)*). One reading, so a change is said the same way on both.
 *
 * The changes waiting and the page copies they wait on must answer, or nothing
 * is a statement about what waits. What the site published, which goal each
 * change serves and the project's goals each cost only what they name: a page
 * by its id instead of its name, the goal chips, the goal picker.
 */
export type ReviewReading =
  | { readonly kind: "unavailable" }
  | { readonly kind: "no-site" }
  | {
      readonly kind: "read"
      readonly application: ApplicationId
      readonly projectName: string
      /** Every change waiting, oldest first, as the store lists them. */
      readonly rows: readonly QueueRow[]
      /** Each change waiting, by its proposal id, for the drawer that opens one. */
      readonly held: ReadonlyMap<string, HeldProposal>
      /** How many waiting changes could not be read, so a list never claims to be whole. */
      readonly unreadable: number
      /** Whether the goal each change serves was read; where not, no row has one. */
      readonly goalsRead: boolean
      /** The project's goals, for the picker; `undefined` where they could not be read. */
      readonly goals: readonly Goal[] | undefined
      /** The pages the site published, with their names; `undefined` where they could not be read. */
      readonly pages: ReadonlyMap<string, string> | undefined
      /** The ids of the pages the site published; `undefined` where they could not be read. */
      readonly pageIds: ReadonlySet<string> | undefined
    }

export const readReview = async (projectId: ProjectId, role: Role): Promise<ReviewReading> => {
  const [project, applications] = await Promise.all([
    portalProjects.get(projectId),
    portalApplications.list({ closed: "all" }),
  ])

  if (!project.ok || !applications.ok) return { kind: "unavailable" }

  const application = soleApplicationOf(applications.value, projectId)?.applicationId

  if (application === undefined) return { kind: "no-site" }

  const [waiting, published, copies, goals] = await Promise.all([
    holdsFor(application).waiting(),
    readWithin(() => publishedPagesFor(application).list(), unavailable, PORTAL_READ_BUDGET_MS),
    readWithin(() => pageCopiesFor(application).list(), unavailable, PORTAL_READ_BUDGET_MS),
    readWithin(() => goalsFor(application).list(), unavailable, PORTAL_READ_BUDGET_MS),
  ])

  if (!waiting.ok || !copies.ok) return { kind: "unavailable" }

  const { held, unreadable } = waiting.value
  const served = await readWithin(
    () => proposalGoalsFor(application).forIntents(held.map((change) => change.intent.intentId)),
    unavailable,
    PORTAL_READ_BUDGET_MS
  )
  const names = published.ok ? pageNamesOf(published.value) : new Map<string, string>()

  return {
    kind: "read",
    application,
    projectName: project.value.name,
    rows: held.map((change) =>
      queueRowOf(change, {
        names,
        role,
        copies: copies.value,
        goals: served.ok ? served.value : new Map(),
      })
    ),
    held: new Map(held.map((change) => [change.proposalId, change])),
    unreadable: unreadable.length,
    goalsRead: served.ok,
    goals: goals.ok ? goals.value : undefined,
    pages: published.ok ? names : undefined,
    pageIds: published.ok ? new Set(published.value.map((page) => page.tree.treeId)) : undefined,
  }
}

/**
 * How many changes wait for review on one page, for the count on its tab;
 * `undefined` where the changes or the copies they wait on could not be read,
 * so the tab never says nought for a list it could not read.
 */
export const readWaitingOn = async (
  application: ApplicationId,
  pageId: TreeId
): Promise<number | undefined> => {
  const [waiting, copies] = await Promise.all([
    holdsFor(application).waiting(),
    readWithin(() => pageCopiesFor(application).list(), unavailable, PORTAL_READ_BUDGET_MS),
  ])

  return waiting.ok && copies.ok
    ? (waitingByPage(waiting.value.held, copies.value).get(pageId) ?? 0)
    : undefined
}

/**
 * How many changes wait for a person in a project, for the count beside
 * *For review* on the rail: every change *For review* lists, and the ones it
 * says could not be read, since those wait too. `undefined` where the project's
 * site or its waiting changes could not be read, so the rail never says nought
 * for a list it could not read.
 */
export const readWaitingCount = async (projectId: ProjectId): Promise<number | undefined> => {
  const applications = await portalApplications.list({ closed: "all" })

  if (!applications.ok) return undefined

  const application = soleApplicationOf(applications.value, projectId)?.applicationId

  if (application === undefined) return undefined

  const waiting = await holdsFor(application).waiting()

  return waiting.ok ? waiting.value.held.length + waiting.value.unreadable.length : undefined
}
