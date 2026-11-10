import Link from "next/link"
import { notFound } from "next/navigation"

import type { TreeId } from "@jam-overture/loom"
import { projectIdSchema } from "@jam-overture/loom/store"

import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { readMeasurement } from "@/app/(portal)/_lib/accepted/measurement"
import { readAccepted, type AcceptedReading } from "@/app/(portal)/_lib/accepted/reading"
import { requireActor, requireRole } from "@/app/(portal)/_lib/auth/identity"
import { goalNameOf, sentencesOf, servedOf } from "@/app/(portal)/_lib/going-live"
import {
  historyOf,
  loomOutcomeOf,
  newestOf,
  NOT_A_LOOM_CHANGE,
  originOf,
  versionWordsOf,
} from "@/app/(portal)/_lib/page-history"
import { publishedRowOf } from "@/app/(portal)/_lib/published-view"
import { portalApplications, portalProjects } from "@/app/(portal)/_lib/store"
import { PORTAL_READ_BUDGET_MS } from "@/app/_lib/app/bounded"
import { readWithin, unavailable } from "@/app/_lib/app/bounded-store"
import { soleApplicationOf } from "@/app/_lib/app/sole-application"
import { publishedPagesFor } from "@/app/_lib/pages/store"

import { NewestChange, type Newest } from "./_components/newest-change"

/**
 * *Pages*: the pages a project's site last published — unit 6 of
 * `docs/portal.md`, and the first screen showing a customer's own trees
 * rather than what was counted about them.
 *
 * It reads what the site's build sent to `/api/pages` (0312), so it is what
 * the site says it serves, not what Loom changed. A page a later snapshot left
 * out stays, with the date it last arrived (clause 4), and anybody in the
 * project reads it, because it says nothing a reader of the site cannot see.
 *
 * Each page also says its newest change, answering the rail's question for
 * *Pages* (`docs/portal-wireframes.md`, *The chrome*: what is live, and did
 * each change help?): a Loom change with the verdict its card on *Page
 * history* gives and the goal it served beside it, one accepted and on its way to readers with where it has
 * got to, or the site's own version, which Loom does not judge. Where Loom's
 * record of changes cannot be read the column is left out and the list stands.
 */

/**
 * A page's newest version in the list's words, from the record every screen
 * under *Accepted* reads: a Loom change measured as its card on *Page history*
 * measures it, or the site's own version.
 */
const newestWordsOf = async (
  reading: Extract<AcceptedReading, { readonly kind: "read" }>,
  pageId: TreeId,
  now: number
): Promise<Newest | undefined> => {
  const newest = newestOf(
    historyOf(pageId, reading.changes, reading.copyStarts.get(pageId) ?? [], reading.reach)
  )

  if (newest === undefined) return undefined

  if (newest.kind === "site") {
    return { outcome: { label: NOT_A_LOOM_CHANGE, tone: "plain" }, what: originOf(newest) }
  }

  const { change } = newest
  const served = servedOf(change.proposalId, reading.origins)
  const measurement = await readMeasurement(reading, change, served)

  return {
    outcome: loomOutcomeOf(change, reading.reach, measurement, now),
    what: versionWordsOf(change, reading.changes, sentencesOf(change, reading.parts)).heading,
    ...(served.kind === "recorded" ? { goal: goalNameOf(served) } : {}),
  }
}
const PagesPage = async ({ params }: { params: Promise<{ project: string }> }) => {
  const asked = projectIdSchema.safeParse((await params).project)

  if (!asked.success) notFound()

  const projectId = asked.data

  /** Signed in first, with this address to come back to — the Connect screen's reason. */
  await requireActor(`/portal/${projectId}/pages`)
  await requireRole(projectId)

  const [project, applications] = await Promise.all([
    portalProjects.get(projectId),
    portalApplications.list({ closed: "all" }),
  ])

  const application = applications.ok ? soleApplicationOf(applications.value, projectId) : undefined

  const now = Date.now()
  const [published, accepted] =
    application === undefined
      ? [undefined, undefined]
      : await Promise.all([
          readWithin(
            () => publishedPagesFor(application.applicationId).list(),
            unavailable,
            PORTAL_READ_BUDGET_MS
          ),
          readAccepted(projectId, now),
        ])
  const pageIds = published?.ok === true ? published.value.map((page) => page.tree.treeId) : []
  const newest =
    accepted?.kind === "read"
      ? new Map<string, Newest | undefined>(
          await Promise.all(
            pageIds.map(
              async (pageId) => [pageId, await newestWordsOf(accepted, pageId, now)] as const
            )
          )
        )
      : undefined

  const body = (() => {
    /** A store that cannot answer is said, never drawn as *nothing published*. */
    if (!project.ok || !applications.ok || (published !== undefined && !published.ok)) {
      return (
        <StateNotice tone="failure" title="The store did not answer">
          Nothing here is a statement about what your site has published. Try again in a moment.
        </StateNotice>
      )
    }

    if (application === undefined || published === undefined) {
      return (
        <StateNotice tone="failure" title="There is no single site to read">
          This project does not hold exactly one site, so nothing can be published under it. Tell
          whoever runs this deployment.
        </StateNotice>
      )
    }

    if (published.value.length === 0) {
      return (
        <StateNotice
          tone="empty"
          title="Your site has not published its pages yet"
          action={
            <Link href={`/portal/${projectId}/connect`} className="text-ink underline">
              Connect your site
            </Link>
          }
        >
          Once your build sends its pages, each one shows up here by the name its heading gives it.
        </StateNotice>
      )
    }

    return (
      <div className="flex flex-col gap-3">
        <table className="w-full text-left text-xs">
          <thead className="text-ink-muted">
            <tr>
              <th className="py-1.5 font-normal">Page</th>
              <th className="py-1.5 font-normal">Version</th>
              {newest === undefined ? null : <th className="py-1.5 font-normal">Newest change</th>}
              <th className="py-1.5 text-right font-normal">Last published</th>
            </tr>
          </thead>
          <tbody>
            {published.value.map(publishedRowOf).map((row) => (
              <tr key={row.treeId} className="border-edge-subtle border-t">
                <td className="py-1.5">
                  <Link
                    href={`/portal/${projectId}/pages/${row.treeId}`}
                    className={row.derived ? "text-ink" : "text-ink-muted italic"}
                  >
                    {row.name}
                  </Link>
                  <span className="text-ink-muted block font-mono text-[11px]">{row.treeId}</span>
                </td>
                <td className="py-1.5">{row.revision}</td>
                {newest === undefined ? null : (
                  <td className="py-1.5">
                    <NewestChange
                      newest={newest.get(row.treeId)}
                      history={`/portal/${projectId}/pages/${row.treeId}/history`}
                    />
                  </td>
                )}
                <td className="py-1.5 text-right">{row.received}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {newest === undefined ? (
          <p className="text-ink-muted m-0 text-xs">
            Loom&apos;s record of the changes made to these pages could not be read, so the list
            does not say what changed on each. Try again in a moment.
          </p>
        ) : null}
      </div>
    )
  })()

  return (
    <Screen>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl tracking-tight">Pages</h1>
        {project.ok && <p className="text-ink-muted text-sm">{project.value.name}</p>}
      </div>

      {body}
    </Screen>
  )
}

export default PagesPage
