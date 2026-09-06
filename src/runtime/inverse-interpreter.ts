import type { IdFactory } from "../ids.js"
import { err, ok } from "../result.js"
import type { TreeOperation } from "../tree/delta.js"
import type { LoomTree } from "../tree/tree.js"

import type { Clock } from "./events.js"
import type { EditIntent } from "./intent.js"
import type { ChangeInterpreter } from "./interpreter.js"
import type { DiscardedWork } from "./proposal.js"

/**
 * Proposing an inverse that is already in hand.
 *
 * The runtime computes the inverse of every change at assessment time
 * (`assessReversibility`), and until now the only way to *offer* one back was
 * `revertRevision`, which plans an undo by replaying a store. That is the right
 * path when the undo is being recovered from a log — it has to read one to know
 * what has been built on top since (0035).
 *
 * It is the wrong path, and an unreachable one, when the inverse never left the
 * process. A surface that composed a change and still holds the `Reversibility`
 * it produced has no log to replay and nothing to contest: the whole of what it
 * needs is the short piece between *here is an inverse* and *here is a proposal
 * the Gate can weigh*. `Loom marketing` wrote that piece by hand on 5 September
 * to make the front door's *Put it back* do what it says, and filed it, because
 * the alternative is every stateless surface rebuilding the same thirty lines
 * with its own idea of what an undo's provenance says.
 *
 * So this is the assembled version, and `revertInterpreter` is now it plus the
 * two things only a log can supply: a rationale naming the revision, and the
 * declaration of what applying it writes over.
 */

/**
 * The inverse, as little of it as proposing one needs.
 *
 * A `TreeDelta` satisfies this, which is the common case — it is what
 * `Reversibility.inverse` hands back. A caller holding operations and the
 * revision they were computed against, and no delta yet, satisfies it too: the
 * delta id and tree id belong to the delta this proposes, not to the inverse it
 * proposes from.
 */
export type ProposableInverse = {
  /** The revision the operations were computed against. */
  readonly baseRevision: number
  readonly operations: readonly TreeOperation[]
}

/**
 * What the interpreter cannot compute, because it depends on where the inverse
 * came from.
 *
 * Both are required rather than defaulted. A default interpreter id would put
 * one stamp on undos planned by unrelated callers, and reading that stamp back
 * is how a surface tells an undo from a change — `(demo)` does exactly that
 * against `REVERT_INTERPRETER`. A default rationale would be the runtime
 * writing a sentence about a provenance it does not know, on the one field the
 * person answering a hold actually reads (0019).
 */
export type InverseTerms = {
  /** What produced the delta, for `Provenance.interpreter`. Not a model. */
  readonly interpreter: string
  /** Why, in the words the person answering a hold is shown. */
  readonly rationale: string
  /**
   * Work applying this inverse would write over. Only a caller holding a log
   * can know of any, and absence keeps meaning "nobody looked at a log" rather
   * than "a log was checked and was clean" (0035).
   */
  readonly discards?: readonly DiscardedWork[]
  /**
   * The revision this puts back, recorded on the provenance the log keeps.
   *
   * Optional because not every inverse has one to name. A stateless surface
   * undoing a change it made in the same session has no revision — nothing was
   * ever appended — and stamping a number it does not have would be worse than
   * the absence. A caller that planned the undo off a log always does.
   */
  readonly undoes?: number
}

/**
 * An interpreter that has nothing to interpret.
 *
 * The seam exists because interpretation is the non-deterministic step (0005),
 * not because it is always a model — and an undo is the case that proves the
 * seam was drawn in the right place. Everything downstream of it cannot tell
 * that no model was involved, which is exactly what makes an undo gateable on
 * the same terms as an AI-authored change.
 *
 * `confidence` is 1 because the inverse is computed, not guessed. That is the
 * honest self-grade (0007), and it is also why `authoredBy` is `runtime`: a 1
 * nobody graded is not a claim, and calibration (0031) segments these out of its
 * score rather than letting every undo walk the top band toward a perfect record
 * the model never earned.
 */
export const inverseInterpreter = (
  inverse: ProposableInverse,
  terms: InverseTerms,
  idFactory: IdFactory,
  clock: Clock
): ChangeInterpreter => ({
  interpret: (intent: EditIntent, tree: LoomTree) =>
    Promise.resolve(
      /**
       * An inverse is computed against one arrangement of a tree. Offering it
       * against another would be proposing something whose reasoning has
       * expired, so it declines rather than proposing. The write path refuses a
       * moved head before reaching here; this is what keeps the interpreter safe
       * to wire into a runtime directly, which a stateless caller does.
       */
      tree.revision === inverse.baseRevision
        ? ok({
            proposalId: idFactory.proposalId(),
            intentId: intent.intentId,
            delta: {
              deltaId: idFactory.deltaId(),
              treeId: tree.treeId,
              baseRevision: tree.revision,
              operations: inverse.operations,
            },
            rationale: terms.rationale,
            ...(terms.discards === undefined || terms.discards.length === 0
              ? {}
              : { discards: terms.discards }),
            provenance: {
              origin: intent.origin,
              ...(intent.actor === undefined ? {} : { actor: intent.actor }),
              interpreter: terms.interpreter,
              /** Computed, not inferred — so calibration leaves it out (0031). */
              authoredBy: "runtime",
              ...(terms.undoes === undefined ? {} : { undoes: terms.undoes }),
              confidence: 1,
              interpretedAt: clock.now(),
            },
          })
        : err({
            code: "refused",
            detail: `the inverse was computed against revision ${inverse.baseRevision}, and this tree is at ${tree.revision}`,
          })
    ),
})
