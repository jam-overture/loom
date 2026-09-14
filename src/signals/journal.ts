import type { TreeId } from "../ids.js"
import { clampLimit, type PageDirection, type PageEnds } from "../paging.js"
import type { Result } from "../result.js"

import type { ReaderSignalBatch } from "./signal.js"

/**
 * Where batches wait to be rolled up.
 *
 * This is a **buffer, not an archive**, and everything about it follows from
 * that. Aggregates are the durable artefact (0146); raw batches exist for as
 * long as it takes rollup to read them and no longer. A deployment that kept
 * them would hold the largest table in its database in order to answer
 * questions that are all about counters.
 *
 * It is deliberately the same shape as `src/telemetry/journal.ts` — append,
 * page by an opaque cursor, forget a prefix — because a second paged log that
 * paged differently would be a second thing to learn and a second place for the
 * cursor rules to be subtly wrong. What it is not is the same *table*: a
 * journal holds what the runtime said about itself, and this holds what
 * browsers said about pages, and the two have different retention and different
 * volumes by two orders of magnitude.
 */

/**
 * The only way it fails. No `not-found` — reading a tree nothing has been
 * received about is an empty page, because a buffer makes no claim that a tree
 * exists. No conflict — receiving a batch cannot collide with another batch.
 */
export type ReaderSignalStoreError = {
  readonly code: "unavailable"
  readonly detail: string
}

export const describeReaderSignalStoreError = (error: ReaderSignalStoreError): string =>
  `reader signals are unavailable: ${error.detail}`

/**
 * A batch as it comes back out, with the position the buffer gave it.
 *
 * `seq` orders by arrival, not by `sentAt`. A browser's clock is not merely
 * skewed but attacker-controlled — `sentAt` is a number a page said — so it can
 * order nothing and can certainly not be what retention measures. `receivedAt`
 * is stamped here and is the only timestamp the buffer vouches for.
 */
export type ReceivedBatch = ReaderSignalBatch & {
  readonly seq: number
  readonly receivedAt: string
}

export type ReaderSignalReadRequest = {
  /** Absent reads every tree the handle can see, which is the scope rule (0020). */
  readonly treeId?: TreeId
  /** A cursor from a previous page's `older`/`newer`, passed back unread. */
  readonly cursor?: string
  /** Default `newer`, which with no cursor is the oldest page — where rollup starts. */
  readonly direction?: PageDirection
  readonly limit?: number
}

export type ReaderSignalPage = PageEnds & {
  /** Always ascending by `seq`, whichever end the page was taken from. */
  readonly batches: readonly ReceivedBatch[]
}

/**
 * Larger than a telemetry page, because these are read only to be folded and a
 * batch is small. Rollup walks the whole window, so the page size is purely how
 * much of it is in memory at once.
 */
export const DEFAULT_READER_SIGNAL_LIMIT = 500
export const MAX_READER_SIGNAL_LIMIT = 2000

export const clampReaderSignalLimit = (limit: number | undefined): number =>
  clampLimit(limit, { fallback: DEFAULT_READER_SIGNAL_LIMIT, max: MAX_READER_SIGNAL_LIMIT })

/**
 * What the buffer is asked to forget, as a position rather than a rule.
 *
 * Declared here rather than shared with telemetry's identical pair on purpose.
 * They are the same two fields today and they answer to different policies —
 * telemetry must not cut an episode in half, and this must not forget a batch
 * that has not been rolled up — so a shared type would be two subsystems
 * agreeing by coincidence and discovering it when one of them changes.
 */
export type ForgetBefore = {
  readonly before: number
}

export type ForgetOutcome = {
  readonly removed: number
}

/**
 * Three operations, mirroring the journal's.
 *
 * `receive` takes several batches because an ingestion endpoint may be handed
 * several and should pay for one round trip. Unlike a journal's, this batch has
 * no atomicity to protect — signals are independent observations and half of
 * them is a smaller sample rather than a broken story — but a single statement
 * is how both implementations write anyway.
 */
export interface ReaderSignalJournal {
  readonly receive: (
    batches: readonly ReaderSignalBatch[]
  ) => Promise<Result<void, ReaderSignalStoreError>>
  readonly read: (
    request?: ReaderSignalReadRequest
  ) => Promise<Result<ReaderSignalPage, ReaderSignalStoreError>>
  readonly forget: (request: ForgetBefore) => Promise<Result<ForgetOutcome, ReaderSignalStoreError>>
}
