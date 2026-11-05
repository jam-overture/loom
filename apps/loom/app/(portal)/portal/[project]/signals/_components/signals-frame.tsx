import Link from "next/link"
import type { ReactNode } from "react"

import { Screen } from "@/app/(portal)/_components/screen"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import type { Arrivals } from "@/app/(portal)/_lib/arrivals"
import type { TurnedAway } from "@/app/(portal)/_lib/turned-away"
import { plainMoment } from "@/app/(portal)/_lib/when"

import type { SignalsReading } from "../_lib/reading"

/**
 * What both *Signals* tabs share: the heading, the three figures, what was
 * turned away, and the two tabs (`docs/portal-wireframes.md`, *1 · Signals*).
 *
 * The tab's own list is handed in and drawn only once something has arrived:
 * a store that did not answer, a project with no single site, and a project
 * nothing has reached yet are each said here, once, for both tabs.
 */

export type SignalsTab = "events" | "pages"

const Figure = ({ label, value, note }: { label: string; value: string; note: string }) => (
  <div className="border-edge-subtle bg-surface-base flex flex-col gap-1 rounded-lg border p-4">
    <span className="text-ink-muted text-[11px] tracking-wide uppercase">{label}</span>
    <span className="text-xl tracking-tight">{value}</span>
    <span className="text-ink-muted text-xs">{note}</span>
  </div>
)

const refusedFigure = (turnedAway: TurnedAway | undefined) =>
  turnedAway === undefined
    ? {
        value: "Not available",
        note: "This deployment could not read what it turned away.",
      }
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

const Figures = ({
  arrivals,
  turnedAway,
}: {
  arrivals: Arrivals
  turnedAway: TurnedAway | undefined
}) => (
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
          ? "Nothing that arrived is still kept, so this is when something was last added up."
          : "When this deployment last received something from one of your pages."
      }
    />
    <Figure label="Turned away" {...refusedFigure(turnedAway)} />
  </div>
)

const TABS: readonly {
  readonly tab: SignalsTab
  readonly label: string
  readonly href: (projectId: string) => string
}[] = [
  { tab: "events", label: "Events", href: (projectId) => `/portal/${projectId}/signals` },
  { tab: "pages", label: "By page", href: (projectId) => `/portal/${projectId}/signals/pages` },
]

const Tabs = ({ projectId, current }: { projectId: string; current: SignalsTab }) => (
  <nav aria-label="Signals" className="border-edge-subtle flex gap-4 border-b text-sm">
    {TABS.map(({ tab, label, href }) => (
      <Link
        key={tab}
        href={href(projectId)}
        aria-current={tab === current ? "page" : undefined}
        className={`-mb-px border-b-2 pb-2 no-underline ${
          tab === current
            ? "border-ink text-ink"
            : "text-ink-muted hover:text-ink border-transparent"
        }`}
      >
        {label}
      </Link>
    ))}
  </nav>
)

const Body = ({
  reading,
  projectId,
  tab,
  children,
}: {
  reading: SignalsReading
  projectId: string
  tab: SignalsTab
  children?: ReactNode
}) => {
  if (reading.state === "failed") {
    return (
      <StateNotice tone="failure" title="The store did not answer">
        Nothing here is a statement about what has arrived. Try again in a moment.
      </StateNotice>
    )
  }

  if (reading.state === "no-site") {
    return (
      <StateNotice tone="failure" title="There is no single site to read">
        This project does not hold exactly one site, so nothing can be filed under it. Tell whoever
        runs this deployment.
      </StateNotice>
    )
  }

  if (reading.arrivals.latest === undefined) {
    return (
      <div className="flex flex-col gap-6">
        <StateNotice
          tone="empty"
          title="Nothing has arrived yet"
          action={
            <Link href={`/portal/${projectId}/connect`} className="text-ink underline">
              Connect your site
            </Link>
          }
        >
          Once the snippet is on your site, each reader who opens a page shows up here within a few
          seconds.
        </StateNotice>
        <TurnedAwayList turnedAway={reading.turnedAway} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Figures arrivals={reading.arrivals} turnedAway={reading.turnedAway} />
      <TurnedAwayList turnedAway={reading.turnedAway} />
      <div className="flex flex-col gap-4">
        <Tabs projectId={projectId} current={tab} />
        {children}
      </div>
    </div>
  )
}

export const SignalsFrame = ({
  reading,
  projectId,
  tab,
  children,
}: {
  reading: SignalsReading
  projectId: string
  tab: SignalsTab
  children?: ReactNode
}) => {
  const project = reading.project
  const closed =
    project !== undefined &&
    (project.closedAt !== undefined ||
      (reading.state === "read" && reading.application.closedAt !== undefined))

  return (
    <Screen>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl tracking-tight">Signals</h1>
        {project === undefined ? null : <p className="text-ink-muted text-sm">{project.name}</p>}
        {closed && (
          <p className="text-ink-muted text-xs">
            This project is closed and takes no new signals. What it collected before is below.
          </p>
        )}
      </div>

      <Body reading={reading} projectId={projectId} tab={tab}>
        {children}
      </Body>
    </Screen>
  )
}

/** Whether a tab has anything of its own to draw, so a page reads its list only then. */
export const drawsTab = (
  reading: SignalsReading
): reading is Extract<SignalsReading, { state: "read" }> =>
  reading.state === "read" && reading.arrivals.latest !== undefined
