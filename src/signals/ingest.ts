import { err, ok, type Result } from "../result.js"

import type { ReaderSignalJournal, ReaderSignalStoreError } from "./journal.js"
import { openingsOf } from "./page-views.js"
import { regionCountsOf, type ReaderRegion, type ReaderRegionStore } from "./region.js"
import { parseReaderSignalBatch, type ReaderSignalBatch, type ReaderSignalParseError } from "./signal.js"
import type { ReaderOpeningCounter } from "./tally.js"

/**
 * The doorway a browser's batches come through.
 *
 * A page is not a trusted author. Everything that arrives here is parsed before
 * it is kept — the shape, the kinds, the tree id's grammar, and the view key's
 * thirty-two characters of nothing — because the alternative is a database
 * column a visitor can write anything into, including the visitor id that 0146
 * exists to refuse.
 *
 * The route handler that serves this is a surface's, not the framework's. What
 * the framework owns is this function: unknown in, a counted outcome or a
 * typed refusal out, no throw either way.
 */

/**
 * How many batches one delivery may carry.
 *
 * A broadcaster sends one at a time, so anything above a handful is a retry
 * queue draining after an outage, and that is worth allowing. What it is not
 * worth is unbounded: the parse is the expensive part and an endpoint that will
 * parse as many batches as a body can hold is an endpoint that can be made to
 * spend a minute on one request.
 */
export const MAX_BATCHES_PER_DELIVERY = 50

export type IngestOutcome = {
  readonly batches: number
  readonly signals: number
  /**
   * Page views this delivery opened, which is what the exact counter moved by.
   *
   * Zero unless the caller keeps that counter and the delivery actually opened
   * something — most deliveries of a page view are the middle of one.
   */
  readonly opened: number
  /**
   * Page views counted against a region, which is zero unless the caller said
   * where the delivery came from and the delivery opened a page view.
   */
  readonly regions: number
  /**
   * Why a counter did not move, when a store refused it.
   *
   * Present and the delivery still stands: the batch is already kept, and a
   * sender told to retry would deliver it twice, which is the one failure in
   * this subsystem that cannot be undone (0158). So a lost count is a counter
   * that did not move, reported here rather than raised — the same trade a sink
   * makes when a browser refuses a beacon.
   */
  readonly openingError?: ReaderSignalStoreError
  readonly regionError?: ReaderSignalStoreError
}

/** Where a delivery came from, and the buckets to count it in. */
export type RegionCounter = {
  readonly store: ReaderRegionStore
  readonly region: ReaderRegion
}

/**
 * What this delivery is counted into, besides being buffered.
 *
 * Both of these are read from the request rather than from the batch — the
 * framework has no request and no opinion about which header a platform writes
 * — and both are counted once per page view rather than once per delivery. What
 * the framework owns is that arithmetic: against a counter, never onto the
 * batch that is about to be buffered.
 *
 * Absent means a caller that keeps neither, which is a supported deployment and
 * not a misconfigured one: a buffer and a rollup answer every question except
 * *how many readers* and *from where*.
 */
export type DoorCounters = {
  /** When, as an instant every counter this delivery moves is stamped with. The caller's clock. */
  readonly at: string
  /** Where the delivery came from. Absent on a deployment that does not count regions. */
  readonly region?: RegionCounter
  /**
   * How many page views began. No switch guards it where it is wired, because a
   * count of page views of a revision names nowhere and nobody — it is the
   * denominator everything else is a rate against.
   */
  readonly openings?: ReaderOpeningCounter
}

export type IngestError =
  | {
      readonly code: "invalid-delivery"
      /** Which batch of the delivery, so a sender with one bad batch can be told which. */
      readonly index: number
      readonly issues: ReaderSignalParseError["issues"]
    }
  | {
      readonly code: "too-many"
      readonly limit: number
      readonly given: number
    }
  | ReaderSignalStoreError

export const describeIngestError = (error: IngestError): string => {
  if (error.code === "too-many") {
    return `a delivery may carry ${error.limit} batches and this one carried ${error.given}`
  }

  if (error.code === "unavailable") return `reader signals are unavailable: ${error.detail}`

  const first = error.issues.at(0)

  return `batch ${error.index} is not a reader signal batch${first === undefined ? "" : `: ${first.path} ${first.message}`}`
}

/**
 * One batch or a list of them, because both are what senders send:
 * `navigator.sendBeacon` posts a single batch and a queue draining after an
 * outage posts what it has. Distinguishing them at the door costs one check and
 * saves every caller an envelope.
 */
const deliveryOf = (input: unknown): readonly unknown[] => (Array.isArray(input) ? input : [input])

/**
 * What one counter contributed to the outcome: the page views it moved by, or
 * why it did not move.
 *
 * A refused write reports nought rather than the number it would have added, so
 * a caller adding up what it was told is adding up what is actually stored.
 */
const moved = (
  counts: readonly { readonly views: number }[],
  kept: Result<void, ReaderSignalStoreError> | undefined
): { readonly views: number; readonly error?: ReaderSignalStoreError } =>
  kept !== undefined && !kept.ok
    ? { views: 0, error: kept.error }
    : { views: counts.reduce((total, count) => total + count.views, 0) }

/**
 * Parse a delivery and keep it.
 *
 * **Nothing is kept unless all of it parses.** A partial accept would mean a
 * sender's retry either duplicates what was taken or drops what was not, and
 * neither is something a browser can be asked to work out. It also means the
 * refusal is actionable: one index, one reason.
 */
export const ingestReaderSignals = async (
  journal: ReaderSignalJournal,
  input: unknown,
  counters?: DoorCounters
): Promise<Result<IngestOutcome, IngestError>> => {
  const delivery = deliveryOf(input)

  if (delivery.length > MAX_BATCHES_PER_DELIVERY) {
    return err({ code: "too-many", limit: MAX_BATCHES_PER_DELIVERY, given: delivery.length })
  }

  const batches: ReaderSignalBatch[] = []

  for (const [index, raw] of delivery.entries()) {
    const parsed = parseReaderSignalBatch(raw)
    if (!parsed.ok) return err({ code: "invalid-delivery", index, issues: parsed.error.issues })

    batches.push(parsed.value)
  }

  const received = await journal.receive(batches)
  if (!received.ok) return err(received.error)

  /**
   * After the buffer accepted it, never before. A page view counted for a
   * delivery the journal then refused would be a reader who arrived and read
   * nothing — every other counter about that page view is missing, and the only
   * numbers that moved are the two about them having turned up.
   *
   * **One walk for both counters.** The openings are found once and a region is
   * a stamp on them, so the two can never disagree about how many readers
   * arrived (`page-views.ts`).
   */
  const openings = counters === undefined ? [] : openingsOf(batches)
  const counting = counters?.openings === undefined ? [] : openings
  const counted = counters?.region === undefined ? [] : regionCountsOf(openings, counters.region.region)

  const openingsKept =
    counters?.openings === undefined || counting.length === 0
      ? undefined
      : await counters.openings.opened(counting, counters.at)
  const regionsKept =
    counters?.region === undefined || counted.length === 0
      ? undefined
      : await counters.region.store.count(counted, counters.at)

  const opened = moved(counting, openingsKept)
  const regions = moved(counted, regionsKept)

  return ok({
    batches: batches.length,
    signals: batches.reduce((count, batch) => count + batch.signals.length, 0),
    opened: opened.views,
    regions: regions.views,
    ...(opened.error === undefined ? {} : { openingError: opened.error }),
    ...(regions.error === undefined ? {} : { regionError: regions.error }),
  })
}
