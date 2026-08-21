import { cursorPosition, pageEnds } from "../paging.js"
import { ok } from "../result.js"
import { systemClock, type Clock } from "../runtime/events.js"

import type { TelemetryRecord } from "./event.js"
import {
  clampTelemetryLimit,
  type ForgetOutcome,
  type RecordedTelemetry,
  type TelemetryJournal,
  type TelemetryPage,
  type TelemetryReadRequest,
} from "./journal.js"

/**
 * The telemetry journal that keeps its records in the process.
 *
 * It is the implementation the contract is written against, so what it does is
 * what a journal is expected to do.
 */

/**
 * A journal in memory: the reference implementation of the contract, and the
 * one `pnpm dev` runs on.
 *
 * Like the memory store, it is not a test double. The ordering it promises —
 * arrival order, stable across reads, paged by an opaque cursor — is what a SQL
 * implementation is checked against, and `journal-contract.ts` runs the same
 * suite over both so a disagreement is a test failure rather than a surprise in
 * production.
 *
 * The clock is a parameter for the same reason it is one everywhere else: a
 * `recordedAt` this journal read off the wall clock would make every retention
 * test a race against real time.
 */
export const memoryTelemetryJournal = (clock: Clock = systemClock): TelemetryJournal => {
  let records: RecordedTelemetry[] = []
  let nextSeq = 1

  const positioned = (record: TelemetryRecord): RecordedTelemetry => ({
    ...record,
    seq: nextSeq++,
    recordedAt: clock.now(),
  })

  return {
    record: (batch) => {
      /**
       * Appended in one statement, so a reader can never see half a request's
       * narration — the atomicity the contract asks of every implementation.
       */
      records.push(...batch.map(positioned))

      return Promise.resolve(ok(undefined))
    },

    read: (request?: TelemetryReadRequest) => {
      const limit = clampTelemetryLimit(request?.limit)
      const from = cursorPosition(request?.cursor)
      const direction = request?.direction ?? "newer"

      const matching = records.filter(
        (record) =>
          (request?.treeId === undefined || record.treeId === request.treeId) &&
          (from === undefined || (direction === "older" ? record.seq < from : record.seq > from))
      )

      /**
       * `older` takes the page from the far end, which is a slice rather than a
       * reverse: the records that come back are still in arrival order, because
       * the contract says a page's order never depends on which end it came from.
       */
      const page = direction === "older" ? matching.slice(-limit) : matching.slice(0, limit)

      return Promise.resolve(
        ok<TelemetryPage>({
          records: page,
          ...pageEnds(page.map((record) => record.seq), direction, {
            beyond: matching.length > page.length,
            resumed: from !== undefined,
          }),
        })
      )
    },

    /**
     * `nextSeq` is deliberately not rewound. A forgotten position must never be
     * handed out again: a cursor a reader is holding across a prune would
     * otherwise resume in the middle of records it has already seen.
     */
    forget: ({ before }) => {
      const kept = records.filter((record) => record.seq >= before)
      const removed = records.length - kept.length
      records = kept

      return Promise.resolve(ok<ForgetOutcome>({ removed }))
    },
  }
}
