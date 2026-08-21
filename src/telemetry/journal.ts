import type { TreeId } from "../ids.js"
import { clampLimit, type PageDirection, type PageEnds } from "../paging.js"
import type { Result } from "../result.js"

import type { TelemetryRecord } from "./event.js"

/**
 * Where the narrated runtime goes to be read later.
 *
 * A journal is append-only and answers questions in the order things arrived.
 * It is not the truth about any tree — 0016 already settled that the revision
 * log is — and nothing downstream may reconstruct a tree from it. It is the
 * record of what was proposed, what the Gate decided, and what became of it,
 * including all the changes that never reached the log because they were
 * refused, held, or discarded.
 */

/**
 * The only way a journal fails. There is no `not-found`: reading a tree nothing
 * has been recorded about is an empty page, not an error, because a journal
 * makes no claim that a tree exists. There is no conflict either — appending an
 * observation cannot collide with another observation.
 */
export type TelemetryError = {
  readonly code: "unavailable"
  readonly detail: string
}

export const describeTelemetryError = (error: TelemetryError): string =>
  `telemetry is unavailable: ${error.detail}`

/**
 * A record as it comes back out, with the position the journal gave it.
 *
 * `seq` orders records by *arrival*, not by `occurredAt`. Those differ, and the
 * arrival order is the one worth exposing: clocks on two serverless instances
 * disagree by more than the gap between two events in the same request, so a
 * cursor built on a timestamp would skip or repeat rows. `seq` is opaque —
 * increasing, but not a count, not dense, and not comparable across journals.
 */
export type RecordedTelemetry = TelemetryRecord & {
  readonly seq: number
  /**
   * When the journal learned of the record, which is not `occurredAt`.
   *
   * Both are here because they answer different questions and only one of them
   * the journal can vouch for. `occurredAt` is what the host said, and a host
   * that sets it wrongly — a skewed serverless clock, a replayed batch — is
   * describing its own timeline. `recordedAt` is stamped on arrival, so it is
   * the only timestamp retention may be measured against: an age a writer can
   * choose is an age a writer can dodge.
   */
  readonly recordedAt: string
}

export type TelemetryReadRequest = {
  /** Absent reads every tree the handle can see, which is the scope rule (0020). */
  readonly treeId?: TreeId
  /** A cursor from a previous page's `older`/`newer`, passed back unread. */
  readonly cursor?: string
  /**
   * Default `newer`, which with no cursor is the oldest page. `older` with no
   * cursor is the newest page — the read a reader almost always wants first.
   */
  readonly direction?: PageDirection
  readonly limit?: number
}

export type TelemetryPage = PageEnds & {
  /**
   * Always ascending by `seq`, whichever end the page was taken from.
   *
   * The direction is a property of *which* records a page contains, never of
   * the order they arrive in. `episodesOf` folds a stream in arrival order, and
   * a page that sometimes came back reversed would make every consumer
   * responsible for knowing which — and silently wrong when it guessed.
   */
  readonly records: readonly RecordedTelemetry[]
}

/**
 * Larger than a tree listing's, because these are read to be folded rather than
 * shown: an episode spans a dozen or so records, so a page of 200 is a handful
 * of episodes and a page of 50 would routinely split one across a boundary.
 */
export const DEFAULT_TELEMETRY_LIMIT = 200
export const MAX_TELEMETRY_LIMIT = 1000

export const clampTelemetryLimit = (limit: number | undefined): number =>
  clampLimit(limit, { fallback: DEFAULT_TELEMETRY_LIMIT, max: MAX_TELEMETRY_LIMIT })

/**
 * What a journal is asked to forget, expressed as a position rather than a rule.
 *
 * Every record below `before` goes; nothing else is touched. A journal is not
 * told about ages, policies, or episodes — deciding *what* may be forgotten is
 * `retention.ts`'s job, and it makes that decision by reading the journal
 * through the same paged contract everyone else uses. This half only knows how
 * to drop a prefix, which is why both implementations of it fit in four lines
 * and cannot disagree about anything more interesting than that.
 */
export type ForgetRequest = {
  readonly before: number
}

export type ForgetOutcome = {
  readonly removed: number
}

/**
 * Three operations, and the asymmetry is deliberate: writes arrive in batches
 * because a request narrates several stages and should pay for one round trip
 * (0024), while reads are paged because a journal only grows.
 *
 * `record` takes a batch rather than a single record so that an implementation
 * can make the batch atomic. Half a request's narration is worse than none of
 * it: an episode missing its disposition reads as a change that was proposed
 * and never judged, which is a fault report rather than a gap.
 *
 * `forget` is the only destructive operation anywhere in Loom's storage, and it
 * is on the journal rather than the store for the reason 0016 gives: telemetry
 * is narrowed from a log that keeps the truth, so forgetting it loses history
 * and never loses a tree.
 */
export interface TelemetryJournal {
  readonly record: (
    records: readonly TelemetryRecord[]
  ) => Promise<Result<void, TelemetryError>>
  readonly read: (
    request?: TelemetryReadRequest
  ) => Promise<Result<TelemetryPage, TelemetryError>>
  readonly forget: (
    request: ForgetRequest
  ) => Promise<Result<ForgetOutcome, TelemetryError>>
}
