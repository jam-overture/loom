import Link from "next/link"
import { notFound } from "next/navigation"

import { projectIdSchema } from "@jam-overture/loom/store"

import { Pager } from "@/app/(portal)/_components/pager"
import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { requireActor, requireRole } from "@/app/(portal)/_lib/auth/identity"
import { changesPage, newerHref, olderHref } from "@/app/(portal)/_lib/changes-page"
import { positionWords, spanLine, stretchWords } from "@/app/(portal)/_lib/list-span"
import { single, type Query } from "@/app/(portal)/_lib/query"
import { countWords, RECENT_DAYS } from "@/app/(portal)/_lib/turned-down-list"
import { readTurnedDown } from "@/app/(portal)/_lib/turned-down-reading"

import { TurnedDownCard } from "./_components/turned-down-card"

/**
 * *Turned down*: every change turned down on the project's pages in the last
 * thirty days, newest first, each with the reason given (0341;
 * `docs/portal-wireframes.md`, *2 · For review*, *Turned down recently: N ·
 * see them*). Loom weighs these the next time it proposes for a page, and may
 * propose one again when the page's signals have moved; this is where a
 * person sees what it is weighing.
 *
 * Fifty to a page, with the last change shown in the address (`before`).
 */
const TurnedDownPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ project: string }>
  searchParams: Promise<Query>
}) => {
  const asked = projectIdSchema.safeParse((await params).project)
  const before = single((await searchParams).before)

  if (!asked.success) notFound()

  const projectId = asked.data
  const here = `/portal/${projectId}/review/turned-down`

  /** Signed in first, with this address to come back to — the Connect screen's reason. */
  await requireActor(here)
  await requireRole(projectId)

  const now = Date.now()

  const reading = await readTurnedDown(projectId, now)

  const body = (() => {
    if (reading.kind === "unavailable") {
      return (
        <StateNotice tone="failure" title="The store did not answer">
          Nothing here is a statement about what was turned down. Try again in a moment.
        </StateNotice>
      )
    }

    if (reading.kind === "no-site") {
      return (
        <StateNotice tone="failure" title="There is no single site to read">
          This project does not hold exactly one site, so nothing can have been turned down on it.
          Tell whoever runs this deployment.
        </StateNotice>
      )
    }

    if (reading.rows.length === 0) {
      return (
        <StateNotice
          tone="empty"
          title={`Nothing turned down in the last ${RECENT_DAYS} days`}
          action={
            <Link href={`/portal/${projectId}/review`} className="text-ink underline">
              For review
            </Link>
          }
        >
          A change you turn down under For review is listed here with your reason, which Loom weighs
          the next time it proposes for that page.
        </StateNotice>
      )
    }

    const page = changesPage(reading.rows, before)

    return (
      <div className="flex flex-col gap-3">
        <p className="text-ink-secondary m-0 text-sm">
          {countWords(reading.count)} in the last {RECENT_DAYS} days, newest first. Loom weighs each
          the next time it proposes for its page, and proposes one again only with a reason.
        </p>
        {page.rows.map((row) => (
          <TurnedDownCard key={row.proposalId} row={row} projectId={projectId} />
        ))}
        <Pager
          span={spanLine(
            positionWords(page.first, page.last, reading.count),
            stretchWords(page.rows.at(-1)?.at, page.rows[0]?.at, now)
          )}
          newer={newerHref(here, page.newer)}
          older={olderHref(here, page.older)}
        />
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
        <h1 className="text-2xl tracking-tight">Turned down</h1>
        {reading.kind === "read" && <p className="text-ink-muted text-sm">{reading.projectName}</p>}
      </div>

      {body}
    </Screen>
  )
}

export default TurnedDownPage
