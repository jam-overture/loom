import type { Disposition, IrreversibilityReason } from "@jam-overture/loom"
import type { AssessmentSummary } from "@jam-overture/loom/telemetry"

import { plainPieceName } from "./piece-view"
import {
  irreversibilityPlain,
  namedList,
  unnamedObstacle,
  withOutOfTreeParts,
  type PlainWord,
} from "./vocabulary"

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
 * ## Two records, two fidelities, one reading
 *
 * The reasons arrive from two places and this module answers for both.
 *
 * - A **`Disposition`**, which is what a hold carries, so it is what the review
 *   queue has. Since [0222] it carries the reasons whole: the codes, the budget,
 *   and *which* registered pieces reach outside the page.
 * - An **`AssessmentSummary`**, the journalled record, which keeps the codes as
 *   `readonly string[]` so that a record outlives the version that wrote it,
 *   with `outOfTreeEffectTypes` and `retainedNodeCount` beside them.
 *
 * The first is richer and the second is older, and a screen must not be able to
 * tell which it was handed — the sentence a reader meets is the same sentence.
 * So both narrow to `UndoStanding` here rather than at two points of use.
 *
 * **This module shipped on 3 October reading only the second**, with the queue
 * left out and filed as a finding, because the Gate was flattening the codes
 * into the prose of `reason.detail` on the way to a hold and mining them back
 * out of a sentence meant for a reader is a reading that breaks silently the
 * first time somebody rewords it. `Loom daily build` closed that the next day.
 * The ask was one optional field; what arrived was that field **and** the piece
 * types, which is the second finding closed in the same breath.
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
const withRetainedCount = (
  word: PlainWord,
  retainedNodeCount: number,
  /**
   * What the deployment's rules actually allow, when the record knows it.
   *
   * A hold carries it and the journal does not, which is the one place the two
   * paths genuinely differ in what they can say — so it is optional here rather
   * than two near-identical sentences in two modules. *"takes 9 parts off the
   * page"* is what is at stake; *"and your rules keep at most 4"* is the number
   * a reader would have to go to another screen for.
   */
  budget?: number
): PlainWord =>
  retainedNodeCount === 0
    ? word
    : {
        ...word,
        meaning: `${word.meaning} This one takes ${retainedNodeCount} ${
          retainedNodeCount === 1 ? "part" : "parts"
        } off the page${budget === undefined ? "" : `, and your rules keep at most ${budget}`}.`,
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

    if (code === "retention-budget-exceeded") return withRetainedCount(named, assessment.retainedNodeCount)

    return withOutOfTreeParts(named, piecesIn(assessment.outOfTreeEffectTypes ?? []))
  })

  return {
    undoable: assessment.reversible,
    obstacles,
    unexplained: !assessment.reversible && obstacles.length === 0,
  }
}

/**
 * The pieces a reason blames, as a person would say them.
 *
 * `loom.form` is the deployment's own vocabulary and stays recognisable — it is
 * what somebody would grep their own code for — but `Form` is what goes in the
 * sentence. `plainPieceName` is the catalogue screen's reading of exactly this,
 * so the two screens name the same piece the same way.
 */
const piecesIn = (types: readonly string[]): string =>
  namedList(types.map((type) => plainPieceName(type)))

/**
 * The same standing, read off a judgment rather than off the journal.
 *
 * This is the review queue's entry point and the richer of the two: a
 * `Disposition` carries the reasons as the Gate built them, so the budget is a
 * number rather than an absence and the pieces are named rather than inferred.
 *
 * The absence of `irreversibilityReasons` is **two** different facts and
 * `reversible` is what tells them apart — the framework's own table, consumed
 * rather than restated: absent with `reversible` true is nothing fired, and
 * absent with `reversible` false is a judgment recorded before the field
 * existed. The second is exactly `unexplained`, which this module already had a
 * sentence for and which was until now unreachable from a real run.
 */
export const undoStandingFor = (disposition: Disposition): UndoStanding => {
  const obstacles = (disposition.irreversibilityReasons ?? []).map((reason) =>
    obstacleFor(reason)
  )

  return {
    undoable: disposition.reversible,
    obstacles,
    unexplained: !disposition.reversible && obstacles.length === 0,
  }
}

/**
 * One structured reason, as a sentence.
 *
 * `switch` over the discriminant rather than a lookup with a fallback, so a
 * third member added to `IrreversibilityReason` stops this file compiling. The
 * journal's path cannot have that — its codes are strings by design — which is
 * why `unnamedObstacle` exists over there and is not needed here.
 */
const obstacleFor = (reason: IrreversibilityReason): PlainWord => {
  const named = irreversibilityPlain(reason.code)!

  switch (reason.code) {
    case "out-of-tree-effect":
      return withOutOfTreeParts(named, piecesIn(reason.primitiveTypes))
    case "retention-budget-exceeded":
      return withRetainedCount(named, reason.retainedNodeCount, reason.budget)
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
