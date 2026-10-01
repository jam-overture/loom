import type { ChangeRecord } from "./record"

/**
 * What asking for something else right now would cost a visitor.
 *
 * **The two presses this exists for**, measured at 1280×900 against a real
 * `next build`:
 *
 * | | the rail |
 * | --- | --- |
 * | press **Take the numbers off** — the big green button the panel leads with | `Waiting on you` · *“Take the numbers band off the page.”* |
 * | then press **Re-theme the whole page** — the first entry under *or ask for one of these* | `Applied` · *“Switch this page to the other palette.”*<br>`Nothing changed` · *“Take the numbers band off the page.”* |
 *
 * The demo asks a stranger a question, and the very next thing the panel invites
 * them to do **answers it for them, with no**. Nothing warned them before the
 * press, and nothing about the second button suggested it had anything to do
 * with the first.
 *
 * **Every step of it is correct**, which is why the fix is words rather than
 * behavior. The two low-risk presets land unattended, which moves the tree's
 * revision; a hold is judged against a base revision, and
 * `HeldProposal.baseRevision` going stale is the runtime's own way of saying
 * *Loom will not apply a decision to a page it has not seen*; and `moved.ts`
 * reports it accurately once it has happened. Nobody is wrong and the visitor
 * loses the question anyway.
 *
 * It is worse than one lost card. Driven with all five presets in order, three
 * of the five end `Nothing changed`, and those are the tallest cards in the
 * rail — so a visitor who presses every button, which is what the panel is for,
 * ends with a record three-fifths composed of asks that went nowhere.
 *
 * **Said before the press, at the control it is about.** That is the rule this
 * rail already follows twice — `AskPanel`'s own frame sentence says some asks
 * will wait for you before offering anything to press, and `ASK_AGAIN_CAUTION`
 * says a fresh ask may be held too, under the button that makes one. This is the
 * third, and it is the one the surface was missing at the moment it mattered
 * most.
 *
 * The other two shapes this lane filed on 15 September are deliberately not
 * taken. **Disabling the other asks** would be honest and would make the demo
 * feel narrower than it is at exactly the moment a visitor is exploring — the
 * asks really do work, and a stranger who wants to see the page move twice
 * should be allowed to. **Re-asking automatically** on the visitor's behalf is a
 * surface making a decision, on the one surface whose whole argument is that
 * decisions are recorded rather than assumed; it needs a record of its own, and
 * that is an argument worth having in its own unit rather than folded into this
 * one.
 */

/** A question the visitor can still answer, and what it would cost to lose it. */
export type SetAside = {
  /** How many are open. Plural is reachable: two asks held against one revision. */
  readonly questions: number
  /**
   * The newest open question's record, which is the anchor the caution offers.
   *
   * `record-card.tsx` puts `record.recordId` on the card's own element, so this
   * is a fragment that lands on the card carrying the buttons — inside the rail's
   * own scroller on a wide screen, and in the document on a phone.
   */
  readonly recordId: string
  /** The plain sentence, at the controls. */
  readonly sentence: string
  /** The words on the way out of it. */
  readonly answerLabel: string
}

/**
 * Why the press costs the question, in the visitor's terms rather than the
 * runtime's.
 *
 * It says what *they* would be doing — *anything else you ask for moves the page
 * on* — because on this surface the visitor is the only thing that can move it,
 * which is the same reading `movedOn`'s sentence takes after the fact. The two
 * are one claim said at two moments, and they must not drift: the test asserts
 * both name a page Loom has not seen.
 */
const sentenceFor = (questions: number): string =>
  questions === 1
    ? "One question is still waiting on you. Anything else you ask for moves the page on — and Loom won’t carry an answer onto a page it hasn’t seen, so that question would be set aside."
    : `${questions} questions are still waiting on you. Anything else you ask for moves the page on — and Loom won’t carry an answer onto a page it hasn’t seen, so they would be set aside.`

const ANSWER_ONE = "Answer it first"
const ANSWER_MANY = "Answer them first"

/**
 * The open questions, newest first, from the two halves that know.
 *
 * **Keyed on the store rather than on the record.** A record keeps the
 * `heldProposalId` it was written with, and what decides whether a question is
 * still live is whether the store still holds that proposal *and* whether the
 * page has moved past it — neither of which is a fact about the record. So the
 * caller passes the proposal ids it has already worked out are answerable
 * (`page.tsx` builds exactly that list, for the readings it computes against the
 * tree), and a record whose hold is spent, declined or dead simply is not in it.
 *
 * That direction is the safe one. A stale `heldProposalId` cannot manufacture a
 * warning about a question that is not there; the worst a mismatch can do is
 * leave the caution off, which is the surface as it stands today.
 */
export const setAside = (
  records: readonly ChangeRecord[],
  answerable: ReadonlySet<string>
): SetAside | undefined => {
  const open = records.filter(
    (record) => record.heldProposalId !== undefined && answerable.has(record.heldProposalId)
  )

  const newest = open[0]
  if (newest === undefined) return undefined

  return {
    questions: open.length,
    recordId: newest.recordId,
    sentence: sentenceFor(open.length),
    answerLabel: open.length === 1 ? ANSWER_ONE : ANSWER_MANY,
  }
}

/**
 * What the list of other asks is called, which changes with the answer above.
 *
 * *“or ask for one of these”* is the second half of a sentence whose first half
 * is the green button. While a question is open that button is gone — the one
 * primary on this rail is the **Apply this change** under the question — so the
 * *or* would be pointing at nothing.
 */
export const ASKS_HEADING = "or ask for one of these"
export const ASKS_HEADING_WHILE_WAITING = "ask for something else"
