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

/**
 * Which side of the cursor a page is taken from.
 *
 * A journal only grows, so the question asked of it most often is "what
 * happened recently" — and forward-only paging answers that by reading
 * everything that ever happened first. `older` starts at the newest record and
 * walks back, which is one query rather than a walk from the beginning.
 */
export type TelemetryDirection = "newer" | "older"

export type TelemetryReadRequest = {
  /** Absent reads every tree the handle can see, which is the scope rule 0020 set. */
  readonly treeId?: TreeId
  /** A cursor from a previous page's `older`/`newer`, passed back unread. */
  readonly cursor?: string
  /**
   * Default `newer`, which with no cursor is the oldest page. `older` with no
   * cursor is the newest page — the read a reader almost always wants first.
   */
  readonly direction?: TelemetryDirection
  readonly limit?: number
}

export type TelemetryPage = {
  /**
   * Always ascending by `seq`, whichever end the page was taken from.
   *
   * The direction is a property of *which* records a page contains, never of
   * the order they arrive in. `episodesOf` folds a stream in arrival order, and
   * a page that sometimes came back reversed would make every consumer
   * responsible for knowing which — and silently wrong when it guessed.
   */
  readonly records: readonly RecordedTelemetry[]
  /** Pass back with `direction: "older"`. `null` when this page reaches the oldest record. */
  readonly older: string | null
  /**
   * Pass back with `direction: "newer"`. `null` when this page reaches the
   * newest record *at the time of the read* — a journal that is still being
   * written to will have more a moment later.
   */
  readonly newer: string | null
}

/**
 * The cursors a page reports, given the records it holds and what the read
 * already knows about the ends.
 *
 * Shared by every implementation because "which ends does this page name" is a
 * property of the contract, not of a backend. `beyond` is what the limit+1
 * probe found on the side being paged toward; the far side is bounded by the
 * cursor the caller passed, since a position it named is a position records
 * exist at.
 */
export const pageCursors = (
  records: readonly RecordedTelemetry[],
  direction: TelemetryDirection,
  { beyond, resumed }: { readonly beyond: boolean; readonly resumed: boolean }
): Pick<TelemetryPage, "older" | "newer"> => {
  const first = records.at(0)
  const last = records.at(-1)

  if (first === undefined || last === undefined) return { older: null, newer: null }

  return direction === "older"
    ? {
        older: beyond ? String(first.seq) : null,
        newer: resumed ? String(last.seq) : null,
      }
    : {
        older: resumed ? String(first.seq) : null,
        newer: beyond ? String(last.seq) : null,
      }
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
 * implementation — start at the end the direction begins from — rather than one
 * refusing what another silently accepts.
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
