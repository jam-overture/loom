import Link from "next/link"

import { GoalChip } from "@/app/(portal)/_components/goal-chip"
import { Pager } from "@/app/(portal)/_components/pager"
import type {
  ByPageList,
  GoalInDrawer,
  GoalOnPage,
  KindBar,
  NamedPart,
  PageDrawer,
  RangeBars,
} from "@/app/(portal)/_lib/by-page"
import { goalRangeWordsOf } from "@/app/(portal)/_lib/goal-range"
import { wordCountOf, type PageStops } from "@/app/(portal)/_lib/page-stops"
import { per100Of, readingSentence } from "@/app/(portal)/_lib/goals/goal-view"
import { positionWords, spanLine, stretchWords } from "@/app/(portal)/_lib/list-span"
import { rangeLabel, rangeParam, type SignalsRange } from "@/app/(portal)/_lib/signals-range"
import { plainMoment } from "@/app/(portal)/_lib/when"

/**
 * *Signals · By page*: the project's pages, newest first, fifty to a page,
 * and the drawer for the one the URL names (8a of `docs/portal.md`).
 *
 * Every link is a plain address — `from` for where the list starts, `page`
 * for the drawer's subject, `range` for the figures above — so a link a person sends reopens exactly what
 * they were looking at, and the screen needs no client code to do it.
 */

export type ByPageAddress = {
  readonly base: string
  readonly from: string | undefined
  readonly range: SignalsRange
}

/** An address on this tab, keeping the range the figures above it are read over. */
export const byPageHref = (
  { base, range }: ByPageAddress,
  query: Readonly<Record<string, string | undefined>>
) => {
  const kept = new URLSearchParams(
    Object.entries({ ...query, range: rangeParam(range) }).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, value]]
    )
  ).toString()

  return kept === "" ? base : `${base}?${kept}`
}

const count = (value: number): string => value.toLocaleString("en-GB")

/** A page by the heading it published, with its id beneath; by its id alone otherwise. */
const PageName = ({ name, treeId }: { name: string | undefined; treeId: string }) =>
  name === undefined ? (
    <span className="font-mono">{treeId}</span>
  ) : (
    <>
      {name}
      <span className="text-ink-muted block font-mono text-[11px]">{treeId}</span>
    </>
  )

const PartLabel = ({ part }: { part: NamedPart }) =>
  part.name === undefined ? (
    <span className="font-mono">{part.nodeId}</span>
  ) : (
    <>
      {part.name} <span className="text-ink-muted font-mono text-[11px]">{part.nodeId}</span>
    </>
  )

const WaitingBadge = ({ waiting }: { waiting: number | undefined }) =>
  waiting === undefined || waiting === 0 ? null : (
    <span className="bg-awaiting text-awaiting-ink ml-2 rounded px-1.5 py-0.5 text-[11px] whitespace-nowrap">
      {waiting} waiting
    </span>
  )

/** The primary goal's rate on one page, or that the goal does not cover it. */
const GoalRate = ({ goal }: { goal: GoalOnPage | undefined }) => {
  const rate = goal === undefined ? undefined : per100Of(goal.reading)

  return goal === undefined ? (
    <span className="text-ink-muted whitespace-nowrap">Not on this page</span>
  ) : (
    <span title={readingSentence(goal.kind, goal.reading)}>{rate ?? "Nothing counted"}</span>
  )
}

/**
 * `primaryGoal` is the primary goal's name, and its column is drawn only when
 * there is one: a project with no goal has no rate to show, and a column of
 * blanks would say every page scored nothing.
 */
export const ByPageTable = ({
  list,
  address,
  open,
  primaryGoal,
  now,
}: {
  list: ByPageList
  address: ByPageAddress
  open: string | undefined
  primaryGoal: string | undefined
  now: number
}) => (
  <div className="flex min-w-0 flex-1 flex-col gap-2">
    <table className="w-full text-left text-xs">
      <thead className="text-ink-muted">
        <tr>
          <th className="py-1.5 font-normal">Page</th>
          <th className="py-1.5 font-normal">Live version</th>
          <th className="py-1.5 text-right font-normal">Page views</th>
          {primaryGoal === undefined ? null : (
            <th className="py-1.5 pl-3 text-right font-normal">
              {primaryGoal}
              <span className="block text-[11px]">per 100 page views</span>
            </th>
          )}
          <th className="py-1.5 pl-3 font-normal">Pressed most</th>
          <th className="py-1.5 text-right font-normal">Last moved</th>
        </tr>
      </thead>
      <tbody>
        {list.rows.map((row) => (
          <tr
            key={row.treeId}
            className={`border-edge-subtle border-t ${
              open === row.treeId ? "bg-surface-active" : "hover:bg-surface-hover"
            }`}
          >
            <td className="py-1.5">
              <Link
                href={byPageHref(address, { from: address.from, page: row.treeId })}
                className="text-ink no-underline hover:underline"
              >
                <PageName name={row.name} treeId={row.treeId} />
              </Link>
              <WaitingBadge waiting={row.waiting} />
            </td>
            <td className="py-1.5">{row.liveVersion}</td>
            <td className="py-1.5 text-right">{count(row.opened)}</td>
            {primaryGoal === undefined ? null : (
              <td className="py-1.5 pl-3 text-right">
                <GoalRate goal={row.primaryGoal} />
              </td>
            )}
            <td className="py-1.5 pl-3">
              {row.mostPressed === undefined ? (
                <span className="text-ink-muted">Nothing pressed</span>
              ) : (
                <PartLabel part={row.mostPressed} />
              )}
            </td>
            <td className="py-1.5 text-right">{plainMoment(row.lastMoved)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <Pager
      span={spanLine(
        positionWords(list.first, list.last, { count: list.total, more: false }),
        stretchWords(list.rows.at(-1)?.lastMoved, list.rows[0]?.lastMoved, now)
      )}
      newer={
        list.newer === undefined && list.first <= 1
          ? undefined
          : byPageHref(address, { from: list.newer })
      }
      older={list.older === undefined ? undefined : byPageHref(address, { from: list.older })}
    />
  </div>
)

const seconds = (value: number): string => (value === 1 ? "1 second" : `${value} seconds`)

const lower = (range: SignalsRange): string => rangeLabel(range).toLocaleLowerCase("en-GB")

/** One goal's rate on this page over the range and its change, and since counting began beneath. */
const GoalFigures = ({ goal, range }: { goal: GoalInDrawer; range: SignalsRange }) => {
  const since = readingSentence(goal.kind, goal.reading)

  if (goal.range === undefined) {
    return (
      <>
        <span className="text-ink-muted text-xs">
          Its figures for the {lower(range)} could not be read just now.
        </span>
        <span className="text-xs">Since counting began: {since}</span>
      </>
    )
  }

  const words = goalRangeWordsOf(goal, goal.range, range, "page")

  return (
    <>
      <span className="text-sm">
        {words.value} <span className="text-ink-muted text-[11px]">{lower(range)}</span>
      </span>
      <span className="text-xs">{words.note}</span>
      <span className="text-ink-muted text-[11px]">Since counting began: {since}</span>
    </>
  )
}

/** Every goal covering the page, the primary first, each with what it counted here. */
const GoalsOnPage = ({
  goals,
  projectId,
  range,
}: {
  goals: readonly GoalInDrawer[] | undefined
  projectId: string
  range: SignalsRange
}) => (
  <section className="flex flex-col gap-2">
    <h3 className="text-xs font-medium">Goals on this page</h3>
    {goals === undefined ? (
      <p className="text-ink-muted text-xs">This deployment could not read its goals just now.</p>
    ) : goals.length === 0 ? (
      <p className="text-ink-muted text-xs">
        No goal covers this page.{" "}
        <Link href={`/portal/${projectId}/goals`} className="text-ink">
          Goals
        </Link>
      </p>
    ) : (
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {goals.map((goal) => (
          <li key={goal.goalId} className="flex flex-col gap-1">
            <span className="flex flex-wrap items-center gap-2">
              <GoalChip goal={goal.name} />
              {goal.primary && <span className="text-ink-muted text-[11px]">Primary</span>}
            </span>
            <GoalFigures goal={goal} range={range} />
          </li>
        ))}
      </ul>
    )}
  </section>
)

const KindBars = ({ bars }: { bars: readonly KindBar[] }) => (
  <ul className="m-0 flex list-none flex-col gap-2 p-0">
    {bars.map((bar) => (
      <li key={bar.technical} className="flex flex-col gap-1" title={bar.meaning}>
        <span className="flex justify-between text-xs">
          <span>{bar.label}</span>
          <span>{count(bar.count)}</span>
        </span>
        <span className="bg-surface-hover block h-1.5 rounded">
          <span
            className="bg-ink block h-1.5 rounded"
            style={{ width: `${Math.round(bar.share * 100)}%` }}
          />
        </span>
      </li>
    ))}
  </ul>
)

/** Why the bars are since the page was first counted rather than for the range, or where the range's start. */
const rangeNoteOf = (range: RangeBars): string | undefined => {
  switch (range.kind) {
    case "unreadable":
      return "This page's figures by the hour could not be read just now, so these are since it was first counted."
    case "uncounted":
      return "Nothing has been counted by the hour on this page yet, so these are since it was first counted."
    case "read":
      return range.countedFrom === undefined
        ? undefined
        : `Counted by the hour from ${plainMoment(new Date(range.countedFrom).toISOString())}, so these start there.`
  }
}

/**
 * What readers did: the bars for the range where the hourly counters answer,
 * with the bars since the page was first counted one click away; the bars
 * since it was first counted, and why, where they do not.
 */
const WhatReadersDid = ({ drawer, range }: { drawer: PageDrawer; range: SignalsRange }) => {
  const note = rangeNoteOf(drawer.range)

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium">
        What readers did
        {drawer.range.kind === "read" ? `, ${lower(range)}` : ", since this page was first counted"}
      </h3>
      {note === undefined ? null : <p className="text-ink-muted text-[11px]">{note}</p>}
      {drawer.range.kind === "read" ? (
        <>
          <KindBars bars={drawer.range.bars} />
          <details className="text-xs">
            <summary className="text-ink-muted cursor-pointer text-[11px]">
              Since this page was first counted, across every version
            </summary>
            <div className="pt-2">
              <KindBars bars={drawer.bars} />
            </div>
          </details>
        </>
      ) : (
        <KindBars bars={drawer.bars} />
      )}
      {drawer.longest === undefined ? null : (
        <p className="text-xs">
          Readers kept <PartLabel part={drawer.longest} /> on screen longest, for{" "}
          {seconds(drawer.longest.seconds)} on average, since this page was first counted.
        </p>
      )}
    </section>
  )
}

const plural = (n: number, one: string, many: string): string =>
  n === 1 ? `1 ${one}` : `${count(n)} ${many}`

/** What is said in place of the reading, where it cannot be drawn. */
const stopsRefusalOf = (stops: Exclude<PageStops, { kind: "read" }>): string => {
  switch (stops.kind) {
    case "unpublished":
      return "The site has not published this page, so there is no version to read where readers stopped against."
    case "unreadable":
      return "Where readers stopped could not be read just now."
    case "two-forms":
      return "This page is served in more than one form, and the readers of each stop in different places, so no one answer is drawn."
    case "mismatched":
      return `Readers were counted on ${plural(stops.orphaned, "part", "parts")} this version does not have, so the counts and the page do not belong together and nothing is drawn rather than something wrong.`
    case "unopened":
      return `No page view of version ${stops.version} has been counted yet.`
  }
}

/**
 * Where reading stopped on the version the site last published: how many
 * places, how much of the page they cost, the three that cost the most, and
 * the words nobody reached one click away. Parts that were on a reader's
 * screen without saying so are named apart, because they are not a reader
 * going no further.
 */
const WhereReadersStopped = ({ stops }: { stops: PageStops }) => (
  <section className="flex flex-col gap-2">
    <h3 className="text-xs font-medium">Where readers stopped</h3>
    {stops.kind !== "read" ? (
      <p className="text-ink-muted text-xs">{stopsRefusalOf(stops)}</p>
    ) : stops.places === 0 ? (
      <p className="text-xs">
        No part of version {stops.version} went unreached, over{" "}
        {plural(stops.views, "page view", "page views")} since it was first counted.
      </p>
    ) : (
      <>
        <p className="text-xs">
          On version {stops.version}, over {plural(stops.views, "page view", "page views")} since it
          was first counted, reading stopped in {plural(stops.places, "place", "places")}, and{" "}
          {count(stops.unseen)} of its {plural(stops.parts, "part", "parts")} went unreached.
        </p>
        <ol className="m-0 flex list-decimal flex-col gap-1 pl-5 text-xs">
          {stops.costliest.map((part) => (
            <li key={part.nodeId}>
              <PartLabel part={part} />{" "}
              <span className="text-ink-muted">
                {plural(part.unseen, "part unreached", "parts unreached")}
              </span>
            </li>
          ))}
        </ol>
        {stops.words.length === 0 ? null : (
          <details className="text-xs">
            <summary className="text-ink-muted cursor-pointer text-[11px]">
              The words nobody reached ({plural(wordCountOf(stops.words), "word", "words")})
            </summary>
            <ul className="m-0 flex list-none flex-col gap-1 p-0 pt-2">
              {stops.words.map((passage, at) => (
                <li key={at}>{passage}</li>
              ))}
            </ul>
          </details>
        )}
      </>
    )}
    {stops.kind !== "read" || stops.notReporting.length === 0 ? null : (
      <p className="text-ink-muted text-[11px]">
        {plural(stops.notReporting.length, "part was", "parts were")} on a reader&apos;s screen
        without saying so, so {stops.notReporting.length === 1 ? "it is" : "they are"} not counted
        as a place readers stopped:{" "}
        {stops.notReporting.map((part, at) => (
          <span key={part.nodeId}>
            {at === 0 ? "" : ", "}
            <PartLabel part={part} />
          </span>
        ))}
        .
      </p>
    )}
  </section>
)

const waitingSentence = (waiting: number): string =>
  waiting === 1
    ? "1 change for this page waits for review."
    : `${waiting} changes for this page wait for review.`

export const PageDrawerPanel = ({
  drawer,
  stops,
  address,
  projectId,
}: {
  drawer: PageDrawer
  stops: PageStops
  address: ByPageAddress
  projectId: string
}) => (
  <aside
    aria-label="One page"
    className="border-edge-subtle bg-surface-base flex w-full shrink-0 flex-col self-start rounded-lg border lg:w-[440px]"
  >
    <div className="border-edge-subtle flex items-start justify-between gap-3 border-b px-4 py-3">
      <div className="text-sm">
        <PageName name={drawer.row.name} treeId={drawer.row.treeId} />
      </div>
      <Link
        href={byPageHref(address, { from: address.from })}
        className="text-ink-muted text-xs no-underline"
        aria-label="Close"
      >
        ✕
      </Link>
    </div>

    <div className="flex flex-col gap-5 px-4 py-3">
      <WhatReadersDid drawer={drawer} range={address.range} />

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium">Pressed most</h3>
        {drawer.pressed.length === 0 ? (
          <p className="text-ink-muted text-xs">Nothing on this page has been pressed yet.</p>
        ) : (
          <ol className="m-0 flex list-decimal flex-col gap-1 pl-5 text-xs">
            {drawer.pressed.map((part) => (
              <li key={part.nodeId}>
                <PartLabel part={part} />{" "}
                <span className="text-ink-muted">
                  {part.presses === 1 ? "1 press" : `${count(part.presses)} presses`}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <WhereReadersStopped stops={stops} />

      <GoalsOnPage goals={drawer.goals} projectId={projectId} range={address.range} />

      {drawer.row.waiting === undefined || drawer.row.waiting === 0 ? null : (
        <Link
          href={`/portal/${projectId}/pages/${drawer.row.treeId}/review`}
          className="bg-awaiting text-awaiting-ink rounded px-3 py-2 text-xs no-underline"
        >
          {waitingSentence(drawer.row.waiting)}
        </Link>
      )}

      <div className="flex flex-wrap gap-4 text-xs">
        {drawer.row.published ? (
          <>
            <Link href={`/portal/${projectId}/pages/${drawer.row.treeId}`} className="text-ink">
              Open the page
            </Link>
            <Link
              href={`/portal/${projectId}/pages/${drawer.row.treeId}/history`}
              className="text-ink"
            >
              Page history
            </Link>
          </>
        ) : (
          <span className="text-ink-muted">
            The site has not published this page, so it has no screens of its own yet.
          </span>
        )}
        <Link
          href={byPageHref(
            { ...address, base: `/portal/${projectId}/signals` },
            { on: drawer.row.treeId }
          )}
          className="text-ink"
        >
          Events on this page
        </Link>
      </div>
    </div>
  </aside>
)
