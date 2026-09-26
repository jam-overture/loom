import {
  composeChange,
  confirmChange,
  fixedPolicy,
  inverseInterpreter,
  noopEventSink,
  sequentialIdFactory,
  systemClock,
  type ComputedInverse,
  type CompositionRuntime,
  type EditIntent,
  type EventSink,
  type LoomTree,
  type TreeDelta,
} from "@loom/runtime"

import type { Ask } from "./asks"
import { nothingHappened, recordOf, type ChangeRecord, type Request } from "./record"
import { FRONT_DOOR_POLICY, SITE_PROPS_VOCABULARY } from "./run"

/**
 * Putting it back, as a change of its own.
 *
 * **This band said the word "undo" for two weeks and never showed one.** The
 * panel's fifth rung is headed *Putting it back* and reads out how many pieces
 * the reversing change carries; the questions band promises that *undoing is
 * checked against your rules and written down like anything else*; and the
 * control under all of it — labeled *Put it back* — was a link to `/`. It
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
 * there is no log to replay and nothing to contest. What was missing was only
 * the short piece between *here is an inverse* and *here is a proposal the Gate
 * can weigh*, and this module wrote it by hand for a week, filed as a finding
 * for `Loom daily build` because every stateless surface that ever offers an
 * undo would write it again.
 *
 * **It came back as `inverseInterpreter`, and the hand-written copy is gone**
 * ([0137](../../../../../../decisions/0137-an-undo-already-computed-is-assembled-by-the-runtime-and-stamped-by-its-caller.md)).
 * `revertInterpreter` is that same function with a log's half filled in, which
 * is the property worth having: the portal's undo and the front door's are one
 * implementation of the head check rather than two readings of one rule.
 *
 * The one thing not borrowed is the runtime's `REVERT_INTERPRETER` stamp. That
 * is what `revertInterpreter` puts on a delta *it* planned off a store, and
 * claiming it for a delta planned somewhere else would be this site lying in its
 * own provenance — on the page whose entire argument is that provenance is worth
 * something. So the field has no default and this module names it.
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
 * What the sequence is handed, for an undo this page already has in hand.
 *
 * The thirty lines that used to sit here are gone, and the reason is the best
 * kind: this lane filed on 5 September that *a stateless surface can compute an
 * undo and cannot assemble one*, and `Loom daily build` answered it with
 * `inverseInterpreter`
 * ([0137](../../../../../../decisions/0137-an-undo-already-computed-is-assembled-by-the-runtime-and-stamped-by-its-caller.md)).
 * `revertInterpreter` is now that same function with a log's half filled in, so
 * the portal's undo and this one are one implementation of the head check, the
 * record of where the change came from, and the shape of what is put to the
 * rules.
 *
 * **The stamp stays ours, and that is deliberate.** The interpreter id has no
 * default and never will: the runtime's own means *this came off a log*, and a
 * page that claimed it for a change it planned itself would be this site lying
 * in the one field its whole argument is about.
 *
 * The head check is not defensive coding, and it is why this is safe to hand
 * straight to the sequence with no write path in front of it. The change that
 * reverses a change is written against one arrangement of the page, and offering
 * it against another would be proposing something whose reasoning has expired —
 * the stale proposal the whole sequence exists to catch.
 */
export const frontDoorUndo = (inverse: TreeDelta): ComputedInverse => ({
  operations: inverse.operations,
  headRevision: inverse.baseRevision,
  interpreter: FRONT_DOOR_UNDO_INTERPRETER,
  rationale: `Reverses the change applied at revision ${inverse.baseRevision}.`,
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
    interpreter: inverseInterpreter(frontDoorUndo(inverse), idFactory, systemClock),
    policySource: fixedPolicy(FRONT_DOOR_POLICY),
    /**
     * The same floors as the change this reverses, and for the same reason the
     * rules are the same: an undo exempt from a check the change had to pass
     * would be this site demonstrating reversibility under easier terms than the
     * thing it reverses.
     */
    propsVocabulary: SITE_PROPS_VOCABULARY,
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
