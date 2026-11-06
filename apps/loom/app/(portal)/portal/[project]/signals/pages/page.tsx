import { notFound } from "next/navigation"

import { projectIdSchema } from "@jam-overture/loom/store"

import {
  byPageListOf,
  byPageRowsOf,
  openRowOf,
  pageDrawerOf,
  parseCursor,
  waitingByPage,
} from "@/app/(portal)/_lib/by-page"
import { requireActor, requireRole } from "@/app/(portal)/_lib/auth/identity"
import { primaryOf } from "@/app/(portal)/_lib/goals/goal"
import { goalsFor } from "@/app/(portal)/_lib/goals/stores"
import { pageCopiesFor } from "@/app/(portal)/_lib/proposing/stores"
import { holdsFor } from "@/app/(portal)/_lib/write"
import { PORTAL_READ_BUDGET_MS } from "@/app/_lib/app/bounded"
import { boundedReaderTallyStore, readWithin, unavailable } from "@/app/_lib/app/bounded-store"

import { ByPageTable, PageDrawerPanel } from "../_components/by-page"
import { drawsTab, SignalsFrame } from "../_components/signals-frame"
import { readSignals } from "../_lib/reading"

/**
 * *Signals · By page* (8a of `docs/portal.md`): one row per page, newest
 * first and fifty to a page, added up across versions and audiences from the
 * tallies, with the part pressed most and how many changes wait on it;
 * `?page=` opens the drawer on one. `_lib/by-page.ts` holds what it says.
 *
 * Page names come from what the project's site published (0312), and a page
 * it has not published is shown by the id its renderer gave it. The changes
 * waiting are a figure the list can do without, so a failure to read them
 * costs the badge alone. The goals likewise cost the primary goal's column
 * alone, and the drawer says they could not be read.
 */

/** A query value as one string, or `undefined` for none or for a repeated key. */
const single = (value: string | readonly string[] | undefined): string | undefined =>
  typeof value === "string" ? value : undefined

const ByPageScreen = async ({
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
  const base = `/portal/${projectId}/signals/pages`

  await requireActor(base)
  await requireRole(projectId)

  const reading = await readSignals(projectId)

  if (!drawsTab(reading)) {
    return <SignalsFrame reading={reading} projectId={projectId} tab="pages" />
  }

  const { applicationId } = reading.application

  const [tallies, waiting, copies, goals] = await Promise.all([
    boundedReaderTallyStore(reading.readings.tallies).tallies(),
    holdsFor(applicationId).waiting(),
    readWithin(() => pageCopiesFor(applicationId).list(), unavailable, PORTAL_READ_BUDGET_MS),
    readWithin(() => goalsFor(applicationId).list(), unavailable, PORTAL_READ_BUDGET_MS),
  ])

  if (!tallies.ok) {
    return (
      <SignalsFrame
        reading={{ state: "failed", project: reading.project }}
        projectId={projectId}
        tab="pages"
      />
    )
  }

  const readings = {
    pageViews: reading.pageViews,
    tallies: tallies.value,
    published: reading.published,
    goals: goals.ok ? goals.value : undefined,
  }
  const rows = byPageRowsOf({
    ...readings,
    waiting: waiting.ok && copies.ok ? waitingByPage(waiting.value.held, copies.value) : undefined,
  })
  const from = single(query.from)
  const address = { base, from }
  const opened = openRowOf(rows, single(query.page))

  return (
    <SignalsFrame reading={reading} projectId={projectId} tab="pages">
      {rows.length === 0 ? (
        <p className="text-ink-muted text-xs">No page view has been counted yet.</p>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <ByPageTable
            list={byPageListOf(rows, parseCursor(from))}
            address={address}
            open={opened?.treeId}
            primaryGoal={goals.ok ? primaryOf(goals.value)?.name : undefined}
          />
          {opened === undefined ? null : (
            <PageDrawerPanel
              drawer={pageDrawerOf(opened, readings)}
              address={address}
              projectId={projectId}
            />
          )}
        </div>
      )}
    </SignalsFrame>
  )
}

export default ByPageScreen
