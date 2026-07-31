import type { TreeId } from "../ids.js"
import { clampLimit } from "../paging.js"
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
}

export type TelemetryReadRequest = {
  /** Absent reads every tree the handle can see, which is the scope rule 0020 set. */
  readonly treeId?: TreeId
  /** The previous page's `cursor`, passed back unread. */
  readonly cursor?: string
  readonly limit?: number
}

export type TelemetryPage = {
  readonly records: readonly RecordedTelemetry[]
  /** `null` when this was the last page. */
  readonly cursor: string | null
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
 * Reads a cursor back into the position it names. A cursor is opaque to the
 * caller, so one that is absent or unreadable means the same thing to every
 * implementation — start at the beginning — rather than one refusing what
 * another silently accepts.
 */
export const cursorSeq = (cursor: string | undefined): number | undefined => {
  if (cursor === undefined) return undefined

  const seq = Number(cursor)

  return Number.isFinite(seq) ? seq : undefined
}

/**
 * Two operations, and the asymmetry is deliberate: writes arrive in batches
 * because a request narrates several stages and should pay for one round trip
 * (0024), while reads are paged because a journal only grows.
 *
 * `record` takes a batch rather than a single record so that an implementation
 * can make the batch atomic. Half a request's narration is worse than none of
 * it: an episode missing its disposition reads as a change that was proposed
 * and never judged, which is a fault report rather than a gap.
 */
export interface TelemetryJournal {
  readonly record: (
    records: readonly TelemetryRecord[]
  ) => Promise<Result<void, TelemetryError>>
  readonly read: (
    request?: TelemetryReadRequest
  ) => Promise<Result<TelemetryPage, TelemetryError>>
}
