import Link from "next/link"
import { notFound } from "next/navigation"

import { treeIdSchema } from "@jam-overture/loom"
import { projectIdSchema, type ApplicationId } from "@jam-overture/loom/store"
import type { HeldProposal } from "@jam-overture/loom/write"

import { FilterChips } from "@/app/(portal)/_components/filter-chips"
import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { requireActor, requireRole } from "@/app/(portal)/_lib/auth/identity"
import { roleThatCanAccept } from "@/app/(portal)/_lib/auth/roles"
import { drawHeld } from "@/app/(portal)/_lib/held-change"
import { requestPartsOf } from "@/app/(portal)/_lib/proposing/brief"
import { nextLookOf, type NextLook } from "@/app/(portal)/_lib/proposing/next-look"
import { scheduleConfigured } from "@/app/(portal)/_lib/proposing/schedule"
import { turnedDownFor } from "@/app/(portal)/_lib/proposing/stores"
import type { TurnedDown } from "@/app/(portal)/_lib/proposing/turned-down"
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
import { readTurnedDownCount } from "@/app/(portal)/_lib/turned-down-reading"
import type { QueueRow } from "@/app/(portal)/_lib/queue"
import { governedPagesFor } from "@/app/(portal)/_lib/write"
import { modelKeyOf } from "@/app/_lib/models/store"
import { PORTAL_READ_BUDGET_MS } from "@/app/_lib/app/bounded"
import { readWithin, unavailable } from "@/app/_lib/app/bounded-store"

import { ChangeDrawer } from "./_components/change-drawer"
import { NextLookLine } from "./_components/next-look-line"
import { ReviewCard, ReviewGaps } from "./_components/review-card"
import { TurnedDownLine } from "./_components/turned-down-line"

/**
 * The last change turned down on a page, read only for a change that says it
 * was turned down before (0341); `null` where there is none or it could not
 * be read, which costs that line alone.
 */
const lastTurnedDownOn = async (
  application: ApplicationId,
  pageId: string
): Promise<TurnedDown | null> => {
  const page = treeIdSchema.safeParse(pageId)

  if (!page.success) return null

  const read = await readWithin(
    () => turnedDownFor(application).forPage(page.data, 1),
    unavailable,
    PORTAL_READ_BUDGET_MS
  )

  return read.ok ? (read.value[0] ?? null) : null
}

/**
 * When Loom next looks at the project's pages by itself, or why it will not;
 * `undefined` where the project's key could not be read, which costs that line alone.
 */
const readNextLook = async (
  application: ApplicationId,
  now: number
): Promise<NextLook | undefined> => {
  const key = await modelKeyOf(application)

  return key.ok
    ? nextLookOf({ now, scheduled: scheduleConfigured(process.env.CRON_SECRET), key: key.value })
    : undefined
}

/** The drawer for one waiting change: the page before and after it, read when it opens. */
const OpenChange = async ({
  application,
  row,
  held,
  goalsRead,
  projectId,
  close,
}: {
  readonly application: ApplicationId
  readonly row: QueueRow
  readonly held: HeldProposal
  readonly goalsRead: boolean
  readonly projectId: string
  readonly close: string
}) => {
  const parts = requestPartsOf(row.asked)
  const [drawn, lastTurnedDown] = await Promise.all([
    drawHeld(governedPagesFor(application), held, row.standing),
    parts.again === null ? null : lastTurnedDownOn(application, row.pageId),
  ])

  return (
    <ChangeDrawer
      row={row}
      parts={parts}
      drawn={drawn}
      lastTurnedDown={lastTurnedDown}
      acceptedBy={roleThatCanAccept(held.disposition.stakes)}
      goalsRead={goalsRead}
      projectId={projectId}
      close={close}
    />
  )
}

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
 * A change opens a drawer beside the list (`?change=`, every filter kept):
 * the page before and after it as two outlines, why Loom proposes it, what it
 * expects and what is at stake, with the answers (`docs/portal-wireframes.md`,
 * *2 · For review*). A change no longer waiting says so in its place.
 *
 * Under the title, when Loom next looks at the pages by itself (the daily
 * sweep, 0329) or why it will not: no schedule on this deployment, or no
 * model key Loom can use for the project (0332).
 *
 * *Accepted*, linked under the heading, follows each change said yes to on to
 * live and its result (0358). *Turned down recently*, under the list, counts
 * the changes said no to in the last thirty days and leads to them (0341);
 * it is left out where they could not be read.
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
  const now = Date.now()
  const [turnedDown, nextLook] =
    reading.kind === "read"
      ? await Promise.all([
          readTurnedDownCount(reading.application, now),
          readNextLook(reading.application, now),
        ])
      : [undefined, undefined]
  const filter = reviewFilterOf({ goal: single(query.goal), standing: single(query.standing) })
  const opened = single(query.change)

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

    const { rows, held, unreadable, goalsRead, goals } = reading

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
    const close = reviewHrefOf(projectId, filter)
    const openRow = opened === undefined ? undefined : rows.find((row) => row.proposalId === opened)
    const openHeld = opened === undefined ? undefined : held.get(opened)

    const list = (
      <div className="flex min-w-0 flex-1 flex-col gap-3">
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
              open={reviewHrefOf(projectId, filter, row.proposalId)}
            />
          ))
        )}
      </div>
    )

    if (opened === undefined) return list

    return (
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {list}
        {openRow === undefined || openHeld === undefined ? (
          <aside className="w-full shrink-0 self-start lg:w-[480px]">
            <StateNotice
              tone="empty"
              title="This change is no longer waiting"
              action={
                <Link href={`/portal/${projectId}/review/accepted`} className="text-ink underline">
                  Accepted
                </Link>
              }
            >
              It was answered, or never waited here. A change said yes to is on Accepted.
            </StateNotice>
          </aside>
        ) : (
          <OpenChange
            application={reading.application}
            row={openRow}
            held={openHeld}
            goalsRead={goalsRead}
            projectId={projectId}
            close={close}
          />
        )}
      </div>
    )
  })()

  return (
    <Screen>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl tracking-tight">For review</h1>
        {reading.kind === "read" && <p className="text-ink-muted text-sm">{reading.projectName}</p>}
        {nextLook === undefined ? null : (
          <NextLookLine look={nextLook} now={now} projectId={projectId} />
        )}
        <Link
          href={`/portal/${projectId}/review/accepted`}
          className="text-ink self-start text-xs no-underline hover:underline"
        >
          Accepted: where each change you said yes to has got to
        </Link>
      </div>

      {body}

      {turnedDown === undefined ? null : (
        <TurnedDownLine count={turnedDown} projectId={projectId} />
      )}
    </Screen>
  )
}

export default ForReviewPage
