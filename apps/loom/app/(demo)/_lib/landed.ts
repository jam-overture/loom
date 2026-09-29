import type { ChangeRecord } from "./record"

/**
 * The card the visitor's own answer just put on the page — and nothing at all
 * the rest of the time.
 *
 * **Why this is a reading rather than a flag.** The demo's one invited sequence
 * is *ask*, then *answer*, and the second press is the moment the whole
 * argument comes true: the page moves, the badge turns to **Applied**, and the
 * card grows the account of what happened and the offer to put it back. That
 * card is the payoff frame, and it is the one thing on this surface a stranger
 * must not have to go looking for.
 *
 * Measured on a production build at 1280 × 900 and filed on 28 September: the
 * rail keeps the scroll `AnswerInView` took to put the *question* at the top of
 * it, and answering the question makes everything above the card 91px shorter,
 * so the card drifts up under the fold by 48px — or does not, if the card
 * happens to be short enough that the browser clamps the scroll away first.
 * **What a stranger saw of the payoff frame was decided by whether the card was
 * taller or shorter than the rail**, which is nobody's decision.
 *
 * ## The three things it is not
 *
 * **Not the newest record.** A visitor may leave one question open, ask for
 * something that lands on its own, and answer the first question afterwards;
 * answering folds onto the record that was waiting (`session.ts`) rather than
 * minting a new one, so the answered card is not at the head of the list in
 * that order. The head of the list is the wrong question to ask.
 *
 * **Not `answeredBy` alone.** That field survives for the life of the record,
 * so on its own it would name a card the visitor answered four presses ago and
 * go on naming it.
 *
 * **Not a state the surface remembers.** The revision the answer produced is
 * the revision the page is at, or it is not; nothing has to be set, cleared, or
 * kept in step. The moment anything else lands — another ask, an undo — the
 * page's revision moves past it and this reading goes quiet on its own.
 *
 * Both halves are load-bearing and each is wrong alone: `answeredBy` is what
 * says the visitor was asked and answered (`answer.ts` reads the same field for
 * the same reason), and the revision is what says it was *this* press.
 */
export const landedOnYourAnswer = (
  records: readonly ChangeRecord[],
  revision: number
): ChangeRecord | undefined =>
  records.find(
    (record) => record.answeredBy !== undefined && record.revision?.produced === revision
  )
