import Link from "next/link"
import { notFound } from "next/navigation"

import { projectIdSchema } from "@jam-overture/loom/store"

import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { arrivalsOf, type Arrivals } from "@/app/(portal)/_lib/arrivals"
import { requireActor, requireRole } from "@/app/(portal)/_lib/auth/identity"
import { soleApplicationOf } from "@/app/(portal)/_lib/connecting"
import { screenName } from "@/app/(portal)/_lib/screen-names"
import { portalApplications, portalProjects } from "@/app/(portal)/_lib/store"
import { plainMoment } from "@/app/(portal)/_lib/when"
import { boundedReaderSignalJournal, boundedReaderTallyStore } from "@/app/_lib/app/bounded-store"
import { readingsFor } from "@/app/_lib/reader-signals/intake"

/**
 * *Signals*: what has arrived for one project — unit 5 of `docs/portal.md`,
 * and the screen that makes *a signal sent from a second machine appears under
 * its project within a minute* something a person can watch happen.
 *
 * It reads the project's own stores, the same scoped ones the door writes
 * to, so what it shows is exactly what the door filed under this project's key
 * and nothing filed under anybody else's (0298 clause 5). `_lib/arrivals.ts`
 * holds what the screen says; this is the reading.
 *
 * ## What it does not show
 *
 * **Refused deliveries.** The door turns a refused batch away before anything
 * is written, so there is no count to read. The screen says so in one line
 * rather than drawing a nought that would read as *nothing was refused*.
 *
 * **Page names.** A customer's pages are rendered on their own site and this
 * deployment does not hold them until the read path (unit 6), so a page is
 * shown by the address its renderer gave it rather than by a name looked up
 * in a store that would be the wrong project's.
 */

/** Enough to see a batch you just sent land, and no more than one bounded read returns. */
const RECENT = 25

const Figure = ({ label, value, note }: { label: string; value: string; note: string }) => (
  <div className="border-edge-subtle bg-surface-base flex flex-col gap-1 rounded-lg border p-4">
    <span className="text-ink-muted text-[11px] tracking-wide uppercase">{label}</span>
    <span className="text-xl tracking-tight">{value}</span>
    <span className="text-ink-muted text-xs">{note}</span>
  </div>
)

const Received = ({ arrivals }: { arrivals: Arrivals }) => (
  <div className="flex flex-col gap-6">
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <Figure
        label="Page views counted"
        value={arrivals.opened.toLocaleString("en-GB")}
        note="Every time a reader opened one of this project's pages."
      />
      <Figure
        label={arrivals.latest?.kind === "counted" ? "Last counted" : "Last arrival"}
        value={arrivals.latest === undefined ? "Nothing yet" : plainMoment(arrivals.latest.at)}
        note={
          arrivals.latest?.kind === "counted"
            ? "Everything that arrived has been added up, so this is when that last happened."
            : "When this deployment last received something from one of your pages."
        }
      />
      <Figure
        label="Refused"
        value="Not counted"
        note="A refused batch is turned away before anything is kept, so there is no count of them yet."
      />
    </div>

    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium tracking-tight">Newest arrivals</h2>
      {arrivals.recent.length === 0 ? (
        <p className="text-ink-muted text-xs">
          Nothing is waiting to be added up. Whatever arrived has been counted in the pages below.
        </p>
      ) : (
        <table className="w-full text-left text-xs">
          <thead className="text-ink-muted">
            <tr>
              <th className="py-1.5 font-normal">Received</th>
              <th className="py-1.5 font-normal">Page</th>
              <th className="py-1.5 font-normal">Version</th>
              <th className="py-1.5 text-right font-normal">Signals</th>
            </tr>
          </thead>
          <tbody>
            {arrivals.recent.map((arrival, index) => (
              <tr key={`${arrival.receivedAt}-${index}`} className="border-edge-subtle border-t">
                <td className="py-1.5">{plainMoment(arrival.receivedAt)}</td>
                <td className="py-1.5 font-mono">{arrival.treeId}</td>
                <td className="py-1.5">{arrival.revision}</td>
                <td className="py-1.5 text-right">{arrival.signals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>

    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium tracking-tight">By page</h2>
      {arrivals.pages.length === 0 ? (
        <p className="text-ink-muted text-xs">No page view has been counted yet.</p>
      ) : (
        <table className="w-full text-left text-xs">
          <thead className="text-ink-muted">
            <tr>
              <th className="py-1.5 font-normal">Page</th>
              <th className="py-1.5 font-normal">Version</th>
              <th className="py-1.5 text-right font-normal">Page views</th>
              <th className="py-1.5 text-right font-normal">Last moved</th>
            </tr>
          </thead>
          <tbody>
            {arrivals.pages.map((page) => (
              <tr key={`${page.treeId}-${page.revision}`} className="border-edge-subtle border-t">
                <td className="py-1.5 font-mono">{page.treeId}</td>
                <td className="py-1.5">{page.revision}</td>
                <td className="py-1.5 text-right">{page.opened.toLocaleString("en-GB")}</td>
                <td className="py-1.5 text-right">{plainMoment(page.lastMoved)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  </div>
)

const SignalsPage = async ({ params }: { params: Promise<{ project: string }> }) => {
  const asked = projectIdSchema.safeParse((await params).project)

  if (!asked.success) notFound()

  const projectId = asked.data

  /** Signed in first, with this address to come back to — the Connect screen's reason. */
  await requireActor(`/portal/${projectId}/signals`)
  await requireRole(projectId)

  const [project, applications] = await Promise.all([
    portalProjects.get(projectId),
    portalApplications.list({ closed: "all" }),
  ])

  const application = applications.ok ? soleApplicationOf(applications.value, projectId) : undefined

  /**
   * The stores the door files this application's deliveries into, read on the
   * portal's budget. Bounded here rather than in `intake.ts`, because the door
   * writes through the same handles and a write cut off by a screen's budget
   * would lose a reader's batch.
   */
  const readings = application === undefined ? undefined : readingsFor(application.applicationId)

  const [rows, newest] =
    readings === undefined
      ? [undefined, undefined]
      : await Promise.all([
          boundedReaderTallyStore(readings.tallies).pageViews(),
          boundedReaderSignalJournal(readings.journal).read({ direction: "older", limit: RECENT }),
        ])

  const connect = `/portal/${projectId}/connect`

  const body = (() => {
    if (
      !project.ok ||
      !applications.ok ||
      (rows !== undefined && !rows.ok) ||
      (newest !== undefined && !newest.ok)
    ) {
      return (
        <StateNotice tone="failure" title="The store did not answer">
          Nothing here is a statement about what has arrived. Try again in a moment.
        </StateNotice>
      )
    }

    if (application === undefined || rows === undefined || newest === undefined) {
      return (
        <StateNotice tone="failure" title="There is no single site to read">
          This project does not hold exactly one site, so nothing can be filed under it. Tell
          whoever runs this deployment.
        </StateNotice>
      )
    }

    const arrivals = arrivalsOf(rows.value, newest.value.batches)

    if (arrivals.latest === undefined) {
      return (
        <StateNotice
          tone="empty"
          title="Nothing has arrived yet"
          action={
            <Link href={connect} className="text-ink underline">
              Connect your site
            </Link>
          }
        >
          Once the snippet is on your site, each reader who opens a page shows up here within a few
          seconds.
        </StateNotice>
      )
    }

    return <Received arrivals={arrivals} />
  })()

  return (
    <Screen>
      <div className="flex flex-col gap-2">
        <Link href="/portal" className="text-ink-muted text-sm no-underline hover:underline">
          ← {screenName("/portal")}
        </Link>
        <h1 className="text-2xl tracking-tight">Signals</h1>
        {project.ok && <p className="text-ink-muted text-sm">{project.value.name}</p>}
        {project.ok &&
          (project.value.closedAt !== undefined || application?.closedAt !== undefined) && (
            <p className="text-ink-muted text-xs">
              This project is closed and takes no new signals. What it collected before is below.
            </p>
          )}
      </div>

      {body}
    </Screen>
  )
}

export default SignalsPage
