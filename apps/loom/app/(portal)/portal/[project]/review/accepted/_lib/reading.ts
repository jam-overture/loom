import { ok, type TreeId } from "@jam-overture/loom"
import type { ProjectId } from "@jam-overture/loom/store"

import { acceptedOnPages } from "@/app/(portal)/_lib/accepted-reading"
import { reachOf, type AcceptedChange, type Reach } from "@/app/(portal)/_lib/going-live"
import { namesInTree, type PartName } from "@/app/(portal)/_lib/part-name"
import { pageCopiesFor } from "@/app/(portal)/_lib/proposing/stores"
import { pageNamesOf } from "@/app/(portal)/_lib/published-view"
import { pullingOf } from "@/app/(portal)/_lib/pulling"
import { portalApplications, portalProjects } from "@/app/(portal)/_lib/store"
import { governedPagesFor } from "@/app/(portal)/_lib/write"
import { readWithin, unavailable } from "@/app/_lib/app/bounded-store"
import { soleApplicationOf } from "@/app/_lib/app/sole-application"
import { appSitePulls, publishedPagesFor } from "@/app/_lib/pages/store"

/**
 * What both screens under *Accepted* read: every change accepted on the
 * project's pages, and whether and when its site took them (0358).
 */
export type AcceptedReading =
  | { readonly kind: "unavailable" }
  | { readonly kind: "no-site" }
  | {
      readonly kind: "read"
      readonly projectName: string
      readonly changes: readonly AcceptedChange[]
      readonly reach: Reach
      /** Each published page's name, by its id, where the site gave it one. */
      readonly pages: ReadonlyMap<string, string>
      /** Every part of every published page, named, for the sentences about a change. */
      readonly parts: ReadonlyMap<TreeId, ReadonlyMap<string, PartName>>
    }

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
  const taken =
    pulling.kind !== "pulling" || oldest === undefined
      ? ok([])
      : await readWithin(() => appSitePulls.firstTakenSince(application, oldest), unavailable)

  return {
    kind: "read",
    projectName: project.value.name,
    changes: changes.value,
    reach: reachOf(pulling, taken),
    pages: pageNamesOf(published.value),
    parts: new Map(published.value.map((page) => [page.tree.treeId, namesInTree(page.tree)])),
  }
}
