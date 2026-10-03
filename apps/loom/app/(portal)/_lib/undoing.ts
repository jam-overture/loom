import type { AssessmentSummary } from "@jam-overture/loom/telemetry"

import { irreversibilityPlain, unnamedObstacle, type PlainWord } from "./vocabulary"

/**
 * Why a change cannot be cleanly undone — which Loom computes, records, and has
 * never said out loud anywhere.
 *
 * ## The defect
 *
 * Every screen in this portal that mentions undo says one of two things:
 * *you could undo it* or *this one can't be undone* (`reversibilityWord`). Both
 * are true and the second one is the worst kind of warning: it tells a reader to
 * be careful and nothing at all about what to be careful of.
 *
 * The runtime is not being vague. `assessReversibility` computes **exactly two**
 * obstacles, and they call for opposite things from the person reading:
 *
 * | the runtime's code | what it actually means | what a person should do |
 * | --- | --- | --- |
 * | `out-of-tree-effect` | undoing the page would not undo *reality* — the change configures a part that takes a payment or sends something | go and look at whatever that part is wired to, before saying yes |
 * | `retention-budget-exceeded` | putting it back would mean holding more removed content than this project's rules allow | decide whether the content is worth keeping, because the rest of it will not come back |
 *
 * One is *"the page is recoverable and the world is not"*. The other is *"the
 * world is fine and the page is not fully recoverable"*. Collapsing both into
 * `this one can't be undone` is not a simplification, it is the loss of the only
 * part a reader could act on.
 *
 * ## What this tells somebody that nothing else can
 *
 * Nothing. Not `git log`, not a diff, not a server log — because neither fact is
 * a property of the change on its own. `out-of-tree-effect` is the *deployment's
 * own* declaration (`outOfTreeEffectTypes` in its rules) crossed with what the
 * model proposed; `retention-budget-exceeded` is arithmetic over the proposed
 * removal against a budget the deployment set. Both are produced at the moment
 * of judgement and exist only in Loom's record of it.
 *
 * ## Where the reasons are legible, and where they are not
 *
 * This reads an `AssessmentSummary` — the journalled record — because that is
 * the one place the reasons survive as data (`irreversibilityReasons`, a list of
 * codes). The review queue reads a `Disposition` instead, where the Gate has
 * already joined the same codes into the prose of `reason.detail`, so the screen
 * that is actually asking somebody to decide cannot read them. Filed as a
 * finding rather than worked around: mining tokens out of a sentence meant for a
 * reader is a reading that breaks silently the first time the sentence is
 * reworded, and this module would then be confidently wrong instead of absent.
 *
 * ## The invariant, and why it is not assumed
 *
 * A real run of the runtime sets `reversible` to `reasons.length === 0`, so the
 * two can never disagree. `assessmentSummarySchema` does not couple them, and a
 * record read back from storage — written by another version, or by a host's own
 * tooling — can hold either mismatch. So `reversible` leads, because it is what
 * the Gate acted on and what the reader was told, and a record that gives no
 * reason says so rather than being rendered as a change with nothing wrong.
 */

/** One obstacle to undoing, in a person's words, with the runtime's code kept. */
export type UndoObstacle = PlainWord

export type UndoStanding = {
  /**
   * What the Gate decided, which is the sentence the reader has already met.
   * Read off `reversible` and never inferred from the reasons.
   */
  readonly undoable: boolean
  /**
   * One per recorded reason, in the order the record holds them. A code this
   * portal has no sentence for still appears — nothing is dropped to make the
   * list tidy, which is the whole plain-language rule and not a courtesy.
   */
  readonly obstacles: readonly UndoObstacle[]
  /**
   * The record says it cannot be cleanly undone and gives no reason why.
   *
   * Unreachable from a run of Loom and representable in a stored record, which
   * is a real input to this surface. Saying so is cheaper than the alternative:
   * a card showing the warning and an empty list reads as a portal that lost
   * the explanation, and this says which of the two happened.
   */
  readonly unexplained: boolean
}

/**
 * How many parts putting it back would have to carry, when that is the obstacle.
 *
 * `retainedNodeCount` is on every summary and is only *the* number for one of
 * the two codes — for an out-of-tree effect a retained count of nine says
 * nothing about why undo would not undo anything. So the count is spliced into
 * the one sentence it belongs to rather than printed beside both.
 *
 * Zero is left out rather than written. `retainedNodeCount` is the removed
 * count, so a budget exceeded by a change that removed nothing is a record
 * contradicting itself, and "putting back the 0 parts it removes" is that
 * contradiction rendered as a sentence.
 */
const withRetainedCount = (word: PlainWord, retainedNodeCount: number): PlainWord =>
  retainedNodeCount === 0
    ? word
    : {
        ...word,
        meaning: `${word.meaning} This one takes ${retainedNodeCount} ${
          retainedNodeCount === 1 ? "part" : "parts"
        } off the page.`,
      }

/**
 * The standing of one assessed change, as a reader meets it.
 *
 * Pure and takes the record rather than reading one, for the reason every
 * `_lib` reading in this route group is: a line on Activity is one of many
 * drawn from one fan-out, and this has to be assertable without a journal.
 */
export const undoStandingOf = (assessment: AssessmentSummary): UndoStanding => {
  const obstacles = assessment.irreversibilityReasons.map((code) => {
    const named = irreversibilityPlain(code)
    if (named === undefined) return unnamedObstacle(code)

    return code === "retention-budget-exceeded"
      ? withRetainedCount(named, assessment.retainedNodeCount)
      : named
  })

  return {
    undoable: assessment.reversible,
    obstacles,
    unexplained: !assessment.reversible && obstacles.length === 0,
  }
}

/**
 * Whether there is anything here for a screen to draw.
 *
 * A change the Gate called undoable is the ordinary case and gets no section:
 * the shape line above it already says *you could undo it*, and a second
 * paragraph confirming that nothing is wrong is the kind of addition that makes
 * a screen longer without making it say more.
 *
 * It is a function rather than an `if` at each point of use because two
 * conditions make a section worth drawing — an obstacle, or a warning with no
 * obstacle behind it — and a screen that checked only the first would silently
 * drop the state this module exists to name.
 */
export const hasUndoObstacle = (standing: UndoStanding): boolean =>
  standing.obstacles.length > 0 || standing.unexplained
