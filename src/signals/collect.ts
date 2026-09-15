import { z } from "zod"

import { clampLimit } from "../paging.js"
import { systemClock, type Clock } from "../runtime/events.js"

import type { ReaderSignalJournal, ReaderSignalStoreError, ReceivedBatch } from "./journal.js"
import { rollUp, type FunnelPair } from "./rollup.js"
import type { ReaderTallyStore } from "./tally.js"

/**
 * The one operation that empties the buffer.
 *
 * `journal.ts` can hold batches, `rollup.ts` can fold them and `tally.ts` can
 * keep what the fold produced — and until this module existed nothing joined
 * the three, so a deployment with signals switched on accumulated the largest
 * table it owns and counted none of it.
 *
 * **Counting and forgetting are one call, and that is the design rather than a
 * convenience.** A rollup reports *what this window added* (0147), so a batch
 * counted twice is counted twice forever: there is no idempotence to fall back
 * on and no way to notice afterwards, because the wrong number looks exactly
 * like a busy afternoon. The only defence that does not need durable bookkeeping
 * is for the set of batches rolled up and the set forgotten to be the same set,
 * decided once, in one place. That is this file, and it is why there is no
 * exported `applyReaderSignalRetention` beside it — a function that can forget
 * without counting is the data-loss bug, and one that can count without
 * forgetting is the double-count bug.
 *
 * Nothing schedules it, for the reason nothing schedules telemetry's retention
 * or `auditSnapshot`: when a deployment forgets is an operational choice, and a
 * framework that quietly deleted a host's data on a timer it chose would be
 * making it. A host calls this from a cron route, a deploy hook, or by hand.
 *
 * **One run at a time, and the caller is what makes that true.** Two runs over
 * the same ripe prefix both roll it up and both apply; applying is additive
 * (0147), so the counters double and the buffer empties once, leaving nothing
 * behind that could say what happened. Nothing here can prevent it — a journal
 * and a store are two handles with no shared transaction between them — so
 * serialising belongs to whatever schedules this. `apps/loom/scripts/
 * signals-collect.ts` does it with a Postgres advisory lock, which is the
 * cheapest thing that works for a cron that overruns its own interval.
 */

/**
 * The window is the age a batch reaches before it is counted and dropped, and
 * it is two arguments pulling opposite ways.
 *
 * **Longer is more accurate.** `views` and `reached` count distinct page views,
 * distinctness does not add up, and a page view whose batches straddle two
 * windows is counted in both — the over-count 0147 accepts. `tally.ts` already
 * states the remedy in its own words: *a deployment that wants the bound small
 * makes the rollup window long relative to a page view.* This is that number.
 *
 * **Shorter is more anonymous.** The raw window is the entire mechanism by
 * which a view key stops existing (0146). The key is opaque, random and
 * correlates nothing outside the buffer, but it correlates that, and the
 * argument for it rests on how briefly it lives.
 *
 * An hour is long against a page view and short against a day, which is why it
 * is the default rather than a constant: rule 5 of `docs/signals.md` makes the
 * number a deployment's.
 */
export const DEFAULT_READER_SIGNAL_WINDOW_MS = 60 * 60 * 1000

/**
 * A minute, and the floor is not a style choice.
 *
 * Under a minute every page view straddles a boundary, so `views` stops being
 * an approximation and becomes a count of flushes — a number about the network
 * rather than about readers. It also refuses the ordinary way a window is
 * written wrongly, which is a units mistake: `windowMs: 60` reads as an hour
 * and means a minute and a tenth of a second.
 */
export const MIN_READER_SIGNAL_WINDOW_MS = 60 * 1000

export const readerSignalWindowSchema = z.object({
  windowMs: z.number().int().min(MIN_READER_SIGNAL_WINDOW_MS),
})

export type ReaderSignalWindow = z.infer<typeof readerSignalWindowSchema>

/**
 * How much of the buffer one run will look at.
 *
 * Incremental for telemetry retention's reason: a first run against a buffer
 * nothing has ever drained does a bounded amount of work and the next run does
 * more, so the operation is safe to schedule without knowing how far behind it
 * is. `more` on the outcome is how a caller learns there was another run's
 * worth waiting.
 */
export const DEFAULT_COLLECTION_SCAN = 5_000
export const MAX_COLLECTION_SCAN = 50_000

/** Read in pages like every other log walk (0026), so memory is bounded by the page. */
const SCAN_PAGE = 500

export type CollectionRequest = {
  readonly windowMs?: number
  /**
   * The funnels this deployment asks about. Absent means none — a pair is a
   * question somebody wrote down, and rollup does not invent questions.
   *
   * A pair added later applies to windows collected after it, never to the ones
   * already folded, because the batches those answers came from are gone. That
   * is the price of aggregates being the durable artefact and it is worth
   * knowing before a deployment waits a day for a number it will not get.
   */
  readonly pairs?: readonly FunnelPair[]
  readonly clock?: Clock
  readonly scanLimit?: number
}

/**
 * What one run may take, as a pure function of batches and an instant.
 *
 * The cut is the **first** batch young enough to keep, not every old one: the
 * buffer forgets a prefix or nothing, exactly as the journals do, because a
 * hole would make `seq` — an opaque increasing position — start meaning
 * something a reader could misread. `receivedAt` is what it measures, never
 * `sentAt`, which is a number a page said.
 */
export type CollectionPlan = {
  /** Old enough to count, in ascending `seq`. */
  readonly ripe: readonly ReceivedBatch[]
  /** The position to forget below, once the counters are durable. `null` when nothing is ripe. */
  readonly before: number | null
  /** Seen by this scan and too young. A floor rather than a total — the scan stops at the first. */
  readonly waiting: number
}

export const collectionPlanOf = (
  scanned: readonly ReceivedBatch[],
  horizon: string
): CollectionPlan => {
  const ceiling = scanned.findIndex((batch) => batch.receivedAt >= horizon)
  const ripe = ceiling === -1 ? scanned : scanned.slice(0, ceiling)
  const last = ripe.at(-1)

  return {
    ripe,
    before: last === undefined ? null : last.seq + 1,
    waiting: scanned.length - ripe.length,
  }
}

export const horizonOf = (configured: ReaderSignalWindow, now: string): string | null => {
  const instant = Date.parse(now)

  return Number.isFinite(instant) ? new Date(instant - configured.windowMs).toISOString() : null
}

/** The half of the outcome a caller shows or logs, with nothing in it about a reader. */
export type CollectionSummary = {
  readonly counted: number
  readonly tallies: number
  readonly funnels: number
  /** Distinct page views the window held. */
  readonly views: number
  /**
   * Batches that carried no view key, whose occurrences counted and whose views
   * did not. A rate shown without saying which denominator it used is the
   * failure mode here, so the number travels with the run that produced it.
   */
  readonly uncorrelated: number
}

export type CollectionOutcome =
  | {
      readonly outcome: "collected"
      readonly summary: CollectionSummary
      /** Rows the buffer removed. Below `counted` only if something else pruned first. */
      readonly removed: number
      /** The scan filled its limit with ripe batches, so another run has work now. */
      readonly more: boolean
    }
  /** Nothing is old enough yet, which is the ordinary answer on a quiet deployment. */
  | { readonly outcome: "nothing-ripe"; readonly waiting: number }
  /**
   * The counters took the window and the buffer would not drop it.
   *
   * Its own outcome because it is the one state that gets worse if it is
   * ignored: the batches are durable in the counters and still in the buffer,
   * so the next run counts them again. An operator seeing this prunes below the
   * reported position by hand, or fixes the buffer before the next run.
   */
  | {
      readonly outcome: "counted-not-forgotten"
      readonly summary: CollectionSummary
      readonly before: number
      readonly error: ReaderSignalStoreError
    }
  /** The window was not usable. Nothing was read, counted or deleted. */
  | { readonly outcome: "refused"; readonly reason: string }
  /** Read or write failed before anything became durable. Nothing was deleted. */
  | { readonly outcome: "unavailable"; readonly error: ReaderSignalStoreError }

type Scan =
  | { readonly ok: true; readonly batches: readonly ReceivedBatch[]; readonly full: boolean }
  | { readonly ok: false; readonly error: ReaderSignalStoreError }

/**
 * The oldest end of the buffer, forward, stopping at the horizon.
 *
 * Every batch from the horizon on is too young to count, and `collectionPlanOf`
 * needs only the first of them to know where the ripe prefix ends — so reading
 * further would be reading the busiest part of the table to throw it away.
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

    if (page.value.batches.some((batch) => batch.receivedAt >= horizon)) {
      return { ok: true, batches: collected, full: false }
    }
    if (page.value.newer === null) return { ok: true, batches: collected, full: false }

    cursor = page.value.newer
  }

  return { ok: true, batches: collected, full: true }
}

/**
 * Count a window of the buffer into the durable counters, then drop it.
 *
 * The order is the safe one and the reverse is a data-loss bug that looks like
 * a feature working: aggregates first, the buffer second. What that leaves is
 * `counted-not-forgotten`, which is visible and recoverable — the opposite
 * order's failure is neither.
 */
export const collectReaderSignals = async (
  journal: ReaderSignalJournal,
  store: ReaderTallyStore,
  request: CollectionRequest = {}
): Promise<CollectionOutcome> => {
  /** Named for what it is rather than `window`, which is a global this package's sibling touches. */
  const configured = readerSignalWindowSchema.safeParse({
    windowMs: request.windowMs ?? DEFAULT_READER_SIGNAL_WINDOW_MS,
  })
  if (!configured.success) {
    return { outcome: "refused", reason: configured.error.issues[0]?.message ?? "invalid window" }
  }

  const now = (request.clock ?? systemClock).now()
  const horizon = horizonOf(configured.data, now)
  if (horizon === null) return { outcome: "refused", reason: `the clock read "${now}"` }

  const scanned = await scanFrom(
    journal,
    horizon,
    clampLimit(request.scanLimit, { fallback: DEFAULT_COLLECTION_SCAN, max: MAX_COLLECTION_SCAN })
  )
  if (!scanned.ok) return { outcome: "unavailable", error: scanned.error }

  const plan = collectionPlanOf(scanned.batches, horizon)
  if (plan.before === null) return { outcome: "nothing-ripe", waiting: plan.waiting }

  const rollup = rollUp(plan.ripe, { ...(request.pairs ? { pairs: request.pairs } : {}) })
  const summary: CollectionSummary = {
    counted: plan.ripe.length,
    tallies: rollup.tallies.length,
    funnels: rollup.funnels.length,
    views: rollup.views,
    uncorrelated: rollup.uncorrelated,
  }

  const applied = await store.apply(rollup, now)
  if (!applied.ok) return { outcome: "unavailable", error: applied.error }

  const forgotten = await journal.forget({ before: plan.before })
  if (!forgotten.ok) {
    return {
      outcome: "counted-not-forgotten",
      summary,
      before: plan.before,
      error: forgotten.error,
    }
  }

  return {
    outcome: "collected",
    summary,
    removed: forgotten.value.removed,
    more: scanned.full,
  }
}

const batches = (count: number): string => `${count} ${count === 1 ? "batch" : "batches"}`

const uncorrelated = (summary: CollectionSummary): string =>
  summary.uncorrelated === 0 ? "" : `, ${summary.uncorrelated} with no view key`

/** One line for an operator, because an outcome nobody can read is one nobody acts on. */
export const describeCollection = (outcome: CollectionOutcome): string => {
  switch (outcome.outcome) {
    case "collected":
      return `counted ${batches(outcome.summary.counted)} into ${outcome.summary.tallies} ${
        outcome.summary.tallies === 1 ? "tally" : "tallies"
      } over ${outcome.summary.views} ${outcome.summary.views === 1 ? "view" : "views"}${uncorrelated(
        outcome.summary
      )}, and forgot ${outcome.removed}${outcome.more ? " — more is waiting" : ""}`
    case "nothing-ripe":
      return `nothing old enough to count${
        outcome.waiting === 0 ? "" : `, ${batches(outcome.waiting)} waiting`
      }`
    case "counted-not-forgotten":
      return `counted ${batches(
        outcome.summary.counted
      )} and could not forget them, so the next run counts them again unless the buffer is pruned below ${
        outcome.before
      }: ${outcome.error.detail}`
    case "refused":
      return `collection refused: ${outcome.reason}`
    case "unavailable":
      return `collection could not run: ${outcome.error.detail}`
  }
}
