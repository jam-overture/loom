"use client"

import { useEffect } from "react"

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
 * **Only when something is actually waiting.** An applied change has already
 * moved the page, which is its own announcement, and its *Put it back* is an
 * offer rather than a question — dragging the rail to it would be the surface
 * moving for its own reasons. A hold is the one state where the demo has asked
 * the visitor something and cannot proceed until they answer.
 *
 * **Both layouts, and the stacked one is not an exception — it is the same
 * intent.** `SpotlightScroll` declines to move the narrow layout's scroller for
 * a change that is being held, and says why: the two panes share one scroller
 * there, so carrying the visitor to the marked band would carry them *away from
 * these very buttons*. Moving to the buttons is the other half of that
 * sentence rather than a contradiction of it, and the two never act at once —
 * on a narrow screen a held change is exactly the case `SpotlightScroll` sits
 * out, and an applied one is the case this component does not render for. One
 * scroller, one opinion, in every state.
 *
 * `block: "nearest"` rather than `center`: the minimum movement that puts the
 * answer on screen. A visitor who has just pressed something should see the
 * consequence arrive under their cursor, not have the panel they were reading
 * thrown to the middle of the rail.
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
}: {
  readonly recordId: string
  readonly token: string
}) => {
  useEffect(() => {
    const card = document.getElementById(recordId)
    if (!(card instanceof HTMLElement)) return

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    card.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "nearest" })
  }, [recordId, token])

  return null
}
