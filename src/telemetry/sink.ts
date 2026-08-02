import { ok, type Result } from "../result.js"
import type { EventSink, RuntimeEventEnvelope } from "../runtime/events.js"

import { recordOf, type TelemetryRecord } from "./event.js"
import type { TelemetryError, TelemetryJournal } from "./journal.js"

/**
 * The seam between a runtime narrating itself and a journal that outlives the
 * request (0024).
 *
 * Emission does no IO. It narrows the envelope and puts it in a list, which is
 * the only thing that satisfies `EventSink`'s standing promise that a sink can
 * never fail a change the Gate already accepted — an awaited write could refuse
 * one, and an un-awaited write on a serverless host is a promise the platform
 * cancels when the response ends. Writing happens once, at `flush`, at a point
 * the host chooses and can await.
 */

/**
 * A ceiling on what one collector will hold. A host that forgets to flush leaks
 * memory into the write path, and unbounded telemetry buffers are a worse
 * failure than lost telemetry — so the buffer refuses to grow past this and
 * says how much it dropped.
 */
export const MAX_BUFFERED_RECORDS = 1000

export type TelemetryCollector = {
  readonly sink: EventSink
  /** Not yet written. Exposed so a host can decide a flush is worth the round trip. */
  readonly pending: () => readonly TelemetryRecord[]
  /** Records this collector could not hold or could not write. */
  readonly dropped: () => number
  /**
   * Writes what has been collected and empties the buffer, whether or not the
   * write succeeded. Records are not retained for a retry: a journal that is
   * failing will fail the retry too, and a queue that grows while it drains
   * moves the outage into the write path.
   */
  readonly flush: () => Promise<Result<void, TelemetryError>>
}

export const collectTelemetry = (journal: TelemetryJournal): TelemetryCollector => {
  let buffered: TelemetryRecord[] = []
  let dropped = 0

  const emit = (envelope: RuntimeEventEnvelope): void => {
    if (buffered.length >= MAX_BUFFERED_RECORDS) {
      dropped += 1

      return
    }

    try {
      buffered.push(recordOf(envelope))
    } catch {
      /**
       * `recordOf` is total over `RuntimeEvent`, so reaching here means a host
       * emitted something outside the union. That is a bug in the host, and it
       * must not become a failed change: it is counted and dropped.
       */
      dropped += 1
    }
  }

  return {
    sink: { emit },
    pending: () => buffered,
    dropped: () => dropped,
    flush: async () => {
      if (buffered.length === 0) return ok(undefined)

      const batch = buffered
      buffered = []

      const written = await journal.record(batch)
      if (!written.ok) dropped += batch.length

      return written
    },
  }
}
