import type {
  ReaderSignalJournal,
  ReaderSignalStoreError,
  ReceivedBatch,
} from "@jam-overture/loom/signals"
import { ok, type Result } from "@jam-overture/loom"

import {
  BEFORE_EVERY_EVENT,
  EVENTS_PAGE_SIZE,
  eventsOf,
  eventsOfBatch,
  isNewerThan,
  isOlderThan,
  matchesFilter,
  newerFirst,
  olderFirst,
  pageViewOf,
  type EventFilter,
  type EventPage,
  type EventPlace,
  type EventPosition,
  type Naming,
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
 * (`src/paging.ts`: a cursor is a delivery's place, `older` reads below it and
 * `newer` above it). An event is one signal inside a delivery, so a page of
 * fifty events can end half way through one. The address therefore carries
 * the event a page starts beyond, and the read starts at **the cursor one
 * place past its delivery**, the one position whose read includes that
 * delivery, and drops what is not beyond the event.
 */
type Read = ReaderSignalJournal["read"]
type Towards = EventPlace["towards"]

/** Deliveries per read, and reads per screen: two thousand deliveries at most. */
export const SCAN = { deliveries: 500, reads: 4 } as const

/** Deliveries looked at on each side of one, for the rest of its page view. */
export const AROUND = 200

/** The cursor at a delivery, which `older` and `newer` both read past. */
const at = (seq: number): string => String(seq)

/** The cursor whose read toward `towards` starts with this delivery. */
const through = (seq: number, towards: Towards): string =>
  at(towards === "older" ? seq + 1 : seq - 1)

/** The newest events first when reading back, the oldest first when reading forward. */
const nearestFirst = (towards: Towards) => (towards === "older" ? newerFirst : olderFirst)

/** Below every signal of a delivery when reading back, above every one when reading forward. */
const farSideOf = (batch: ReceivedBatch, towards: Towards): EventPosition => ({
  seq: batch.seq,
  index: towards === "older" ? 0 : Math.max(0, batch.signals.length - 1),
})

type Scan = {
  readonly found: readonly ReaderEvent[]
  /** The delivery furthest from the start that any read reached. */
  readonly furthest: ReceivedBatch | undefined
  readonly exhausted: boolean
}

const scan = async (
  read: Read,
  filter: EventFilter,
  keep: (event: ReaderEvent) => boolean,
  towards: Towards,
  cursor: string | undefined,
  reads: number,
  sofar: Scan
): Promise<Result<Scan, ReaderSignalStoreError>> => {
  const page = await read({
    direction: towards,
    limit: SCAN.deliveries,
    ...(cursor === undefined ? {} : { cursor }),
    ...(filter.page === undefined ? {} : { treeId: filter.page }),
  })

  if (!page.ok) return page

  const { batches } = page.value
  const next = page.value[towards]
  const reached: Scan = {
    found: [...sofar.found, ...eventsOf(batches).filter(keep)],
    furthest: (towards === "older" ? batches.at(0) : batches.at(-1)) ?? sofar.furthest,
    exhausted: next === null,
  }

  if (next === null || reached.found.length > EVENTS_PAGE_SIZE || reads <= 1) {
    return ok(reached)
  }

  return scan(read, filter, keep, towards, next, reads - 1, reached)
}

/**
 * What a read toward newer answers when nothing newer than its place fills a
 * page: the newest page is the one to show, and its address names no place.
 */
export type EventReading =
  | { readonly at: "page"; readonly page: EventPage }
  | { readonly at: "newest" }

/**
 * Fifty events matching the filter, newest first: the newest fifty, or the
 * fifty nearest beyond the place the address names, in the way it names.
 *
 * Reads until it holds one more than a page, which is how it knows the list
 * goes on that way, or until the journal has nothing further, or until its
 * budget of reads is spent. In the last case the page says how far it looked,
 * and the same way resumes beyond the furthest delivery it read.
 *
 * Reading toward newer and reaching the newest delivery with no more than a
 * page answers `newest` instead, because those events are on the newest page
 * and a shorter copy of it would be a page the list does not have.
 */
export const readEventPage = async (
  read: Read,
  filter: EventFilter,
  place: EventPlace | undefined,
  naming: Naming
): Promise<Result<EventReading, ReaderSignalStoreError>> => {
  const towards = place?.towards ?? "older"
  const matches = matchesFilter(filter, naming)
  const beyond =
    place === undefined
      ? () => true
      : place.towards === "older"
        ? isOlderThan(place.from)
        : isNewerThan(place.from)

  const scanned = await scan(
    read,
    filter,
    (event) => beyond(event) && matches(event),
    towards,
    place === undefined ? undefined : through(place.from.seq, towards),
    SCAN.reads,
    { found: [], furthest: undefined, exhausted: false }
  )

  if (!scanned.ok) return scanned

  const { found, furthest, exhausted } = scanned.value
  const full = found.length > EVENTS_PAGE_SIZE

  if (towards === "newer" && exhausted && !full) return ok({ at: "newest" })

  const shown = [...found].sort(nearestFirst(towards)).slice(0, EVENTS_PAGE_SIZE)
  const events = [...shown].sort(newerFirst)
  /** Where the read stopped short of a page: past the furthest delivery it read. */
  const stopped = furthest === undefined ? undefined : farSideOf(furthest, towards)
  const searched =
    full || exhausted || furthest === undefined ? undefined : { towards, to: furthest.receivedAt }
  /** Beyond the furthest event shown that way, or where the read stopped. */
  const onward = full ? shown.at(-1) : exhausted ? undefined : stopped
  /** Beyond the nearest event shown the way back, or, with none shown, where the read stopped. */
  const backward = shown.at(0) ?? stopped ?? (towards === "older" ? BEFORE_EVERY_EVENT : undefined)

  return ok({
    at: "page",
    page:
      towards === "older"
        ? {
            events,
            older: onward,
            newer: place === undefined ? undefined : backward,
            searched,
          }
        : { events, older: backward, newer: onward, searched },
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
  const held = await read({
    direction: "older",
    cursor: through(position.seq, "older"),
    limit: 1,
  })

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
