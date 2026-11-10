import Link from "next/link"
import type { ReactNode } from "react"

import { READER_SIGNAL_KINDS } from "@jam-overture/loom/signals"
import { DEFAULT_AUDIENCE_ID } from "@jam-overture/loom/store"

import { FilterChips } from "@/app/(portal)/_components/filter-chips"
import { GoalChip } from "@/app/(portal)/_components/goal-chip"
import { Pager } from "@/app/(portal)/_components/pager"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import {
  eventSentence,
  eventsHref,
  happenedOf,
  lengthOf,
  LIVE_EVERY_MS,
  LIVE_ON,
  partKindOf,
  SEARCH_LENGTH,
  type EventPageChoice,
  type EventPage,
  type EventPlace,
  type EventView,
  type Naming,
  type ReaderEvent,
} from "@/app/(portal)/_lib/events"
import type { OpenedEvent } from "@/app/(portal)/_lib/events-reading"
import { spanLine, stretchWords } from "@/app/(portal)/_lib/list-span"
import { rangeParam } from "@/app/(portal)/_lib/signals-range"
import { SIGNAL_KINDS } from "@/app/(portal)/_lib/vocabulary"
import { plainMoment } from "@/app/(portal)/_lib/when"

import { LiveRefresh } from "./live-refresh"

/**
 * *Signals · Events*: what readers did, one row each, newest first, and the
 * drawer for the one the address names (`docs/portal-wireframes.md`,
 * *1 · Signals*).
 *
 * Every control is an address — `kind`, `on`, `view` and `q` for the filter,
 * `range` for the stretch the figures above are read over, `live` for reading
 * the newest again as it arrives, `before` or `after` for where the list
 * starts when it is not the newest page, `event`
 * for the drawer's subject — so a link a person sends reopens exactly what
 * they were looking at. Being live is the one piece of client code, and all it
 * does is ask the server to draw the address again.
 */

export type EventsAddress = {
  readonly base: string
  readonly filter: EventView
  readonly place: EventPlace | undefined
}

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

const PartCell = ({ event, naming }: { event: ReaderEvent; naming: Naming }) => {
  const name = naming.part(event.treeId, event.signal.nodeId)
  const length = lengthOf(event.signal)

  return (
    <>
      {name ?? <span className="font-mono">{event.signal.nodeId}</span>}
      {length === undefined ? null : <span className="text-ink-muted"> · {length}</span>}
      <span className="text-ink-muted block text-[11px]">{partKindOf(event.signal)}</span>
    </>
  )
}

/**
 * The *Live* switch, and while it is on, the reading again that makes it so.
 *
 * Switching on from an older page goes to the newest, because that is the
 * only page live can be ({@link EventView}); the sentence beside it says so
 * before it is pressed.
 */
const LiveSwitch = ({ address }: { address: EventsAddress }) => {
  const { base, filter, place } = address

  return (
    <p className="text-ink-muted m-0 flex flex-wrap items-center gap-2 text-xs">
      <Link
        href={eventsHref(base, { ...filter, live: !filter.live })}
        role="switch"
        aria-checked={filter.live}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 no-underline ${
          filter.live
            ? "bg-applied text-applied-ink border-applied-ink/20"
            : "border-edge-subtle text-ink"
        }`}
      >
        <span
          aria-hidden="true"
          className={`size-1.5 rounded-full ${filter.live ? "bg-applied-ink" : "bg-ink-muted"}`}
        />
        Live
      </Link>
      {filter.live
        ? "New events appear at the top as they arrive."
        : place === undefined
          ? "Switch on to see new events as they arrive."
          : "Switching on goes back to the newest events."}
      {filter.live ? <LiveRefresh everyMs={LIVE_EVERY_MS} /> : null}
    </p>
  )
}

export const EventFacets = ({
  address,
  pages,
}: {
  address: EventsAddress
  pages: readonly EventPageChoice[]
}) => {
  const { base, filter } = address
  const range = rangeParam(filter.range)

  return (
    <div className="flex flex-col gap-3">
      <LiveSwitch address={address} />
      <FilterChips
        label="Kind"
        choices={[
          { label: "All kinds", kind: undefined },
          ...READER_SIGNAL_KINDS.map((kind) => ({ label: SIGNAL_KINDS[kind].label, kind })),
        ].map(({ label, kind }) => ({
          label,
          href: eventsHref(base, { ...filter, kind }),
          selected: filter.kind === kind,
        }))}
      />
      <form method="get" action={base} className="flex flex-wrap items-center gap-2 text-xs">
        <label htmlFor="events-page" className="text-ink-muted">
          Page
        </label>
        <select
          id="events-page"
          name="on"
          defaultValue={filter.page ?? ""}
          className="border-edge-subtle bg-surface-base max-w-full min-w-0 rounded border px-2 py-1"
        >
          <option value="">Every page</option>
          {pages.map((page) => (
            <option key={page.treeId} value={page.treeId}>
              {page.name ?? page.treeId}
            </option>
          ))}
        </select>
        <label htmlFor="events-search" className="text-ink-muted">
          Find
        </label>
        <input
          id="events-search"
          type="search"
          name="q"
          defaultValue={filter.search ?? ""}
          maxLength={SEARCH_LENGTH}
          placeholder="A part or a page"
          className="border-edge-subtle bg-surface-base w-64 max-w-full min-w-0 rounded border px-2 py-1"
        />
        {filter.kind === undefined ? null : <input type="hidden" name="kind" value={filter.kind} />}
        {filter.view === undefined ? null : <input type="hidden" name="view" value={filter.view} />}
        {range === undefined ? null : <input type="hidden" name="range" value={range} />}
        {filter.live ? <input type="hidden" name="live" value={LIVE_ON} /> : null}
        <button type="submit" className="border-edge-subtle rounded border px-2 py-1">
          Show
        </button>
      </form>
      {filter.search === undefined ? null : (
        <p className="text-ink-muted text-xs">
          Showing what mentions “{filter.search}” in its part or page.{" "}
          <Link href={eventsHref(base, { ...filter, search: undefined })} className="text-ink">
            Clear the search
          </Link>
        </p>
      )}
      {filter.view === undefined ? null : (
        <p className="text-ink-muted text-xs">
          Showing one page view only.{" "}
          <Link href={eventsHref(base, { ...filter, view: undefined })} className="text-ink">
            Show every page view
          </Link>
        </p>
      )}
    </div>
  )
}

/** How many events a page shows. Not its place in the list, which a cursor read cannot know. */
const eventsWords = (shown: number): string => (shown === 1 ? "1 event" : `${shown} events`)

/** Where a read stopped at its budget, and which way the list carries on. */
const searchedWords = (searched: NonNullable<EventPage["searched"]>, shown: number): string =>
  searched.towards === "older"
    ? `Looked through everything received since ${plainMoment(searched.to)}. ${
        shown === 0 ? "Nothing there matches. " : ""
      }Older events continue on the next page.`
    : `Looked through everything received up to ${plainMoment(searched.to)}. ${
        shown === 0 ? "Nothing there matches. " : ""
      }Newer events continue on the page before.`

const EventsPager = ({
  page,
  address,
  now,
}: {
  page: EventPage
  address: EventsAddress
  now: number
}) => (
  <div className="text-ink-muted flex flex-col gap-2 text-xs">
    {page.searched === undefined ? null : <p>{searchedWords(page.searched, page.events.length)}</p>}
    <Pager
      span={
        page.events.length === 0
          ? undefined
          : spanLine(
              eventsWords(page.events.length),
              stretchWords(page.events.at(-1)?.receivedAt, page.events[0]?.receivedAt, now)
            )
      }
      newer={
        page.newer === undefined
          ? undefined
          : eventsHref(address.base, address.filter, {
              place: { towards: "newer", from: page.newer },
            })
      }
      older={
        page.older === undefined
          ? undefined
          : eventsHref(address.base, address.filter, {
              place: { towards: "older", from: page.older },
            })
      }
    />
  </div>
)

export const EventsTable = ({
  page,
  address,
  naming,
  open,
  now,
}: {
  page: EventPage
  address: EventsAddress
  naming: Naming
  open: string | undefined
  now: number
}) => (
  <div className="flex min-w-0 flex-1 flex-col gap-2">
    {page.events.length === 0 && page.searched === undefined ? (
      <p className="text-ink-muted text-xs">Nothing kept matches this filter.</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="text-ink-muted">
            <tr>
              <th className="py-1.5 pr-3 font-normal">Received</th>
              <th className="py-1.5 pr-3 font-normal">What happened</th>
              <th className="py-1.5 pr-3 font-normal">Page</th>
              <th className="py-1.5 pr-3 font-normal">Part</th>
              <th className="py-1.5 text-right font-normal">Version</th>
            </tr>
          </thead>
          <tbody>
            {page.events.map((event) => (
              <tr
                key={event.key}
                className={`border-edge-subtle border-t align-top ${
                  open === event.key ? "bg-surface-active" : "hover:bg-surface-hover"
                }`}
              >
                <td className="py-1.5 pr-3 whitespace-nowrap">
                  <Link
                    href={eventsHref(address.base, address.filter, {
                      place: address.place,
                      event: event.key,
                    })}
                    className="text-ink no-underline hover:underline"
                  >
                    {plainMoment(event.receivedAt)}
                  </Link>
                </td>
                <td className="py-1.5 pr-3">{SIGNAL_KINDS[event.signal.kind].label}</td>
                <td className="py-1.5 pr-3">
                  <PageName name={naming.page(event.treeId)} treeId={event.treeId} />
                </td>
                <td className="py-1.5 pr-3">
                  <PartCell event={event} naming={naming} />
                </td>
                <td className="py-1.5 text-right">{event.revision}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
    <EventsPager page={page} address={address} now={now} />
  </div>
)

const Fact = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-ink-muted text-[11px]">{label}</dt>
    <dd className="m-0 text-xs">{children}</dd>
  </div>
)

const Mono = ({ value }: { value: string }) => (
  <span className="text-ink-muted block font-mono text-[11px] break-all">{value}</span>
)

export const EventDrawerPanel = ({
  opened,
  goals,
  naming,
  address,
  projectId,
}: {
  opened: OpenedEvent
  goals: readonly string[]
  naming: Naming
  address: EventsAddress
  projectId: string
}) => {
  const { event, pageView, whole } = opened
  const happened = happenedOf(event.signal)
  const back = eventsHref(address.base, address.filter, { place: address.place })

  return (
    <aside
      aria-label="One event"
      className="border-edge-subtle bg-surface-base order-first flex w-full shrink-0 flex-col self-start rounded-lg border lg:order-none lg:w-[440px]"
    >
      <div className="border-edge-subtle flex items-start justify-between gap-3 border-b px-4 py-3">
        <p className="m-0 text-sm">{eventSentence(event, naming)}</p>
        <Link href={back} className="text-ink-muted text-xs no-underline" aria-label="Close">
          ✕
        </Link>
      </div>

      <div className="flex flex-col gap-5 px-4 py-3">
        {goals.length === 0 ? null : (
          <div className="flex flex-wrap gap-1.5">
            {goals.map((goal) => (
              <GoalChip key={goal} goal={goal} />
            ))}
          </div>
        )}

        <dl className="m-0 grid grid-cols-2 gap-3">
          <Fact label="Happened">
            {"at" in happened ? plainMoment(happened.at) : `Stayed ${happened.lasted}`}
            <span className="text-ink-muted block text-[11px]">
              {"at" in happened ? "By the reader's clock" : "A stay has a length, not a moment"}
            </span>
          </Fact>
          <Fact label="Received">{plainMoment(event.receivedAt)}</Fact>
          <Fact label="Page">
            {naming.page(event.treeId) ?? "Not published to Loom"}
            <Mono value={event.treeId} />
          </Fact>
          <Fact label="Version">{event.revision}</Fact>
          <Fact label="Part">
            {naming.part(event.treeId, event.signal.nodeId) ?? partKindOf(event.signal)}
            <Mono value={`${event.signal.type} · ${event.signal.nodeId}`} />
          </Fact>
          <Fact label="Page view">
            {event.view === undefined ? "Not named by the site" : <Mono value={event.view} />}
          </Fact>
          <Fact label="Audience">
            {event.audienceId === DEFAULT_AUDIENCE_ID ? (
              "Everyone"
            ) : (
              <Mono value={event.audienceId} />
            )}
          </Fact>
        </dl>

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium">The rest of this page view</h3>
          {event.view === undefined ? (
            <p className="text-ink-muted text-xs">
              The site named no page view for this delivery, so nothing ties it to the others.
            </p>
          ) : (
            <ol className="m-0 flex list-decimal flex-col gap-1 pl-5 text-xs">
              {pageView.map((each) => (
                <li key={each.key} aria-current={each.key === event.key ? "true" : undefined}>
                  {each.key === event.key ? (
                    <strong className="font-medium">{SIGNAL_KINDS[each.signal.kind].label}</strong>
                  ) : (
                    <Link
                      href={eventsHref(address.base, address.filter, {
                        place: address.place,
                        event: each.key,
                      })}
                      className="text-ink"
                    >
                      {SIGNAL_KINDS[each.signal.kind].label}
                    </Link>
                  )}{" "}
                  <span className="text-ink-muted">
                    {naming.part(each.treeId, each.signal.nodeId) ?? partKindOf(each.signal)}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {whole ? null : (
            <p className="text-ink-muted text-[11px]">
              Looked for it among the deliveries received just before and after this one, so a long
              page view may have more.
            </p>
          )}
        </section>

        <div className="flex flex-wrap gap-4 text-xs">
          <Link href={`/portal/${projectId}/pages/${event.treeId}`} className="text-ink">
            Open the page
          </Link>
          {event.view === undefined ? null : (
            <Link
              href={eventsHref(address.base, {
                kind: undefined,
                page: undefined,
                view: event.view,
                search: undefined,
                live: address.filter.live,
                range: address.filter.range,
              })}
              className="text-ink"
            >
              Events from this view
            </Link>
          )}
        </div>

        <TechnicalDetail summary="Raw signal">
          <pre className="overflow-x-auto font-mono text-[11px] whitespace-pre-wrap">
            {JSON.stringify(
              {
                received: event.receivedAt,
                page: event.treeId,
                version: event.revision,
                audience: event.audienceId,
                view: event.view,
                signal: event.signal,
              },
              null,
              2
            )}
          </pre>
        </TechnicalDetail>
      </div>
    </aside>
  )
}
