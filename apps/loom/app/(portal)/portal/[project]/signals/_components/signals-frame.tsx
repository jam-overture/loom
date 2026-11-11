import Link from "next/link"
import type { ReactNode } from "react"

import { Screen } from "@/app/(portal)/_components/screen"
import { FilterChips } from "@/app/(portal)/_components/filter-chips"
import { StateNotice } from "@/app/(portal)/_components/state-notice"
import { goalFigureOf } from "@/app/(portal)/_lib/goal-range"
import { lastArrivalFigureOf } from "@/app/(portal)/_lib/last-arrival"
import { pageNamesOf } from "@/app/(portal)/_lib/published-view"
import {
  rangeChartOf,
  rangeFigureOf,
  rangeLabel,
  rangeParam,
  SIGNALS_RANGES,
  type SignalsRange,
} from "@/app/(portal)/_lib/signals-range"
import type { TurnedAway } from "@/app/(portal)/_lib/turned-away"

import type { SignalsReading } from "../_lib/reading"

import { RangeChart } from "./range-chart"

/**
 * What both *Signals* tabs share: the heading, the range picker, the figures
 * (the primary goal's among them once the project has one, and the last
 * arrival with its site and page), page views by hour, what was turned away,
 * and the two tabs (`docs/portal-wireframes.md`, *1 · Signals*).
 *
 * The tab's own list is handed in and drawn only once something has arrived:
 * a store that did not answer, a project with no single site, and a project
 * nothing has reached yet are each said here, once, for both tabs.
 */

export type SignalsTab = "events" | "pages"

const Figure = ({
  label,
  value,
  note,
  link,
}: {
  label: string
  value: string
  note: string
  link?: { readonly label: string; readonly href: string } | undefined
}) => (
  <div className="border-edge-subtle bg-surface-base flex flex-col gap-1 rounded-lg border p-4">
    <span className="text-ink-muted text-[11px] tracking-wide uppercase">{label}</span>
    <span className="text-xl tracking-tight">{value}</span>
    <span className="text-ink-muted text-xs">{note}</span>
    {link === undefined ? null : (
      <Link href={link.href} className="text-ink text-xs underline">
        {link.label}
      </Link>
    )}
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
  reading,
  projectId,
}: {
  reading: Extract<SignalsReading, { state: "read" }>
  projectId: string
}) => {
  const { arrivals, turnedAway } = reading
  const goal = goalFigureOf(reading.goal, reading.range)
  const last = lastArrivalFigureOf(arrivals.latest, {
    projectId,
    host: reading.application.host,
    names: pageNamesOf(reading.published),
    range: reading.range,
  })

  return (
    <div
      className={`grid grid-cols-1 gap-3 ${goal === undefined ? "md:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4"}`}
    >
      <Figure {...rangeFigureOf(reading.hourly, reading.range, arrivals.opened)} />
      {goal === undefined ? null : <Figure {...goal} />}
      <Figure {...last} />
      <Figure label="Turned away" {...refusedFigure(turnedAway)} />
    </div>
  )
}

/** The address of the tab being drawn, with another range. */
export type RangeHref = (range: SignalsRange) => string

/**
 * The range picker. Each choice is an address the tab builds, so changing the
 * range keeps whatever else the tab's address holds.
 */
const RangePicker = ({ current, hrefOf }: { current: SignalsRange; hrefOf: RangeHref }) => (
  <FilterChips
    label="Range"
    choices={SIGNALS_RANGES.map((range) => ({
      label: rangeLabel(range),
      href: hrefOf(range),
      selected: range === current,
    }))}
  />
)

const TABS: readonly {
  readonly tab: SignalsTab
  readonly label: string
  readonly href: (projectId: string) => string
}[] = [
  { tab: "events", label: "Events", href: (projectId) => `/portal/${projectId}/signals` },
  { tab: "pages", label: "By page", href: (projectId) => `/portal/${projectId}/signals/pages` },
]

/** A tab's address, keeping the range so moving between tabs does not reset it. */
const tabHref = (path: string, range: SignalsRange): string => {
  const kept = rangeParam(range)

  return kept === undefined ? path : `${path}?range=${kept}`
}

const Tabs = ({
  projectId,
  current,
  range,
}: {
  projectId: string
  current: SignalsTab
  range: SignalsRange
}) => (
  <nav aria-label="Signals" className="border-edge-subtle flex gap-4 border-b text-sm">
    {TABS.map(({ tab, label, href }) => (
      <Link
        key={tab}
        href={tabHref(href(projectId), range)}
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
  rangeHref,
  children,
}: {
  reading: SignalsReading
  projectId: string
  tab: SignalsTab
  rangeHref: RangeHref
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
      <RangePicker current={reading.range} hrefOf={rangeHref} />
      <Figures reading={reading} projectId={projectId} />
      {reading.hourly === undefined ? null : (
        <RangeChart chart={rangeChartOf(reading.hourly.series, reading.range)} />
      )}
      <TurnedAwayList turnedAway={reading.turnedAway} />
      <div className="flex flex-col gap-4">
        <Tabs projectId={projectId} current={tab} range={reading.range} />
        {children}
      </div>
    </div>
  )
}

export const SignalsFrame = ({
  reading,
  projectId,
  tab,
  rangeHref,
  children,
}: {
  reading: SignalsReading
  projectId: string
  tab: SignalsTab
  rangeHref: RangeHref
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

      <Body reading={reading} projectId={projectId} tab={tab} rangeHref={rangeHref}>
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
