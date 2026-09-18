import type { LoomTree, TreeDelta } from "@loom/runtime"
import type { CopyDeclarations } from "@loom/runtime/sdk"

import { inertNote, plainEffect, plainObstacle } from "./effect-view"
import { describeProposalEffect, type ProposalEffect } from "./proposal-effect"
import type { PlainLine, PlainWord } from "./vocabulary"

/**
 * What a waiting change would do to the page, for somebody deciding which one
 * to open first.
 *
 * ## The gap this closes
 *
 * `/portal` lists every change waiting on a person, wherever it is. Until now a
 * row of that queue said what somebody asked for, why Loom stopped, and what
 * either answer would set in motion — and never what the change itself would
 * *do*. So the queue could tell a reader that three changes were waiting and
 * could not tell them that one of the three deletes their pricing section. The
 * only way to find out which was the big one was to open all three.
 *
 * That is the triage question, and it is the one thing a queue is for.
 *
 * ## Why this is not the review card with the buttons taken off
 *
 * `WaitingCard` argued for a fortnight that the front door could not say this,
 * because a *before* the reader cannot see is worse than no before. The
 * argument is right and this does not contradict it: what goes on a queue row
 * is the forward sentence — *"Deletes the card “Prices” n_h, and the 12 pieces
 * inside it"* — which is self-contained and needs nothing on screen beside it.
 * What stays on the page screen is the before: the values a reconfigure would
 * overwrite, the place in the page, the words arriving and leaving, the whole
 * of `plainEffect`. This is a preview of the first two steps and the reason it
 * would not land, and it ends where the reader has enough to choose.
 *
 * The other half of that argument was a cost claim — *"this one has read no
 * trees at all"* — and it was already false when it was written. The front door
 * reads the head of every page it names, including every page a hold sits on,
 * and throws the tree away once it has taken the heading off it. See
 * `headsOf` in `page-name.ts`: the reading below is paid for and was being
 * discarded.
 *
 * ## One reading, two screens
 *
 * Everything here is selected from `plainEffect` and nothing is computed. That
 * is the property worth keeping: the front door and the page screen cannot
 * describe one held change two different ways, because there is one description
 * and this takes the first two sentences of it.
 */

/**
 * How many steps a queue row shows before it stops.
 *
 * Two, because a row is a row. A held delta is usually one operation and
 * occasionally several; what a reader needs from the front door is enough to
 * tell one waiting change from another, and the rest is one click away on the
 * screen that can show it properly.
 */
const PREVIEW_STEPS = 2

/**
 * A change whose delta has no operations in it.
 *
 * It should not happen and the queue must not render a silence if it does: an
 * empty list of steps under a heading that promises what a change would do
 * reads as a screen that failed rather than as a proposal that asks for
 * nothing.
 */
export const NO_STEPS: PlainWord = {
  label: "This change asks for nothing.",
  meaning:
    "It arrived with no steps in it, so there is nothing for Loom to do to the page either way.",
  technical: "the delta carries no operations",
}

/**
 * A change every step of which writes what is already on the page.
 *
 * `inertNote` says this on the page screen and says it at the foot, after the
 * steps, because a reader there has the page in front of them. On a queue row
 * it is the headline — it is the one thing that turns "open this next" into
 * "this one can wait" — so it is a `PlainWord` beside the obstacle rather than
 * a footnote under the preview.
 *
 * Whole-proposal only. `inertNote` also reports *some* of the steps being inert
 * and that is genuine detail for the screen with the page on it; on a row it
 * would be a caveat about a change the reader can still not see.
 */
export const NOTHING_WOULD_CHANGE: PlainWord = {
  label: "This would leave the page exactly as it is.",
  meaning:
    "Every step of it writes what is already there, so saying yes would change nothing you can see.",
  technical: "every operation inert",
}

export type WaitingTriage = {
  /** The first steps, each as one sentence with the part's name in the middle. */
  readonly steps: readonly PlainLine[]
  /**
   * How many steps are not in the preview. Said rather than dropped — a list of
   * two that is really five is an account of a change with three steps missing
   * and no way for a reader to tell.
   */
  readonly more: string | null
  /**
   * The one fact that changes what a reader should do with this row before they
   * open it: that the change would be refused as it stands, or that it would
   * achieve nothing. `null` on the ordinary waiting change, which is most of
   * them.
   */
  readonly standing: PlainWord | null
  /**
   * Every step in the runtime's own words — all of them, not the preview.
   *
   * The preview cut is a decision about a row's height and must not be a
   * decision about what a reader may find out. So the steps the row does not
   * show are one click down rather than gone, which is the rule this whole
   * surface is arranged around.
   */
  readonly technical: readonly string[]
}

/**
 * The standing of the whole proposal, in the order a reader needs it.
 *
 * An obstacle outranks inertness because they suggest opposite actions and only
 * one of them is available: a stale change is turned down and asked for again,
 * where a change that would do nothing can still be said yes to. A proposal that
 * would not apply is also never reported as inert — `inertNote` withholds itself
 * for exactly that reason, and this keeps the order it implies.
 */
const standingOf = (effect: ProposalEffect): PlainWord | null => {
  if (effect.operations.length === 0) return NO_STEPS

  const obstacle = plainObstacle(effect)
  if (obstacle !== null) return obstacle

  return inertNote(effect) !== null && effect.inertCount === effect.operations.length
    ? NOTHING_WOULD_CHANGE
    : null
}

export const triageOf = (effect: ProposalEffect): WaitingTriage => {
  const plain = plainEffect(effect)
  const hidden = plain.operations.length - PREVIEW_STEPS

  return {
    steps: plain.operations.slice(0, PREVIEW_STEPS).map((operation) => operation.reading),
    more: hidden > 0 ? `and ${hidden} more ${hidden === 1 ? "step" : "steps"}` : null,
    standing: standingOf(effect),
    technical: plain.operations.map((operation) => operation.technical),
  }
}

/**
 * The same reading, for a caller holding a page that may not have been read.
 *
 * `undefined` is the honest answer rather than an empty triage: a queue row with
 * no steps under it would be indistinguishable from a change that asks for
 * nothing, and those are opposite facts. The card says which of the two it is
 * looking at, so the read failure costs the reading and never the row.
 */
export const triageAgainst = (
  tree: LoomTree | undefined,
  delta: TreeDelta,
  copy: CopyDeclarations
): WaitingTriage | undefined =>
  tree === undefined ? undefined : triageOf(describeProposalEffect(tree, delta, copy))
