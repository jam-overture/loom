import Link from "next/link"
import { notFound } from "next/navigation"

import { projectIdSchema } from "@jam-overture/loom/store"

import { GoalChip } from "@/app/(portal)/_components/goal-chip"
import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { requireActor, requireRole } from "@/app/(portal)/_lib/auth/identity"
import {
  acceptedPage,
  goalNameOf,
  sentencesOf,
  servedOf,
  statusOf,
  type StepState,
} from "@/app/(portal)/_lib/going-live"
import { plainMoment } from "@/app/(portal)/_lib/when"

import { readAccepted } from "@/app/(portal)/_lib/accepted/reading"

/**
 * *Accepted*: every change accepted on the project's pages, newest first, each
 * saying where it has got to and opening its timeline (unit 8, 0358). It is
 * how a person finds a change again after *Accept*, which is the other way the
 * wireframes reach the timeline.
 *
 * Fifty to a page, with the last change shown in the address (`before`).
 * Each leads with the goal it served where that was kept.
 */
/** Live in green, an ending in red, and a change still on its way in the body's grey. */
const STATUS_INK: Readonly<Record<StepState, string>> = {
  done: "text-applied-ink",
  current: "text-ink-secondary",
  upcoming: "text-ink-secondary",
  ended: "text-refuse-ink",
}

const single = (value: string | readonly string[] | undefined): string | undefined =>
  typeof value === "string" ? value : undefined

const AcceptedPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ project: string }>
  searchParams: Promise<Readonly<Record<string, string | readonly string[] | undefined>>>
}) => {
  const asked = projectIdSchema.safeParse((await params).project)
  const before = single((await searchParams).before)

  if (!asked.success) notFound()

  const projectId = asked.data
  const here = `/portal/${projectId}/review/accepted`

  /** Signed in first, with this address to come back to — the Connect screen's reason. */
  await requireActor(here)
  await requireRole(projectId)

  const reading = await readAccepted(projectId, Date.now())

  const body = (() => {
    if (reading.kind === "unavailable") {
      return (
        <StateNotice tone="failure" title="The store did not answer">
          Nothing here is a statement about what was accepted. Try again in a moment.
        </StateNotice>
      )
    }

    if (reading.kind === "no-site") {
      return (
        <StateNotice tone="failure" title="There is no single site to read">
          This project does not hold exactly one site, so nothing can have been accepted on it. Tell
          whoever runs this deployment.
        </StateNotice>
      )
    }

    if (reading.changes.length === 0) {
      return (
        <StateNotice
          tone="empty"
          title="Nothing accepted yet"
          action={
            <Link href={`/portal/${projectId}/review`} className="text-ink underline">
              For review
            </Link>
          }
        >
          A change you accept under For review is listed here, with where it has got to on its way
          to your readers.
        </StateNotice>
      )
    }

    const page = acceptedPage(reading.changes, before)

    return (
      <div className="flex flex-col gap-3">
        {page.rows.map((change) => {
          const status = statusOf(change, reading.reach)
          const [said, ...more] = sentencesOf(change, reading.parts)
          const served = servedOf(change.proposalId, reading.origins)

          return (
            <Link
              key={change.proposalId}
              href={`${here}/${change.proposalId}`}
              className="border-edge-subtle bg-surface-base hover:bg-surface-hover flex flex-col gap-1.5 rounded-lg border p-4 no-underline"
            >
              {served.kind === "recorded" && <GoalChip goal={goalNameOf(served)} />}
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-ink-muted text-xs">
                  {reading.pages.get(change.pageId) ?? change.pageId}
                </span>
                <time
                  dateTime={new Date(change.acceptedAt).toISOString()}
                  className="text-ink-muted text-xs"
                >
                  Accepted {plainMoment(new Date(change.acceptedAt).toISOString())}
                </time>
              </div>
              <p className="text-ink m-0 text-sm">
                {said}
                {more.length === 0 ? null : (
                  <span className="text-ink-muted">
                    {" "}
                    And {more.length} more {more.length === 1 ? "part" : "parts"}.
                  </span>
                )}
              </p>
              <p className={`m-0 text-xs ${STATUS_INK[status.state]}`}>{status.title}</p>
            </Link>
          )
        })}
        <nav className="flex gap-4 text-xs">
          {before === undefined ? null : (
            <Link href={here} className="text-ink">
              Newest
            </Link>
          )}
          {page.older === undefined ? null : (
            <Link href={`${here}?before=${page.older}`} className="text-ink">
              Older
            </Link>
          )}
        </nav>
      </div>
    )
  })()

  return (
    <Screen>
      <div className="flex flex-col gap-2">
        <Link
          href={`/portal/${projectId}/review`}
          className="text-ink-muted self-start text-xs no-underline hover:underline"
        >
          ← For review
        </Link>
        <h1 className="text-2xl tracking-tight">Accepted</h1>
        {reading.kind === "read" && <p className="text-ink-muted text-sm">{reading.projectName}</p>}
      </div>

      {body}
    </Screen>
  )
}

export default AcceptedPage
