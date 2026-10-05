import type { ChangeRecord } from "./record"

/**
 * The card the visitor's own press just put on the page — and nothing at all
 * the rest of the time.
 *
 * **Why this is a reading rather than a flag.** Every change this surface shows
 * ends in a card, and that card is the half of the claim nothing else on the
 * screen makes: the page moving is a thing any demonstration can show, and
 * *what was asked, what the Gate weighed, which way it went and the button that
 * puts it back* is the half only this one can. It is the frame a stranger must
 * not have to go looking for.
 *
 * Measured on a production build at 1280 × 900 and filed on 28 September: the
 * rail keeps the scroll `AnswerInView` took to put the *question* at the top of
 * it, and answering the question makes everything above the card 91px shorter,
 * so the card drifts up under the fold by 48px — or does not, if the card
 * happens to be short enough that the browser clamps the scroll away first.
 * **What a stranger saw of the payoff frame was decided by whether the card was
 * taller or shorter than the rail**, which is nobody's decision.
 *
 * ## It used to ask whether the visitor had answered, and that was too narrow
 *
 * This reading was `landedOnYourAnswer` and required `answeredBy`, on the
 * argument that a change which went ahead on its own has already announced
 * itself by moving the page. Measured on a production build at 1280 × 900, on
 * the two asks the rail marks **GOES AHEAD** — the only one-press changes this
 * surface offers, and the ones the run of 3 October brought above the fold:
 *
 * | after the one press | the record card's top | of a 900px viewport |
 * | --- | --- | --- |
 * | *Re-theme the whole page* | **848** | 52px of a 496px card |
 * | *Repaint the top band* | **872** | 28px of a 512px card |
 *
 * So the press that turns the whole stage from dark navy to cream — the most
 * arresting fifteen seconds on this surface — put *Low risk. A small, easily
 * undone change*, *Nothing this project watches for was involved, so it went
 * ahead on its own* and **Put it back** four hundred and forty pixels below the
 * screen. The page announced itself and the record did not, on the one surface
 * whose argument is that the two come together.
 *
 * The premise was sound and the inference from it was not: *the page moving is
 * its own announcement* is a claim about the **stage**, and on a wide screen
 * the stage and the rail are two scrollers. Saying the stage speaks for itself
 * is a reason for the rail to carry the record, not a reason for it to sit
 * still.
 *
 * ## The three things it is not
 *
 * **Not the newest record.** A visitor may leave one question open, ask for
 * something that lands on its own, and answer the first question afterwards;
 * answering folds onto the record that was waiting (`session.ts`) rather than
 * minting a new one, so the answered card is not at the head of the list in
 * that order. The head of the list is the wrong question to ask.
 *
 * **Not the newest *applied* record either.** That would go on naming a card
 * four presses after the page moved past it. What is asked is whether this
 * record produced the revision the page is **at**, which is a fact about the
 * page rather than about the list.
 *
 * **And asking it that way takes the list order out of the answer**, which is
 * the one thing widening this reading changed that nobody set out to change. A
 * revision is produced once, so at most one record can claim any revision and
 * `find` and `findLast` cannot disagree. The defect matrix for this unit is
 * where that turned up: *the reading takes the last match* was restored and the
 * whole lane stayed green, because there is nothing for an ordering to choose
 * between. It is asserted as the uniqueness it is, over records the pipeline
 * really produced (`rail.test.ts`), rather than defended as an ordering —
 * while the reading also required `answeredBy`, two *different* records could
 * satisfy the two halves and which came first was load-bearing; now they
 * cannot.
 *
 * **Not a state the surface remembers.** The revision the press produced is the
 * revision the page is at, or it is not; nothing has to be set, cleared, or
 * kept in step. The moment anything else lands — another ask, an undo — the
 * page's revision moves past it and this reading goes quiet on its own.
 */
export const landedOnYourPress = (
  records: readonly ChangeRecord[],
  revision: number
): ChangeRecord | undefined => records.find((record) => record.revision?.produced === revision)
