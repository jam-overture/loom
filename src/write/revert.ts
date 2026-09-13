import type { IdFactory, TreeId } from "../ids.js"
import type { Clock } from "../runtime/events.js"
import type { EditIntent, IntentOrigin } from "../runtime/intent.js"
import type { ChangeInterpreter } from "../runtime/interpreter.js"
import { inverseInterpreter } from "../runtime/inverse.js"
import type { CompositionRuntime } from "../runtime/pipeline.js"
import { describeRevertPlan, planRevert, type RevertPlan, type UnrevertablePlan } from "../store/revert.js"
import type { LoomTree } from "../tree/tree.js"

import { commitIntent, describeWriteOutcome, type WriteOutcome, type WritePath } from "./commit.js"

/**
 * Undo, as a change like any other.
 *
 * The runtime has always been able to *say* a change is reversible — the
 * inverse delta is computed at assessment time and carried through the
 * pipeline. Nothing applied it, so "reversible" was a claim the runtime made
 * about itself and never had to honour.
 *
 * This honours it without giving undo a private route. A revert is interpreted
 * (deterministically), proposed, assessed, gated, applied, and appended to the
 * log as a new revision — the same seven steps every other change takes. It is
 * therefore attributable to whoever asked for it, refusable by the Gate,
 * holdable for confirmation, visible to telemetry, and itself revertable.
 *
 * The alternative — rewinding the log, or applying the inverse straight to the
 * store — would make undo the one operation that changes a tree without being
 * judged, and the log the one record with a hole in it (0032).
 *
 * An undo whose target was built on afterwards is offered rather than refused
 * (0035). What made it refusable was that the Gate could not see the difference
 * between a clean undo and one that writes over later work; now the plan says so
 * and the proposal carries the declaration, so the Gate holds it for a person
 * instead of the runtime deciding on their behalf that they may not have it.
 */

/** What produced the delta, for `Provenance.interpreter`. Not a model. */
export const REVERT_INTERPRETER = "loom/revert"

export type RevertablePlan = Extract<RevertPlan, { readonly outcome: "revertable" }>

/**
 * What the undo is for, and — when there is one — what it costs.
 *
 * The cost is spelled out in the rationale as well as declared in `discards`,
 * because the two are read by different readers: the Gate reads the declaration,
 * and the person answering the hold reads this (0019 — the portal shows a
 * reviewer the reason, not a verdict).
 */
const rationaleFor = (plan: RevertablePlan): string => {
  const undoes = `Undoes revision ${plan.target.revision}, applied ${plan.target.appliedAt} from proposal ${plan.target.proposalId}.`
  if (plan.discards.length === 0) return undoes

  const revisions = plan.discards.map((discarded) => discarded.revision).join(", ")

  return `${undoes} Revision${
    plan.discards.length === 1 ? "" : "s"
  } ${revisions} changed nodes this undo touches, and applying it writes over what they did.`
}

/**
 * The same interpreter every undo uses, with the log's half filled in.
 *
 * Everything specific to a revert is here — the stamp that says this came off a
 * log, the rationale that names the revision and what it costs, and the work the
 * plan found to declare. What is left is `inverseInterpreter`, which a surface
 * with no store reaches for directly: the head check, the provenance of a
 * computed change, and the shape of the proposal are one implementation rather
 * than two that drift.
 */
export const revertInterpreter = (
  plan: RevertablePlan,
  idFactory: IdFactory,
  clock: Clock
): ChangeInterpreter =>
  inverseInterpreter(
    {
      operations: plan.operations,
      /**
       * The plan's contest check was made against one head. Judging it at a
       * different one would be judging a different question, so the interpreter
       * declines rather than proposing something whose reasoning has expired.
       * The write path refuses a moved head before reaching here; this is what
       * keeps the interpreter safe to wire into a runtime directly.
       */
      headRevision: plan.headRevision,
      interpreter: REVERT_INTERPRETER,
      rationale: rationaleFor(plan),
      /**
       * The same number the rationale states in a sentence, as a field. The
       * sentence is for the person answering a hold; this is for the surface
       * reading the log afterwards, which until now could only have the sentence.
       */
      undoes: plan.target.revision,
      /**
       * Declared only when there is something to declare, so absence keeps
       * meaning "nobody looked at a log" rather than "a log was checked and was
       * clean" (0035).
       */
      ...(plan.discards.length === 0 ? {} : { discards: plan.discards }),
    },
    idFactory,
    clock
  )

export type RevertRequest = {
  readonly treeId: TreeId
  /** The revision to undo. */
  readonly revision: number
  /** Replayed from, to recover the tree the target's delta observed (0028). */
  readonly seed: LoomTree
  readonly origin: IntentOrigin
  readonly actor?: string
}

export type RevertOutcome =
  | WriteOutcome
  /**
   * Nothing was proposed, because no undo could be computed: the revision is
   * outside the span the seed reaches, the log does not replay, or the delta does
   * not invert. Work the undo would write over is not one of these — that is a
   * proposal the Gate holds, not a plan that failed (0035).
   */
  | { readonly kind: "not-revertable"; readonly plan: UnrevertablePlan }

export const describeRevertOutcome = (outcome: RevertOutcome): string =>
  outcome.kind === "not-revertable"
    ? `not revertable: ${describeRevertPlan(outcome.plan)}`
    : describeWriteOutcome(outcome)

/**
 * The same runtime, interpreting reverts.
 *
 * Built field by field rather than spread, so that dropping the repairer is a
 * statement instead of an omission: repair (0006) exists to let a model try a
 * smaller version of what the Gate refused, and there is no smaller version of
 * an undo. A revert the Gate refuses is refused.
 */
const revertingRuntime = (
  runtime: CompositionRuntime,
  interpreter: ChangeInterpreter
): CompositionRuntime => ({
  interpreter,
  policySource: runtime.policySource,
  events: runtime.events,
  clock: runtime.clock,
  idFactory: runtime.idFactory,
})

/**
 * Undoes a revision, if the log allows it and the Gate agrees.
 *
 * The intent is synthesised here rather than taken from the caller, because the
 * utterance behind a revert is not a sentence someone typed — it is the
 * revision number they named. `origin` and `actor` are the caller's, and they
 * are what the Gate weighs and what provenance records: undoing a change is
 * still someone asking for a change.
 */
export const revertRevision = async (
  path: WritePath,
  request: RevertRequest
): Promise<RevertOutcome> => {
  const planned = await planRevert(path.store, {
    treeId: request.treeId,
    revision: request.revision,
    seed: request.seed,
  })

  if (!planned.ok) return { kind: "not-written", error: planned.error }
  if (planned.value.outcome !== "revertable") return { kind: "not-revertable", plan: planned.value }

  const plan = planned.value
  const { idFactory, clock } = path.runtime

  const intent: EditIntent = {
    intentId: idFactory.intentId(),
    treeId: request.treeId,
    baseRevision: plan.headRevision,
    origin: request.origin,
    ...(request.actor === undefined ? {} : { actor: request.actor }),
    utterance: `Undo revision ${request.revision}.`,
    observedAt: clock.now(),
  }

  return commitIntent(
    {
      store: path.store,
      holds: path.holds,
      runtime: revertingRuntime(path.runtime, revertInterpreter(plan, idFactory, clock)),
    },
    intent
  )
}
