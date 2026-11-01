import Link from "next/link"
import { notFound } from "next/navigation"

import { treeIdSchema } from "@jam-overture/loom"
import { projectIdSchema } from "@jam-overture/loom/store"

import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { mayAsk } from "@/app/(portal)/_lib/asking"
import { requireActor, requireRole } from "@/app/(portal)/_lib/auth/identity"
import { isInterpreterConfigured } from "@/app/(portal)/_lib/interpreter"
import { publishedRowOf } from "@/app/(portal)/_lib/published-view"
import { portalApplications, portalProjects } from "@/app/(portal)/_lib/store"
import { governedPagesFor } from "@/app/(portal)/_lib/write"
import { PORTAL_READ_BUDGET_MS } from "@/app/_lib/app/bounded"
import { absent, readWithin, unavailable } from "@/app/_lib/app/bounded-store"
import { soleApplicationOf } from "@/app/_lib/app/sole-application"
import { publishedPagesFor } from "@/app/_lib/pages/store"

import { AskForm } from "./_components/ask-form"

/**
 * One published page, and the place to ask for a change to it (0329).
 *
 * It says two versions because there are two: the one the site last
 * published, and the one Loom's copy of the page has reached through the
 * changes asked for here. They start equal and part when a change is made,
 * and until unit 8 turns an accepted change into a pull request, the site
 * keeps serving the published one.
 *
 * The request box is offered only where it can be answered: to a role that
 * could accept a change, on an open project, on a deployment with a model.
 * Each of the others is said, so nobody types a request that goes nowhere.
 */
const PageScreen = async ({ params }: { params: Promise<{ project: string; tree: string }> }) => {
  const route = await params
  const asked = projectIdSchema.safeParse(route.project)
  const treeId = treeIdSchema.safeParse(route.tree)

  if (!asked.success || !treeId.success) notFound()

  const projectId = asked.data

  /** Signed in first, with this address to come back to — the Connect screen's reason. */
  await requireActor(`/portal/${projectId}/pages/${treeId.data}`)

  const role = await requireRole(projectId)

  const [project, applications] = await Promise.all([
    portalProjects.get(projectId),
    portalApplications.list({ closed: "all" }),
  ])

  const application = applications.ok ? soleApplicationOf(applications.value, projectId) : undefined

  const [published, copy] =
    application === undefined
      ? [undefined, undefined]
      : await Promise.all([
          readWithin(
            () => publishedPagesFor(application.applicationId).list(),
            unavailable,
            PORTAL_READ_BUDGET_MS
          ),
          governedPagesFor(application.applicationId).head(treeId.data),
        ])

  if (
    !project.ok ||
    !applications.ok ||
    application === undefined ||
    published === undefined ||
    copy === undefined ||
    !published.ok ||
    (!copy.ok && !absent(copy))
  ) {
    return (
      <Screen>
        <StateNotice tone="failure" title="The store did not answer">
          Nothing here is a statement about this page. Try again in a moment.
        </StateNotice>
      </Screen>
    )
  }

  const page = published.value.find((held) => held.tree.treeId === treeId.data)

  if (page === undefined) notFound()

  const row = publishedRowOf(page)
  const closed = project.value.closedAt !== undefined || application.closedAt !== undefined

  const asking = (() => {
    if (closed) {
      return (
        <p className="text-ink-muted text-xs">
          This project is closed, so nothing can be asked of its pages. Reopen it in Settings.
        </p>
      )
    }

    if (!mayAsk(role)) {
      return (
        <p className="text-ink-muted text-xs">
          You can read this page. Asking for a change is for an approver or an owner of the project.
        </p>
      )
    }

    if (!isInterpreterConfigured) {
      return (
        <p className="text-ink-muted text-xs">
          This deployment has no model to work out a change, so nothing can be asked yet. Whoever
          runs it sets LOOM_ANTHROPIC_API_KEY.
        </p>
      )
    }

    return <AskForm projectId={projectId} treeId={row.treeId} />
  })()

  return (
    <Screen>
      <div className="flex flex-col gap-2">
        <Link
          href={`/portal/${projectId}/pages`}
          className="text-ink-muted self-start text-xs no-underline hover:underline"
        >
          ← Pages
        </Link>
        <h1 className={row.derived ? "text-2xl tracking-tight" : "text-ink-muted text-2xl italic"}>
          {row.name}
        </h1>
        <p className="text-ink-muted font-mono text-xs">{row.treeId}</p>
      </div>

      <section className="border-edge-subtle bg-surface-base flex flex-col gap-1.5 rounded-lg border p-4">
        <p className="text-xs">
          Your site last published version {row.revision}, on {row.received}.
        </p>
        <p className="text-ink-muted text-xs">
          {copy.ok
            ? copy.value.revision === row.revision
              ? "Nothing asked for here has changed it yet."
              : `Changes asked for here have taken Loom's copy to version ${copy.value.revision}. Your site still serves the published one.`
            : "Nothing has been asked of this page yet."}
        </p>
      </section>

      <section className="border-edge-subtle bg-surface-base flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium tracking-tight">Ask for a change</h2>
        {asking}
      </section>
    </Screen>
  )
}

export default PageScreen
