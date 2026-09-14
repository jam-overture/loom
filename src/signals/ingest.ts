import { err, ok, type Result } from "../result.js"

import type { ReaderSignalJournal, ReaderSignalStoreError } from "./journal.js"
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
  input: unknown
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

  return ok({
    batches: batches.length,
    signals: batches.reduce((count, batch) => count + batch.signals.length, 0),
  })
}
