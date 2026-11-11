import { z } from "zod"

import type { AudienceId } from "../audience/audience.js"
import { clampLimit } from "../paging.js"
import { systemClock, type Clock } from "../runtime/events.js"

import type { ReaderSignalJournal, ReaderSignalStoreError, ReceivedBatch } from "./journal.js"
import { rollUp, type FunnelPair } from "./rollup.js"
import type { ReaderTallyStore } from "./tally.js"

/**
 * The one operation that counts the buffer.
 *
 * `journal.ts` can hold batches, `rollup.ts` can fold them and `tally.ts` can
 * keep what the fold produced — and until this module existed nothing joined
 * the three, so a deployment with signals switched on accumulated the largest
 * table it owns and counted none of it.
 *
 * **Counting and recording that it happened are one call, and that is the
 * design rather than a convenience.** A rollup reports *what this window
 * added* (0147), so a batch counted twice is counted twice forever: there is no
 * idempotence to fall back on and no way to notice afterwards, because the
 * wrong number looks exactly like a busy afternoon. The only defence that does
 * not need durable bookkeeping is for the set of batches rolled up and the set
 * marked as counted to be the same set, decided once, in one place. That is
 * this file.
 *
 * **Until 5 November the mark was a delete** (0146), and the sentence above
 * said *forgotten* where it now says *marked*. A delivery is now kept for the
 * window its deployment states — thirty days by default, so that an operator
 * can look at individual deliveries rather than only at counters (0349) — and
 * deleted by a second sweep in `expire.ts`. What did not change is the thing
 * the invariant protects: this run decides one prefix, counts it, and records
 * that it counted it, and no other operation may touch that decision. What that
 * split buys is that the two failures are no longer the same failure. A sweep
 * that deletes without counting loses deliveries; this cannot delete at all.
 *
 * Nothing schedules it, for the reason nothing schedules telemetry's retention
 * or `auditSnapshot`: when a deployment counts is an operational choice, and a
 * framework that quietly swept a host's data on a timer it chose would be
 * making it. A host calls this from a cron route, a deploy hook, or by hand,
 * and calls {@link expireReaderEvents} from the same place.
 *
 * **One run at a time, and the caller is what makes that true.** Two runs over
 * the same ripe prefix both roll it up and both apply; applying is additive
 * (0147), so the counters double and the prefix is marked once, leaving nothing
 * behind that could say what happened. Nothing here can prevent it — a journal
 * and a store are two handles with no shared transaction between them — so
 * serialising belongs to whatever schedules this. `apps/loom/scripts/
 * signals-collect.ts` does it with a Postgres advisory lock, which is the
 * cheapest thing that works for a cron that overruns its own interval.
 */

/**
 * The window is the age a batch reaches before it is counted, and it is two
 * arguments pulling opposite ways.
 *
 * **Longer is more accurate.** `views` and `reached` count distinct page views,
 * distinctness does not add up, and a page view whose batches straddle two
 * windows is counted in both — the over-count 0147 accepts. `tally.ts` already
 * states the remedy in its own words: *a deployment that wants the bound small
 * makes the rollup window long relative to a page view.* This is that number.
 * A deployment no longer has to guess whether it chose well: each run adds its
 * window's page views to the counter the door counts arrivals into, so the
 * difference between the two is what this setting actually cost
 * (`page-views.ts`).
 *
 * **A run also writes down that it happened.** Applying a window stamps the
 * fold's own timestamp on each revision's door row, which is what lets a
 * deployment be told that nothing has folded for longer than its own schedule
 * allows — the openings waiting are otherwise indistinguishable from the
 * ordinary one-window lag this setting creates (0274).
 *
 * **Shorter is more anonymous — and since 5 November this is no longer the
 * window that governs that.** The view key stops existing when the row holding
 * it is deleted, and that is now the kept window rather than this one
 * (0349, 0351): a delivery is counted at this age and deleted at the age
 * `expire.ts` is given. This setting still decides how much over-count a
 * straddling page view causes, which is the accuracy argument above; what it no
 * longer decides is how long a page view's signals stay correlatable. That
 * number is `DEFAULT_READER_EVENT_RETENTION_MS` and the tension in it is
 * recorded rather than hidden.
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
  /**
   * Hourly rows this run wrote for what readers did (`acted.ts`).
   *
   * A slice of the tallies rather than a figure beside them: a window in which
   * nobody pressed, opened or sent anything writes none, however many tallies
   * it wrote, because the counter holds what readers *did* and a page being on
   * screen is not one of those.
   */
  readonly acted: number
  /** Distinct page views the window held. */
  readonly views: number
  /**
   * Batches that carried no view key, whose occurrences counted and whose views
   * did not. A rate shown without saying which denominator it used is the
   * failure mode here, so the number travels with the run that produced it.
   */
  readonly uncorrelated: number
  /**
   * Of the batches counted, how many were a repeat of one already folded in
   * this window and were therefore folded once (`rollup.ts`).
   *
   * A subset of `counted` rather than a number beside it: every one of them was
   * read from the buffer and is forgotten with the rest. Non-zero every run is
   * a sender retrying deliveries it already made, which is worth finding — and
   * the figure is in the run's outcome rather than in a stored row because a
   * fold's own numbers are not durable, only the counters it produced are.
   */
  readonly redelivered: number
  /**
   * How old the oldest **uncounted** delivery the scan found was, in
   * milliseconds, at the instant this run was taken.
   *
   * A fact about the buffer and about no reader, like every other figure here.
   * It is free: a scan runs from the oldest uncounted end, so the first batch
   * it read is the oldest one waiting, and this is one subtraction over it.
   *
   * **The run does the subtraction rather than the caller**, because the
   * caller's clock is not this run's: a surface that read the age against its
   * own `now` would publish a number nothing had measured.
   *
   * **It is the fold's lag, not the kept window** (0351). It was both while a
   * counted delivery was deleted in the same breath, which is why
   * `retentionPromiseOf` used to be handed this outcome; the ceiling readers
   * are promised is now about deletion, so that reading is handed the expiry
   * run's own figure and this one answers the question it still owns — how far
   * behind collection is.
   *
   * Never absent and always at least the ripeness window: a summary exists only
   * where something was ripe.
   */
  readonly oldestMs: number
}

export type CollectionOutcome =
  | {
      readonly outcome: "collected"
      readonly summary: CollectionSummary
      /**
       * Rows this run marked as counted.
       *
       * Below `counted` only where something had already marked them — which on
       * one run at a time is nothing, and is why a figure below the count is
       * worth seeing rather than a rounding difference.
       */
      readonly recorded: number
      /** The scan filled its limit with ripe batches, so another run has work now. */
      readonly more: boolean
    }
  /** Nothing is old enough yet, which is the ordinary answer on a quiet deployment. */
  | { readonly outcome: "nothing-ripe"; readonly waiting: number }
  /**
   * The counters took the window and the journal would not record it.
   *
   * Its own outcome because it is the one state that gets worse if it is
   * ignored: the batches are durable in the counters and still unmarked, so the
   * next run counts them again. An operator seeing this marks the prefix by
   * hand, or fixes the store before the next run — and must not reach for a
   * delete, which would lose the deliveries and leave the double-count.
   */
  | {
      readonly outcome: "counted-not-recorded"
      readonly summary: CollectionSummary
      readonly before: number
      readonly error: ReaderSignalStoreError
    }
  /** The window was not usable. Nothing was read, counted or marked. */
  | { readonly outcome: "refused"; readonly reason: string }
  /** Read or write failed before anything became durable. Nothing was marked. */
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
 *
 * **Uncounted rows only** (0351), which is what makes the oldest end of the
 * table the oldest *uncounted* delivery rather than the oldest kept one. Without
 * it this scan would read the whole kept window — thirty days by default — to
 * reach the handful of rows a run is for, and the cost of collecting would grow
 * with a setting that has nothing to do with collecting.
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
      counted: false,
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
 * Count a window of the buffer into the durable counters, then record that it
 * was counted.
 *
 * The order is the safe one and the reverse is a data-loss bug that looks like
 * a feature working: aggregates first, the mark second. What that leaves is
 * `counted-not-recorded`, which is visible and recoverable — the opposite
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

  /**
   * **One fold per audience, not one per window** (0284).
   *
   * A window holds whatever arrived in it, and once a deployment serves two
   * forms of a page that is two audiences' batches interleaved. Folding them
   * together would add two populations into one counter — the failure the
   * record behind this exists to prevent, and the one that cannot be undone
   * afterwards, because the rows that would say which form a reader saw are the
   * rows being summed.
   *
   * So the ripe batches are grouped by the audience they were filed under and
   * each group is folded on its own, then **all of them are written together**
   * (0316). `rollUp` stays audience-blind: it is handed one audience's batches
   * and knows nothing about the dimension, which is what keeps the fold a pure
   * function of a window.
   *
   * The summary adds up across audiences, because it describes the run rather
   * than any one population.
   */
  const byAudience = new Map<AudienceId, ReceivedBatch[]>()
  for (const batch of plan.ripe) {
    const group = byAudience.get(batch.audienceId)
    if (group === undefined) byAudience.set(batch.audienceId, [batch])
    else group.push(batch)
  }

  const folded = [...byAudience].map(([audience, batches]) => ({
    audience,
    rollup: rollUp(batches, { ...(request.pairs ? { pairs: request.pairs } : {}) }),
  }))

  /**
   * The oldest delivery in the buffer, which is the first batch the scan read:
   * it runs from the oldest end and the ripe prefix starts there.
   *
   * There is always one wherever a summary is built — `plan.before` is a
   * position taken off the last ripe batch, so a plan carrying one has a first
   * — and the unreachable branch is a parse of nothing rather than a nought on
   * purpose. A nought would say *a delivery that arrived this instant*, which
   * is the strongest answer the retention reading can give; a figure that is
   * not a number makes it answer that nothing here can say.
   */
  const oldest = plan.ripe[0]?.receivedAt ?? ""

  const summary: CollectionSummary = {
    counted: plan.ripe.length,
    oldestMs: Date.parse(now) - Date.parse(oldest),
    tallies: folded.reduce((total, { rollup }) => total + rollup.tallies.length, 0),
    acted: folded.reduce((total, { rollup }) => total + rollup.acted.length, 0),
    funnels: folded.reduce((total, { rollup }) => total + rollup.funnels.length, 0),
    views: folded.reduce((total, { rollup }) => total + rollup.views, 0),
    uncorrelated: folded.reduce((total, { rollup }) => total + rollup.uncorrelated, 0),
    redelivered: folded.reduce((total, { rollup }) => total + rollup.redelivered, 0),
  }

  /**
   * **One write for the whole window, every audience in it** (0316).
   *
   * One call per audience is what this was, and it had a state between the
   * calls that nothing could get out of: the audiences already applied were
   * durable, the rest were not, and the buffer still held the window — because
   * counting and forgetting are one operation, which is the invariant at the
   * top of this file. So the next run folded the same batches again and **added
   * the already-durable audiences a second time**, permanently (0158), on the
   * five of nine counters that are occurrences rather than distinct counts.
   * `unavailable` said *nothing became durable* while that was happening.
   *
   * It is one `applyWindow` now, so there is no state to get out of and the
   * sentence on `unavailable` is true again. Nothing is reported about it
   * because there is nothing left to report.
   */
  const applied = await store.applyWindow(
    folded.map(({ audience, rollup }) => ({
      audience,
      tallies: rollup.tallies,
      funnels: rollup.funnels,
      appearances: rollup.appearances,
      acted: rollup.acted,
    })),
    now
  )
  if (!applied.ok) return { outcome: "unavailable", error: applied.error }

  /**
   * The same instant the counters were written with, so one run leaves one
   * instant across both halves of what it did — and the instant a reading of
   * the fold's lag is taken against is the instant the fold actually happened.
   */
  const recorded = await journal.counted({ before: plan.before, at: now })
  if (!recorded.ok) {
    return {
      outcome: "counted-not-recorded",
      summary,
      before: plan.before,
      error: recorded.error,
    }
  }

  return {
    outcome: "collected",
    summary,
    recorded: recorded.value.counted,
    more: scanned.full,
  }
}

const batches = (count: number): string => `${count} ${count === 1 ? "batch" : "batches"}`

const uncorrelated = (summary: CollectionSummary): string =>
  summary.uncorrelated === 0 ? "" : `, ${summary.uncorrelated} with no view key`

/**
 * Said only when there were some, in the same clause-after-the-count shape
 * `uncorrelated` uses, because a line that always carries a nought trains an
 * operator to stop reading it.
 */
const redelivered = (summary: CollectionSummary): string =>
  summary.redelivered === 0 ? "" : `, ${summary.redelivered} delivered again and folded once`

/** One line for an operator, because an outcome nobody can read is one nobody acts on. */
export const describeCollection = (outcome: CollectionOutcome): string => {
  switch (outcome.outcome) {
    case "collected":
      return `counted ${batches(outcome.summary.counted)} into ${outcome.summary.tallies} ${
        outcome.summary.tallies === 1 ? "tally" : "tallies"
      } over ${outcome.summary.views} ${outcome.summary.views === 1 ? "view" : "views"}${uncorrelated(
        outcome.summary
      )}${redelivered(outcome.summary)}, and marked ${outcome.recorded} counted${
        outcome.more ? " — more is waiting" : ""
      }`
    case "nothing-ripe":
      return `nothing old enough to count${
        outcome.waiting === 0 ? "" : `, ${batches(outcome.waiting)} waiting`
      }`
    case "counted-not-recorded":
      return `counted ${batches(
        outcome.summary.counted
      )} and could not record it, so the next run counts them again unless they are marked counted below ${
        outcome.before
      }: ${outcome.error.detail}`
    case "refused":
      return `collection refused: ${outcome.reason}`
    case "unavailable":
      return `collection could not run: ${outcome.error.detail}`
  }
}
