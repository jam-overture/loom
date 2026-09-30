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

/**
 * The travel the rail's scroller needs for `ANSWER_ARRIVES` to be a landing
 * rather than an intention — **the third half of the same decision**, and it
 * was missing.
 *
 * A scroller carries an element to its top only if it has that much scroll
 * left below it. Everything above assumed it always would, which was true for
 * as long as the rail was tall: a card at `start` left the panel behind, so no
 * caution could pin over it.
 *
 * **Folding the explainer took about three hundred pixels out of the rail**
 * (`what-happens.tsx`, 26 September, and it was right to — it cost a phone
 * screen that is nothing but rail). Measured on a production build at
 * 1280 × 900 immediately afterwards, with a question open:
 *
 * | | |
 * | --- | --- |
 * | the rail's scroll position after the press | **612** |
 * | the furthest it can scroll | **612** |
 * | where that leaves the card's top | **−404** — it never arrives |
 * | the caution, pinned, in amber | **43 → 146**, back on the frame |
 *
 * So the whole table at the top of this file came back, by a route neither of
 * the two constants above could see: nothing about the landing changed, and
 * the scroller stopped being able to honour it. `ANSWER_ARRIVES` is a promise
 * about where a card goes, and a promise the layout can quietly withdraw is
 * the exact failure this file was written to stop.
 *
 * **Only while a question is open, and only where the rail is a scroller.** On
 * arrival the rail is a screen and a half of content and this would make it
 * scroll into emptiness — the default state, which is the one a stranger
 * judges. On a phone the document scrolls and the card reaches the top by
 * ordinary means.
 *
 * `70vh` rather than a fixed length because the shortfall is
 * `viewport − card − what follows it`: it grows with the screen, so a rem
 * value correct on a laptop is short on a monitor. The cost is a band of empty
 * rail below the footer, reachable only by scrolling past the end of the
 * record while a question is waiting, and it buys the frame the demo's one
 * invited press produces.
 *
 * ## And it outlived the question by one press too few
 *
 * The room was given while a question was **open** and taken back the moment it
 * was answered — which is the press that produces the frame the whole
 * demonstration is for. Measured on a production build at 1280 × 900 and filed
 * on 28 September:
 *
 * | | after the ask | after the answer |
 * | --- | --- | --- |
 * | the rail's scroll | **788** — the card was carried to the top | **788**, nothing re-took it |
 * | the card's top, in the rail | 831 | **740** — the panel above it lost 91px |
 * | the furthest the rail could scroll | 1,223 | **993**, and **623** with a shorter card |
 * | so the card's top, on screen | 43 | **−48**, or **+117** where the browser clamped |
 *
 * Two different failures, and the room is the second of them. Answering takes
 * the caution out of the panel and puts the green button back, so everything
 * above the card ends up 91px shorter than it was when the scroll was taken;
 * that is what `AnswerInView` re-lands. But with the room gone the rail may no
 * longer be *able* to put the card at its top — at 606px of card the furthest
 * scroll is 623 and the landing is a clamp rather than a landing. **So what a
 * stranger saw of the payoff frame was decided by whether the card was taller
 * or shorter than the rail**, which is nobody's decision, and a re-landing
 * without the room would have moved that arithmetic rather than removed it.
 *
 * So the room is given for **both** moments the rail has to put a card at its
 * own top: a question waiting on an answer, and the change that answer landed
 * (`landed.ts`). It is the same promise in the same file, made twice, and it
 * costs the same band of empty rail for one press longer.
 *
 * **It is handed the rail rather than a boolean**, and that is this run's other
 * small correction. `page.tsx` is an `async` Server Component no `vitest` run
 * can mount, so a condition written at the call site is a condition nothing can
 * check — the defect class `rail.ts` was extracted to end, which turned up five
 * readings unwired by deleting one argument with the whole suite green. Asking
 * for the two fields means the *when* is asserted here beside the *what*.
 */
export const roomToLand = (rail: {
  readonly waiting?: unknown
  readonly landing?: unknown
}): string => (rail.waiting === undefined && rail.landing === undefined ? "" : "lg:pb-[70vh]")
