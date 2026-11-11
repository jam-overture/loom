import { z } from "zod"

import { clampLimit, ok, type Result, type TreeId } from "@jam-overture/loom"
import type {
  ReaderSignal,
  ReaderSignalJournal,
  ReaderSignalStoreError,
  ReceivedBatch,
  ViewKey,
} from "@jam-overture/loom/signals"
import type { ApplicationId, AudienceId } from "@jam-overture/loom/store"

import { boundedReaderSignalJournal } from "@/app/_lib/app/bounded-store"

import { readingsFor } from "./intake"

/**
 * The deliveries this deployment kept, as events a screen can list (0355).
 *
 * `docs/portal.md`'s *Events* tab is a paginated list of what readers did,
 * newest first, with a drawer for one of them. The rows it needs have existed
 * since 5 November — [0351](../../../../../decisions/0351-a-counted-delivery-is-kept-for-a-stated-window-rather-than-deleted-by-the-fold.md)
 * stopped the fold deleting a delivery and
 * [0349](../../../../../decisions/0349-a-projects-reader-events-are-kept-thirty-days-by-default-and-the-tallies-stay-the-durable-record.md)
 * keeps them for thirty days by default — and nothing could read them except
 * `ReaderSignalJournal.read`, which is the store's own handle: unscoped,
 * delivery-shaped, and the table rather than a reading.
 *
 * So this is `reading.ts`'s sibling at the other end of the same screen: one
 * module that scopes the rows to an application the way `readingsFor` does,
 * bounds every read the way every other portal read is bounded, and hands back
 * **one row per signal** rather than one row per delivery, because what a
 * reader did is the row and a delivery is how several of them travelled.
 *
 * ## Three things it deliberately does not do
 *
 * - **It counts nothing.** 0349's second clause is that nothing said over all
 *   time comes out of these rows, and a total here would be the first place that
 *   bent. There is no *of 4,812* on this page and no facet count: both are on
 *   the tallies already, which hold exactly those numbers and go on answering
 *   after a row is swept.
 * - **It names no page and no part.** A tree id and a node id are what a
 *   delivery carries; the heading a page publishes and the label a part shows
 *   are the portal's to join from what the site published (0312), as *By page*
 *   already does. A second namer here would be a second one to drift.
 * - **It cannot stitch two page views together.** {@link ReaderEvents.pageView}
 *   takes a key the caller is already holding and reads that one page view;
 *   there is nothing that lists keys, and nothing that takes a row and asks
 *   what else shares its key. That is rule 2 of `docs/signals.md` as a
 *   signature rather than as a convention.
 */

/** Events a page of the list holds, the wireframes' 50. */
export const EVENTS_PAGE_SIZE = 50

/**
 * The ceiling, which is the drawer's panel as much as the list's page: both are
 * read into memory and both are drawn, and a reader who stayed an hour has
 * thousands of signals in one page view.
 */
export const MAX_EVENTS_PAGE_SIZE = 200

/**
 * One thing a reader did, with the delivery's own facts beside it.
 *
 * The signal is carried whole rather than spread into columns, because
 * `ReaderSignal` is already the closed five-kind union and a parallel shape
 * here would be a second vocabulary to keep in step — one that would quietly
 * lose the fact that a `dwelled` has **no instant of its own** and a `viewed`
 * does. A caller narrows on `signal.kind` and the kind's own fields are typed.
 */
export type ReaderEvent = {
  /**
   * The subject of the drawer, which is `?event=` in the URL.
   *
   * The delivery's position and the signal's place inside it. Stable for as
   * long as the row is kept: `seq` is assigned once and a delivery's signals
   * are never rewritten.
   */
  readonly id: string
  /**
   * When the intake stamped the delivery — **the only instant Loom vouches
   * for**, and the order this list is in.
   *
   * A reader's clock is not merely skewed but attacker-controlled, so
   * `signal.at` and {@link sentAt} order nothing. They are shown, because
   * *Happened* against *Received* is a sentence an operator can read; they are
   * never sorted by, because a page that could reorder this list could hide a
   * row at the bottom of it.
   */
  readonly receivedAt: string
  /** What the page said the time was when it sent the delivery. A number a page said. */
  readonly sentAt: number
  readonly treeId: TreeId
  readonly revision: number
  /** The audience the delivery was filed under, which is resolved rather than optional (0284). */
  readonly audienceId: AudienceId
  /**
   * The page view it belongs to, absent where the sender minted none.
   *
   * **There is deliberately no *this is where the page view began*.** A batch
   * says so on the wire — the opening marker §7 of `docs/signals.md` added so a
   * region could be counted once per reader — and both journals drop it at the
   * door rather than store it (0219), because a row saying *this page view
   * began at this instant* is the step toward a profile that §7 refused. The
   * kept window makes that argument stronger rather than weaker: the row now
   * lives for thirty days. So the drawer can say which signals shared a page
   * view and cannot say which of them opened it, and the oldest kept delivery
   * of a page view is not evidence either, since the sweep takes the oldest
   * first.
   */
  readonly view: ViewKey | undefined
  /** When a fold counted the delivery into the counters, absent where none has yet (0351). */
  readonly countedAt: string | undefined
  readonly signal: ReaderSignal
}

export type ReaderEventListRequest = {
  /** One page of the site, absent reads every tree this application has. */
  readonly treeId?: TreeId
  /** A cursor from a previous page's `older`, passed back unread. */
  readonly cursor?: string
  readonly limit?: number
}

export type ReaderEventPage = {
  /** Newest delivery first; a delivery's own signals in the order it sent them. */
  readonly events: readonly ReaderEvent[]
  /**
   * The page after this one, `undefined` where it reaches the oldest delivery
   * the deployment still keeps.
   *
   * There is no cursor in the other direction, because the list is read from
   * the newest end and a screen going back is a screen going back to a cursor
   * it already had — which is how *By page* already works, with `from` in the
   * URL.
   */
  readonly older: string | undefined
}

export type ReaderPageViewPanel = {
  /** Oldest first, which is the order they arrived in and the only order they have. */
  readonly events: readonly ReaderEvent[]
  /**
   * Whether the page view holds more than this.
   *
   * The panel is bounded rather than paged: a drawer shows the start of a page
   * view and says when there is more, and a reader who stayed an hour has more
   * than a drawer can draw.
   */
  readonly more: boolean
}

export type ReaderEvents = {
  readonly list: (
    request?: ReaderEventListRequest
  ) => Promise<Result<ReaderEventPage, ReaderSignalStoreError>>
  /**
   * The rest of one page view, for the drawer's panel.
   *
   * The key comes from a row the caller could already see. Nothing here will
   * find it one.
   */
  readonly pageView: (
    view: ViewKey,
    limit?: number
  ) => Promise<Result<ReaderPageViewPanel, ReaderSignalStoreError>>
}

const clamp = (limit: number | undefined): number =>
  clampLimit(limit, { fallback: EVENTS_PAGE_SIZE, max: MAX_EVENTS_PAGE_SIZE })

const eventsOf = (batch: ReceivedBatch): readonly ReaderEvent[] =>
  batch.signals.map((signal, index) => ({
    id: `${batch.seq}.${index}`,
    receivedAt: batch.receivedAt,
    sentAt: batch.sentAt,
    treeId: batch.treeId,
    revision: batch.revision,
    audienceId: batch.audienceId,
    view: batch.view,
    countedAt: batch.foldedAt,
    signal,
  }))

/**
 * A chunk of deliveries as events, newest delivery first.
 *
 * **A delivery's own signals keep the order it sent them in**, which is not the
 * list's order reversed. That order is the only account of their sequence
 * anybody has — the clock on them is the reader's, and a `dwelled` has no clock
 * at all — so reversing it would be this module asserting a sequence the
 * sender did not claim. The deliveries around it are ordered by arrival, which
 * the intake does vouch for.
 */
const newestFirst = (batches: readonly ReceivedBatch[]): readonly ReaderEvent[] =>
  [...batches].reverse().flatMap(eventsOf)

/**
 * Where a page of the list starts: the delivery walk to resume, and the events
 * of its first chunk that have already been shown.
 *
 * **The second half is why this is not the store's cursor passed through.** The
 * store pages deliveries and this pages events, so a page of fifty events can
 * end in the middle of a delivery that carried sixty — and the store, quite
 * rightly, hands out no cursor that points inside one. Rather than mint a
 * position the store did not give us, or let a page spill to however many
 * events fifty deliveries happen to hold, the cursor says *resume this chunk
 * and skip what has been shown*: one bounded read of the same chunk, whose cost
 * does not grow with how deep the reader has paged.
 */
const cursorSchema = z.tuple([z.string(), z.number().int().nonnegative()])

type EventCursor = z.infer<typeof cursorSchema>

const cursorOf = (from: string | undefined, skip: number): string =>
  Buffer.from(JSON.stringify([from ?? "", skip])).toString("base64url")

/** `undefined` for anything that is not a cursor this module wrote, which opens the first page. */
const parseCursor = (cursor: string | undefined): EventCursor | undefined => {
  if (cursor === undefined) return undefined

  try {
    const parsed = cursorSchema.safeParse(JSON.parse(Buffer.from(cursor, "base64url").toString()))

    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}

type Gathering = {
  readonly journal: ReaderSignalJournal
  readonly treeId: TreeId | undefined
  readonly limit: number
}

/**
 * Read chunks of deliveries until the page is full or the kept window ends.
 *
 * **It costs at most two reads**, and that is a property of the chunk size
 * rather than of luck: a chunk is `limit` deliveries, every delivery carries at
 * least one signal, so a chunk that is not the last yields at least `limit`
 * events — enough to fill whatever a resumed chunk left short. A chunk with
 * fewer deliveries than it asked for is the oldest end, and the recursion stops
 * there.
 */
const gather = async (
  { journal, treeId, limit }: Gathering,
  from: string | undefined,
  skip: number,
  taken: readonly ReaderEvent[]
): Promise<Result<ReaderEventPage, ReaderSignalStoreError>> => {
  const page = await journal.read({
    ...(treeId === undefined ? {} : { treeId }),
    ...(from === undefined ? {} : { cursor: from }),
    direction: "older",
    limit,
  })

  if (!page.ok) return page

  const events = newestFirst(page.value.batches)
  const shown = events.slice(skip, skip + (limit - taken.length))
  const gathered = [...taken, ...shown]
  const consumed = skip + shown.length

  /** More of this chunk is left, so the next page resumes inside it. */
  if (consumed < events.length) return ok({ events: gathered, older: cursorOf(from, consumed) })

  /** The chunk is spent and nothing is behind it: the oldest kept delivery is in this page. */
  if (page.value.older === null) return ok({ events: gathered, older: undefined })

  return gathered.length >= limit
    ? ok({ events: gathered, older: cursorOf(page.value.older, 0) })
    : gather({ journal, treeId, limit }, page.value.older, 0, gathered)
}

/**
 * The handle over one journal, which is what the tests exercise and what a
 * scope is built from.
 */
export const readerEventsOf = (journal: ReaderSignalJournal): ReaderEvents => ({
  list: (request) => {
    const limit = clamp(request?.limit)
    const [from, skip] = parseCursor(request?.cursor) ?? ["", 0]

    return gather(
      { journal, treeId: request?.treeId, limit },
      from === "" ? undefined : from,
      skip,
      []
    )
  },
  pageView: async (view, limit) => {
    const bound = clamp(limit)
    /**
     * Oldest first, which with no cursor is the start of the page view, and
     * one delivery per event at worst — so a bound in events is a bound in
     * deliveries too.
     */
    const page = await journal.read({ view, direction: "newer", limit: bound })

    if (!page.ok) return page

    const events = page.value.batches.flatMap(eventsOf)

    return ok({
      events: events.slice(0, bound),
      more: events.length > bound || page.value.newer !== null,
    })
  },
})

/**
 * One application's events, on the stores its deliveries are filed into.
 *
 * **Bounded here rather than at the call site**, which is the one way this
 * differs from how the *Signals* screen reads the journal today. That screen
 * bounds the handle itself because the door *writes* through it, and a write
 * cut off by a screen's budget would lose a reader's batch. This handle only
 * reads, so the budget belongs where a screen cannot forget it (0262).
 */
export const readerEventsFor = (application: ApplicationId): ReaderEvents =>
  readerEventsOf(boundedReaderSignalJournal(readingsFor(application).journal))
