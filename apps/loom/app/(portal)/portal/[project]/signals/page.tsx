import Link from "next/link"
import { notFound } from "next/navigation"

import { projectIdSchema } from "@jam-overture/loom/store"

import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { arrivalsOf, type Arrivals } from "@/app/(portal)/_lib/arrivals"
import { requireActor, requireRole } from "@/app/(portal)/_lib/auth/identity"
import { portalApplications, portalProjects } from "@/app/(portal)/_lib/store"
import { pageNamesOf } from "@/app/(portal)/_lib/published-view"
import { turnedAwayOf, type TurnedAway } from "@/app/(portal)/_lib/turned-away"
import { plainMoment } from "@/app/(portal)/_lib/when"
import { boundedReaderSignalJournal, boundedReaderTallyStore } from "@/app/_lib/app/bounded-store"
import { soleApplicationOf } from "@/app/_lib/app/sole-application"
import { readWithin } from "@/app/_lib/app/bounded-store"
import { publishedPagesFor } from "@/app/_lib/pages/store"
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
 * **What the door turned away** that named this project (0311) is read from
 * its own small table, and a failure to read it costs that figure alone: a
 * deployment that has not run `db:push` since the table arrived still shows
 * everything that was kept. The reasons are listed even when nothing has
 * arrived, because *nothing arrived* and *everything was turned away* are the
 * two answers a person setting up their site cannot tell apart otherwise.
 *
 * **Page names** come from what the project's site published (0312): a
 * page it published is shown by its own heading with its id beneath, and one
 * it has not is shown by the id its renderer gave it. The names are read from
 * this project's published pages alone, never from a store that would be the
 * wrong project's, and a failure to read them costs the names and nothing
 * else.
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

/** `undefined` where the refusals could not be read, which is said rather than drawn as a nought. */
const refusedFigure = (turnedAway: TurnedAway | undefined) =>
  turnedAway === undefined
    ? { value: "Not available", note: "This deployment could not read what it turned away." }
    : {
        value: turnedAway.refused.toLocaleString("en-GB"),
        note:
          turnedAway.refused === 0
            ? "Nothing sent with this project's key has been turned away."
            : "Sent with this project's key and turned away. The reasons are below.",
      }

const TurnedAwayList = ({ turnedAway }: { turnedAway: TurnedAway | undefined }) =>
  turnedAway === undefined || turnedAway.lines.length === 0 ? null : (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium tracking-tight">Turned away</h2>
      <ul className="text-ink-secondary m-0 flex list-disc flex-col gap-1.5 pl-5 text-xs leading-relaxed">
        {turnedAway.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  )

/** A page by the name it published under, with its id beneath; by its id alone otherwise. */
const PageCell = ({ treeId, names }: { treeId: string; names: ReadonlyMap<string, string> }) => {
  const name = names.get(treeId)

  return name === undefined ? (
    <td className="py-1.5 font-mono">{treeId}</td>
  ) : (
    <td className="py-1.5">
      {name}
      <span className="text-ink-muted block font-mono text-[11px]">{treeId}</span>
    </td>
  )
}

const Received = ({
  arrivals,
  turnedAway,
  names,
}: {
  arrivals: Arrivals
  turnedAway: TurnedAway | undefined
  names: ReadonlyMap<string, string>
}) => (
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
      <Figure label="Turned away" {...refusedFigure(turnedAway)} />
    </div>

    <TurnedAwayList turnedAway={turnedAway} />

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
                <PageCell treeId={arrival.treeId} names={names} />
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
                <PageCell treeId={page.treeId} names={names} />
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

  const [rows, newest, refusals, published] =
    readings === undefined || application === undefined
      ? [undefined, undefined, undefined, undefined]
      : await Promise.all([
          boundedReaderTallyStore(readings.tallies).pageViews(),
          boundedReaderSignalJournal(readings.journal).read({ direction: "older", limit: RECENT }),
          readWithin(
            () => readings.refusals.read(),
            (detail) => ({ code: "unavailable" as const, detail })
          ),
          readWithin(
            () => publishedPagesFor(application.applicationId).list(),
            (detail) => ({ code: "unavailable" as const, detail })
          ),
        ])

  const turnedAway = refusals?.ok === true ? turnedAwayOf(refusals.value) : undefined
  const names = published?.ok === true ? pageNamesOf(published.value) : new Map<string, string>()

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
        <div className="flex flex-col gap-6">
          <StateNotice
            tone="empty"
            title="Nothing has arrived yet"
            action={
              <Link href={connect} className="text-ink underline">
                Connect your site
              </Link>
            }
          >
            Once the snippet is on your site, each reader who opens a page shows up here within a
            few seconds.
          </StateNotice>
          <TurnedAwayList turnedAway={turnedAway} />
        </div>
      )
    }

    return <Received arrivals={arrivals} turnedAway={turnedAway} names={names} />
  })()

  return (
    <Screen>
      <div className="flex flex-col gap-2">
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
