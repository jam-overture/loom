import type { IdFactory } from "../ids.js"
import { err, ok } from "../result.js"
import type { TreeOperation } from "../tree/delta.js"
import type { LoomTree } from "../tree/tree.js"

import type { Clock } from "./events.js"
import type { EditIntent } from "./intent.js"
import type { ChangeInterpreter } from "./interpreter.js"
import type { DiscardedWork } from "./proposal.js"

/**
 * An undo that is already computed, offered as a change like any other.
 *
 * The runtime writes an inverse every time a change applies, so a surface that
 * ran the change is holding the undo before anybody asks for it. What it is not
 * holding is a *proposal*: the short piece between "here are the operations that
 * put it back" and "here is something the Gate can weigh" — a proposal id, the
 * delta stated against the tree in hand, a rationale, and provenance that says
 * the runtime computed this rather than a model guessing it.
 *
 * `revertInterpreter` has assembled that piece since undo landed, and only ever
 * for a caller with a store: it takes a `RevertablePlan`, which is a reading of
 * a log. A surface with no store — the front door, a preview, anything that
 * demonstrates on one request and keeps nothing (0081) — could compute an undo
 * and could not assemble one, so it wrote this by hand. The marketing lane did,
 * in about thirty lines, and filed the fact as the finding.
 *
 * So the store-shaped half comes out. What is left is the whole of what a
 * stateless caller needs and exactly what `revertInterpreter` is built from,
 * which is the property that keeps the two honest: a surface offering an undo
 * gets the portal's behaviour rather than its own reading of it.
 */

/**
 * The operations that put something back, and what to say about them.
 *
 * `interpreter` has no default on purpose. It is the stamp a reader uses to
 * decide whether a record is an undo the runtime planned — `REVERT_INTERPRETER`
 * means "this came off a log", and a caller inheriting that for a delta planned
 * somewhere else would be lying in its own provenance. Naming it is one line and
 * it is the line that stays true.
 */
export type ComputedInverse = {
  /** The undo, as operations. The delta's id and base belong to the proposal. */
  readonly operations: readonly TreeOperation[]
  /**
   * The revision the operations were computed against.
   *
   * An inverse is only an inverse of one arrangement. Offered against another it
   * would be proposing something whose reasoning has expired, so the interpreter
   * declines rather than proposing it — which is what makes this safe to wire
   * into a runtime directly, with no write path in front of it.
   */
  readonly headRevision: number
  /** What produced the delta, for `Provenance.interpreter`. Not a model. */
  readonly interpreter: string
  /** Why, in the words the person answering a hold reads (0019). */
  readonly rationale: string
  /**
   * Work this undo writes over, when the caller knows of some.
   *
   * Only a caller that read a log can know, so it is absent by default and
   * absence keeps meaning "nobody looked" rather than "a log was checked and was
   * clean" (0035).
   */
  readonly discards?: readonly DiscardedWork[]
  /**
   * The revision this puts back, recorded on the provenance the log keeps.
   *
   * Optional because not every inverse has one to name. A stateless surface
   * undoing a change it made in the same session has no revision — nothing was
   * ever appended — and stamping a number it does not have would be worse than
   * the absence. A caller that planned the undo off a log always does (0111).
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
  inverse: ComputedInverse,
  idFactory: IdFactory,
  clock: Clock
): ChangeInterpreter => ({
  interpret: (intent: EditIntent, tree: LoomTree) =>
    Promise.resolve(
      tree.revision === inverse.headRevision
        ? ok({
            proposalId: idFactory.proposalId(),
            intentId: intent.intentId,
            delta: {
              deltaId: idFactory.deltaId(),
              treeId: tree.treeId,
              baseRevision: tree.revision,
              operations: inverse.operations,
            },
            rationale: inverse.rationale,
            ...(inverse.discards === undefined || inverse.discards.length === 0
              ? {}
              : { discards: inverse.discards }),
            provenance: {
              origin: intent.origin,
              ...(intent.actor === undefined ? {} : { actor: intent.actor }),
              interpreter: inverse.interpreter,
              ...(inverse.undoes === undefined ? {} : { undoes: inverse.undoes }),
              /** Computed, not inferred — so calibration leaves it out (0031). */
              authoredBy: "runtime",
              confidence: 1,
              interpretedAt: clock.now(),
            },
          })
        : err({
            code: "refused",
            detail: `the undo was computed against revision ${inverse.headRevision}, and this tree is at ${tree.revision}`,
          })
    ),
})
