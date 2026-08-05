import { z } from "zod"

import type { IntentId, ProposalId } from "../ids.js"
import { clampLimit } from "../paging.js"
import { systemClock, type Clock } from "../runtime/events.js"

import { episodesOf, type EpisodeResolutionKind } from "./episode.js"
import { intentIdOf, proposalIdOf } from "./event.js"
import type { RecordedTelemetry, TelemetryError, TelemetryJournal } from "./journal.js"

/**
 * How a journal is allowed to forget.
 *
 * 0016 made the revision log the truth and 0023 made telemetry a narrowing of a
 * stream the log already holds, and together those are what make this safe to
 * build at all: forgetting telemetry loses the account of what was proposed and
 * judged, and cannot lose a tree, a revision, or a held proposal. That is why
 * retention exists here and nowhere near `src/store/`.
 *
 * Two rules shape everything below.
 *
 * **Forgetting is a prefix.** A journal drops its oldest records or none; it
 * never punches holes. A hole would make `seq` — an opaque increasing position,
 * never a count — start meaning something a reader could misread, and it would
 * make "is this window complete" unanswerable.
 *
 * **An episode is never cut in half.** A window that kept a commit but forgot
 * the proposal it committed reads as a change nobody proposed. `episodesOf`
 * already reports records it cannot attribute, so the damage would be visible —
 * but a journal that manufactures the exact fault its own fold exists to detect
 * is not a journal anyone should trust.
 */

/**
 * The floor is not a style choice. A policy of zero would empty the journal on
 * the next run, and the most likely way to write one is a units mistake — days
 * where milliseconds were wanted. An hour is short enough to never obstruct a
 * host that means it and long enough that `maxAgeMs: 7` is refused rather than
 * obeyed.
 */
export const MIN_RETENTION_MS = 60 * 60 * 1000

export const retentionPolicySchema = z.object({
  maxAgeMs: z.number().int().min(MIN_RETENTION_MS),
})

export type RetentionPolicy = z.infer<typeof retentionPolicySchema>

/**
 * How much of the journal one run will look at.
 *
 * Retention is incremental on purpose: a first run against a journal that has
 * never been pruned forgets a bounded chunk, and the next run forgets more.
 * That keeps the operation's cost predictable — an unbounded scan to fix an
 * unbounded journal is the problem restated — and it makes the operation safe
 * to run on a schedule without knowing how far behind it is.
 */
export const DEFAULT_RETENTION_SCAN = 5_000
export const MAX_RETENTION_SCAN = 50_000

/** Read in pages like every other log walk (0026), so memory is bounded by the page. */
const SCAN_PAGE = 500

/**
 * Resolutions that mean the window may not have seen the end of the story.
 *
 * `awaiting-answer` is a proposal the Gate held: someone may confirm it
 * tomorrow, and forgetting how it came to be held would leave that answer
 * hanging off nothing. `open` is the fold saying it cannot tell — a window that
 * stops mid-episode, which is exactly what a horizon cutting through one looks
 * like. Every other resolution is an ending, and an ended episode gains no
 * further records.
 */
const UNSETTLED: readonly EpisodeResolutionKind[] = ["awaiting-answer", "open"]

export type RetentionPlan = {
  /**
   * Forget every record below this position. `null` when nothing may go yet —
   * either the journal holds nothing old enough, or the oldest thing in it is
   * an episode still waiting on someone.
   */
  readonly before: number | null
  readonly forgets: number
  /** Older than the horizon, kept because their own episode is unsettled. */
  readonly keptUnsettled: number
  /**
   * Older than the horizon and settled, kept only because an unsettled episode
   * sits in front of them. Reported separately because it is the price of the
   * prefix rule, and a host watching this number stay large has learned that
   * something very old is still waiting on an answer.
   */
  readonly keptBehind: number
  readonly unsettledEpisodes: number
}

const EMPTY_PLAN: RetentionPlan = {
  before: null,
  forgets: 0,
  keptUnsettled: 0,
  keptBehind: 0,
  unsettledEpisodes: 0,
}

export const horizonOf = (policy: RetentionPolicy, now: string): string | null => {
  const instant = Date.parse(now)

  return Number.isFinite(instant) ? new Date(instant - policy.maxAgeMs).toISOString() : null
}

/**
 * The episode each record belongs to, built in one forward pass.
 *
 * An event names its intent directly or names a proposal, and a proposal names
 * its intent on the record that created it — so a forward walk can resolve
 * every record, and the ones it cannot are the records `episodesOf` calls
 * unattributed. Both readings come from `event.ts` rather than being derived
 * again here: two implementations of "which episode is this" would eventually
 * disagree, and the disagreement would be a journal that forgot half a story.
 */
const intentsByRecord = (records: readonly RecordedTelemetry[]): ReadonlyMap<number, IntentId> => {
  const intentOfProposal = new Map<ProposalId, IntentId>()
  const byRecord = new Map<number, IntentId>()

  for (const { seq, event } of records) {
    const direct = intentIdOf(event)
    const proposalId = proposalIdOf(event)

    if (direct !== undefined && proposalId !== undefined) intentOfProposal.set(proposalId, direct)

    const intentId = direct ?? (proposalId === undefined ? undefined : intentOfProposal.get(proposalId))
    if (intentId !== undefined) byRecord.set(seq, intentId)
  }

  return byRecord
}

/**
 * What may be forgotten, as a pure function of records and an instant.
 *
 * Takes the journal from its oldest record forward, in arrival order. It finds
 * its own ceiling rather than trusting the caller to have filtered: the first
 * record at or after the horizon ends the candidate window, and everything from
 * there on is young enough to keep regardless. Doing that here means the whole
 * decision is testable against a list of records, with no journal, no clock and
 * no paging in the way.
 *
 * A record whose episode this window never saw begin is forgettable. The window
 * starts at the journal's oldest record, so nothing earlier exists to attribute
 * it to — it is already an orphan, and keeping it only preserves the orphan.
 */
export const retentionPlanOf = (
  records: readonly RecordedTelemetry[],
  horizon: string
): RetentionPlan => {
  const ceiling = records.findIndex((record) => record.recordedAt >= horizon)
  const candidates = ceiling === -1 ? records : records.slice(0, ceiling)
  if (candidates.length === 0) return EMPTY_PLAN

  const byRecord = intentsByRecord(candidates)
  const unsettled = new Set(
    episodesOf(candidates)
      .episodes.filter((episode) => UNSETTLED.includes(episode.resolution.kind))
      .map((episode) => episode.intentId)
  )

  const isUnsettled = (record: RecordedTelemetry): boolean => {
    const intentId = byRecord.get(record.seq)

    return intentId !== undefined && unsettled.has(intentId)
  }

  /**
   * The lowest position an unsettled episode reaches. Everything below it is
   * both old enough and finished, so it is the highest cut the prefix rule
   * permits.
   */
  const firstKept = candidates.find(isUnsettled)?.seq
  const beyond = ceiling === -1 ? undefined : records[ceiling]?.seq
  const before = firstKept ?? beyond ?? (candidates.at(-1)?.seq ?? 0) + 1

  const forgets = candidates.filter((record) => record.seq < before).length
  const kept = candidates.filter((record) => record.seq >= before)

  return {
    before: forgets === 0 ? null : before,
    forgets,
    keptUnsettled: kept.filter(isUnsettled).length,
    keptBehind: kept.filter((record) => !isUnsettled(record)).length,
    unsettledEpisodes: unsettled.size,
  }
}

export type RetentionRequest = {
  readonly policy: RetentionPolicy
  readonly clock?: Clock
  readonly scanLimit?: number
}

/**
 * What a run did, in the shape of `SnapshotAudit`: an outcome a host can log,
 * show, or ignore, and never an exception. Nothing downstream depends on
 * retention having happened, so a run that could not read the journal is a
 * reported non-event rather than a fault anyone has to handle.
 */
export type RetentionOutcome =
  | { readonly outcome: "forgot"; readonly plan: RetentionPlan; readonly removed: number }
  | { readonly outcome: "nothing-to-forget"; readonly plan: RetentionPlan }
  /** The policy or the clock was not usable. Nothing was read and nothing was deleted. */
  | { readonly outcome: "refused"; readonly reason: string }
  | { readonly outcome: "unavailable"; readonly error: TelemetryError }

const scanFrom = async (
  journal: TelemetryJournal,
  horizon: string,
  scanLimit: number
): Promise<
  { readonly ok: true; readonly records: readonly RecordedTelemetry[] } | { readonly ok: false; readonly error: TelemetryError }
> => {
  const collected: RecordedTelemetry[] = []
  let cursor: string | null | undefined

  while (collected.length < scanLimit) {
    const page = await journal.read({
      direction: "newer",
      limit: Math.min(SCAN_PAGE, scanLimit - collected.length),
      ...(cursor ? { cursor } : {}),
    })
    if (!page.ok) return { ok: false, error: page.error }

    collected.push(...page.value.records)

    /**
     * Stops at the horizon rather than reading to the end of the journal. Every
     * record from here on is young enough to keep, and `retentionPlanOf` needs
     * only the first of them to know where the candidate window closes.
     */
    if (page.value.records.some((record) => record.recordedAt >= horizon)) break
    if (page.value.newer === null) break

    cursor = page.value.newer
  }

  return { ok: true, records: collected }
}

/**
 * Reads the oldest end of a journal, decides what may go, and drops it.
 *
 * The judgment is `retentionPlanOf`'s and the deletion is the journal's; this
 * only carries a decision from one to the other. That split is what lets the
 * rule be tested exhaustively against a list of records while the two storage
 * implementations are held to a contract that says nothing about episodes.
 *
 * Nothing schedules this. A host runs it — from a cron route, a deploy hook, or
 * by hand — for the same reason nothing schedules `auditSnapshot`: when to
 * forget is an operational choice, and a framework that quietly deleted a
 * host's history on a timer it chose would be making it.
 */
export const applyRetention = async (
  journal: TelemetryJournal,
  request: RetentionRequest
): Promise<RetentionOutcome> => {
  const policy = retentionPolicySchema.safeParse(request.policy)
  if (!policy.success) {
    return { outcome: "refused", reason: policy.error.issues[0]?.message ?? "invalid policy" }
  }

  const now = (request.clock ?? systemClock).now()
  const horizon = horizonOf(policy.data, now)
  if (horizon === null) return { outcome: "refused", reason: `the clock read "${now}"` }

  const scanned = await scanFrom(
    journal,
    horizon,
    clampLimit(request.scanLimit, { fallback: DEFAULT_RETENTION_SCAN, max: MAX_RETENTION_SCAN })
  )
  if (!scanned.ok) return { outcome: "unavailable", error: scanned.error }

  const plan = retentionPlanOf(scanned.records, horizon)
  if (plan.before === null) return { outcome: "nothing-to-forget", plan }

  const forgotten = await journal.forget({ before: plan.before })

  return forgotten.ok
    ? { outcome: "forgot", plan, removed: forgotten.value.removed }
    : { outcome: "unavailable", error: forgotten.error }
}

const describePlan = (plan: RetentionPlan): string =>
  plan.keptUnsettled + plan.keptBehind === 0
    ? ""
    : `, keeping ${plan.keptUnsettled + plan.keptBehind} older records for ${plan.unsettledEpisodes} unfinished ${
        plan.unsettledEpisodes === 1 ? "episode" : "episodes"
      }`

/** One line for an operator, because an outcome nobody can read is an outcome nobody acts on. */
export const describeRetention = (outcome: RetentionOutcome): string => {
  switch (outcome.outcome) {
    case "forgot":
      return `forgot ${outcome.removed} telemetry ${
        outcome.removed === 1 ? "record" : "records"
      }${describePlan(outcome.plan)}`
    case "nothing-to-forget":
      return `nothing to forget${describePlan(outcome.plan)}`
    case "refused":
      return `retention refused: ${outcome.reason}`
    case "unavailable":
      return `retention could not run: ${outcome.error.detail}`
  }
}
