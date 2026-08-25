import type {
  EpisodeResolution,
  EpisodeResolutionKind,
  EpisodeTally,
  IntentEpisode,
  ProposalEpisode,
} from "@loom/runtime/telemetry"

import type { OutcomeTone } from "./outcome"
import { ANSWERS, ASK_ORIGINS, ASK_OUTCOMES, FAILURE_STAGES, type PlainState } from "./vocabulary"

/**
 * An episode, as something a page can render.
 *
 * The same shape as `outcome.ts` and for the same reason: the portal has exactly
 * one place that decides what a refusal looks like, and it is a pure function a
 * test can cover without a database or a request. A resolution the runtime added
 * and this file did not is a compile error rather than a blank badge.
 *
 * What changed on 24 August is where the *words* come from. This file used to
 * hold its own `HEADLINES` and `detailOf` — `not interpreted`, `not written`,
 * `discarded`, `the Gate would not apply it, and no repair replaced it` — which
 * made it a second vocabulary beside `vocabulary.ts`, and the two disagreed:
 * a change turned down was "You said no" in red on the review queue and
 * `discarded` in grey here. The words live in one place now and this file
 * assembles them, which is the split the brief asks for.
 */

export type EpisodeView = PlainState & {
  /**
   * The revision the ask produced, and null for every outcome that produced
   * none. Kept out of the sentences because a revision is somewhere a reviewer
   * can go (0043), and a number inside a sentence is a number they have to
   * retype.
   */
  readonly revision: number | null
}

/**
 * Tone and words are keyed by the resolution's kind alone, so a summary that has
 * counts but no resolutions — the tally — can label them without inventing a
 * resolution to ask about.
 */
export const askOutcome = (kind: EpisodeResolutionKind): PlainState => ASK_OUTCOMES[kind]

export const toneOfResolution = (kind: EpisodeResolutionKind): OutcomeTone =>
  ASK_OUTCOMES[kind].tone

/**
 * The runtime's own account of a resolution, kept whole for the disclosure.
 *
 * A failure carries a stage and a detail that no plain sentence can replace —
 * `commit: the store rejected the write` is the line somebody debugging this
 * needs, verbatim — so it is appended to the kind rather than reworded away.
 * The plain sentence above it says what the failure *meant* for the page, which
 * is a different question and the one a reader asks first.
 */
const technicalOf = (resolution: EpisodeResolution): string => {
  const kind = ASK_OUTCOMES[resolution.kind].technical

  switch (resolution.kind) {
    case "not-interpreted":
    case "not-writable":
    case "failed":
      return `${kind} — ${resolution.failure.stage}: ${resolution.failure.detail}`
    default:
      return kind
  }
}

/**
 * A failure's stage, said as what it means for the page rather than as a stage.
 *
 * Empty for every resolution that did not fail, so a card can render it without
 * asking which resolutions carry a failure.
 */
export const failureWords = (resolution: EpisodeResolution): string => {
  switch (resolution.kind) {
    case "not-interpreted":
    case "not-writable":
    case "failed": {
      const stage = FAILURE_STAGES[resolution.failure.stage]

      return `This stopped ${stage.label}. ${stage.meaning}`
    }
    default:
      return ""
  }
}

export const viewOf = (resolution: EpisodeResolution): EpisodeView => ({
  ...ASK_OUTCOMES[resolution.kind],
  technical: technicalOf(resolution),
  revision: resolution.kind === "committed" ? resolution.revision : null,
})

/**
 * What this page of the record adds up to, and whether any of it is yours.
 *
 * The counts were four monospace pairs headed `asks`, `proposals`, `held` and
 * `repairs`, and none of them answered the question somebody opens this screen
 * with: *is anything waiting on me?* The counts are all still there — one click
 * down, and in the chips — but a screen that makes a reader work out their own
 * answer from a number labelled `held` has failed the test the brief sets.
 *
 * "Nothing here is waiting on you" is said out loud rather than left as an
 * absence, for the same reason the tally renders its zeroes: a count that is not
 * shown and a count that is zero are different claims.
 */
export const tallySummary = (tally: EpisodeTally): string => {
  const asks = tally.episodes === 1 ? "1 ask" : `${tally.episodes} asks`
  const waiting = tally.byResolution["awaiting-answer"]

  return waiting === 0
    ? `${asks} on this page of the record. Nothing here is waiting on you.`
    : `${asks} on this page of the record. ${
        waiting === 1 ? "1 is waiting" : `${waiting} are waiting`
      } on you to say yes or no.`
}

/**
 * The entries this page of the record could not attribute to an ask it saw.
 *
 * The fold returns them rather than dropping them, because a refusal rate over a
 * denominator that was silently shrunk is worse than no rate at all — so the
 * page has to say so, and the sentence has to be readable by somebody who has
 * never heard the word "attribute". What it means to a reader is narrower and
 * more useful than the mechanism: *some of what happened here began before this
 * page starts, and the counts above do not include it.*
 *
 * Returns the empty string for zero, so the page asks about one thing rather
 * than two.
 */
export const unattributedNote = (count: number): string => {
  if (count === 0) return ""

  return count === 1
    ? "One entry here belongs to an ask that started further back than this page reaches, so it is counted in nothing above. Go back a page to see it in context."
    : `${count} entries here belong to asks that started further back than this page reaches, so they are counted in nothing above. Go back a page to see them in context.`
}

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
 *
 * The line this replaced was `dana · developer · n_card1 · revision 3 · 42
 * characters`: five facts in monospace with nothing saying which was which. Every
 * one of them is still here. Four are in `technical`, and the two a reader
 * actually opens the page for — who asked, and whether it was aimed at one part
 * or the whole page — are sentences.
 */
export type AskLine = {
  /** Who asked, in a person's words. Never empty. */
  readonly who: string
  /** What it was aimed at. Empty when the ask itself was not recorded. */
  readonly scope: string
  /** The revision the ask was made against, or null when the ask was not recorded. */
  readonly revision: number | null
  /** The same facts in the runtime's words, for the disclosure. */
  readonly technical: string
}

export const describeAsk = (episode: IntentEpisode): AskLine => {
  const { intent } = episode
  if (intent === undefined) {
    return {
      who: "This started further back than this page reaches, so Loom can't say who asked.",
      scope: "",
      revision: null,
      technical: "no intent record in this window",
    }
  }

  const origin = ASK_ORIGINS[intent.origin]
  /**
   * The full stop is load-bearing and a screenshot found it missing. `who` and
   * `scope` are two sentences the card sets side by side, so a `who` that ends
   * without one renders as `ana@loom.local asked for this It was aimed at the
   * whole page.` — which reads as a dropped word rather than a missing stop. The
   * table's labels stay unpunctuated, because a label is not a sentence; the
   * punctuation belongs to the place that makes them into one.
   */
  const who = intent.actor === undefined ? `${origin.label}.` : `${intent.actor} asked for this.`
  const scope =
    intent.scopeNodeId === undefined
      ? "It was aimed at the whole page."
      : "It was aimed at one part of the page."
  const characters = intent.utteranceLength === 1 ? "character" : "characters"
  const aimedAt = intent.scopeNodeId === undefined ? "the whole tree" : intent.scopeNodeId

  return {
    who,
    scope,
    revision: intent.baseRevision,
    technical: `${intent.actor === undefined ? "" : `${intent.actor} · `}${origin.technical} · ${aimedAt} · ${intent.utteranceLength} ${characters}`,
  }
}

/**
 * How a proposal was answered, and by whom.
 *
 * `null` when nobody has answered — which is not the same as an answer with no
 * name on it, and the two must not render the same way. A hold nobody has
 * reached yet is a queue; a hold answered anonymously is a gap in the record,
 * and this says so in as many words rather than printing `by nobody recorded`.
 */
export type AnswerLine = {
  readonly sentence: string
  readonly technical: string
}

export const describeAnswer = (proposal: ProposalEpisode): AnswerLine | null => {
  if (proposal.answer === undefined) return null

  const answer = ANSWERS[proposal.answer]

  return {
    sentence:
      proposal.answeredBy === undefined
        ? `Somebody ${answer.label}, but the record doesn't say who.`
        : `${proposal.answeredBy} ${answer.label}.`,
    technical:
      proposal.answeredBy === undefined
        ? `${answer.technical} by nobody recorded`
        : `${answer.technical} by ${proposal.answeredBy}`,
  }
}
