/**
 * Where the card a press produced lands, and how much room it has to leave
 * above itself — **one decision, in one file, because they are two halves of
 * one claim** and were held in two files that could disagree.
 *
 * ## What they cost when they disagreed
 *
 * The rail pins a caution to the top of its scroller while a question is open
 * (`AskPanel`, `set-aside.ts`): *anything else you ask for moves the page on,
 * so that question would be set aside.* Every word of it is true and the
 * measurement behind it is sound — a stranger really does press a second ask
 * before answering the first.
 *
 * `AnswerInView` carried the new card into view with `block: "nearest"` — the
 * minimum movement — and `record-card.tsx` carried `scroll-mt-28` so the card
 * would not land underneath that pinned caution. Each is defensible alone.
 * Together, measured against a production build at the moment this
 * demonstration's whole argument comes true:
 *
 * | after the one press the demo invites | 1280 × 900 | 390 × 844 |
 * | --- | --- | --- |
 * | the card the press produced | top **397** | top **112** |
 * | above it, pinned, in amber | the caution, **103px** | the caution, **cut to 40px** |
 * | ask controls on screen | two — and the nearest **behind the caution** | **none** |
 *
 * So the first correct press a stranger makes was answered by a warning about
 * a mistake they had not made, in the loudest position on the rail, read
 * *before* the question it is about; and on a phone by a sentence **sliced
 * through the middle of its first line**, with no control anywhere on screen
 * that it could have been about. The clearance was not protecting the card
 * from the strip. It was the reason there was a strip to be protected from.
 *
 * ## The rule
 *
 * A card carried to the **top** of its scroller leaves the whole panel behind
 * it — and the caution can only pin while the panel is in the scroller, so
 * nothing is over the card and nothing has to be left room for. A card carried
 * anywhere else stops with the panel still on screen, where the caution pins
 * to the scroller's top edge, and then the clearance is not optional.
 *
 * Both halves read from here, so a later run that reaches for the smaller
 * movement gets the clearance back in the same edit rather than discovering it
 * in a screenshot.
 *
 * **The caution loses nothing.** It keeps every property it was measured for —
 * on screen, above the controls, amber, before the press — because the visitor
 * meets it the moment they scroll back to a control, which is the only moment
 * it was ever for. Verified on a production build at both sizes: with any ask
 * control on screen the caution is on screen too, and with the card at the top
 * of the rail neither is.
 */

/**
 * How `AnswerInView` carries the waiting card into view.
 *
 * `start` rather than `nearest`, and the trade it used to be argued on is not
 * a trade: the panel a visitor was reading does not survive the press. The
 * green button is withdrawn while a question is open (`AskPanel`) and the
 * preset leaves the list (`already-asked.ts`), so the minimum movement
 * preserves continuity with a panel that is no longer there.
 */
export const ANSWER_ARRIVES = "start" satisfies ScrollLogicalPosition

/**
 * The room a record card leaves above itself, as Tailwind writes it.
 *
 * Empty when the card arrives at the top of its scroller, because nothing can
 * be pinned over it there. `scroll-mt-28` — seven rem, measured against a
 * 103px strip at 1280×900 — for every other landing, where the caution is
 * still pinned to the scroller's top edge and a flush card would put its
 * `Waiting on you` badge and its utterance behind the band that sent the
 * visitor to it.
 *
 * Honoured by both ways in, which is why it is a property of the card rather
 * than of either caller: a fragment navigation from **Answer it first** and
 * `AnswerInView`'s `scrollIntoView` read the same scroll margin.
 */
export const clearanceFor = (block: ScrollLogicalPosition): string =>
  block === "start" ? "" : "scroll-mt-28"
