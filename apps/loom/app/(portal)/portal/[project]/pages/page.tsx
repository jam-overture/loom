import Link from "next/link"
import { notFound } from "next/navigation"

import { projectIdSchema } from "@jam-overture/loom/store"

import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { requireActor, requireRole } from "@/app/(portal)/_lib/auth/identity"
import { publishedRowOf } from "@/app/(portal)/_lib/published-view"
import { portalApplications, portalProjects } from "@/app/(portal)/_lib/store"
import { PORTAL_READ_BUDGET_MS } from "@/app/_lib/app/bounded"
import { readWithin, unavailable } from "@/app/_lib/app/bounded-store"
import { soleApplicationOf } from "@/app/_lib/app/sole-application"
import { publishedPagesFor } from "@/app/_lib/pages/store"

/**
 * *Pages*: the pages a project's site last published — unit 6 of
 * `docs/portal.md`, and the first screen showing a customer's own trees
 * rather than what was counted about them.
 *
 * It reads what the site's build sent to `/api/pages` (0312), so it is what
 * the site says it serves, not what Loom changed. A page a later snapshot left
 * out stays, with the date it last arrived (clause 4), and anybody in the
 * project reads it, because it says nothing a reader of the site cannot see.
 */
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

  const published =
    application === undefined
      ? undefined
      : await readWithin(
          () => publishedPagesFor(application.applicationId).list(),
          unavailable,
          PORTAL_READ_BUDGET_MS
        )

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
      <table className="w-full text-left text-xs">
        <thead className="text-ink-muted">
          <tr>
            <th className="py-1.5 font-normal">Page</th>
            <th className="py-1.5 font-normal">Id</th>
            <th className="py-1.5 font-normal">Version</th>
            <th className="py-1.5 text-right font-normal">Last published</th>
          </tr>
        </thead>
        <tbody>
          {published.value.map(publishedRowOf).map((row) => (
            <tr key={row.treeId} className="border-edge-subtle border-t">
              <td className={row.derived ? "py-1.5" : "text-ink-muted py-1.5 italic"}>
                {row.name}
              </td>
              <td className="py-1.5 font-mono">{row.treeId}</td>
              <td className="py-1.5">{row.revision}</td>
              <td className="py-1.5 text-right">{row.received}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
