import type {
  ReaderSignalJournal,
  ReaderSignalStoreError,
  ReceivedBatch,
} from "@jam-overture/loom/signals"
import { ok, type Result } from "@jam-overture/loom"

import {
  EVENTS_PAGE_SIZE,
  eventKeyOf,
  eventsOf,
  eventsOfBatch,
  isOlderThan,
  matchesFilter,
  pageViewOf,
  type EventFilter,
  type EventPage,
  type EventPosition,
  type ReaderEvent,
} from "./events"

/**
 * Reading *Signals · Events* from one project's journal: the handle
 * `readingsFor(application).journal` the door files deliveries into, which
 * keeps them for the deployment's window (0351). The portal reads it and
 * never reaches the table (0018).
 *
 * ## Cursors
 *
 * The journal pages by delivery and reads strictly either side of a position
 * (`src/paging.ts`: a cursor is a delivery's place, and `older` reads below
 * it). An event is one signal inside a delivery, so a page of fifty events can
 * end half way through one. The address therefore carries the last event
 * shown, and the next read starts at **the cursor one place above its
 * delivery**, the one position whose `older` read includes that delivery,
 * and drops what was already shown.
 */
type Read = ReaderSignalJournal["read"]

/** Deliveries per read, and reads per screen: two thousand deliveries at most. */
export const SCAN = { deliveries: 500, reads: 4 } as const

/** Deliveries looked at on each side of one, for the rest of its page view. */
export const AROUND = 200

/** The cursor at a delivery, which `older` and `newer` both read past. */
const at = (seq: number): string => String(seq)

/** The cursor whose `older` read starts with this delivery. */
const through = (seq: number): string => at(seq + 1)

type Scan = {
  readonly found: readonly ReaderEvent[]
  readonly oldest: ReceivedBatch | undefined
  readonly exhausted: boolean
}

const scan = async (
  read: Read,
  filter: EventFilter,
  keep: (event: ReaderEvent) => boolean,
  cursor: string | undefined,
  reads: number,
  found: readonly ReaderEvent[]
): Promise<Result<Scan, ReaderSignalStoreError>> => {
  const page = await read({
    direction: "older",
    limit: SCAN.deliveries,
    ...(cursor === undefined ? {} : { cursor }),
    ...(filter.page === undefined ? {} : { treeId: filter.page }),
  })

  if (!page.ok) return page

  const more = [...found, ...eventsOf(page.value.batches).filter(keep)]
  const oldest = page.value.batches[0]
  const exhausted = page.value.older === null

  if (exhausted || more.length > EVENTS_PAGE_SIZE || reads <= 1) {
    return ok({ found: more, oldest, exhausted })
  }

  return scan(read, filter, keep, page.value.older, reads - 1, more)
}

/**
 * Fifty events matching the filter, newest first, older than `before` where
 * the address names one.
 *
 * Reads until it holds one more than a page, which is how it knows there is
 * an older page, or until the journal has nothing older, or until its budget
 * of reads is spent. In the last case the page says how far back it looked,
 * and *Older* resumes below the oldest delivery it read.
 */
export const readEventPage = async (
  read: Read,
  filter: EventFilter,
  before: EventPosition | undefined
): Promise<Result<EventPage, ReaderSignalStoreError>> => {
  const matches = matchesFilter(filter)
  const keep =
    before === undefined
      ? matches
      : (event: ReaderEvent) => isOlderThan(before)(event) && matches(event)

  const scanned = await scan(
    read,
    filter,
    keep,
    before === undefined ? undefined : through(before.seq),
    SCAN.reads,
    []
  )

  if (!scanned.ok) return scanned

  const { found, oldest, exhausted } = scanned.value
  const events = found.slice(0, EVENTS_PAGE_SIZE)
  const last = events.at(-1)

  if (found.length > EVENTS_PAGE_SIZE && last !== undefined) {
    return ok({ events, older: last.key, searchedTo: undefined })
  }

  if (exhausted || oldest === undefined) {
    return ok({ events, older: undefined, searchedTo: undefined })
  }

  return ok({
    events,
    older: eventKeyOf({ seq: oldest.seq, index: 0 }),
    searchedTo: oldest.receivedAt,
  })
}

export type OpenedEvent = {
  readonly event: ReaderEvent
  /** The page view's events in the order they happened, this one among them. */
  readonly pageView: readonly ReaderEvent[]
  /**
   * Whether every delivery that could share its page view was looked at.
   * False when there were more than {@link AROUND} on either side, so the page
   * view may have more than is shown.
   */
  readonly whole: boolean
}

/**
 * The one event an address opens, and the rest of its page view.
 *
 * `undefined` when the journal no longer holds it: the window passed and the
 * sweep deleted it, or the address was never a real one.
 */
export const readOpenedEvent = async (
  read: Read,
  position: EventPosition
): Promise<Result<OpenedEvent | undefined, ReaderSignalStoreError>> => {
  const held = await read({ direction: "older", cursor: through(position.seq), limit: 1 })

  if (!held.ok) return held

  const batch = held.value.batches.find((each) => each.seq === position.seq)
  const event =
    batch === undefined
      ? undefined
      : eventsOfBatch(batch).find((each) => each.index === position.index)

  if (batch === undefined || event === undefined) return ok(undefined)
  if (event.view === undefined) return ok({ event, pageView: [], whole: true })

  const [older, newer] = await Promise.all([
    read({ direction: "older", cursor: at(position.seq), limit: AROUND }),
    read({ direction: "newer", cursor: at(position.seq), limit: AROUND }),
  ])

  if (!older.ok) return older
  if (!newer.ok) return newer

  return ok({
    event,
    pageView: pageViewOf(event, [...older.value.batches, batch, ...newer.value.batches]),
    whole: older.value.older === null && newer.value.newer === null,
  })
}
