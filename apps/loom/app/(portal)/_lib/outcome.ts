import {
  describeRevertOutcome,
  describeWriteOutcome,
  type RevertOutcome,
  type WriteOutcome,
} from "@loom/runtime/write"

/**
 * A write's outcome, as something a page can render.
 *
 * Kept apart from the server action so the mapping is a pure function a test can
 * cover without invoking one — and so the portal has exactly one place that
 * decides what a refusal looks like. The tones are the `--outcome-*` tokens; a
 * change that was refused and a change that could not be interpreted read
 * differently on purpose, because "you may not" and "I did not understand" are
 * different answers (0019).
 */

export type OutcomeTone = "applied" | "awaiting" | "rejected" | "uninterpreted" | "inapplicable"

export type WriteReport = {
  readonly tone: OutcomeTone
  readonly headline: string
  readonly detail: string
}

const toneOf = (kind: WriteOutcome["kind"]): OutcomeTone => {
  switch (kind) {
    case "committed":
      return "applied"
    case "held":
      return "awaiting"
    case "refused":
      return "rejected"
    case "not-interpreted":
      return "uninterpreted"
    case "not-applicable":
    case "not-written":
    case "not-answerable":
      return "inapplicable"
  }
}

const headlineOf = (kind: WriteOutcome["kind"]): string => {
  switch (kind) {
    case "committed":
      return "applied"
    case "held":
      return "waiting on you"
    case "refused":
      return "refused"
    case "not-interpreted":
      return "not interpreted"
    case "not-applicable":
      return "did not apply"
    case "not-written":
      return "not written"
    case "not-answerable":
      return "nothing to answer"
  }
}

export const reportOf = (outcome: WriteOutcome): WriteReport => ({
  tone: toneOf(outcome.kind),
  headline: headlineOf(outcome.kind),
  detail: describeWriteOutcome(outcome),
})

/**
 * An undo's outcome, as something the history page can render.
 *
 * Two things differ from an ordinary write. A plan that produced no undo at all
 * is not a write outcome, so it reads as inapplicable rather than as a refusal —
 * the runtime did not decline this, it could not compute it.
 *
 * And a held undo is answered somewhere else. Undo is offered on `/portal/history`,
 * every hold queues on the tree's own page (0019), and a reviewer told "waiting
 * on you" with nowhere named would have to go and find it. An undo that
 * discards later work is now the common way to reach that state (0035), so the
 * pointer is part of the answer rather than a nicety.
 */
export const revertReportOf = (outcome: RevertOutcome): WriteReport => {
  if (outcome.kind === "not-revertable") {
    return {
      tone: "inapplicable",
      headline: "cannot undo",
      detail: describeRevertOutcome(outcome),
    }
  }

  return outcome.kind === "held"
    ? {
        ...reportOf(outcome),
        detail: `${describeWriteOutcome(outcome)} Answer it in this tree's review queue.`,
      }
    : reportOf(outcome)
}

const TONE_CLASSES: Readonly<Record<OutcomeTone, string>> = {
  applied: "bg-applied text-applied-ink",
  awaiting: "bg-awaiting text-awaiting-ink",
  rejected: "bg-rejected text-rejected-ink",
  uninterpreted: "bg-uninterpreted text-uninterpreted-ink",
  inapplicable: "bg-inapplicable text-inapplicable-ink",
}

export const toneClasses = (tone: OutcomeTone): string => TONE_CLASSES[tone]
