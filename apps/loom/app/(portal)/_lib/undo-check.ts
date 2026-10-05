import type { ProposalId, TreeId } from "@jam-overture/loom"
import {
  describeTelemetryError,
  type AssessmentSummary,
  type TelemetryJournal,
} from "@jam-overture/loom/telemetry"

import { undoStandingOf, type UndoStanding } from "./undoing"

/**
 * Whether undoing a revision would undo everything it did — asked of the
 * journal, for the one screen that offers to undo it.
 *
 * ## The gap this closes
 *
 * `/portal/history` has `ReversalNote`, and it is the best thing on this
 * surface: it inverts the log and says what undoing a revision would put back
 * and what later work it would write over. Every word of it is about the
 * **page**, because `planRevert` is about the page.
 *
 * The Gate's irreversibility is the other question, and from the outside the
 * two look identical. A tree-level inverse always exists (0016), so a change
 * that took a payment has a perfectly clean `Reversal` — and until now this
 * screen drew the undo button over it with no notice at all. *"If you undo
 * this, Loom puts back: the card “Autumn sign-up”"* is true, complete about the
 * page, and silent about the charge.
 *
 * This lane filed that on 3 October as a **question** rather than an ask — *is
 * reversibility a property of a revision the log should carry, or a property of
 * the judgment that should be joined to it?* — with its own answer being the
 * join. [0225] is the join: `TelemetryJournal.assessments` answers about a set
 * of proposals a caller already holds, bounded by how many ids it will look at.
 *
 * ## Three absences, and only one of them is this screen's to say out loud
 *
 * The framework's own contract is explicit that these must not collapse:
 *
 * > *"truncating silently would make* not looked up *and* nothing recorded *the
 * > same empty answer at the one place a reader is being asked to decide
 * > something."*
 *
 * So:
 *
 * | why a row has no standing | what the screen does |
 * | --- | --- |
 * | **nothing recorded** — no judgment in the journal for that proposal | nothing, per row |
 * | **not looked up** — more revisions on screen than one lookup answers | one line, once, naming how many |
 * | **the journal would not answer** | one line, once, with the error below it |
 *
 * The first is silent on purpose and is the common case: a revision the runtime
 * authored — an undo, a repair — has no model's judgment behind it, and a
 * deployment with no journal configured has none for anything. A line on every
 * row saying *we could not check* would be noise on every screen in the
 * ordinary case, and the ordinary case is *there was nothing to check*.
 *
 * The other two are the screen's own ignorance rather than the record's
 * silence, and they are said once rather than per row because they are facts
 * about the read and not about any one change.
 */

/** What this screen managed to find out about undoing the revisions it shows. */
export type UndoCheck = {
  /** By revision, for the rows a judgment was found for. */
  readonly standings: ReadonlyMap<number, UndoStanding>
  /**
   * Said once when the read could not be made or could not reach every row.
   *
   * `null` when the screen knows as much as the record does — which includes a
   * deployment whose journal holds nothing at all, because *nothing recorded*
   * is an answer and not a gap.
   */
  readonly gap: UndoGap | null
}

export type UndoGap = {
  /** One sentence, for somebody who has read no decision record. */
  readonly reading: string
  /** The runtime's own account, when there is one. */
  readonly technical?: string
}

/**
 * Ask about the revisions on screen, and never about more than that.
 *
 * Takes the journal rather than reaching for one, like every other reading in
 * this route group: a screen that could not be tested without a journal is a
 * screen whose states are only reachable by configuring a database.
 */
export const checkUndo = async (
  journal: TelemetryJournal,
  treeId: TreeId,
  /**
   * The rows on screen, carrying both halves of the join.
   *
   * A row is keyed by revision and the journal answers by proposal, and a
   * `StoredRevision` is the one place both are already together — so the pairing
   * is made from what the caller already has rather than rebuilt from a second
   * read.
   */
  shown: readonly Shown[]
): Promise<UndoCheck> => {
  if (shown.length === 0) return { standings: new Map(), gap: null }

  const looked = await journal.assessments({
    proposalIds: shown.map((row) => row.proposalId),
    treeId,
  })

  if (!looked.ok) {
    return {
      standings: new Map(),
      gap: {
        reading:
          "Loom couldn’t check whether any of these changes reach beyond the page, so it isn’t saying. Undoing one still puts the page back exactly as it is described below — what can’t be checked right now is whether anything happened outside it.",
        technical: describeTelemetryError(looked.error),
      },
    }
  }

  return {
    standings: standingsBy(shown, looked.value.assessments),
    gap: gapFor(looked.value.unasked.length),
  }
}

/** The half of a revision this reading needs. `StoredRevision` satisfies it. */
export type Shown = {
  readonly revision: number
  readonly proposalId: ProposalId
}

/**
 * The lookup's answer, keyed by the thing a row has.
 *
 * A row holds a revision number; the journal answers by proposal. The caller
 * knows both, so the pairing happens here once rather than in the row — and
 * `proposalIds` arriving in revision order is what makes the two line up
 * without a second map.
 */
const standingsBy = (
  shown: readonly Shown[],
  assessments: ReadonlyMap<ProposalId, AssessmentSummary>
): ReadonlyMap<number, UndoStanding> => {
  const standings = new Map<number, UndoStanding>()

  for (const row of shown) {
    const assessment = assessments.get(row.proposalId)
    /*
     * Absent is *nothing recorded*, which is an answer rather than a gap — a
     * revision the runtime authored has no model's judgment behind it. The row
     * is left out of the map, and the row renders nothing.
     */
    if (assessment !== undefined) standings.set(row.revision, undoStandingOf(assessment))
  }

  return standings
}

/**
 * One sentence about the rows the lookup did not reach, or nothing.
 *
 * Unreachable in practice — a history page shows a page of revisions and the
 * cap is deliberately larger than the store's widest page, which the cap's own
 * comment says is the whole point. It is handled anyway because *unreachable in
 * practice* is a claim about two numbers in two packages, and the failure if
 * either moves is the silent one this module exists to prevent.
 */
const gapFor = (unasked: number): UndoGap | null =>
  unasked === 0
    ? null
    : {
        reading: `Loom checked whether these changes reach beyond the page for all but ${unasked} of them, which is more than it looks at in one go. The ${unasked} it didn’t reach are the oldest shown.`,
      }
