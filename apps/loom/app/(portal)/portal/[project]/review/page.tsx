import Link from "next/link"
import { notFound } from "next/navigation"

import { projectIdSchema } from "@jam-overture/loom/store"

import { GoalChip } from "@/app/(portal)/_components/goal-chip"
import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { requireActor, requireRole } from "@/app/(portal)/_lib/auth/identity"
import { goalsFor, proposalGoalsFor } from "@/app/(portal)/_lib/goals/stores"
import { pageCopiesFor } from "@/app/(portal)/_lib/proposing/stores"
import { pageNamesOf } from "@/app/(portal)/_lib/published-view"
import { queueRowOf } from "@/app/(portal)/_lib/queue"
import {
  EVERY_CHANGE,
  filteredRows,
  goalChoicesOf,
  reviewFilterOf,
  reviewHrefOf,
  standingChoicesOf,
} from "@/app/(portal)/_lib/review-filter"
import { portalApplications, portalProjects } from "@/app/(portal)/_lib/store"
import { holdsFor } from "@/app/(portal)/_lib/write"
import { PORTAL_READ_BUDGET_MS } from "@/app/_lib/app/bounded"
import { readWithin, unavailable } from "@/app/_lib/app/bounded-store"
import { soleApplicationOf } from "@/app/_lib/app/sole-application"
import { publishedPagesFor } from "@/app/_lib/pages/store"

import { AnswerControls } from "./_components/answer-controls"
import { FilterChips } from "./_components/filter-chips"

/**
 * *For review* (formerly *Waiting*): the changes proposed for this project's pages that the Gate
 * would not make alone (0329) — unit 7's queue.
 *
 * Each says what was proposed and why, of which page, by whom, why it stopped and how
 * much is at stake, whether it was proposed for an older version of the page (0340), and offers *Accept* and *Turn down* to a person whose
 * role may accept a change of that stake. Anybody else is told which role can.
 *
 * Each card leads with the goal the change serves (0352). A goal picker and
 * standing chips (`?goal=`, `?standing=`) narrow the list, each choice with its
 * count; the goal picker is left out where which goal a change serves, or the
 * goals themselves, cannot be read, rather than offering goals it cannot place.
 *
 * Oldest first, as the store lists them, so whatever has waited longest is
 * read first. A change the store could not read is counted rather than
 * skipped, so the list never claims to be complete when it is not.
 */
const single = (value: string | readonly string[] | undefined): string | undefined =>
  typeof value === "string" ? value : undefined

const ForReviewPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ project: string }>
  searchParams: Promise<Readonly<Record<string, string | readonly string[] | undefined>>>
}) => {
  const asked = projectIdSchema.safeParse((await params).project)
  const query = await searchParams

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

  const [waiting, published, copies, projectGoals] =
    application === undefined
      ? [undefined, undefined, undefined, undefined]
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
          readWithin(
            () => goalsFor(application.applicationId).list(),
            unavailable,
            PORTAL_READ_BUDGET_MS
          ),
        ])

  const filter = reviewFilterOf({ goal: single(query.goal), standing: single(query.standing) })
  const names = published?.ok === true ? pageNamesOf(published.value) : new Map<string, string>()
  const goals =
    application === undefined || waiting?.ok !== true
      ? undefined
      : await readWithin(
          () =>
            proposalGoalsFor(application.applicationId).forIntents(
              waiting.value.held.map((held) => held.intent.intentId)
            ),
          unavailable,
          PORTAL_READ_BUDGET_MS
        )

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
    const rows = held.map((change) =>
      queueRowOf(change, {
        names,
        role,
        copies: copies.value,
        goals: goals?.ok === true ? goals.value : new Map(),
      })
    )
    const shown = filteredRows(rows, filter)
    const goalChoices =
      goals?.ok === true && projectGoals?.ok === true
        ? goalChoicesOf(rows, projectGoals.value, filter, projectId)
        : undefined

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
        {goals?.ok === true ? null : (
          <p className="text-ink-muted text-xs">
            Which goal each change serves cannot be read here. If goals are new to this deployment,
            whoever runs it has to run <code>pnpm db:push</code> once; otherwise try again in a
            moment.
          </p>
        )}
        {goalChoices === undefined ? null : <FilterChips label="Goal" choices={goalChoices} />}
        <FilterChips label="Standing" choices={standingChoicesOf(rows, filter, projectId)} />
        {shown.length === 0 ? (
          <StateNotice
            tone="empty"
            title="Nothing waiting matches"
            action={
              <Link href={reviewHrefOf(projectId, EVERY_CHANGE)} className="text-ink underline">
                Everything for review
              </Link>
            }
          >
            No change waiting for review fits the goal and standing picked.
          </StateNotice>
        ) : (
          shown.map((row) => (
            <section
              key={row.proposalId}
              className="border-edge-subtle bg-surface-base flex flex-col gap-2 rounded-lg border p-4"
            >
              {goals?.ok === true && <GoalChip goal={row.goal} />}
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
          ))
        )}
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
