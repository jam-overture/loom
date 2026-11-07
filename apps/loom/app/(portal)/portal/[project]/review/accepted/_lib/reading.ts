import { ok, type ProposalId, type TreeId } from "@jam-overture/loom"
import type { ApplicationId, ProjectId } from "@jam-overture/loom/store"

import { acceptedOnPages } from "@/app/(portal)/_lib/accepted-reading"
import { proposalGoalsFor } from "@/app/(portal)/_lib/goals/stores"
import {
  reachOf,
  type AcceptedChange,
  type Origins,
  type Reach,
} from "@/app/(portal)/_lib/going-live"
import { namesInTree, type PartName } from "@/app/(portal)/_lib/part-name"
import type { PageCopy } from "@/app/(portal)/_lib/proposing/copies"
import { madeFromFor, pageCopiesFor } from "@/app/(portal)/_lib/proposing/stores"
import { pageNamesOf } from "@/app/(portal)/_lib/published-view"
import { pullingOf } from "@/app/(portal)/_lib/pulling"
import { portalApplications, portalProjects } from "@/app/(portal)/_lib/store"
import { governedPagesFor } from "@/app/(portal)/_lib/write"
import { readWithin, unavailable } from "@/app/_lib/app/bounded-store"
import { soleApplicationOf } from "@/app/_lib/app/sole-application"
import { appSitePulls, publishedPagesFor } from "@/app/_lib/pages/store"

/**
 * What both screens under *Accepted* read: every change accepted on the
 * project's pages, whether and when its site took them (0358), and the goal
 * each served with the stake it was made at.
 */
export type AcceptedReading =
  | { readonly kind: "unavailable" }
  | { readonly kind: "no-site" }
  | {
      readonly kind: "read"
      readonly application: ApplicationId
      readonly projectName: string
      readonly changes: readonly AcceptedChange[]
      readonly reach: Reach
      /** When each page's copies started after its first, which is when the site's newer versions were followed. */
      readonly copyStarts: ReadonlyMap<TreeId, readonly number[]>
      /** What each change was made from and the goal it served, or that it could not be read. */
      readonly origins: Origins
      /** Each published page's name, by its id, where the site gave it one. */
      readonly pages: ReadonlyMap<string, string>
      /** Every part of every published page, named, for the sentences about a change. */
      readonly parts: ReadonlyMap<TreeId, ReadonlyMap<string, PartName>>
    }

/**
 * What the changes were made from, then the goals their intents served. A
 * deployment without the table reads as `unreadable`, and the rest of the
 * screen stands.
 */
const originsOf = async (
  application: ApplicationId,
  proposalIds: readonly ProposalId[]
): Promise<Origins> => {
  const made = await readWithin(
    () => madeFromFor(application).forProposals(proposalIds),
    unavailable
  )

  if (!made.ok) return { kind: "unreadable" }

  const goals = await readWithin(
    () => proposalGoalsFor(application).forIntents([...made.value.values()].map((m) => m.intentId)),
    unavailable
  )

  return goals.ok ? { kind: "read", made: made.value, goals: goals.value } : { kind: "unreadable" }
}

const copyStartsOf = (copies: readonly PageCopy[]): ReadonlyMap<TreeId, readonly number[]> =>
  copies.reduce(
    (starts, copy) =>
      new Map(starts).set(copy.pageId, [...(starts.get(copy.pageId) ?? []), copy.startedAt]),
    new Map<TreeId, readonly number[]>()
  )

export const readAccepted = async (projectId: ProjectId, now: number): Promise<AcceptedReading> => {
  const [project, applications] = await Promise.all([
    portalProjects.get(projectId),
    portalApplications.list({ closed: "all" }),
  ])

  if (!project.ok || !applications.ok) return { kind: "unavailable" }

  const application = soleApplicationOf(applications.value, projectId)?.applicationId

  if (application === undefined) return { kind: "no-site" }

  const [published, copies, span] = await Promise.all([
    readWithin(() => publishedPagesFor(application).list(), unavailable),
    readWithin(() => pageCopiesFor(application).list(), unavailable),
    readWithin(() => appSitePulls.span(application), unavailable),
  ])

  if (!published.ok || !copies.ok) return { kind: "unavailable" }

  const changes = await readWithin(
    () =>
      acceptedOnPages(
        governedPagesFor(application),
        copies.value,
        published.value.map((page) => page.tree.treeId)
      ),
    unavailable
  )

  if (!changes.ok) return { kind: "unavailable" }

  const pulling = pullingOf(application, span, now)
  const oldest = changes.value.at(-1)?.acceptedAt
  const [taken, origins] = await Promise.all([
    pulling.kind !== "pulling" || oldest === undefined
      ? ok([])
      : readWithin(() => appSitePulls.firstTakenSince(application, oldest), unavailable),
    originsOf(
      application,
      changes.value.map((change) => change.proposalId)
    ),
  ])

  return {
    kind: "read",
    application,
    projectName: project.value.name,
    changes: changes.value,
    reach: reachOf(pulling, taken),
    copyStarts: copyStartsOf(copies.value),
    origins,
    pages: pageNamesOf(published.value),
    parts: new Map(published.value.map((page) => [page.tree.treeId, namesInTree(page.tree)])),
  }
}
