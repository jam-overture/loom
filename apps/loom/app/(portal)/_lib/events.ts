import { z } from "zod"

import {
  readerSignalKindSchema,
  viewKeySchema,
  type ReaderSignal,
  type ReaderSignalKind,
  type ReceivedBatch,
} from "@jam-overture/loom/signals"
import { treeIdSchema, type TreeId } from "@jam-overture/loom"

import type { PublishedPage } from "@/app/_lib/pages/published"

import type { Goal } from "./goals/goal"
import { pageNameOf } from "./page-name"
import { namesInTree, nounOf } from "./part-name"
import type { SegmentWord } from "./segments/segment"
import { SEGMENT_PARAM, segmentAsked } from "./segments/segment-pick"
import { rangeOf, rangeParam, type SignalsRange } from "./signals-range"

/**
 * *Signals · Events*: one row per thing a reader did, newest first (8a of
 * `docs/portal.md`, *1 · Signals* of `docs/portal-wireframes.md`).
 *
 * The intake keeps each delivery for the deployment's window, thirty days by
 * default (0349, 0351), and a delivery is a batch of signals from one page
 * view. An *event* here is one signal in one delivery, so its position is the
 * delivery's place in the journal and the signal's place in the delivery, and
 * that pair is all an address needs to name it.
 *
 * Everything in this file is a function of deliveries already read; reading
 * them is `events-reading.ts`.
 */

/** Fifty to a page, as *By page* and the wireframe count them. */
export const EVENTS_PAGE_SIZE = 50

/** Where an event sits: its delivery's place in the journal, and its own in the delivery. */
export type EventPosition = {
  readonly seq: number
  readonly index: number
}

export type ReaderEvent = EventPosition & {
  readonly key: string
  readonly receivedAt: string
  readonly treeId: string
  readonly revision: number
  readonly audienceId: string
  readonly view: string | undefined
  readonly signal: ReaderSignal
}

const KEY = /^(\d{1,15})\.(\d{1,6})$/u

/** `12.3`: the twelfth delivery's fourth signal, which is how an address names an event. */
export const eventKeyOf = ({ seq, index }: EventPosition): string => `${seq}.${index}`

export const parseEventKey = (asked: string | undefined): EventPosition | undefined => {
  const parts = asked === undefined ? null : KEY.exec(asked)

  return parts === null ? undefined : { seq: Number(parts[1]), index: Number(parts[2]) }
}

/** Newest first: the later delivery, and within one delivery the later signal. */
export const newerFirst = (a: EventPosition, b: EventPosition): number =>
  b.seq - a.seq || b.index - a.index

/** Oldest first: the earlier delivery, and within one delivery the earlier signal. */
export const olderFirst = (a: EventPosition, b: EventPosition): number => newerFirst(b, a)

/** Strictly older than a position, which is what *the page after this one* starts from. */
export const isOlderThan =
  (position: EventPosition) =>
  (event: EventPosition): boolean =>
    newerFirst(position, event) < 0

/** Strictly newer than a position, which is what *the page before this one* ends at. */
export const isNewerThan =
  (position: EventPosition) =>
  (event: EventPosition): boolean =>
    newerFirst(position, event) > 0

/**
 * Below every delivery the journal can hold, whose places count from one: the
 * place a read toward newer starts from when nothing it could start above is
 * still kept.
 */
export const BEFORE_EVERY_EVENT: EventPosition = { seq: 0, index: 0 }

/**
 * Where a page of the list starts, when it is not the newest: the events just
 * older than a place (*Older*, `before` in the address), or just newer than one
 * (*Newer*, `after`).
 */
export type EventPlace = {
  readonly towards: "older" | "newer"
  readonly from: EventPosition
}

const PLACE_PARAM = { older: "before", newer: "after" } as const

/** One delivery's signals as events, newest first. */
export const eventsOfBatch = (batch: ReceivedBatch): readonly ReaderEvent[] =>
  batch.signals
    .map((signal, index) => ({
      seq: batch.seq,
      index,
      key: eventKeyOf({ seq: batch.seq, index }),
      receivedAt: batch.receivedAt,
      treeId: batch.treeId,
      revision: batch.revision,
      audienceId: batch.audienceId,
      view: batch.view,
      signal,
    }))
    .sort(newerFirst)

/** Deliveries in any order, as events newest first. */
export const eventsOf = (batches: readonly ReceivedBatch[]): readonly ReaderEvent[] =>
  batches.flatMap(eventsOfBatch).sort(newerFirst)

/**
 * What the list is narrowed to, read off the address. A value that does not
 * parse narrows nothing, so a mangled link shows every event rather than none.
 */
export type EventFilter = {
  readonly kind: ReaderSignalKind | undefined
  readonly page: TreeId | undefined
  readonly view: string | undefined
  /** Words to find in the part or the page, as {@link searchOf} keeps them. */
  readonly search: string | undefined
  /**
   * The segment whose readers' events these are (0371 clause 6): the deliveries
   * the site filed under its `aud_` id. The picker sits above both tabs, so the
   * list narrows with the figures over it.
   */
  readonly segment: SegmentWord | undefined
}

/** Longer than any part's name a person would type, short enough to keep an address readable. */
export const SEARCH_LENGTH = 80

/**
 * The search as typed, with its spacing tidied and cut to
 * {@link SEARCH_LENGTH}; nothing to search for when nothing is left.
 */
export const searchOf = (typed: string | undefined): string | undefined => {
  const tidied = typed?.trim().replace(/\s+/gu, " ").slice(0, SEARCH_LENGTH).trim()

  return tidied === undefined || tidied === "" ? undefined : tidied
}

/**
 * Whether every word searched for is somewhere in the part or the page: its
 * name, its id, or the kind of part it is. The words a person sees on a row
 * are what they can find it by, the ids included, because an id is what they
 * paste from a log line. Case does not matter, and the order of the words
 * does not either.
 */
export const matchesSearch =
  (search: string, naming: Naming) =>
  (event: ReaderEvent): boolean => {
    const { treeId, signal } = event
    const said = [
      naming.page(treeId),
      treeId,
      naming.part(treeId, signal.nodeId),
      signal.nodeId,
      partKindOf(signal),
    ]
      .filter((each) => each !== undefined)
      .join(" ")
      .toLocaleLowerCase("en-GB")

    return search
      .toLocaleLowerCase("en-GB")
      .split(" ")
      .every((word) => said.includes(word))
  }

/**
 * How often a live list reads again: the five seconds a page's broadcast
 * waits before it sends what it saw, so a reading rarely finds nothing new
 * and a new event is never more than two of these behind.
 */
export const LIVE_EVERY_MS = 5_000

/** The one value `live` takes in an address; any other leaves the list still. */
export const LIVE_ON = "on"

/**
 * The filter, whether the list is live and the range the figures above it
 * are read over: what every link on the screen carries, so moving between
 * kinds, pages and searches keeps both.
 *
 * **Live is the newest page only.** It reads again every
 * {@link LIVE_EVERY_MS}, and a list that started further back would either
 * never change or jump to the top under the reader, so an address with a
 * cursor is never live, however it was written.
 */
export type EventView = EventFilter & {
  readonly live: boolean
  readonly range: SignalsRange
}

export type EventQuery = EventView & {
  readonly place: EventPlace | undefined
  readonly open: EventPosition | undefined
}

const parsedOr = <T>(schema: z.ZodType<T>, value: string | undefined): T | undefined => {
  const parsed = schema.safeParse(value)

  return parsed.success ? parsed.data : undefined
}

export const eventQueryOf = (
  query: Readonly<Record<string, string | readonly string[] | undefined>>
): EventQuery => {
  const one = (key: string): string | undefined => {
    const value = query[key]

    return typeof value === "string" ? value : undefined
  }

  const placed = (towards: EventPlace["towards"]): EventPlace | undefined => {
    const from = parseEventKey(one(PLACE_PARAM[towards]))

    return from === undefined ? undefined : { towards, from }
  }
  /** A mangled address naming both ways reads the older one. */
  const place = placed("older") ?? placed("newer")

  return {
    kind: parsedOr(readerSignalKindSchema, one("kind")),
    page: parsedOr(treeIdSchema, one("on")),
    view: parsedOr(viewKeySchema, one("view")),
    search: searchOf(one("q")),
    segment: segmentAsked(one(SEGMENT_PARAM)),
    live: one("live") === LIVE_ON && place === undefined,
    range: rangeOf(one("range")),
    place,
    open: parseEventKey(one("event")),
  }
}

/** The search needs the site's words for its parts and pages, which only `naming` has. */
export const matchesFilter =
  ({ kind, page, view, search, segment }: EventFilter, naming: Naming) =>
  (event: ReaderEvent): boolean =>
    (kind === undefined || event.signal.kind === kind) &&
    (segment === undefined || event.audienceId === `aud_${segment}`) &&
    (page === undefined || event.treeId === page) &&
    (view === undefined || event.view === view) &&
    (search === undefined || matchesSearch(search, naming)(event))

/**
 * An address on the Events screen, keeping the filter, whether it is live and
 * the range, and naming what changes. Live is dropped where a cursor is named, as
 * {@link EventView} says.
 */
export const eventsHref = (
  base: string,
  view: EventView,
  more: { readonly place?: EventPlace | undefined; readonly event?: string | undefined } = {}
): string => {
  const { place } = more
  const query = new URLSearchParams(
    Object.entries({
      kind: view.kind,
      on: view.page,
      view: view.view,
      q: view.search,
      range: rangeParam(view.range),
      [SEGMENT_PARAM]: view.segment,
      live: view.live && place === undefined ? LIVE_ON : undefined,
      ...(place === undefined ? {} : { [PLACE_PARAM[place.towards]]: eventKeyOf(place.from) }),
      event: more.event,
    }).flatMap(([key, value]) => (value === undefined ? [] : [[key, value]]))
  ).toString()

  return query === "" ? base : `${base}?${query}`
}

/**
 * One page of the list, newest first, and where the pages either side of it
 * start: *Older* reads below `older`, *Newer* above `newer`. `newer` is
 * `undefined` only on the newest page, and `older` where nothing older is kept.
 *
 * `searched` is set when the reading stopped at its budget before it had
 * fifty matching events: the list then holds what it found among the
 * deliveries received between the place it started from and that moment, and
 * the way it was reading carries on from there. Without it, a narrow filter
 * over a busy window would read as *nothing older* when the truth is *not
 * looked at yet*.
 */
export type EventPage = {
  readonly events: readonly ReaderEvent[]
  readonly older: EventPosition | undefined
  readonly newer: EventPosition | undefined
  readonly searched: { readonly towards: EventPlace["towards"]; readonly to: string } | undefined
}

/** A person's word for each part of the page, by the page's published version. */
export type Naming = {
  readonly page: (treeId: string) => string | undefined
  readonly part: (treeId: string, nodeId: string) => string | undefined
}

export const namingOf = (published: readonly PublishedPage[]): Naming => {
  const trees = new Map(published.map(({ tree }) => [tree.treeId as string, tree] as const))
  const parts = new Map(
    [...trees.entries()].map(([treeId, tree]) => [treeId, namesInTree(tree)] as const)
  )

  return {
    page: (treeId) => {
      const tree = trees.get(treeId)
      const name = tree === undefined ? undefined : pageNameOf(tree)

      return name?.derived === true ? name.name : undefined
    },
    part: (treeId, nodeId) => parts.get(treeId)?.get(nodeId)?.name,
  }
}

const seconds = (ms: number): string => {
  const value = Math.round(ms / 100) / 10

  return value === 1 ? "1 second" : `${value.toLocaleString("en-GB")} seconds`
}

/** *the button “Start”*, or the kind of part where the site has not published it. */
const partWord = (naming: Naming, event: ReaderEvent): string =>
  naming.part(event.treeId, event.signal.nodeId) ?? `a ${nounOf(event.signal.type)}`

/** What a dwell lasted, the one kind that has a length rather than a moment. */
export const lengthOf = (signal: ReaderSignal): string | undefined =>
  signal.kind === "dwelled" ? seconds(signal.ms) : undefined

/** *A reader pressed the button “Start” on Home.* */
export const eventSentence = (event: ReaderEvent, naming: Naming): string => {
  const page = naming.page(event.treeId) ?? "a page the site has not published to Loom"
  const part = partWord(naming, event)
  const { signal } = event

  switch (signal.kind) {
    case "viewed":
      return `A reader opened ${page}.`
    case "dwelled":
      return `A reader had ${part} on screen for ${seconds(signal.ms)} on ${page}.`
    case "activated":
      return `A reader pressed ${part} on ${page}.`
    case "disclosed":
      return `A reader ${signal.open ? "opened" : "closed"} ${part} on ${page}.`
    case "completed":
      return `A reader sent ${part} on ${page}.`
  }
}

/**
 * When it happened by the reader's browser, or, for a dwell, how long it
 * lasted: a stay has a length and no moment of its own.
 */
export type Happened = { readonly at: string } | { readonly lasted: string }

export const happenedOf = (signal: ReaderSignal): Happened =>
  signal.kind === "dwelled"
    ? { lasted: seconds(signal.ms) }
    : { at: new Date(signal.at).toISOString() }

/**
 * The goals this event counts toward, primary first as the list is handed in.
 *
 * The rule each goal's figure is read by (0350): the same kind, on the same
 * part, on a page the goal covers. *Opens it* counts an opening only, so a
 * reader closing the part counts toward nothing.
 */
export const goalsCountedBy = (event: ReaderEvent, goals: readonly Goal[]): readonly Goal[] =>
  goals.filter(
    (goal) =>
      goal.kind === event.signal.kind &&
      goal.nodeId === event.signal.nodeId &&
      (goal.pages === null || goal.pages.some((page) => page === event.treeId)) &&
      (event.signal.kind !== "disclosed" || event.signal.open)
  )

/**
 * The rest of an event's page view: every event sharing its `view` key, in the
 * order it happened, the event itself among them. The `view` key is the only
 * correlation there is (`docs/signals.md` rule 2), so an event whose site
 * named no page view has nothing to show here.
 */
export const pageViewOf = (
  event: ReaderEvent,
  around: readonly ReceivedBatch[]
): readonly ReaderEvent[] =>
  event.view === undefined
    ? []
    : [...eventsOf(around.filter((batch) => batch.view === event.view))].reverse()

/** The part's kind in a person's words, from the type the site's renderer gave it. */
export const partKindOf = (signal: ReaderSignal): string => nounOf(signal.type)

/**
 * The pages the page picker offers: every page a reader has opened and every
 * page the site published, by name where it has one, named pages first.
 */
export type EventPageChoice = { readonly treeId: string; readonly name: string | undefined }

export const eventPagesOf = (
  opened: readonly string[],
  published: readonly PublishedPage[],
  naming: Naming
): readonly EventPageChoice[] =>
  [...new Set([...opened, ...published.map(({ tree }) => tree.treeId as string)])]
    .map((treeId) => ({ treeId, name: naming.page(treeId) }))
    .sort(
      (a, b) =>
        Number(a.name === undefined) - Number(b.name === undefined) ||
        (a.name ?? a.treeId).localeCompare(b.name ?? b.treeId)
    )
