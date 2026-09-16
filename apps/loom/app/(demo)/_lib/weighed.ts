import { reversibilityWord, STAKES } from "@/app/(portal)/_lib/vocabulary"

import type { ChangeRecord, ReversibilityView, StakesView } from "./record"

/**
 * The two questions the rail promises, and the answers the record already had.
 *
 * `WhatHappens` step two tells a first-time visitor, before they press
 * anything, that *every ask is weighed on two questions: how much damage could
 * this do, and can it be taken back?* It is the demo's best sentence about the
 * Gate — the whole mechanism in one line with no vocabulary in it.
 *
 * **Then the card answered neither of them.** In plain view a held change
 * reported the rule's conclusion — *"Riskier than a request from here is
 * allowed to be without asking."*, which is what the shared vocabulary printed
 * for `stakes-above-ceiling` when this was written and not what it prints today
 * — and stopped. Both answers had been on the
 * record since this surface was built, one click down, in the runtime's own
 * shorthand: `stakes: medium`, `reversible: yes`, `undo carries: 4 nodes`. So a
 * stranger was told what would be weighed, watched a verdict arrive, and never
 * saw the weighing. What they leave with is *some rule stopped it*, which is an
 * assertion. What was on offer is *this could take four things off the page,
 * and every one of them is kept so it can go back* — which is the argument.
 *
 * The second answer is also the sentence that makes the green button pressable.
 * The card's line above the buttons now reads *"This comes off the page, and
 * everything under it goes too"*, and until this module there was nothing
 * anywhere near it saying the page could be put back — a stranger was asked to
 * commit to a described loss, with the reassurance three clicks away as `undo
 * carries: 4 nodes` and the button that spends it only appearing *after* they
 * had said yes.
 *
 * **Nothing here is new vocabulary.** The stakes sentences are the portal's
 * `STAKES` table and the reversibility clause is its `reversibilityWord`, both
 * already exported and neither previously read by this surface. That is
 * deliberate: a visitor told *"Some risk"* here and a reviewer told the same
 * thing three files away are looking at one product, and a second table in this
 * lane would be a second product's worth of drift waiting to happen.
 *
 * What this module adds is the *pairing* — that these two answers are the
 * answers to two questions a visitor was asked to hold in their head sixty
 * seconds ago, printed in the words they were asked in. The questions are one
 * constant, read by the rail that promises them and by the card that answers
 * them, so the promise and the answer cannot drift apart without a test going
 * red.
 *
 * A pure function over the record, with no React in it, because which sentence
 * a level or a retained count earns is the part worth testing.
 */

/**
 * The two questions, in one place.
 *
 * Phrased as questions rather than as labels (`Risk`, `Reversible`) because
 * that is how the rail introduces them, and a label is a field name wearing a
 * plain word. `WhatHappens` composes its step from these; the card heads its
 * answers with them.
 */
export const WEIGHED_QUESTIONS = {
  damage: "How much damage could this do?",
  reversal: "Can it be taken back?",
} as const

export type WeighedAnswer = {
  readonly question: string
  /** The answer in two or three words, which is what the eye takes. */
  readonly verdict: string
  /** What that verdict means for the person about to decide. */
  readonly meaning: string
}

/**
 * What the record is holding, as a clause that agrees with its own number.
 *
 * The count came through a `plural` helper that inflected the noun and left the
 * verb behind, so a change retaining one node read *"The 1 piece it takes off
 * the page **are** kept"* — on the free-text path, which is the one a curious
 * visitor types into, and in the one box on this card written to be the plain
 * half of the record. Both halves of the agreement are here now, in one place,
 * because splitting a number from its verb is how they came apart.
 *
 * The numeral is spelled at one for the same reason the rest of this box has no
 * digits in it: *"The 1 piece"* is a field value in a sentence, and everything
 * around it is prose.
 */
const keptClause = (count: number): string =>
  count === 1
    ? "The one piece it takes off the page is kept"
    : `The ${count} pieces it takes off the page are kept`

/**
 * How much damage, in the portal's words for the level rather than the level.
 *
 * The factors that produced it — `large-removal`, `shallow-structural-change` —
 * stay in the technical record, where they already are and where nothing has
 * been removed from. They are the runtime's evidence for this sentence, and a
 * card that led with them would be back to printing codes at a stranger.
 */
const damageAnswer = (stakes: StakesView): WeighedAnswer => ({
  question: WEIGHED_QUESTIONS.damage,
  verdict: STAKES[stakes.level].label,
  meaning: STAKES[stakes.level].meaning,
})

/**
 * Whether it can be taken back, and — the part only this surface can say — what
 * makes the answer true.
 *
 * `retainedNodeCount` is the runtime's count of what a removal destroyed, which
 * the inverse has to carry to be exact (`reversibility.ts`). It is the most
 * persuasive number on the record and it was printed as *"undo carries: 4
 * nodes"*, four clicks and one glossary from meaning anything. Said plainly it
 * is the reason the undo is real rather than a promise: the page has not been
 * asked to remember what it looked like, the record is holding the removed
 * content itself.
 *
 * It says the opposite *exists*, never that pressing the button puts the page
 * back at once — an undo is a change of its own and is gated like any other
 * (0032), and a sentence here promising otherwise would be the same defect one
 * control further along, which `UNDO_CAUTION` was written to stop.
 *
 * A change that removes nothing has nothing to retain, so the count is zero and
 * the clause about kept pieces would be a lie about a theme swap. It gets the
 * shorter sentence instead.
 */
const reversalAnswer = (reversibility: ReversibilityView): WeighedAnswer => {
  if (!reversibility.reversible) {
    return {
      question: WEIGHED_QUESTIONS.reversal,
      verdict: "No",
      meaning: `Undoing it would not put everything back the way it was — ${reversibilityWord(false)}.`,
    }
  }

  return {
    question: WEIGHED_QUESTIONS.reversal,
    verdict: "Yes",
    meaning:
      reversibility.retainedNodeCount > 0
        ? `${keptClause(reversibility.retainedNodeCount)}, so the exact opposite of this change already exists.`
        : "Nothing is destroyed by it, so the exact opposite of this change already exists.",
  }
}

/**
 * The pair, or nothing.
 *
 * Absent when the ask never reached assessment — an utterance no interpreter
 * could make a delta from has no stakes and no inverse, and a card inventing
 * *"Low risk"* for it would be the surface answering a question the runtime
 * never asked.
 */
export const weighedOf = (record: ChangeRecord): readonly WeighedAnswer[] | undefined =>
  record.stakes === undefined || record.reversibility === undefined
    ? undefined
    : [damageAnswer(record.stakes), reversalAnswer(record.reversibility)]

/**
 * The same pair in one line, for a card a visitor has already read.
 *
 * The box above is the argument, and it is the *first* card's argument. By the
 * fifth ask the rail was printing it five times — measured at 1280×900, a
 * hundred and fifty pixels of panel per card with the same two questions on
 * every one of them, in a rail 3,851px long against 857px of screen. A visitor
 * scrolling that is not reading the weighing again; they are looking for the
 * one line that says which ask this card is.
 *
 * So the pair folds to this, and the box is one click under it. **Nothing is
 * removed** — `TheReasoning` puts the whole panel, the rule and the ceiling
 * behind the summary this string is, which is the maintainer's standing
 * direction for this surface applied to repetition rather than to vocabulary.
 *
 * **Not a third wording.** The level is `STAKES[…].label`, the same string the
 * damage answer prints, and the clause is the portal's `reversibilityWord` —
 * whose own note says the two clauses "read straight after a stakes label
 * without a colon in sight", which is exactly the sentence wanted here and the
 * reason this needed no new words. A summary that paraphrased its own panel is
 * the drift this module exists to refuse, and `weighed.test.ts` asserts the
 * brief and the open answers name the same level and the same direction.
 *
 * Absent on the same terms as the pair: an ask that never reached assessment
 * has nothing to be brief about, and `TheReasoning` falls back to naming what
 * is behind the arrow rather than claiming a verdict.
 */
export const weighedBrief = (record: ChangeRecord): string | undefined =>
  record.stakes === undefined || record.reversibility === undefined
    ? undefined
    : `${STAKES[record.stakes.level].label}, and ${reversibilityWord(record.reversibility.reversible)}.`
