import {
  describeRevertOutcome,
  describeWriteOutcome,
  type RevertOutcome,
  type WriteOutcome,
} from "@loom/runtime/write"

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
}

export const reportOf = (outcome: WriteOutcome): WriteReport => {
  const plain = plainState(stateOfWrite(outcome.kind))

  return {
    tone: plain.tone,
    headline: plain.label,
    meaning: plain.meaning,
    detail: describeWriteOutcome(outcome),
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
export const revertReportOf = (outcome: RevertOutcome): WriteReport => {
  if (outcome.kind === "not-revertable") {
    return {
      tone: CANNOT_UNDO.tone,
      headline: CANNOT_UNDO.label,
      meaning: CANNOT_UNDO.meaning,
      detail: describeRevertOutcome(outcome),
    }
  }

  const report = reportOf(outcome)

  return outcome.kind === "held"
    ? { ...report, meaning: `${report.meaning} Answer it in this page's review queue.` }
    : report
}
