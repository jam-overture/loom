import { err, ok, type Result } from "../result.js"

import type { ReaderSignalJournal, ReaderSignalStoreError } from "./journal.js"
import { regionCountsOf, type ReaderRegion, type ReaderRegionStore } from "./region.js"
import { parseReaderSignalBatch, type ReaderSignalBatch, type ReaderSignalParseError } from "./signal.js"

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
   * Page views counted against a region, which is zero unless the caller said
   * where the delivery came from and the delivery opened a page view.
   */
  readonly regions: number
  /**
   * Why no region was counted, when a region store refused one.
   *
   * Present and the delivery still stands: the batch is already kept, and a
   * sender told to retry would deliver it twice, which is the one failure in
   * this subsystem that cannot be undone (0158). So a lost region count is a
   * counter that did not move, reported here rather than raised — the same
   * trade a sink makes when a browser refuses a beacon.
   */
  readonly regionError?: ReaderSignalStoreError
}

/**
 * Where a delivery came from, for a caller who can tell.
 *
 * The region is read from the request by whatever is serving this — the
 * framework has no request and no opinion about which header a platform
 * writes. What it owns is the counting: once per page view, against a bucket,
 * and never onto the batch that is about to be buffered.
 */
export type RegionIntake = {
  readonly store: ReaderRegionStore
  readonly region: ReaderRegion
  /** When, as an instant the counter is stamped with. The caller's clock, like every other. */
  readonly at: string
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
  where?: RegionIntake
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
   * After the buffer accepted it, never before. A region counted for a delivery
   * the journal then refused would be a reader who arrived from a country and
   * read nothing — every other counter about that page view is missing, and the
   * one number that is there is the one about where they were.
   */
  const counted = where === undefined ? [] : regionCountsOf(batches, where.region)
  const regions = counted.reduce((views, count) => views + count.views, 0)
  const kept = where === undefined || counted.length === 0 ? undefined : await where.store.count(counted, where.at)

  return ok({
    batches: batches.length,
    signals: batches.reduce((count, batch) => count + batch.signals.length, 0),
    ...(kept !== undefined && !kept.ok ? { regions: 0, regionError: kept.error } : { regions }),
  })
}
