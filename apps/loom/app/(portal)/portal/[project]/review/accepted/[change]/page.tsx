import Link from "next/link"
import { notFound } from "next/navigation"

import { proposalIdSchema } from "@jam-overture/loom"
import { projectIdSchema } from "@jam-overture/loom/store"

import { GoalChip } from "@/app/(portal)/_components/goal-chip"
import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import { requireActor, requireRole } from "@/app/(portal)/_lib/auth/identity"
import {
  goalNameOf,
  sentencesOf,
  servedNoteOf,
  servedOf,
  stakeWordsOf,
  timelineOf,
} from "@/app/(portal)/_lib/going-live"
import { plainDay } from "@/app/(portal)/_lib/when"

import { Timeline } from "../_components/timeline"
import { readMeasurement } from "@/app/(portal)/_lib/accepted/measurement"
import { readAccepted } from "@/app/(portal)/_lib/accepted/reading"

/**
 * One accepted change, from *Accept* to its result (unit 8, 0358;
 * `docs/portal-wireframes.md` section 4): *Accepted*, then *Live* on the
 * site's first pull after it, then *Measuring* on its goal over the agreed
 * window, then *Result*: before and after on the goal and a plain verdict, by
 * the rules the maintainer settled (8c, `_lib/measuring.ts`). A change that came off the page ends where it came
 * off: no longer fitting the site's newer version, or undone.
 *
 * Until the site pulls, *Live* says the project is connected for observation
 * only, and links to where the site is connected.
 *
 * The heading leads with the goal the change served and the line under it
 * ends with its stake, as the wireframe draws them. A change nothing was kept
 * for says so in place of the chip.
 */
const ChangeScreen = async ({
  params,
}: {
  params: Promise<{ project: string; change: string }>
}) => {
  const route = await params
  const asked = projectIdSchema.safeParse(route.project)
  const proposalId = proposalIdSchema.safeParse(route.change)

  if (!asked.success || !proposalId.success) notFound()

  const projectId = asked.data
  const accepted = `/portal/${projectId}/review/accepted`

  /** Signed in first, with this address to come back to — the Connect screen's reason. */
  await requireActor(`${accepted}/${proposalId.data}`)
  await requireRole(projectId)

  const now = Date.now()
  const reading = await readAccepted(projectId, now)
  const back = (
    <Link
      href={accepted}
      className="text-ink-muted self-start text-xs no-underline hover:underline"
    >
      ← For review / Accepted
    </Link>
  )

  if (reading.kind !== "read") {
    return (
      <Screen>
        {back}
        <StateNotice tone="failure" title="The store did not answer">
          Nothing here is a statement about this change. Try again in a moment.
        </StateNotice>
      </Screen>
    )
  }

  const change = reading.changes.find((held) => held.proposalId === proposalId.data)

  if (change === undefined) notFound()

  const [heading, ...rest] = sentencesOf(change, reading.parts)
  const pageName = reading.pages.get(change.pageId) ?? change.pageId
  const by = change.accepted.answeredBy
  const served = servedOf(change.proposalId, reading.origins)
  const note = servedNoteOf(served)
  const stake = stakeWordsOf(served)
  const measurement = await readMeasurement(reading, change, served)

  return (
    <Screen>
      <div className="flex flex-col gap-2">
        {back}
        {served.kind === "recorded" ? (
          <GoalChip goal={goalNameOf(served)} />
        ) : (
          <p className="text-ink-muted m-0 text-xs">{note}</p>
        )}
        <h1 className="text-2xl tracking-tight">{heading}</h1>
        {rest.map((line) => (
          <p key={line} className="text-ink-secondary m-0 text-sm">
            {line}
          </p>
        ))}
        <p className="text-ink-muted m-0 text-xs">
          <Link href={`/portal/${projectId}/pages/${change.pageId}`} className="text-ink-muted">
            {pageName}
          </Link>
          {` · accepted${by === undefined ? "" : ` by ${by}`} on ${plainDay(new Date(change.acceptedAt).toISOString())}`}
          {stake === undefined ? null : ` · ${stake}`}
        </p>
      </div>

      <section className="border-edge-subtle bg-surface-base flex flex-col gap-3 rounded-lg border p-4">
        <Timeline
          steps={timelineOf(change, reading.reach, now, served, measurement)}
          projectId={projectId}
        />
        <TechnicalDetail summary="The change as Loom keeps it">
          <pre className="m-0 overflow-x-auto font-mono text-[11px] leading-relaxed">
            {JSON.stringify(change.accepted, null, 2)}
          </pre>
        </TechnicalDetail>
      </section>
    </Screen>
  )
}

export default ChangeScreen
