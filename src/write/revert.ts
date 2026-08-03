import type { IdFactory, TreeId } from "../ids.js"
import { err, ok, type Result } from "../result.js"
import type { Clock } from "../runtime/events.js"
import type { EditIntent } from "../runtime/intent.js"
import type { ProposedChange } from "../runtime/proposal.js"
import type { StoredRevision } from "../store/store.js"
import type { ReplayMismatch } from "../store/replay.js"
import type { TreeError } from "../tree/errors.js"
import { invertDelta } from "../tree/inverse.js"
import type { LoomTree } from "../tree/tree.js"

/**
 * Undoing a committed change.
 *
 * The inverse delta has existed since day 2 — the Gate is handed it so that
 * "can this be taken back" is answered by producing the thing that takes it
 * back. Nothing ever applied one, which left `reversible` a property the
 * runtime could prove and a user could not exercise.
 *
 * A revert is an ordinary write. It is proposed, judged by the same Gate under
 * the same policy, held if the policy says so, and appended as a new revision
 * (0032). The log only grows: undoing revision 4 produces revision 5, and both
 * are in the record. Nothing is erased, because a history that could be edited
 * would not be evidence of anything.
 */

export type RevertRequest = {
  readonly treeId: TreeId
  /** The revision to undo. Must be the latest — see 0032. */
  readonly revision: number
  /** Who asked. Lands in `Provenance.actor`, exactly as an edit's asker does. */
  readonly actor?: string
}

export type RevertRefusal =
  | {
      readonly code: "not-the-latest-revision"
      readonly requested: number
      readonly head: number
    }
  | { readonly code: "no-such-revision"; readonly revision: number }
  | { readonly code: "unreplayable"; readonly mismatch: ReplayMismatch }
  | { readonly code: "not-invertible"; readonly error: TreeError }

export const describeRevertRefusal = (refusal: RevertRefusal): string => {
  switch (refusal.code) {
    case "not-the-latest-revision":
      return `Only the latest revision can be undone. Revision ${refusal.requested} was asked for and the tree is at ${refusal.head}.`
    case "no-such-revision":
      return `Revision ${refusal.revision} is not in this tree's log.`
    case "unreplayable":
      return `The log could not be replayed to that point: ${refusal.mismatch.code}.`
    case "not-invertible":
      return `That change cannot be inverted: ${refusal.error.code}.`
  }
}

/**
 * The intent behind a revert, shaped like any other.
 *
 * `origin` stays `user-instruction` because a person asked; what differs is who
 * wrote the delta, and that is `authoredBy` on the provenance rather than a
 * fifth origin. The utterance is the ask in plain words — `IntentSummary` keeps
 * only its length (0023), so this never becomes a channel for content.
 */
export const revertIntent = (
  ids: IdFactory,
  clock: Clock,
  request: RevertRequest,
  baseRevision: number
): EditIntent => ({
  intentId: ids.intentId(),
  treeId: request.treeId,
  baseRevision,
  origin: "user-instruction",
  ...(request.actor === undefined ? {} : { actor: request.actor }),
  utterance: `undo revision ${request.revision}`,
  observedAt: clock.now(),
})

/**
 * Turns the entry to undo, and the tree it was applied to, into a proposal.
 *
 * The confidence is 1 and it means something different from a model's 1. An
 * inverse is derived, not guessed, so there is no uncertainty to report — and
 * because `authoredBy` is `runtime`, calibration (0031) leaves it out of its
 * denominators rather than averaging a constant into a measurement of judgment.
 */
export const revertProposal = (
  ids: IdFactory,
  clock: Clock,
  intent: EditIntent,
  priorTree: LoomTree,
  entry: StoredRevision
): Result<ProposedChange, RevertRefusal> => {
  const inverted = invertDelta(priorTree, entry.delta, ids.deltaId())
  if (!inverted.ok) return err({ code: "not-invertible", error: inverted.error })

  return ok({
    proposalId: ids.proposalId(),
    intentId: intent.intentId,
    delta: inverted.value,
    rationale: `undoes revision ${entry.revision}, which was applied by ${entry.proposalId}`,
    provenance: {
      origin: intent.origin,
      ...(intent.actor === undefined ? {} : { actor: intent.actor }),
      interpreter: "loom.revert",
      authoredBy: "runtime",
      confidence: 1,
      interpretedAt: clock.now(),
    },
  })
}
