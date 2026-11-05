import type { AudienceId } from "../audience/audience.js"
import type { TreeId } from "../ids.js"
import { clampLimit, type PageDirection, type PageEnds } from "../paging.js"
import type { Result } from "../result.js"

import type { ReaderSignalBatch } from "./signal.js"

/**
 * Where deliveries wait to be rolled up, and then where they are kept.
 *
 * It was a **buffer, not an archive**, and until 5 November everything about it
 * followed from that: aggregates are the durable artefact (0146), and a raw
 * batch existed for as long as it took rollup to read it and no longer. That is
 * now two lifetimes rather than one
 * ([0351](../../decisions/0351-a-counted-delivery-is-kept-for-a-stated-window-rather-than-deleted-by-the-fold.md),
 * and the policy it serves,
 * [0349](../../decisions/0349-a-projects-reader-events-are-kept-thirty-days-by-default-and-the-tallies-stay-the-durable-record.md)):
 * a delivery is **counted** when it ripens and **deleted** when it is past the
 * window its deployment keeps events for, thirty days by default.
 *
 * **The aggregates are still the durable record.** Nothing read over all time
 * comes out of this table; what the kept window buys is that an operator can
 * look at individual deliveries for as long as it lasts, which is what
 * `docs/portal.md`'s *Events* tab is. Everything a counter answers, a counter
 * goes on answering after the row is gone.
 *
 * So there are two positions in this table rather than one, and they move
 * independently: {@link ReaderSignalJournal.counted} stamps the fold's
 * instant on a prefix, and {@link ReaderSignalJournal.forget} deletes one.
 * **Nothing may delete a row the fold has not stamped** — that rule lives in
 * `expire.ts`, which is the only caller that deletes.
 *
 * It is deliberately the same shape as `src/telemetry/journal.ts` — append,
 * page by an opaque cursor, forget a prefix — because a second paged log that
 * paged differently would be a second thing to learn and a second place for the
 * cursor rules to be subtly wrong. What it is not is the same *table*: a
 * journal holds what the runtime said about itself, and this holds what
 * browsers said about pages, and the two have different retention and different
 * volumes by two orders of magnitude. The fourth operation is where the two
 * shapes part company, and it is the retention rule that asked for it: a
 * telemetry episode is deleted by age alone, and a delivery may not be deleted
 * until it has been counted.
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
  /**
   * The audience it was **filed** under, which is resolved rather than
   * optional (0284).
   *
   * `audience` is what the sender said and may be absent; this is what the
   * buffer stored, and a stored row always names one — `aud_everyone` where the
   * sender named nothing. A fold reads this, so that a window holding two
   * audiences folds into two sets of counters rather than one.
   */
  readonly audienceId: AudienceId
  /**
   * When a fold counted this delivery into the counters, where one has (0351).
   *
   * Absent is *not yet counted*, which is what every row in the table used to
   * be: before the kept window existed a counted delivery was deleted in the
   * same operation, so there was no state to record. It is the only field on a
   * stored row that changes after it is written, and only one writer sets it.
   *
   * **It is the fold's own instant, not the row's age.** `receivedAt` is what
   * retention measures and this is what makes a row eligible for it — a
   * delivery is deleted when it is both past the kept window and stamped here,
   * never on one of the two (`expire.ts`).
   */
  readonly foldedAt?: string
}

export type ReaderSignalReadRequest = {
  /** Absent reads every tree the handle can see, which is the scope rule (0020). */
  readonly treeId?: TreeId
  /**
   * Narrow to rows the fold has counted, or to rows it has not.
   *
   * Absent reads both, which is what a surface listing deliveries wants and
   * what every caller wanted when a counted row did not outlive its fold.
   *
   * **`false` is the collection scan's read and the reason this exists.** The
   * scan runs from the oldest end looking for the oldest ripe delivery, and the
   * oldest end of a table that keeps deliveries for thirty days is thirty days
   * of rows that have already been counted. Without the filter, collection's
   * cost would grow with the kept window rather than with the window it folds
   * — and the kept window is the one a deployment is invited to lengthen.
   */
  readonly counted?: boolean
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
 * What the fold is asked to stamp, as a position and the instant to write.
 *
 * The same prefix shape {@link ForgetBefore} takes, because it replaces that
 * call in the one place a fold used to make it: counting and dropping were one
 * operation and are now counting and *marking*, which is the same operation
 * against a table that keeps the row (0351).
 *
 * The instant is the fold's, handed in rather than read from a clock here, for
 * the reason every other stored timestamp in this subsystem is handed in: a run
 * writes one instant across every row and every counter it touches, and a store
 * that read its own clock would stamp rows a run did not think it was stamping.
 */
export type CountedBefore = {
  readonly before: number
  readonly at: string
}

export type CountedOutcome = {
  /**
   * Rows this call stamped.
   *
   * Only rows that carried nothing: a row already stamped is left exactly as it
   * was, so a second run over the same prefix reports nought rather than moving
   * an instant that a reading has already been taken against. It is what makes
   * this operation safe to repeat, which matters because the run that makes it
   * is the run that has already made the counters durable.
   */
  readonly counted: number
}

/**
 * Four operations: the journal's three, and the stamp the kept window asked for.
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
  /**
   * Record that a fold counted every row below a position (0351).
   *
   * Idempotent by construction — it stamps only what carries nothing — because
   * the caller has already written the counters when it gets here, so the one
   * thing it must never do is make a retry worse than the failure.
   */
  readonly counted: (
    request: CountedBefore
  ) => Promise<Result<CountedOutcome, ReaderSignalStoreError>>
  readonly forget: (request: ForgetBefore) => Promise<Result<ForgetOutcome, ReaderSignalStoreError>>
}
