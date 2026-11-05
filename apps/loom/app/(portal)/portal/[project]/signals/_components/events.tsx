import Link from "next/link"
import type { ReactNode } from "react"

import { READER_SIGNAL_KINDS } from "@jam-overture/loom/signals"
import { DEFAULT_AUDIENCE_ID } from "@jam-overture/loom/store"

import { FilterChips } from "@/app/(portal)/_components/filter-chips"
import { GoalChip } from "@/app/(portal)/_components/goal-chip"
import { TechnicalDetail } from "@/app/(portal)/_components/technical-detail"
import {
  eventSentence,
  eventsHref,
  happenedOf,
  lengthOf,
  partKindOf,
  type EventFilter,
  type EventPageChoice,
  type EventPage,
  type Naming,
  type ReaderEvent,
} from "@/app/(portal)/_lib/events"
import type { OpenedEvent } from "@/app/(portal)/_lib/events-reading"
import { SIGNAL_KINDS } from "@/app/(portal)/_lib/vocabulary"
import { plainMoment } from "@/app/(portal)/_lib/when"

/**
 * *Signals · Events*: what readers did, one row each, newest first, and the
 * drawer for the one the address names (`docs/portal-wireframes.md`,
 * *1 · Signals*).
 *
 * Every control is an address — `kind`, `on` and `view` for the filter,
 * `before` for where the list starts, `event` for the drawer's subject — so a
 * link a person sends reopens exactly what they were looking at, and the
 * screen needs no client code to do it.
 */

export type EventsAddress = {
  readonly base: string
  readonly filter: EventFilter
  readonly before: string | undefined
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

export const EventFacets = ({
  address,
  pages,
}: {
  address: EventsAddress
  pages: readonly EventPageChoice[]
}) => {
  const { base, filter } = address

  return (
    <div className="flex flex-col gap-3">
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
        {filter.kind === undefined ? null : <input type="hidden" name="kind" value={filter.kind} />}
        {filter.view === undefined ? null : <input type="hidden" name="view" value={filter.view} />}
        <button type="submit" className="border-edge-subtle rounded border px-2 py-1">
          Show
        </button>
      </form>
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

const Pager = ({ page, address }: { page: EventPage; address: EventsAddress }) => (
  <div className="text-ink-muted flex flex-col gap-2 text-xs">
    {page.searchedTo === undefined ? null : (
      <p>
        Looked through everything received since {plainMoment(page.searchedTo)}.{" "}
        {page.events.length === 0 ? "Nothing there matches. " : ""}
        Older events continue on the next page.
      </p>
    )}
    <span className="flex justify-end gap-3">
      {address.before === undefined ? (
        <span aria-disabled="true">Newest</span>
      ) : (
        <Link href={eventsHref(address.base, address.filter)} className="text-ink">
          Newest
        </Link>
      )}
      {page.older === undefined ? (
        <span aria-disabled="true">Older</span>
      ) : (
        <Link
          href={eventsHref(address.base, address.filter, { before: page.older })}
          className="text-ink"
        >
          Older
        </Link>
      )}
    </span>
  </div>
)

export const EventsTable = ({
  page,
  address,
  naming,
  open,
}: {
  page: EventPage
  address: EventsAddress
  naming: Naming
  open: string | undefined
}) => (
  <div className="flex min-w-0 flex-1 flex-col gap-2">
    {page.events.length === 0 && page.searchedTo === undefined ? (
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
                      before: address.before,
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
    <Pager page={page} address={address} />
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
  const back = eventsHref(address.base, address.filter, { before: address.before })

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
                        before: address.before,
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
