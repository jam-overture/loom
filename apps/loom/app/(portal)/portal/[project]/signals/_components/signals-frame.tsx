import Link from "next/link"
import type { ReactNode } from "react"

import { Screen } from "@/app/(portal)/_components/screen"
import { FilterChips } from "@/app/(portal)/_components/filter-chips"
import { SegmentPicker, SegmentUncounted } from "@/app/(portal)/_components/segment-picker"
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
import { SEGMENT_PARAM, type SegmentHref } from "@/app/(portal)/_lib/segments/segment-pick"
import type { TurnedAway } from "@/app/(portal)/_lib/turned-away"

import type { SignalsReading } from "../_lib/reading"

import { RangeChart } from "./range-chart"

/**
 * What both *Signals* tabs share: the heading, the range and segment pickers, the figures
 * (the primary goal's among them once the project has one, and the last
 * arrival with its site and page), page views by hour, what was turned away,
 * and the two tabs (`docs/portal-wireframes.md`, *1 · Signals*).
 *
 * The tab's own list is handed in and drawn only once something has arrived:
 * a store that did not answer, a project with no single site, and a project
 * nothing has reached yet are each said here, once, for both tabs. So is a
 * segment nothing has been counted under (0371 clause 6), with the picker
 * still drawn so a person can go back to everyone.
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

/** A delivery is turned away before it is filed under any audience, so this is every reader's. */
const EVERY_READER = " Every reader's: nothing turned away is filed under a segment."

const refusedFigure = (turnedAway: TurnedAway | undefined, segmented: boolean) => {
  const figure =
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

  return segmented ? { ...figure, note: figure.note + EVERY_READER } : figure
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
      <Figure
        label="Turned away"
        {...refusedFigure(turnedAway, reading.segment.word !== undefined)}
      />
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

/** A tab's address, keeping the range and the segment so moving between tabs resets neither. */
const tabHref = (path: string, range: SignalsRange, segment: string | undefined): string => {
  const kept = new URLSearchParams(
    Object.entries({ range: rangeParam(range), [SEGMENT_PARAM]: segment }).flatMap(
      ([key, value]) => (value === undefined ? [] : [[key, value]])
    )
  ).toString()

  return kept === "" ? path : `${path}?${kept}`
}

const Tabs = ({
  projectId,
  current,
  range,
  segment,
}: {
  projectId: string
  current: SignalsTab
  range: SignalsRange
  segment: string | undefined
}) => (
  <nav aria-label="Signals" className="border-edge-subtle flex gap-4 border-b text-sm">
    {TABS.map(({ tab, label, href }) => (
      <Link
        key={tab}
        href={tabHref(href(projectId), range, segment)}
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
  segmentHref,
  children,
}: {
  reading: SignalsReading
  projectId: string
  tab: SignalsTab
  rangeHref: RangeHref
  segmentHref: SegmentHref
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

  const { segment } = reading
  const picker = <SegmentPicker pick={segment} hrefOf={segmentHref} />

  if (reading.arrivals.latest === undefined && segment.word !== undefined) {
    return (
      <div className="flex flex-col gap-6">
        {picker}
        <SegmentUncounted
          word={segment.word}
          projectId={projectId}
          everyoneHref={segmentHref(undefined)}
        />
      </div>
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
      <div className="flex flex-col gap-2">
        <RangePicker current={reading.range} hrefOf={rangeHref} />
        {picker}
      </div>
      <Figures reading={reading} projectId={projectId} />
      {reading.hourly === undefined ? null : (
        <RangeChart chart={rangeChartOf(reading.hourly.series, reading.range)} />
      )}
      <TurnedAwayList turnedAway={reading.turnedAway} />
      <div className="flex flex-col gap-4">
        <Tabs projectId={projectId} current={tab} range={reading.range} segment={segment.word} />
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
  segmentHref,
  children,
}: {
  reading: SignalsReading
  projectId: string
  tab: SignalsTab
  rangeHref: RangeHref
  segmentHref: SegmentHref
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

      <Body
        reading={reading}
        projectId={projectId}
        tab={tab}
        rangeHref={rangeHref}
        segmentHref={segmentHref}
      >
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
