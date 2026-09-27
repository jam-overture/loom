import {
  EPISODE_RESOLUTION_KINDS,
  TELEMETRY_EVENT_TYPES,
  intentIdOf,
  proposalIdOf,
  type EpisodeFold,
  type EpisodeResolutionKind,
  type EpisodeTally,
  type IntentEpisode,
  type RecordedTelemetry,
  type RetentionPlan,
} from "@jam-overture/loom/telemetry"
import type { IntentId } from "@jam-overture/loom"

/**
 * The sentences the page puts around the runtime's numbers.
 *
 * Nothing here counts anything the runtime already counted — the tally, the
 * plan and the fold arrive computed, and this module decides only what a reader
 * is told they mean and in what order. It is separate from the components so
 * the wording can be held by a test without mounting React, which is the same
 * split `faults.ts` and `interpretation-faults.tsx` already use.
 */

/**
 * What each ending means, in a sentence a person could repeat.
 *
 * A `Record` keyed by `EpisodeResolutionKind` rather than a list, so an ending
 * added to the runtime is a **type error here** rather than a row quietly
 * missing from a page that claims to show every one. The same guard the write
 * page uses on `WriteOutcome`, for the same reason.
 */
const ENDING_MEANING: Record<EpisodeResolutionKind, string> = {
  committed: "The change was allowed and is in the page's history. This is the only ending that changed anything.",
  refused: "The Gate said no. Nothing was applied, and this journal is the only place the attempt exists.",
  "awaiting-answer": "The Gate would not decide alone and put the change in front of a person. Nobody has answered yet.",
  discarded: "A person was asked, and said no.",
  "not-interpreted": "Nothing could be planned from the sentence. The Gate never saw a change, because there was not one.",
  "not-writable": "The ask named a revision the page has moved past. It was turned away before anything was planned.",
  failed: "Something broke on the way — a store, a hold, a commit. Not a verdict about the change.",
  open: "This window does not contain the ending. The ask is still running, or the page of records stops mid-story.",
}

export type EndingRow = {
  readonly kind: EpisodeResolutionKind
  readonly meaning: string
  readonly count: number
}

/**
 * Every ending in the runtime's own order, with this corpus's count against it.
 *
 * The order is `EPISODE_RESOLUTION_KINDS`, not frequency: a table that sorted
 * by count would reorder itself as the corpus changed, and a reader comparing
 * two deployments would be comparing rows in different places.
 */
export const endingRows = (tally: EpisodeTally): readonly EndingRow[] =>
  EPISODE_RESOLUTION_KINDS.map((kind) => ({
    kind,
    meaning: ENDING_MEANING[kind],
    count: tally.byResolution[kind],
  }))

/**
 * One line about a record, saying the thing the type alone does not.
 *
 * Deliberately not a rendering of the whole payload — that is what the printed
 * record above it is for. This is the column that makes a list of eleven
 * identifiers readable as a sequence of events.
 */
export const recordSummary = (record: RecordedTelemetry): string => {
  const { event } = record

  switch (event.type) {
    case "intent-received":
      return `${event.intent.origin} from ${event.intent.actor ?? "nobody named"}, against revision ${event.intent.baseRevision}`
    case "policy-resolved":
      return `judged under "${event.policyId}"`
    case "change-proposed":
      return `${event.proposal.delta.operations.length} operation, confidence ${event.proposal.provenance.confidence}, authored by the ${event.proposal.provenance.authoredBy}`
    case "change-assessed":
      return `stakes ${event.assessment.stakes}, ${event.assessment.reversible ? "reversible" : "irreversible"}, touching ${event.assessment.touchedPrimitiveTypes.join(", ") || "nothing"}`
    case "disposition-decided":
      return `${event.disposition.kind} — ${event.disposition.reason.detail}`
    case "proposal-held":
      return "taken into custody, waiting for a person"
    case "hold-confirmed":
      return `allowed by ${event.actor ?? "nobody named"}`
    case "hold-discarded":
      return `refused by ${event.actor ?? "nobody named"}`
    case "change-applied":
      return `applied in memory at revision ${event.revision}`
    case "change-committed":
      return `written to the log at revision ${event.revision}`
    case "intent-not-writable":
      return `turned away — ${event.failure.detail}`
    case "interpretation-failed":
      return `no plan — ${event.failure.detail}`
    case "assessment-failed":
    case "application-failed":
    case "hold-failed":
    case "commit-failed":
    case "repair-failed":
      return `${event.failure.code} — ${event.failure.detail}`
    case "repair-requested":
      return `asked for something smaller — ${event.reason.detail}`
  }
}

export type EpisodeTrace = {
  readonly episode: IntentEpisode
  /** Every record the fold attributed to this one ask, in the order written. */
  readonly records: readonly RecordedTelemetry[]
}

const intentOfRecords = (
  records: readonly RecordedTelemetry[]
): ReadonlyMap<number, IntentId> => {
  const intentOfProposal = new Map<string, IntentId>()
  const bySeq = new Map<number, IntentId>()

  for (const { seq, event } of records) {
    const direct = intentIdOf(event)
    const proposalId = proposalIdOf(event)

    if (direct !== undefined && proposalId !== undefined) intentOfProposal.set(proposalId, direct)

    const intentId =
      direct ?? (proposalId === undefined ? undefined : intentOfProposal.get(proposalId))

    if (intentId !== undefined) bySeq.set(seq, intentId)
  }

  return bySeq
}

/**
 * The ask the page walks through, and the records behind it.
 *
 * The one that was **held and then confirmed**, chosen by asking rather than by
 * index: it is the only episode in the corpus whose records span two requests
 * and two people, so it is the only one where the difference between a record
 * and an episode is visible rather than asserted. A corpus that stopped
 * producing one is a thrown error rather than a page that quietly walks
 * through something simpler.
 */
export const traceEpisode = (
  fold: EpisodeFold,
  records: readonly RecordedTelemetry[]
): EpisodeTrace => {
  const episode = fold.episodes.find(
    (candidate) =>
      candidate.resolution.kind === "committed" &&
      candidate.proposals.some((proposal) => proposal.held && proposal.answer === "confirmed")
  )

  if (episode === undefined) {
    throw new Error("loom: the corpus has no ask that was held and then confirmed")
  }

  const bySeq = intentOfRecords(records)

  return {
    episode,
    records: records.filter((record) => bySeq.get(record.seq) === episode.intentId),
  }
}

export type RetentionRow = {
  readonly name: string
  readonly value: string
  readonly meaning: string
}

/**
 * The plan, as four numbers and what each one is telling a host.
 *
 * `keptBehind` gets the longest sentence because it is the only one that is a
 * *symptom*: records old enough and finished, held in the journal purely
 * because something older is unfinished. A host watching it grow has learned
 * that somebody never answered a hold.
 */
export const retentionRows = (
  plan: RetentionPlan,
  horizon: string
): readonly RetentionRow[] => [
  {
    name: "horizon",
    value: horizon.slice(0, 10),
    meaning: "the age the policy sets. Nothing recorded after this is a candidate, whatever else is true.",
  },
  {
    name: "forgets",
    value: String(plan.forgets),
    meaning: `records this run would drop, everything below position ${plan.before ?? 0}`,
  },
  {
    name: "keptUnsettled",
    value: String(plan.keptUnsettled),
    meaning: "old enough to go, kept because their own ask is still waiting on a person",
  },
  {
    name: "keptBehind",
    value: String(plan.keptBehind),
    meaning:
      "old enough to go and finished, kept only because the unsettled ask sits in front of them. Forgetting is a prefix, so this is the price of never cutting a story in half.",
  },
  {
    name: "unsettledEpisodes",
    value: String(plan.unsettledEpisodes),
    meaning: "asks inside the candidate window that nothing has settled",
  },
]

export type EventTypeCount = {
  /** Distinct event types this corpus produced. */
  readonly seen: number
  /** How many the runtime can write, from the list it publishes. */
  readonly total: number
}

/**
 * The denominator is `TELEMETRY_EVENT_TYPES`, which the runtime exports for
 * this.
 *
 * It used to be `telemetryEventSchema.options.length` — counting a Loom
 * vocabulary by reaching into the internal shape of a Zod schema, which works
 * until the schema is composed differently and then silently reports a smaller
 * number. That was filed as a finding from this page and the runtime answered
 * it with a list; asking the schema again would be leaving the hole open on
 * purpose.
 */
export const countedEventTypes = (records: readonly RecordedTelemetry[]): EventTypeCount => ({
  seen: new Set(records.map((record) => record.event.type)).size,
  total: TELEMETRY_EVENT_TYPES.length,
})
