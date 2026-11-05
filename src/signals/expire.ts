import { z } from "zod"

import { clampLimit } from "../paging.js"
import { systemClock, type Clock } from "../runtime/events.js"

import type { ReaderSignalJournal, ReaderSignalStoreError, ReceivedBatch } from "./journal.js"

/**
 * The one operation that deletes a delivery.
 *
 * `collect.ts` used to be this as well: counting a ripe prefix and deleting it
 * were one call, because a delivery existed for as long as it took rollup to
 * read it and no longer (0146). On 5 November the maintainer settled that
 * individual reader events are **kept for thirty days by default**, so that an
 * operator can look at the deliveries behind a counter rather than only at the
 * counter ([0349](../../decisions/0349-a-projects-reader-events-are-kept-thirty-days-by-default-and-the-tallies-stay-the-durable-record.md)),
 * and the two halves of that one call became two operations with two windows
 * ([0351](../../decisions/0351-a-counted-delivery-is-kept-for-a-stated-window-rather-than-deleted-by-the-fold.md)).
 *
 * This is the second half. It deletes and counts nothing, exactly as
 * `collect.ts` counts and deletes nothing.
 *
 * ## The one rule, and it is not negotiable
 *
 * **Nothing is deleted that no fold has counted.** A delivery deleted before it
 * was counted is gone from the counters too, and the counters are the durable
 * record (0349) — a day of readers that nothing can reconstruct, because the
 * rows that would say what they did are the rows that were deleted. So the cut
 * is the lesser of two positions: the age the deployment keeps events for, and
 * the oldest delivery the fold has not stamped.
 *
 * That means a deployment whose collection cron has stopped **stops expiring**
 * rather than deleting uncounted deliveries, and says so
 * ({@link ExpiryStop}). It is the same sentence the fix-list makes one level
 * up — *while nothing is arriving, no reading is evidence* (0347) — about this
 * table: while nothing is counting, nothing may be deleted.
 *
 * ## What it is not
 *
 * Not a scheduler, for the reason `collect.ts` is not one: when a deployment
 * deletes is an operational choice, and a framework that quietly swept a host's
 * data on a timer it chose would be making it. A host calls this beside
 * {@link collectReaderSignals} from a cron route, a deploy hook or by hand —
 * **counting first**, so that one run's fold makes its own window expirable
 * rather than waiting for the next.
 *
 * Not idempotence-sensitive, which is the one way it is easier than collection.
 * Deleting a prefix twice removes it once; there is no additive counter behind
 * it and no `redelivered` to report. A run that deletes nothing is the ordinary
 * answer on a deployment inside its window.
 */

/**
 * Thirty days, the maintainer's number, and the default of a setting rather
 * than a constant (0349). Rule 5 of `docs/signals.md` is what makes it one.
 *
 * **It is longer than anything in this subsystem has been, and the cost is
 * stated rather than buried.** A delivery carries an opaque `view` key, which
 * is what correlates one page view's signals with each other and with nothing
 * else (0146). While a counted delivery was deleted within the hour, the
 * argument for that key rested partly on how briefly it lived; it now lives for
 * as long as this window. What has not changed is what the key *is* — random
 * per page view, derived from nothing about the reader, never sent back to a
 * browser, and correlating nothing across two page views — so a row thirty days
 * old identifies exactly nobody, which is the property the rule actually
 * depends on. What has changed is that the window in which one page view's
 * signals can be read together is thirty days rather than an hour, and 0349
 * decided it knowing that.
 *
 * Shorter is cheaper and keeps less: a deployment with heavy traffic states a
 * week and loses only the ability to inspect deliveries older than a week,
 * because the counters keep answering over all time. Longer is what rule 5 made
 * configurable in the first place.
 */
export const DEFAULT_READER_EVENT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

/**
 * A minute, which is the collection window's floor and is the same mistake.
 *
 * It is not that a shorter window is unsafe — the rule above makes any window
 * safe, because an uncounted delivery is never deleted whatever this says. It
 * is that the ordinary way a window is written wrongly is a units mistake:
 * `keptMs: 30` reads as thirty days and means thirty milliseconds, and a
 * deployment that typed it would publish *a delivery is gone within a second*
 * to every reader of its privacy page.
 */
export const MIN_READER_EVENT_RETENTION_MS = 60 * 1000

export const readerEventRetentionSchema = z.object({
  keptMs: z.number().int().min(MIN_READER_EVENT_RETENTION_MS),
})

export type ReaderEventRetention = z.infer<typeof readerEventRetentionSchema>

/** How much of the oldest end one run will look at, as collection bounds its own scan. */
export const DEFAULT_EXPIRY_SCAN = 5_000
export const MAX_EXPIRY_SCAN = 50_000

/** Read in pages like every other log walk (0026), so memory is bounded by the page. */
const SCAN_PAGE = 500

/**
 * Why the cut stopped where it did, which is the one fact an operator cannot
 * infer from a count of deleted rows.
 *
 * `uncounted` is the state worth a line in a log: nothing is wrong with this
 * table, the deployment's collection has stopped, and the reason deliveries are
 * piling up past the window its readers are told is that deleting them would
 * lose them from the counters. The remedy is the fold's, not retention's.
 */
export type ExpiryStop =
  /** The oldest delivery left is inside the kept window, which is the ordinary answer. */
  | "young"
  /** The oldest delivery left is past the window and no fold has counted it. */
  | "uncounted"
  /** The scan reached the end of what it read with everything expirable. */
  | "end"

/**
 * What one run may delete, as a pure function of rows and an instant.
 *
 * The cut is the **first** row that may not go, not every row that may: the
 * table forgets a prefix or nothing, exactly as the journals do, because a hole
 * would make `seq` — an opaque increasing position — start meaning something a
 * reader could misread.
 *
 * **Stopping at the first is also what makes an out-of-order arrival safe.**
 * `received_at` is a transaction's instant and `seq` is its position, so two
 * overlapping inserts can land with the pair inverted by milliseconds. A rule
 * that deleted every old row below the newest old row could then take a
 * delivery younger than the window; a rule that stops at the first row it may
 * not delete leaves that one and the rest of the prefix for the next run, which
 * costs one interval and cannot be wrong.
 */
export type ExpiryPlan = {
  /** The position to delete below. `null` where nothing may go. */
  readonly before: number | null
  /** Rows the scan read and left. A floor rather than a total — the scan stops at the first. */
  readonly waiting: number
  readonly stopped: ExpiryStop
}

/** Past the window **and** counted. Both, which is the rule at the top of this file. */
const expirable = (batch: ReceivedBatch, horizon: string): boolean =>
  batch.receivedAt < horizon && batch.foldedAt !== undefined

export const expiryPlanOf = (
  scanned: readonly ReceivedBatch[],
  horizon: string
): ExpiryPlan => {
  const ceiling = scanned.findIndex((batch) => !expirable(batch, horizon))
  const going = ceiling === -1 ? scanned : scanned.slice(0, ceiling)
  const held = ceiling === -1 ? undefined : scanned[ceiling]
  const last = going.at(-1)

  return {
    before: last === undefined ? null : last.seq + 1,
    waiting: scanned.length - going.length,
    stopped:
      held === undefined ? "end" : held.receivedAt < horizon ? "uncounted" : "young",
  }
}

/** The instant a delivery is old enough to go. `null` where the clock could not be read. */
export const keptHorizonOf = (configured: ReaderEventRetention, now: string): string | null => {
  const instant = Date.parse(now)

  return Number.isFinite(instant) ? new Date(instant - configured.keptMs).toISOString() : null
}

export type ExpiryOutcome =
  | {
      readonly outcome: "expired"
      readonly removed: number
      /**
       * How old the oldest delivery the scan read was, before anything was
       * deleted, in milliseconds at this run's instant.
       *
       * The evidence the published retention ceiling is judged against
       * ({@link retentionPromiseOf}) and the reason this figure is on the run
       * rather than left to a caller's clock: a surface that read the age
       * against its own `now` would publish a number nothing had measured.
       *
       * It is the oldest delivery **this run found**, including the ones it then
       * deleted, which is what the comparison wants. A healthy run finds a row
       * just past the kept window and the ceiling is that window plus one sweep,
       * so it reads as kept; a run on a deployment that has not swept for a week
       * finds a week.
       */
      readonly oldestMs: number
      readonly stopped: ExpiryStop
      /** The scan filled its limit with expirable rows, so another run has work now. */
      readonly more: boolean
    }
  /** Nothing in the table may go yet, which is the ordinary answer inside the window. */
  | {
      readonly outcome: "nothing-expired"
      readonly waiting: number
      /** `null` where the scan read no row at all — a table with nothing in it. */
      readonly oldestMs: number | null
      readonly stopped: ExpiryStop
    }
  /** The window was not usable. Nothing was read or deleted. */
  | { readonly outcome: "refused"; readonly reason: string }
  /** Read or delete failed. Where it was the delete, the prefix is still there. */
  | { readonly outcome: "unavailable"; readonly error: ReaderSignalStoreError }

export type ExpiryRequest = {
  readonly keptMs?: number
  readonly clock?: Clock
  readonly scanLimit?: number
}

type Scan =
  | { readonly ok: true; readonly batches: readonly ReceivedBatch[]; readonly full: boolean }
  | { readonly ok: false; readonly error: ReaderSignalStoreError }

/**
 * The oldest end of the table, forward, stopping at the first row that may not
 * go.
 *
 * Every row from there on is kept by this run, and `expiryPlanOf` needs only
 * the first of them to know where the prefix ends — so reading further would be
 * reading the kept window to throw it away.
 *
 * **Counted and uncounted together**, unlike collection's scan, because the
 * uncounted row is half of what this is looking for: a scan that filtered it
 * out would delete straight through the gap it exists to stop at.
 */
const scanFrom = async (
  journal: ReaderSignalJournal,
  horizon: string,
  scanLimit: number
): Promise<Scan> => {
  const collected: ReceivedBatch[] = []
  let cursor: string | null | undefined

  while (collected.length < scanLimit) {
    const page = await journal.read({
      direction: "newer",
      limit: Math.min(SCAN_PAGE, scanLimit - collected.length),
      ...(cursor ? { cursor } : {}),
    })
    if (!page.ok) return { ok: false, error: page.error }

    collected.push(...page.value.batches)

    if (page.value.batches.some((batch) => !expirable(batch, horizon))) {
      return { ok: true, batches: collected, full: false }
    }
    if (page.value.newer === null) return { ok: true, batches: collected, full: false }

    cursor = page.value.newer
  }

  return { ok: true, batches: collected, full: true }
}

/**
 * Delete the deliveries this deployment no longer keeps.
 *
 * Called beside {@link collectReaderSignals} and after it, so that a run's own
 * fold makes its own window expirable. Nothing here counts, writes a counter or
 * reads a tally: the counters already hold everything these rows said, which is
 * what makes deleting them safe and is the whole of 0349's second clause.
 */
export const expireReaderEvents = async (
  journal: ReaderSignalJournal,
  request: ExpiryRequest = {}
): Promise<ExpiryOutcome> => {
  const configured = readerEventRetentionSchema.safeParse({
    keptMs: request.keptMs ?? DEFAULT_READER_EVENT_RETENTION_MS,
  })
  if (!configured.success) {
    return { outcome: "refused", reason: configured.error.issues[0]?.message ?? "invalid window" }
  }

  const now = (request.clock ?? systemClock).now()
  const horizon = keptHorizonOf(configured.data, now)
  if (horizon === null) return { outcome: "refused", reason: `the clock read "${now}"` }

  const scanned = await scanFrom(
    journal,
    horizon,
    clampLimit(request.scanLimit, { fallback: DEFAULT_EXPIRY_SCAN, max: MAX_EXPIRY_SCAN })
  )
  if (!scanned.ok) return { outcome: "unavailable", error: scanned.error }

  const plan = expiryPlanOf(scanned.batches, horizon)
  const oldest = scanned.batches[0]

  /**
   * The age of the oldest row the scan read, which is the oldest row there is:
   * the scan runs from the oldest end. Absent only where it read nothing.
   */
  const oldestMs =
    oldest === undefined ? null : Date.parse(now) - Date.parse(oldest.receivedAt)

  if (plan.before === null) {
    return {
      outcome: "nothing-expired",
      waiting: plan.waiting,
      oldestMs,
      stopped: plan.stopped,
    }
  }

  const forgotten = await journal.forget({ before: plan.before })
  if (!forgotten.ok) return { outcome: "unavailable", error: forgotten.error }

  return {
    outcome: "expired",
    removed: forgotten.value.removed,
    /** A plan with a position has a first row, so the age is a number here. */
    oldestMs: oldestMs ?? Number.NaN,
    stopped: plan.stopped,
    more: scanned.full,
  }
}

const deliveries = (count: number): string =>
  `${count} ${count === 1 ? "delivery" : "deliveries"}`

/**
 * Said only where it changes what an operator should do, which is the one
 * state where the remedy is somebody else's: the fold's.
 */
const held = (stopped: ExpiryStop): string =>
  stopped === "uncounted"
    ? " — the next one is past the window and uncounted, so collection has stopped and nothing further may go"
    : ""

/** One line for an operator, because an outcome nobody can read is one nobody acts on. */
export const describeExpiry = (outcome: ExpiryOutcome): string => {
  switch (outcome.outcome) {
    case "expired":
      return `deleted ${deliveries(outcome.removed)}${held(outcome.stopped)}${
        outcome.more ? " — more is waiting" : ""
      }`
    case "nothing-expired":
      return outcome.oldestMs === null
        ? "nothing is kept, so nothing is old enough to delete"
        : `nothing is old enough to delete, ${deliveries(outcome.waiting)} kept and the oldest ${
            outcome.oldestMs
          }ms old${held(outcome.stopped)}`
    case "refused":
      return `expiry refused: ${outcome.reason}`
    case "unavailable":
      return `expiry could not run: ${outcome.error.detail}`
  }
}
