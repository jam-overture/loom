import type { IntentId, ProposalId, TreeId } from "../ids.js"
import { assertNever } from "../result.js"
import type { Disposition } from "../runtime/disposition.js"
import type { Provenance } from "../runtime/proposal.js"
import type { TreeDelta } from "../tree/delta.js"

import type { AssessmentSummary, IntentSummary, TelemetryFailure } from "./event.js"
import type { RecordedTelemetry } from "./journal.js"

/**
 * The fold that turns a stream of records into what §6 was built to answer:
 * for each thing someone asked for, what the model proposed, what the Gate
 * decided, and what became of it.
 *
 * This is a derivation, not a second store. The journal is what is written;
 * episodes are computed from it on demand, the same relationship 0016 set
 * between the log and the snapshot. A stored episode table would be a second
 * copy of the same facts, and the two would eventually disagree — and the
 * disagreement would be silent, because nothing would be checking.
 *
 * It is a pure function of the records it is handed, which also means it is
 * honest about being partial: a page that begins after a proposal was made
 * cannot attribute that proposal's later events, so those records come back as
 * `unattributed` rather than being dropped.
 */

export type EpisodeAnswer = "confirmed" | "discarded"

export type FailureStage =
  | "interpretation"
  | "assessment"
  | "repair"
  | "application"
  | "custody"
  | "commit"

export type EpisodeFailure = TelemetryFailure & {
  readonly stage: FailureStage
}

export type ProposalEpisode = {
  readonly proposalId: ProposalId
  /** Set when this proposal replaced one the Gate refused (0006). */
  readonly repairOf?: ProposalId
  readonly provenance: Provenance
  readonly rationale: string
  readonly delta: TreeDelta
  readonly proposedAt: string
  readonly assessment?: AssessmentSummary
  readonly disposition?: Disposition
  /** The Gate held it and custody succeeded, so a human was asked. */
  readonly held: boolean
  /** A refusal that was handed back for one more attempt. */
  readonly repairRequested: boolean
  readonly answer?: EpisodeAnswer
  /** Applied in memory. Present without `committedRevision` means it did not persist. */
  readonly appliedRevision?: number
  readonly committedRevision?: number
  readonly failure?: EpisodeFailure
  readonly settledAt?: string
}

export type EpisodeResolution =
  | { readonly kind: "committed"; readonly proposalId: ProposalId; readonly revision: number }
  | { readonly kind: "refused"; readonly proposalId: ProposalId }
  | { readonly kind: "awaiting-answer"; readonly proposalId: ProposalId }
  | { readonly kind: "discarded"; readonly proposalId: ProposalId }
  | { readonly kind: "not-interpreted"; readonly failure: EpisodeFailure }
  | { readonly kind: "not-writable"; readonly failure: EpisodeFailure }
  | { readonly kind: "failed"; readonly proposalId: ProposalId; readonly failure: EpisodeFailure }
  /** Nothing in this window settled it — still in flight, or the page ends mid-episode. */
  | { readonly kind: "open" }

export type EpisodeResolutionKind = EpisodeResolution["kind"]

export const EPISODE_RESOLUTION_KINDS: readonly EpisodeResolutionKind[] = [
  "committed",
  "refused",
  "awaiting-answer",
  "discarded",
  "not-interpreted",
  "not-writable",
  "failed",
  "open",
]

export type IntentEpisode = {
  readonly intentId: IntentId
  readonly treeId: TreeId
  /** Absent when the window opened after the intent was received. */
  readonly intent?: IntentSummary
  readonly startedAt: string
  readonly proposals: readonly ProposalEpisode[]
  readonly resolution: EpisodeResolution
}

export type EpisodeFold = {
  readonly episodes: readonly IntentEpisode[]
  /**
   * Records that name a proposal this window never saw proposed. Returned
   * rather than discarded: a fold that quietly dropped them would report a
   * refusal rate over a denominator it had silently changed.
   */
  readonly unattributed: readonly RecordedTelemetry[]
}

type ProposalDraft = {
  readonly proposalId: ProposalId
  readonly intentId: IntentId
  readonly repairOf: ProposalId | undefined
  readonly provenance: Provenance
  readonly rationale: string
  readonly delta: TreeDelta
  readonly proposedAt: string
  assessment: AssessmentSummary | undefined
  disposition: Disposition | undefined
  held: boolean
  repairRequested: boolean
  answer: EpisodeAnswer | undefined
  appliedRevision: number | undefined
  committedRevision: number | undefined
  failure: EpisodeFailure | undefined
  settledAt: string | undefined
}

type IntentDraft = {
  readonly intentId: IntentId
  treeId: TreeId
  intent: IntentSummary | undefined
  startedAt: string
  failure: EpisodeFailure | undefined
  failureKind: "not-interpreted" | "not-writable" | undefined
  readonly proposalIds: ProposalId[]
}

const settle = (draft: ProposalDraft, occurredAt: string): void => {
  draft.settledAt = occurredAt
}

const materialiseProposal = (draft: ProposalDraft): ProposalEpisode => ({
  proposalId: draft.proposalId,
  ...(draft.repairOf === undefined ? {} : { repairOf: draft.repairOf }),
  provenance: draft.provenance,
  rationale: draft.rationale,
  delta: draft.delta,
  proposedAt: draft.proposedAt,
  ...(draft.assessment === undefined ? {} : { assessment: draft.assessment }),
  ...(draft.disposition === undefined ? {} : { disposition: draft.disposition }),
  held: draft.held,
  repairRequested: draft.repairRequested,
  ...(draft.answer === undefined ? {} : { answer: draft.answer }),
  ...(draft.appliedRevision === undefined ? {} : { appliedRevision: draft.appliedRevision }),
  ...(draft.committedRevision === undefined ? {} : { committedRevision: draft.committedRevision }),
  ...(draft.failure === undefined ? {} : { failure: draft.failure }),
  ...(draft.settledAt === undefined ? {} : { settledAt: draft.settledAt }),
})

/**
 * What became of the intent, read off the proposals it produced.
 *
 * A commit anywhere in the chain settles it, because a repaired proposal that
 * applied is the intent being satisfied — the first refusal is part of the
 * story, not the ending. Otherwise the last proposal is the one that speaks:
 * it is either the only attempt, or the repair that replaced the refusal.
 */
const resolutionOf = (draft: IntentDraft, proposals: readonly ProposalEpisode[]): EpisodeResolution => {
  if (draft.failure && draft.failureKind) {
    return draft.failureKind === "not-interpreted"
      ? { kind: "not-interpreted", failure: draft.failure }
      : { kind: "not-writable", failure: draft.failure }
  }

  const committed = proposals.find((proposal) => proposal.committedRevision !== undefined)
  if (committed?.committedRevision !== undefined) {
    return {
      kind: "committed",
      proposalId: committed.proposalId,
      revision: committed.committedRevision,
    }
  }

  const last = proposals.at(-1)
  if (!last) return { kind: "open" }

  if (last.failure) return { kind: "failed", proposalId: last.proposalId, failure: last.failure }
  if (last.answer === "discarded") return { kind: "discarded", proposalId: last.proposalId }
  if (last.held && last.answer === undefined) {
    return { kind: "awaiting-answer", proposalId: last.proposalId }
  }
  if (last.disposition?.kind === "rejected") {
    return { kind: "refused", proposalId: last.proposalId }
  }

  return { kind: "open" }
}

export const episodesOf = (records: readonly RecordedTelemetry[]): EpisodeFold => {
  const intents = new Map<IntentId, IntentDraft>()
  const proposals = new Map<ProposalId, ProposalDraft>()
  const unattributed: RecordedTelemetry[] = []

  const intentDraft = (intentId: IntentId, record: RecordedTelemetry): IntentDraft => {
    const existing = intents.get(intentId)
    if (existing) return existing

    const draft: IntentDraft = {
      intentId,
      treeId: record.treeId,
      intent: undefined,
      startedAt: record.occurredAt,
      failure: undefined,
      failureKind: undefined,
      proposalIds: [],
    }
    intents.set(intentId, draft)

    return draft
  }

  /**
   * Every proposal-keyed event runs through here, so "this record names a
   * proposal the window never saw" is answered in exactly one place and always
   * produces the same outcome.
   */
  const withProposal = (
    proposalId: ProposalId,
    record: RecordedTelemetry,
    update: (draft: ProposalDraft) => void
  ): void => {
    const draft = proposals.get(proposalId)
    if (!draft) {
      unattributed.push(record)

      return
    }

    update(draft)
  }

  for (const record of records) {
    const { event, occurredAt } = record

    switch (event.type) {
      case "intent-received": {
        const draft = intentDraft(event.intent.intentId, record)
        draft.intent = event.intent
        draft.startedAt = occurredAt
        break
      }

      case "interpretation-failed": {
        const draft = intentDraft(event.intentId, record)
        draft.failure = { stage: "interpretation", ...event.failure }
        draft.failureKind = "not-interpreted"
        break
      }

      case "intent-not-writable": {
        const draft = intentDraft(event.intentId, record)
        draft.failure = { stage: "interpretation", ...event.failure }
        draft.failureKind = "not-writable"
        break
      }

      case "change-proposed": {
        const { proposal } = event
        const intent = intentDraft(proposal.intentId, record)
        intent.treeId = record.treeId
        intent.proposalIds.push(proposal.proposalId)

        proposals.set(proposal.proposalId, {
          proposalId: proposal.proposalId,
          intentId: proposal.intentId,
          repairOf: proposal.repairOf,
          provenance: proposal.provenance,
          rationale: proposal.rationale,
          delta: proposal.delta,
          proposedAt: occurredAt,
          assessment: undefined,
          disposition: undefined,
          held: false,
          repairRequested: false,
          answer: undefined,
          appliedRevision: undefined,
          committedRevision: undefined,
          failure: undefined,
          settledAt: undefined,
        })
        break
      }

      case "change-assessed":
        withProposal(event.assessment.proposalId, record, (draft) => {
          draft.assessment = event.assessment
        })
        break

      case "assessment-failed":
        withProposal(event.proposalId, record, (draft) => {
          draft.failure = { stage: "assessment", ...event.failure }
          settle(draft, occurredAt)
        })
        break

      /**
       * A second disposition overwrites the first on purpose: a held proposal is
       * judged again when it is confirmed, and the Gate's second look is the one
       * that decided whether it applied.
       */
      case "disposition-decided":
        withProposal(event.proposalId, record, (draft) => {
          draft.disposition = event.disposition
          if (event.disposition.kind === "rejected") settle(draft, occurredAt)
        })
        break

      case "repair-requested":
        withProposal(event.refusedProposalId, record, (draft) => {
          draft.repairRequested = true
        })
        break

      case "repair-failed":
        withProposal(event.refusedProposalId, record, (draft) => {
          draft.failure = { stage: "repair", ...event.failure }
          settle(draft, occurredAt)
        })
        break

      case "proposal-held":
        withProposal(event.proposalId, record, (draft) => {
          draft.held = true
        })
        break

      case "hold-failed":
        withProposal(event.proposalId, record, (draft) => {
          draft.failure = { stage: "custody", ...event.failure }
          settle(draft, occurredAt)
        })
        break

      case "hold-confirmed":
        withProposal(event.proposalId, record, (draft) => {
          draft.answer = "confirmed"
        })
        break

      case "hold-discarded":
        withProposal(event.proposalId, record, (draft) => {
          draft.answer = "discarded"
          settle(draft, occurredAt)
        })
        break

      case "change-applied":
        withProposal(event.proposalId, record, (draft) => {
          draft.appliedRevision = event.revision
        })
        break

      case "application-failed":
        withProposal(event.proposalId, record, (draft) => {
          draft.failure = { stage: "application", ...event.failure }
          settle(draft, occurredAt)
        })
        break

      case "change-committed":
        withProposal(event.proposalId, record, (draft) => {
          draft.committedRevision = event.revision
          settle(draft, occurredAt)
        })
        break

      case "commit-failed":
        withProposal(event.proposalId, record, (draft) => {
          draft.failure = { stage: "commit", ...event.failure }
          settle(draft, occurredAt)
        })
        break

      default:
        assertNever(event, "episodesOf")
    }
  }

  const episodes = Array.from(intents.values()).map((draft): IntentEpisode => {
    const owned = draft.proposalIds.flatMap((proposalId) => {
      const proposal = proposals.get(proposalId)

      return proposal ? [materialiseProposal(proposal)] : []
    })

    return {
      intentId: draft.intentId,
      treeId: draft.treeId,
      ...(draft.intent === undefined ? {} : { intent: draft.intent }),
      startedAt: draft.startedAt,
      proposals: owned,
      resolution: resolutionOf(draft, owned),
    }
  })

  return { episodes, unattributed }
}

/**
 * What a window of episodes adds up to.
 *
 * This is the shape of the question 0007 said calibration would eventually need
 * — how often the Gate refuses, how often it asks, how often a repair rescued a
 * refusal — asked of one page rather than of all history. It is a second fold
 * over the first rather than anything the journal stores, for 0016's reason: a
 * counted total that is kept is a total that can disagree with the records it
 * was counted from.
 */
export type EpisodeTally = {
  readonly episodes: number
  readonly proposals: number
  /** Proposals the Gate would not apply on its own (0002). */
  readonly held: number
  /** Proposals made to replace one the Gate refused (0006). */
  readonly repairs: number
  /**
   * Every kind, including the ones that did not happen. A resolution absent from
   * this map and one that occurred zero times are different claims, and only one
   * of them is true.
   */
  readonly byResolution: Readonly<Record<EpisodeResolutionKind, number>>
}

const emptyTally = (): Record<EpisodeResolutionKind, number> =>
  Object.fromEntries(EPISODE_RESOLUTION_KINDS.map((kind) => [kind, 0])) as Record<
    EpisodeResolutionKind,
    number
  >

export const tallyEpisodes = (episodes: readonly IntentEpisode[]): EpisodeTally => {
  const byResolution = emptyTally()
  let proposals = 0
  let held = 0
  let repairs = 0

  for (const episode of episodes) {
    byResolution[episode.resolution.kind] += 1
    proposals += episode.proposals.length
    held += episode.proposals.filter((proposal) => proposal.held).length
    repairs += episode.proposals.filter((proposal) => proposal.repairOf !== undefined).length
  }

  return { episodes: episodes.length, proposals, held, repairs, byResolution }
}
