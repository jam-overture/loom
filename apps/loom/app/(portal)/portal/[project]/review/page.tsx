import Link from "next/link"
import { notFound } from "next/navigation"

import { projectIdSchema } from "@jam-overture/loom/store"

import { FilterChips } from "@/app/(portal)/_components/filter-chips"
import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { requireActor, requireRole } from "@/app/(portal)/_lib/auth/identity"
import { single, type Query } from "@/app/(portal)/_lib/query"
import {
  EVERY_CHANGE,
  filteredRows,
  goalChoicesOf,
  reviewFilterOf,
  reviewHrefOf,
  standingChoicesOf,
} from "@/app/(portal)/_lib/review-filter"
import { readReview } from "@/app/(portal)/_lib/review-reading"

import { ReviewCard, ReviewGaps } from "./_components/review-card"

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
 * *Accepted*, linked under the heading, follows each change said yes to on to
 * live and its result (0358).
 *
 * Oldest first, as the store lists them, so whatever has waited longest is
 * read first. A change the store could not read is counted rather than
 * skipped, so the list never claims to be complete when it is not. A page's
 * own *For review* tab draws the same cards for that page alone.
 */
const ForReviewPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ project: string }>
  searchParams: Promise<Query>
}) => {
  const asked = projectIdSchema.safeParse((await params).project)
  const query = await searchParams

  if (!asked.success) notFound()

  const projectId = asked.data

  /** Signed in first, with this address to come back to — the Connect screen's reason. */
  await requireActor(`/portal/${projectId}/review`)

  const reading = await readReview(projectId, await requireRole(projectId))
  const filter = reviewFilterOf({ goal: single(query.goal), standing: single(query.standing) })

  const body = (() => {
    if (reading.kind === "unavailable") {
      return (
        <StateNotice tone="failure" title="The store did not answer">
          Nothing here is a statement about what needs review. Try again in a moment.
        </StateNotice>
      )
    }

    if (reading.kind === "no-site") {
      return (
        <StateNotice tone="failure" title="There is no single site to read">
          This project does not hold exactly one site, so nothing can wait on it. Tell whoever runs
          this deployment.
        </StateNotice>
      )
    }

    const { rows, unreadable, goalsRead, goals } = reading

    if (rows.length === 0 && unreadable === 0) {
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

    const shown = filteredRows(rows, filter)

    return (
      <div className="flex flex-col gap-3">
        <ReviewGaps unreadable={unreadable} goalsRead={goalsRead} />
        {goalsRead && goals !== undefined ? (
          <FilterChips label="Goal" choices={goalChoicesOf(rows, goals, filter, projectId)} />
        ) : null}
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
            <ReviewCard
              key={row.proposalId}
              row={row}
              projectId={projectId}
              goalsRead={goalsRead}
            />
          ))
        )}
      </div>
    )
  })()

  return (
    <Screen>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl tracking-tight">For review</h1>
        {reading.kind === "read" && <p className="text-ink-muted text-sm">{reading.projectName}</p>}
        <Link
          href={`/portal/${projectId}/review/accepted`}
          className="text-ink self-start text-xs no-underline hover:underline"
        >
          Accepted: where each change you said yes to has got to
        </Link>
      </div>

      {body}
    </Screen>
  )
}

export default ForReviewPage
