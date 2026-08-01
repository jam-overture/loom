import type {
  EpisodeResolution,
  EpisodeResolutionKind,
  IntentEpisode,
  ProposalEpisode,
} from "@loom/runtime/telemetry"

import type { OutcomeTone } from "./outcome"

/**
 * An episode, as something a page can render.
 *
 * The same shape as `outcome.ts` and for the same reason: the portal has exactly
 * one place that decides what a refusal looks like, and it is a pure function a
 * test can cover without a database or a request. A resolution the runtime added
 * and this file did not is a compile error rather than a blank badge.
 */

export type EpisodeView = {
  readonly tone: OutcomeTone
  readonly headline: string
  /** The sentence under the headline. Empty when the headline says everything. */
  readonly detail: string
}

/**
 * `failed` and `refused` share a tone because both end with the change not
 * happening, and the labels carry the difference that matters: the Gate said no,
 * or a stage broke. `open` is muted rather than alarming — a window that ends
 * mid-episode is the page boundary talking, not the runtime.
 */
const TONES: Readonly<Record<EpisodeResolution["kind"], OutcomeTone>> = {
  committed: "applied",
  refused: "rejected",
  "awaiting-answer": "awaiting",
  discarded: "inapplicable",
  "not-interpreted": "uninterpreted",
  "not-writable": "inapplicable",
  failed: "rejected",
  open: "uninterpreted",
}

const HEADLINES: Readonly<Record<EpisodeResolution["kind"], string>> = {
  committed: "applied",
  refused: "refused",
  "awaiting-answer": "waiting on you",
  discarded: "discarded",
  "not-interpreted": "not interpreted",
  "not-writable": "not written",
  failed: "failed",
  open: "unfinished",
}

const detailOf = (resolution: EpisodeResolution): string => {
  switch (resolution.kind) {
    case "committed":
      return `revision ${resolution.revision}`
    case "refused":
      return "the Gate would not apply it, and no repair replaced it"
    case "awaiting-answer":
      return "held for a human, and no answer has been recorded"
    case "discarded":
      return "held, and answered no"
    case "not-interpreted":
    case "not-writable":
    case "failed":
      return `${resolution.failure.stage}: ${resolution.failure.detail}`
    case "open":
      return "nothing in this page settled it — still in flight, or it began before this page"
  }
}

/**
 * Tone and headline are keyed by the resolution's kind alone, so a summary that
 * has counts but no resolutions — the tally — can label them without inventing a
 * resolution to ask about.
 */
export const toneOfResolution = (kind: EpisodeResolutionKind): OutcomeTone => TONES[kind]

export const headlineOfResolution = (kind: EpisodeResolutionKind): string => HEADLINES[kind]

export const viewOf = (resolution: EpisodeResolution): EpisodeView => ({
  tone: toneOfResolution(resolution.kind),
  headline: headlineOfResolution(resolution.kind),
  detail: detailOf(resolution),
})

/**
 * What the model was asked to change, without what was said.
 *
 * 0023 keeps the utterance out of the journal on purpose, so this describes the
 * ask by its shape — where it was aimed and how long it was. A view that printed
 * nothing here would make the absence look like a bug rather than a decision.
 *
 * Who asked leads when there is a who. An origin is a category and an actor is a
 * person, and the question a reader brings to this page is the second one — but
 * the origin stays alongside it, because `developer` and `user-instruction` are
 * different acts by the same person (0017).
 */
export const describeIntent = (episode: IntentEpisode): string => {
  const { intent } = episode
  if (intent === undefined) return "this page opened after the ask was recorded"

  const who = intent.actor === undefined ? intent.origin : `${intent.actor} · ${intent.origin}`
  const scope = intent.scopeNodeId === undefined ? "the whole tree" : intent.scopeNodeId
  const characters = intent.utteranceLength === 1 ? "character" : "characters"

  return `${who} · ${scope} · revision ${intent.baseRevision} · ${intent.utteranceLength} ${characters}`
}

/**
 * How a proposal was answered, and by whom.
 *
 * `null` when nobody has answered — which is not the same as an answer with no
 * name on it, and the two must not render the same way. A hold nobody has
 * reached yet is a queue; a hold answered anonymously is a gap in the record.
 */
export const describeAnswer = (proposal: ProposalEpisode): string | null => {
  if (proposal.answer === undefined) return null

  return proposal.answeredBy === undefined
    ? `${proposal.answer} by nobody recorded`
    : `${proposal.answer} by ${proposal.answeredBy}`
}
