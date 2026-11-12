import { notFound, redirect } from "next/navigation"

import { projectIdSchema } from "@jam-overture/loom/store"

import { requireActor, requireRole } from "@/app/(portal)/_lib/auth/identity"
import {
  eventKeyOf,
  eventPagesOf,
  eventQueryOf,
  eventsHref,
  goalsCountedBy,
  namingOf,
} from "@/app/(portal)/_lib/events"
import { readEventPage, readOpenedEvent } from "@/app/(portal)/_lib/events-reading"
import { primaryFirst } from "@/app/(portal)/_lib/goals/goal"
import { goalsFor } from "@/app/(portal)/_lib/goals/stores"
import { segmentAsked } from "@/app/(portal)/_lib/segments/segment-pick"
import type { SignalsRange } from "@/app/(portal)/_lib/signals-range"
import { PORTAL_READ_BUDGET_MS } from "@/app/_lib/app/bounded"
import { boundedReaderSignalJournal, readWithin, unavailable } from "@/app/_lib/app/bounded-store"

import { EventDrawerPanel, EventFacets, EventsTable } from "./_components/events"
import { drawsTab, SignalsFrame } from "./_components/signals-frame"
import { readSignals } from "./_lib/reading"

/**
 * *Signals · Events*: every thing a reader did that the deployment still
 * keeps, newest first and fifty to a page, with a drawer for one of them
 * (8a of `docs/portal.md`, *1 · Signals* of `docs/portal-wireframes.md`).
 *
 * The intake keeps each delivery for the deployment's window, thirty days by
 * default (0349, 0351), and this reads it through the project's own journal
 * handle, the one the door files into. `_lib/events.ts` holds what it says
 * and `_lib/events-reading.ts` how far it reads.
 *
 * **The goals an event counts toward** are a chip in the drawer the event can
 * do without, so a failure to read them costs the chip alone.
 */
const EventsScreen = async ({
  params,
  searchParams,
}: {
  params: Promise<{ project: string }>
  searchParams: Promise<Readonly<Record<string, string | readonly string[] | undefined>>>
}) => {
  const asked = projectIdSchema.safeParse((await params).project)
  const query = eventQueryOf(await searchParams)

  if (!asked.success) notFound()

  const projectId = asked.data
  const base = `/portal/${projectId}/signals`

  /** Signed in first, with this address to come back to — the Connect screen's reason. */
  await requireActor(base)
  await requireRole(projectId)

  const now = Date.now()
  const reading = await readSignals(projectId, query.range, now, query.segment)
  const rangeHref = (range: SignalsRange) => eventsHref(base, { ...query, range })
  /** Another segment is another list, so the cursor and the open event go with it. */
  const segmentHref = (segment: string | undefined) =>
    eventsHref(base, { ...query, segment: segmentAsked(segment) })

  if (!drawsTab(reading))
    return (
      <SignalsFrame
        reading={reading}
        projectId={projectId}
        tab="events"
        rangeHref={rangeHref}
        segmentHref={segmentHref}
      />
    )

  const journal = boundedReaderSignalJournal(reading.readings.journal)
  const { applicationId } = reading.application
  const naming = namingOf(reading.published)

  const [page, opened, goals] = await Promise.all([
    readEventPage(journal.read, query, query.place, naming),
    query.open === undefined ? undefined : readOpenedEvent(journal.read, query.open),
    query.open === undefined
      ? undefined
      : readWithin(() => goalsFor(applicationId).list(), unavailable, PORTAL_READ_BUDGET_MS),
  ])

  if (!page.ok) {
    return (
      <SignalsFrame
        reading={{ state: "failed", project: reading.project }}
        projectId={projectId}
        tab="events"
        rangeHref={rangeHref}
        segmentHref={segmentHref}
      />
    )
  }

  /** Newer than this place, the newest page is all there is: its own address says so. */
  if (page.value.at === "newest") {
    redirect(
      eventsHref(base, query, {
        event: query.open === undefined ? undefined : eventKeyOf(query.open),
      })
    )
  }

  const address = { base, filter: query, place: query.place }
  const shown = opened?.ok === true ? opened.value : undefined
  const counted =
    shown === undefined || goals?.ok !== true
      ? []
      : goalsCountedBy(shown.event, primaryFirst(goals.value)).map((goal) => goal.name)

  return (
    <SignalsFrame
      reading={reading}
      projectId={projectId}
      tab="events"
      rangeHref={rangeHref}
      segmentHref={segmentHref}
    >
      <EventFacets
        address={address}
        pages={eventPagesOf(
          reading.pageViews.map((row) => row.treeId),
          reading.published,
          naming
        )}
      />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <EventsTable
          page={page.value.page}
          address={address}
          naming={naming}
          open={shown?.event.key}
          now={now}
        />
        {query.open === undefined ? null : shown === undefined ? (
          <p className="text-ink-muted w-full text-xs lg:w-[440px]">
            {opened?.ok === false
              ? "The store did not answer for this event. Try again in a moment."
              : "This event is no longer kept. Events are deleted once the deployment's window has passed."}
          </p>
        ) : (
          <EventDrawerPanel
            opened={shown}
            goals={counted}
            naming={naming}
            address={address}
            projectId={projectId}
          />
        )}
      </div>
    </SignalsFrame>
  )
}

export default EventsScreen
