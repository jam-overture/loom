import {
  composeChange,
  confirmChange,
  err,
  fixedPolicy,
  noopEventSink,
  ok,
  sequentialIdFactory,
  systemClock,
  type ChangeInterpreter,
  type Clock,
  type CompositionRuntime,
  type EditIntent,
  type EventSink,
  type IdFactory,
  type LoomTree,
  type TreeDelta,
} from "@loom/runtime"

import type { Ask } from "./asks"
import { nothingHappened, recordOf, type ChangeRecord, type Request } from "./record"
import { FRONT_DOOR_POLICY } from "./run"

/**
 * Putting it back, as a change of its own.
 *
 * **This band said the word "undo" for two weeks and never showed one.** The
 * panel's fifth rung is headed *Putting it back* and reads out how many pieces
 * the reversing change carries; the questions band promises that *undoing is
 * checked against your rules and written down like anything else*; and the
 * control under all of it — labelled *Put it back* — was a link to `/`. It
 * dropped `?ask=` from the address and the page was rebuilt from the source.
 *
 * The result looked identical, which is exactly why nothing caught it. It was
 * not the same page: it was a fresh page that resembled the one the visitor had
 * changed, and the site's own claim is the difference between those two things.
 * Everything else this product does is downstream of that difference.
 *
 * So the button now does what it says. The inverse the runtime wrote at the
 * moment the change applied is put back through the same sequence the change
 * went through — interpreted, measured, weighed by the same named rules, and
 * applied only if they allow it — and the panel gains a second record. A visitor
 * who presses it sees the page they changed change back, and reads what the page
 * wrote down about *that*.
 *
 * ## Why it does not call `revertRevision`
 *
 * `@loom/runtime/write` already assembles this and the demonstration at `/demo`
 * uses it. It plans an undo by replaying a **store**: given a revision number it
 * finds the delta, inverts it, and reports what has been built on top since
 * ([0035](../../../../../../decisions/0035-an-undo-whose-target-was-built-on-is-offered-rather-than-refused.md)).
 * The front door has no store and is not going to get one
 * ([0081](../../../../../../decisions/0081-the-front-door-demonstrates-statelessly-and-the-address-is-the-state.md)):
 * a session per visitor on the most-crawled surface the project has is a memory
 * leak with an advertising budget.
 *
 * It does not need one. The change and its undo are computed in the same request
 * here, so the inverse is already in hand and nothing has been built on it —
 * there is no log to replay and nothing to contest. What is missing is only the
 * short piece between *here is an inverse* and *here is a proposal the Gate can
 * weigh*, and that piece is below. Filed for `Loom daily build` as well, because
 * every stateless surface that ever offers an undo will write it again.
 *
 * The one thing not borrowed is the runtime's `REVERT_INTERPRETER` stamp. That
 * is what `revertInterpreter` puts on a delta *it* planned off a store, and
 * claiming it for a delta planned somewhere else would be this site lying in its
 * own provenance — on the page whose entire argument is that provenance is worth
 * something.
 */

/** What produced the delta, for `Provenance.interpreter`. Not a model, and not a guess. */
export const FRONT_DOOR_UNDO_INTERPRETER = "loom/front-door-undo"

/**
 * The words on the control, and the words the record quotes.
 *
 * One string, because they are one thing said twice and the site has been caught
 * before by a label that drifted from the sentence reporting it. A visitor
 * pressed *Put it back*, so *Put it back* is what the record says they asked
 * for — the runtime's own utterance for a revert names a revision number, which
 * is exactly right in a log and is one of our words on a landing page.
 */
export const PUT_IT_BACK = "Put it back."

/**
 * What the undo is about to do, in the register the rest of the panel is held to.
 *
 * It says *carries* rather than *rewrites* on purpose, and the number is the
 * claim: an undo that restored eleven pieces by building eleven new ones would
 * be a page that looked the same, and the fifth rung of the change above has
 * just promised the reader it is not.
 */
const proposedFor = (inverse: TreeDelta): string => {
  const steps = inverse.operations.length

  return `This is the change that reverses the one above, written at the moment that one applied. It is ${steps} ${
    steps === 1 ? "step" : "steps"
  }, and it carries what it needs to put every piece back where it was — the same pieces, not new ones that read the same.`
}

/** The undo of a given ask, as a request the record can quote. */
export const undoRequest = (ask: Ask, inverse: TreeDelta): Request => ({
  ask: ask.id,
  asked: PUT_IT_BACK,
  proposed: proposedFor(inverse),
  putBack: true,
})

/**
 * An interpreter with nothing to interpret, which is the case that proves the
 * seam is drawn in the right place.
 *
 * Interpretation is the one non-deterministic step
 * ([0005](../../../../../../decisions/0005-interpretation-is-the-only-non-deterministic-step.md)),
 * not necessarily a model — and everything downstream of this cannot tell that
 * no model was involved. That is what makes an undo gateable on exactly the same
 * terms as an AI-authored change, which is the property the panel is about to
 * put in front of a stranger.
 *
 * The head check is not defensive coding. An inverse is computed against one
 * arrangement of the page, and offering it against another would be proposing
 * something whose reasoning has expired — the stale proposal the whole sequence
 * exists to catch. `revertInterpreter` declines for the same reason and in the
 * same place.
 */
export const undoInterpreter = (
  inverse: TreeDelta,
  ids: IdFactory,
  clock: Clock
): ChangeInterpreter => ({
  interpret: (intent: EditIntent, page: LoomTree) =>
    Promise.resolve(
      page.revision === inverse.baseRevision
        ? ok({
            proposalId: ids.proposalId(),
            intentId: intent.intentId,
            delta: {
              deltaId: ids.deltaId(),
              treeId: page.treeId,
              baseRevision: page.revision,
              operations: inverse.operations,
            },
            rationale: `Reverses the change applied at revision ${inverse.baseRevision}.`,
            provenance: {
              origin: intent.origin,
              ...(intent.actor === undefined ? {} : { actor: intent.actor }),
              interpreter: FRONT_DOOR_UNDO_INTERPRETER,
              /**
               * Computed rather than guessed, so `authoredBy` is the runtime and
               * calibration leaves the 1 out of the model's score
               * ([0031](../../../../../../decisions/0031-calibration-is-a-reader-not-a-controller.md)).
               */
              authoredBy: "runtime" as const,
              confidence: 1,
              interpretedAt: clock.now(),
            },
          })
        : err({
            code: "refused",
            detail: `the undo was written against revision ${inverse.baseRevision}, and this page is at ${page.revision}`,
          })
    ),
})

export type UndoRun = {
  /** The page with the change taken back off it, if the rules allowed that. */
  readonly page: LoomTree
  readonly record: ChangeRecord
}

/**
 * The namespace the undo draws its ids from.
 *
 * Separate from the change's, because the two runs happen against one page in
 * one request and a shared sequential factory would hand the undo the ids the
 * change was already using.
 */
const UNDO_NAMESPACE = "back"

/**
 * The inverse, run from the request to the record.
 *
 * Deliberately the same shape as `runAsk`, and deliberately the same rules: the
 * interesting outcome is the one where a visitor puts back a change the rules
 * held for them, and the rules hold the undo too — because moving a protected
 * band back is still moving a protected band. Nothing here exempts an undo to
 * make the demonstration tidier, and the moment it did, the band would stop
 * being evidence of anything.
 */
export const runUndo = async (
  page: LoomTree,
  ask: Ask,
  inverse: TreeDelta,
  approve = false,
  namespace: string = UNDO_NAMESPACE,
  events: EventSink = noopEventSink
): Promise<UndoRun> => {
  const idFactory = sequentialIdFactory(namespace)
  const runtime: CompositionRuntime = {
    interpreter: undoInterpreter(inverse, idFactory, systemClock),
    policySource: fixedPolicy(FRONT_DOOR_POLICY),
    events,
    clock: systemClock,
    idFactory,
  }

  const request = undoRequest(ask, inverse)
  const intent: EditIntent = {
    intentId: idFactory.intentId(),
    treeId: page.treeId,
    baseRevision: page.revision,
    /** A visitor pressing a button is a person asking for something, here as anywhere. */
    origin: "user-instruction",
    actor: "a visitor",
    utterance: PUT_IT_BACK,
    observedAt: systemClock.now(),
  }

  const composed = await composeChange(runtime, page, intent)

  if (composed.kind === "not-interpreted" || composed.kind === "not-applicable") {
    return {
      page,
      record: nothingHappened(request, "The page has moved since, so this undo no longer fits it."),
    }
  }

  if (composed.kind === "applied") {
    return { page: composed.tree, record: recordOf(request, composed.assessment, composed.disposition, true) }
  }

  if (composed.kind === "rejected" || !approve) {
    return { page, record: recordOf(request, composed.assessment, composed.disposition, false) }
  }

  /** The visitor has answered a hold on the undo. Same guarantee as answering one on a change. */
  const confirmed = confirmChange(runtime, page, composed.assessment.proposal, intent)

  return confirmed.kind === "applied"
    ? { page: confirmed.tree, record: recordOf(request, confirmed.assessment, confirmed.disposition, true) }
    : confirmed.kind === "rejected"
      ? { page, record: recordOf(request, confirmed.assessment, confirmed.disposition, false) }
      : {
          page,
          record: nothingHappened(request, "The page has moved since, so this undo no longer fits it."),
        }
}
