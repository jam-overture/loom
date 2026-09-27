import type { StakeFactor } from "@jam-overture/loom"
import {
  describeRevertOutcome,
  describeWriteOutcome,
  type RevertOutcome,
  type WriteOutcome,
} from "@jam-overture/loom/write"

import { reasoningOf, refusalState, type Reasoning } from "./refusal"
import { CANNOT_UNDO, plainState, stateOfWrite, type OutcomeTone } from "./vocabulary"

/**
 * A write's outcome, as something a page can render.
 *
 * Kept apart from the server action so the mapping is a pure function a test can
 * cover without invoking one. What it no longer does is choose the words: the
 * headline, the sentence under it and the tone all come from `vocabulary`, so
 * a state cannot be called "held" here and "waiting on you" three files away.
 *
 * The report is now three strings rather than two, and the split is the whole
 * point. `headline` and `meaning` are what a person reads. `detail` is the
 * runtime's own sentence — `describeWriteOutcome`, unaltered, with its error
 * codes and revision numbers intact — and it belongs behind a disclosure
 * rather than on the surface. Nothing was dropped to make room; it moved.
 *
 * ## The fourth field, and why it is optional
 *
 * Three strings were the whole answer for as long as a screen only had to say
 * *what happened*. `reasoning` is *why*, and it is what a person actually acts
 * on — see `refusal.ts` for the three layers and for the one distinction that
 * made this worth building.
 *
 * Optional because four of the seven endings have no reasoning to give and must
 * not be made to invent one. A request the model could not interpret, a change
 * whose target had moved, a store that would not write and a hold somebody had
 * already answered never reached the Gate, so there is no judgement to report —
 * and a card that printed an empty reason list under them would be saying the
 * Gate found nothing wrong, which is a different claim from the Gate never
 * having looked.
 *
 * It is carried on an applied change as well as on a refused one, deliberately.
 * The factors the Gate weighed and went ahead with anyway are the most
 * interesting thing in a healthy deployment's record: *it takes a lot of the page
 * away at once* under a green **Applied** is Loom saying what it noticed, which
 * nothing else on this deployment says.
 */

export type { OutcomeTone }
export { toneClasses } from "./vocabulary"

export type WriteReport = {
  readonly tone: OutcomeTone
  /** The plain name of the state. Shown unasked. */
  readonly headline: string
  /** One sentence a person can act on. Shown unasked. */
  readonly meaning: string
  /** The runtime's own account, verbatim. Belongs one click down. */
  readonly detail: string
  /**
   * What the Gate weighed and which rule decided. Shown unasked, as clauses.
   *
   * Absent on the four endings that never reached the Gate. See the note above.
   */
  readonly reasoning?: Reasoning
}

/**
 * Which disposition a write ended under, when it ended under one.
 *
 * Three of the seven do. Written as a narrowing rather than read off each branch
 * so that the two places a disposition hides — inside `held`, and beside the
 * proposal on `refused` — are named once each.
 */
const dispositionOf = (outcome: WriteOutcome) => {
  switch (outcome.kind) {
    case "committed":
    case "refused":
      return outcome.disposition
    case "held":
      return outcome.held.disposition
    default:
      return undefined
  }
}

/**
 * Which proposal an outcome is about, when it is about one.
 *
 * The same narrowing as `dispositionOf` and separate from it on purpose: the two
 * are read from different places on `held` — the disposition is on the hold, the
 * proposal is inside it — and one function returning a pair would have to invent
 * a name for a thing that is only ever two lookups.
 */
const proposalIdOf = (outcome: WriteOutcome): string | undefined => {
  switch (outcome.kind) {
    case "committed":
    case "refused":
    case "not-applicable":
      return outcome.proposal.proposalId
    case "held":
      return outcome.held.proposalId
    default:
      return undefined
  }
}

/**
 * A lookup rather than a list, which is the shape that keeps the caller honest.
 *
 * `PortalWrite.weighedAgainst` is keyed by proposal, and passing it whole means
 * this module decides which proposal to ask about — which it can, because it
 * already owns where a proposal hides in each of the seven endings. A signature
 * taking the factors instead would put that decision in three server actions,
 * and the bug it invites is the one that matters: a refusal handed to a repairer
 * produces two assessments in one write, so a caller reaching for "the factors"
 * has a coin flip between the change that was refused and the smaller one
 * offered in its place.
 *
 * Defaulted to nothing, for the callers that legitimately have none: confirming
 * or discarding a held proposal is answering a judgement made in a request that
 * has already ended, so this write never weighed it. An empty list reads as
 * *nothing to add* and never as *nothing was wrong* — `reasoning` still carries
 * the rule that decided.
 */
export type WeighedAgainst = (proposalId: string) => readonly StakeFactor[]

const NOTHING_WEIGHED: WeighedAgainst = () => []

export const reportOf = (
  outcome: WriteOutcome,
  weighedAgainst: WeighedAgainst = NOTHING_WEIGHED
): WriteReport => {
  const disposition = dispositionOf(outcome)
  const proposalId = proposalIdOf(outcome)
  const factors = proposalId === undefined ? [] : weighedAgainst(proposalId)
  const reasoning =
    disposition === undefined
      ? undefined
      : reasoningOf(disposition.kind, disposition.reason.code, factors)

  /*
   * The one state a `kind` cannot name on its own. Everything else in this
   * function is a lookup; this is the branch `refusal.ts` exists for, and it is
   * here rather than inside `stateOfWrite` because `stateOfWrite` is handed a
   * kind and a kind does not know what was wrong with the change.
   */
  const plain =
    outcome.kind === "refused" && reasoning !== undefined
      ? refusalState(reasoning.objections)
      : plainState(stateOfWrite(outcome.kind))

  return {
    tone: plain.tone,
    headline: plain.label,
    meaning: plain.meaning,
    detail: describeWriteOutcome(outcome),
    ...(reasoning === undefined ? {} : { reasoning }),
  }
}

/**
 * An undo's outcome, as something the history page can render.
 *
 * Two things differ from an ordinary write. A plan that produced no undo at all
 * is not a write outcome, so it reads as inapplicable rather than as a refusal —
 * the runtime did not decline this, it could not compute it.
 *
 * And a held undo is answered somewhere else. Undo is offered on `/portal/history`,
 * every hold queues on the page's own screen (0019), and a reviewer told
 * "waiting on you" with nowhere named would have to go and find it. An undo that
 * discards later work is now the common way to reach that state (0035), so the
 * pointer is part of the answer rather than a nicety — and it is part of the
 * *meaning*, not the technical detail, because it is the one sentence here that
 * tells somebody what to do next.
 */
export const revertReportOf = (
  outcome: RevertOutcome,
  weighedAgainst: WeighedAgainst = NOTHING_WEIGHED
): WriteReport => {
  if (outcome.kind === "not-revertable") {
    return {
      tone: CANNOT_UNDO.tone,
      headline: CANNOT_UNDO.label,
      meaning: CANNOT_UNDO.meaning,
      detail: describeRevertOutcome(outcome),
    }
  }

  const report = reportOf(outcome, weighedAgainst)

  return outcome.kind === "held"
    ? { ...report, meaning: `${report.meaning} Answer it in this page's review queue.` }
    : report
}
