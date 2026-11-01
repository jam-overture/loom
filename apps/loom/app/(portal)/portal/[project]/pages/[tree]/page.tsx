import Link from "next/link"
import { notFound } from "next/navigation"

import { treeIdSchema } from "@jam-overture/loom"
import { DEFAULT_APPLICATION_ID, projectIdSchema } from "@jam-overture/loom/store"

import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { requireActor, requireRole } from "@/app/(portal)/_lib/auth/identity"
import { mayPropose } from "@/app/(portal)/_lib/proposing/report"
import { publishedRowOf } from "@/app/(portal)/_lib/published-view"
import { portalApplications, portalProjects } from "@/app/(portal)/_lib/store"
import { governedPagesFor } from "@/app/(portal)/_lib/write"
import { PORTAL_READ_BUDGET_MS } from "@/app/_lib/app/bounded"
import { absent, readWithin, unavailable } from "@/app/_lib/app/bounded-store"
import { soleApplicationOf } from "@/app/_lib/app/sole-application"
import { modelKeyOf } from "@/app/_lib/models/store"
import { publishedPagesFor } from "@/app/_lib/pages/store"

import { LookForm } from "./_components/look-form"

/**
 * One published page, and what Loom proposes for it (0329).
 *
 * It says two versions because there are two: the one the site last
 * published, and the one Loom's copy of the page has reached through the
 * changes proposed for it. They start equal and part when a change is made,
 * and until unit 8 turns an accepted change into a pull request, the site
 * keeps serving the published one.
 *
 * Loom looks at every page once a day by itself. *Look now* is offered only
 * where it can run: to a role that could accept a change, on an open project
 * with a model key of its own (0332). Each of the others is said, so nobody
 * presses a button that goes nowhere.
 */
/**
 * Where Loom's copy stands against what the site published. This
 * deployment's own site serves its copy (0259), so there a change is live;
 * every other site keeps serving what it published (0329 clause 7).
 */
const copyStanding = (copied: number | undefined, published: number, servesCopy: boolean) => {
  if (copied === undefined) return "Loom has not proposed anything for this page yet."
  if (copied === published) return "Nothing Loom proposed has changed it yet."

  return servesCopy
    ? `Changes Loom proposed have taken it to version ${copied}, and this deployment's own site serves that version.`
    : `Changes Loom proposed have taken its copy to version ${copied}. Your site still serves the published one.`
}

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

  const [published, copy, key] =
    application === undefined
      ? [undefined, undefined, undefined]
      : await Promise.all([
          readWithin(
            () => publishedPagesFor(application.applicationId).list(),
            unavailable,
            PORTAL_READ_BUDGET_MS
          ),
          governedPagesFor(application.applicationId).head(treeId.data),
          modelKeyOf(application.applicationId),
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

  const looking = (() => {
    if (closed) {
      return (
        <p className="text-ink-muted text-xs">
          This project is closed, so Loom proposes nothing for its pages. Reopen it in Settings.
        </p>
      )
    }

    if (key === undefined || !key.ok) {
      return (
        <p className="text-ink-muted text-xs">
          The store did not say whether this project has a model key. Try again in a moment.
        </p>
      )
    }

    if (key.value.kind !== "set") {
      return (
        <p className="text-ink-muted text-xs">
          {key.value.kind === "none"
            ? "Loom proposes changes with the project's own Anthropic key, and this project has none yet."
            : "This project's model key can no longer be read, so it has to be set again."}{" "}
          <Link href={`/portal/${projectId}/settings`}>An owner sets it in Settings.</Link>
        </p>
      )
    }

    return (
      <div className="flex flex-col gap-3">
        <p className="text-ink-muted text-xs">
          Once a day Loom reads what readers did on this page and, when the figures support it,
          proposes one change. A change it may not make alone waits under Waiting.
        </p>
        {mayPropose(role) ? (
          <LookForm projectId={projectId} treeId={row.treeId} />
        ) : (
          <p className="text-ink-muted text-xs">
            An approver or an owner can also have it look now.
          </p>
        )}
      </div>
    )
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
          {copyStanding(
            copy.ok ? copy.value.revision : undefined,
            row.revision,
            application.applicationId === DEFAULT_APPLICATION_ID
          )}
        </p>
      </section>

      <section className="border-edge-subtle bg-surface-base flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium tracking-tight">What Loom proposes</h2>
        {looking}
      </section>
    </Screen>
  )
}

export default PageScreen
