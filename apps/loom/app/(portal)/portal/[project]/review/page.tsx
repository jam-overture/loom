import Link from "next/link"
import { notFound } from "next/navigation"

import { projectIdSchema } from "@jam-overture/loom/store"

import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { requireActor, requireRole } from "@/app/(portal)/_lib/auth/identity"
import { pageCopiesFor } from "@/app/(portal)/_lib/proposing/stores"
import { pageNamesOf } from "@/app/(portal)/_lib/published-view"
import { queueRowOf } from "@/app/(portal)/_lib/queue"
import { portalApplications, portalProjects } from "@/app/(portal)/_lib/store"
import { holdsFor } from "@/app/(portal)/_lib/write"
import { PORTAL_READ_BUDGET_MS } from "@/app/_lib/app/bounded"
import { readWithin, unavailable } from "@/app/_lib/app/bounded-store"
import { soleApplicationOf } from "@/app/_lib/app/sole-application"
import { publishedPagesFor } from "@/app/_lib/pages/store"

import { AnswerControls } from "./_components/answer-controls"

/**
 * *For review* (formerly *Waiting*): the changes proposed for this project's pages that the Gate
 * would not make alone (0329) — unit 7's queue.
 *
 * Each says what was proposed and why, of which page, by whom, why it stopped and how
 * much is at stake, whether it was proposed for an older version of the page (0340), and offers *Accept* and *Turn down* to a person whose
 * role may accept a change of that stake. Anybody else is told which role can.
 *
 * Oldest first, as the store lists them, so whatever has waited longest is
 * read first. A change the store could not read is counted rather than
 * skipped, so the list never claims to be complete when it is not.
 */
const ForReviewPage = async ({ params }: { params: Promise<{ project: string }> }) => {
  const asked = projectIdSchema.safeParse((await params).project)

  if (!asked.success) notFound()

  const projectId = asked.data

  /** Signed in first, with this address to come back to — the Connect screen's reason. */
  await requireActor(`/portal/${projectId}/review`)

  const role = await requireRole(projectId)

  const [project, applications] = await Promise.all([
    portalProjects.get(projectId),
    portalApplications.list({ closed: "all" }),
  ])

  const application = applications.ok ? soleApplicationOf(applications.value, projectId) : undefined

  const [waiting, published, copies] =
    application === undefined
      ? [undefined, undefined, undefined]
      : await Promise.all([
          holdsFor(application.applicationId).waiting(),
          readWithin(
            () => publishedPagesFor(application.applicationId).list(),
            unavailable,
            PORTAL_READ_BUDGET_MS
          ),
          readWithin(
            () => pageCopiesFor(application.applicationId).list(),
            unavailable,
            PORTAL_READ_BUDGET_MS
          ),
        ])

  const names = published?.ok === true ? pageNamesOf(published.value) : new Map<string, string>()

  const body = (() => {
    if (
      !project.ok ||
      !applications.ok ||
      (waiting !== undefined && !waiting.ok) ||
      (copies !== undefined && !copies.ok)
    ) {
      return (
        <StateNotice tone="failure" title="The store did not answer">
          Nothing here is a statement about what needs review. Try again in a moment.
        </StateNotice>
      )
    }

    if (application === undefined || waiting === undefined || copies === undefined) {
      return (
        <StateNotice tone="failure" title="There is no single site to read">
          This project does not hold exactly one site, so nothing can wait on it. Tell whoever runs
          this deployment.
        </StateNotice>
      )
    }

    const { held, unreadable } = waiting.value

    if (held.length === 0 && unreadable.length === 0) {
      return (
        <StateNotice
          tone="empty"
          title="Nothing needs review"
          action={
            <Link href={`/portal/${projectId}/pages`} className="text-ink underline">
              Pages
            </Link>
          }
        >
          A change Loom proposes for one of your pages waits here when it needs a person to say yes.
        </StateNotice>
      )
    }

    return (
      <div className="flex flex-col gap-3">
        {unreadable.length === 0 ? null : (
          <p className="text-refuse-ink text-xs">
            {unreadable.length === 1
              ? "1 change for review could not be read, so it is not shown."
              : `${unreadable.length} changes for review could not be read, so they are not shown.`}
          </p>
        )}
        {held
          .map((change) => queueRowOf(change, names, role, copies.value))
          .map((row) => (
            <section
              key={row.proposalId}
              className="border-edge-subtle bg-surface-base flex flex-col gap-2 rounded-lg border p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={`/portal/${projectId}/pages/${row.pageId}`}
                  className="text-ink text-xs no-underline hover:underline"
                >
                  {row.page}
                </Link>
                <span className="text-ink-muted text-xs">{row.since}</span>
              </div>
              <p className="m-0 text-sm">&ldquo;{row.asked}&rdquo;</p>
              {row.standingSentence === null ? null : (
                <p
                  className={`m-0 text-xs ${row.standing === "conflicts" ? "text-refuse-ink" : "text-ink-secondary"}`}
                >
                  {row.standingSentence}
                </p>
              )}
              {row.askedBy === null ? null : (
                <p className="text-ink-muted m-0 text-xs">Proposed by {row.askedBy}</p>
              )}
              <p className="text-ink-secondary m-0 text-xs">{row.why}</p>
              <p className="text-ink-muted m-0 text-xs">
                {row.stakes.label}. {row.stakes.meaning}
              </p>
              {row.waitsOn === null ? (
                <AnswerControls
                  projectId={projectId}
                  proposalId={row.proposalId}
                  acceptable={row.standing !== "conflicts"}
                />
              ) : (
                <p className="text-ink-muted m-0 text-xs">Waiting on an {row.waitsOn}.</p>
              )}
            </section>
          ))}
      </div>
    )
  })()

  return (
    <Screen>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl tracking-tight">For review</h1>
        {project.ok && <p className="text-ink-muted text-sm">{project.value.name}</p>}
      </div>

      {body}
    </Screen>
  )
}

export default ForReviewPage
