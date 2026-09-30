"use client"

import { useEffect } from "react"

import { ANSWER_ARRIVES } from "@/app/(demo)/_lib/arrival"

/**
 * Whether the card sits in a scroller of its own — anything but the document.
 *
 * The first ancestor with a scrolling overflow wins, which on this layout is
 * the rail at `lg` and nothing at all below it: `overflow-y: auto` is a `lg:`
 * utility, so on a phone the walk reaches the root having found nothing and the
 * answer is *the document scrolls, and something else owns it*.
 */
const inItsOwnScroller = (card: HTMLElement): boolean => {
  for (let el = card.parentElement; el !== null; el = el.parentElement) {
    const { overflowY } = window.getComputedStyle(el)

    if (overflowY === "auto" || overflowY === "scroll") return true
  }

  return false
}

/**
 * Bring the card that is waiting on an answer into view, in whichever scroller
 * the layout has put it in.
 *
 * The sibling of `SpotlightScroll`, for the other scroller and for the same
 * reason it gives: a visitor can press a button, have everything work exactly
 * as designed, and see none of it. On a wide screen the stage and the rail
 * scroll independently, so bringing the marked band into view does nothing at
 * all for a card sitting below the rail's fold.
 *
 * **Measured rather than guessed.** At 1440×800 — an ordinary laptop — pressing
 * the primary ask put *Apply this change* and *No thanks* at y≈869 in a 800px
 * viewport: sixty-nine pixels under the fold. So the first press produced a
 * change the Gate was holding, marked the page it was about, printed the whole
 * record, and left the two buttons the entire demonstration was waiting on off
 * the screen. That is not a copy problem and no amount of tightening the rail
 * would have fixed it reliably at every height.
 *
 * **Only when something is actually waiting, or when the visitor's own answer
 * has just landed.** A change that applied on its own has already moved the
 * page, which is its own announcement, and its *Put it back* is an offer rather
 * than a question — dragging the rail to it would be the surface moving for its
 * own reasons. Two states are not that: a hold, where the demo has asked the
 * visitor something and cannot proceed until they answer, and the card that
 * answer produced, where the visitor pressed a button *on this card* and the
 * rail must not let it drift out from under them (`landed.ts`, and the 91px is
 * in `arrival.ts`).
 *
 * **The second of those is not a second opinion about scrolling, it is the
 * absence of one.** The card was at the top of the rail when the visitor
 * pressed the button on it; putting it back there is the rail declining to move
 * rather than deciding to. That is why it reads as re-landing and not as an
 * arrival, and why nothing about it is announced.
 *
 * **Both layouts, and the stacked one is not an exception — it is the same
 * intent.** `SpotlightScroll` declines to move the narrow layout's scroller for
 * a change that is being held, and says why: the two panes share one scroller
 * there, so carrying the visitor to the marked band would carry them *away from
 * these very buttons*. Moving to the buttons is the other half of that
 * sentence rather than a contradiction of it, and the two never act at once —
 * on a narrow screen a held change is exactly the case `SpotlightScroll` sits
 * out. One scroller, one opinion, in every state.
 *
 * **Which is exactly what the re-landing would break, so it yields.** An
 * applied change is the case `SpotlightScroll` *does* act on: on a phone it
 * carries the visitor down to the mark on the stage — measured at `scrollY`
 * 4,685, with the card 3,863px above them — and a second component hauling the
 * same scroller back up to the card would be two opinions about one scroller,
 * settled by whichever effect ran last. So `onlyWhereTheRailScrolls` declines.
 *
 * **And it declines by measuring the scroller rather than the viewport.** The
 * fact this depends on is *the rail is a scroller of its own*; a width is a
 * proxy for it, and `globals.css` argues against the cheap way to read one by
 * name — *a media query is right between a resize and a re-render and a
 * mount-time read is not*. Walking up from the card to the first ancestor that
 * scrolls is the fact itself: it is read at the moment the scroll would happen,
 * it is correct at any width without a listener, and it stays correct if the
 * breakpoint the layout uses ever changes, because nothing here names one.
 *
 * **Where it lands is `arrival.ts`'s, not this file's.** `ANSWER_ARRIVES` is
 * `start` — the top of the scroller — rather than the `nearest` it was, and
 * the reason is that the card's own clearance is the other half of the same
 * decision: a card that stops short leaves the panel on screen, where the
 * caution pins to the scroller's top edge and greets the visitor's first
 * correct press. That file carries the measurement and both halves read from
 * it, so the two can no longer disagree.
 *
 * The trade the smaller movement was argued on is not a trade. A visitor who
 * has just pressed something should see the consequence arrive under their
 * cursor rather than have the panel they were reading thrown across the rail —
 * except that the press withdraws the green button the panel was made with
 * (`AskPanel`) and takes the preset out of the list (`already-asked.ts`), so
 * there is no panel left under the cursor to be continuous with.
 */
export const AnswerInView = ({
  recordId,
  /**
   * What else, besides which card, makes this a different moment. The page's
   * revision: a visitor can leave one question open and ask for something that
   * lands on its own, and the still-unanswered card is worth putting back in
   * front of them when the page under it has moved.
   *
   * A new question of its own changes `recordId` and needs no help — answering
   * a hold replaces the record rather than adding one, and a fresh ask mints a
   * fresh id.
   */
  token,
  /**
   * Set for the re-landing and never for the question: this movement happens
   * only where the rail scrolls by itself, because everywhere else
   * `SpotlightScroll` is already carrying the visitor to the page the change
   * moved and there is one scroller between them.
   */
  onlyWhereTheRailScrolls = false,
}: {
  readonly recordId: string
  readonly token: string
  readonly onlyWhereTheRailScrolls?: boolean
}) => {
  useEffect(() => {
    const card = document.getElementById(recordId)
    if (!(card instanceof HTMLElement)) return
    if (onlyWhereTheRailScrolls && !inItsOwnScroller(card)) return

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    card.scrollIntoView({ behavior: still ? "auto" : "smooth", block: ANSWER_ARRIVES })
  }, [recordId, token, onlyWhereTheRailScrolls])

  return null
}
