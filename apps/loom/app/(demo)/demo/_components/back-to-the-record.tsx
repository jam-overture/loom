"use client"

import { useEffect, useState } from "react"

import { reachFor } from "@/app/(demo)/_lib/reach"
import type { SpotTone } from "@/app/(demo)/_lib/spotlight"

/**
 * The way back, on the layout that can lose the record.
 *
 * `SpotlightScroll` carries a visitor to the change, and on a stacked layout
 * that is a one-way trip. The two panes share the document's one scroller there,
 * so the four thousand pixels of somebody else's page between the rail and a
 * marked band near the foot of it are four thousand pixels the visitor has to
 * come back up, without being told there is anything to come back to.
 *
 * **Measured, on the viewport most first visits arrive on.** At 390×844, press
 * *Take the numbers off*, answer it, and the rail's buttons sit at y ≈ −4,281:
 * the record card, the undo, the whole account of what just happened, one
 * screen-and-a-half of scrolling above a green chip reading *Something was
 * removed here*. A stranger's sixty seconds ended with an AI having reached into
 * a page and nothing on screen saying what it touched or who allowed it — which
 * is the one demonstration this surface exists to prevent.
 *
 * On a wide screen there is nothing to fix and this must not appear: the rail is
 * its own scroller, the card does not move when the stage does, and a bar
 * offering to show a record that is already on screen would be the surface
 * talking for its own sake. That is a rule in `globals.css` rather than a
 * measurement here — a media query cannot be wrong between a resize and a
 * re-render, and a `matchMedia` read at mount can.
 *
 * **It appears only when the card is genuinely gone**, which is an observation
 * rather than an inference: the card's own visibility, watched, so scrolling
 * back by hand dismisses the bar without it having to guess how far the visitor
 * went. The demo has one other opinion about scrolling per state
 * (`AnswerInView`, `SpotlightScroll`) and this is not a third — it moves nothing
 * on its own, and only offers.
 *
 * **And the arrow is observed rather than assumed, as of 9 October.** It was a
 * literal `↑` and the comment under it said why: *"the card is above the
 * visitor"*, which was true of every state that could reach this bar when it
 * was written — all of them produced by a press that carried the visitor down
 * the page to a mark. The demo now opens with a change to the page itself
 * (`DEMO_OPENING_PRESET`): nothing scrolls, the visitor stays at the top of
 * the rail, and the record lands **below** them — measured at 390 × 844, the
 * card's top at y 981 of an 844px viewport. The bar was right to appear and
 * pointing the wrong way. The same entry that says the card is gone says which
 * side it went, so the direction is read off it.
 */
export const BackToTheRecord = ({
  recordId,
  tone,
}: {
  readonly recordId: string
  /** The mark's own tone, so the dot here is the dot on the page and on the card. */
  readonly tone: SpotTone
}) => {
  const [away, setAway] = useState(false)
  /**
   * Which way the card went, which is only ever read while `away` is true.
   * `above` is the opening value because it is the state the bar was built
   * for, and because an observer that has not reported yet has not made the
   * bar visible either.
   */
  const [side, setSide] = useState<"above" | "below">("above")
  const reach = reachFor(tone)

  useEffect(() => {
    const card = document.getElementById(recordId)
    if (!(card instanceof HTMLElement)) return

    /*
     * Browsers without it get no bar rather than a broken one. Every state this
     * offers a way back to is still reachable by scrolling, which is what a
     * visitor on such a browser does today.
     */
    if (typeof IntersectionObserver !== "function") return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1)
        if (!entry) return

        setAway(!entry.isIntersecting)
        /*
         * The card's own rectangle, in the viewport's coordinates: a top above
         * zero is a card the visitor has scrolled past, and anything else is a
         * card still to come. Read on every report rather than only on the one
         * that hides the bar, so a visitor who scrolls the card from below
         * them to above them — the stacked layout's whole shape — is offered
         * the right direction without the observer having to fire twice.
         */
        setSide(entry.boundingClientRect.top < 0 ? "above" : "below")
      },
      /*
       * Against the viewport, and any sliver of the card counts as present. The
       * bar is an offer to travel, so the question it answers is "is the record
       * somewhere else" and not "how much of it can you read".
       */
      { threshold: 0 }
    )

    observer.observe(card)

    return () => observer.disconnect()
  }, [recordId])

  const show = () => {
    const card = document.getElementById(recordId)
    if (!(card instanceof HTMLElement)) return

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    /*
     * `start` rather than `nearest`. The card is what they asked to see, so the
     * top of it goes to the top of the screen — `nearest` would stop the moment
     * its last line cleared the fold, which on the tallest card here is the
     * undo and nothing above it, and which does nothing at all for a card
     * below the visitor that is already taller than the viewport.
     */
    card.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" })
  }

  return (
    /*
     * `data-away` rather than a conditional render, so the bar can leave the
     * way it arrived and cannot be tabbed into while it is gone — the hidden
     * state is `visibility: hidden`, which takes it out of the tab order, and
     * the class is what decides both that and the wide-screen exemption.
     */
    <div className="loom-reach" data-away={away}>
      <button
        type="button"
        onClick={show}
        className="border-edge bg-surface-base text-ink mx-auto flex w-full max-w-lg items-center gap-3 rounded-md border px-4 py-3 text-left shadow-lg"
      >
        {/*
          * The same dot as the legend in the rail, the same colour as the ring
          * on the page and the badge on the card. It is the surface's one
          * teaching device and it costs nothing to keep using it.
          */}
        <span
          aria-hidden="true"
          className={`h-2 w-2 shrink-0 rounded-full ${
            tone === "applied" ? "bg-applied-ink" : "bg-awaiting-ink"
          }`}
        />
        <span className="min-w-0 flex-1 text-sm">{reach.said}</span>
        <span className="text-accent flex shrink-0 items-center gap-1 text-xs">
          {reach.action}
          {/*
            * `aria-hidden`, because the words beside it already name the
            * destination and a screen reader has no use for a direction it
            * cannot see. What it is for is the visitor who reads the bar as a
            * control: an arrow pointing away from the record is an instruction
            * to scroll the wrong way.
            */}
          <span aria-hidden="true">{side === "above" ? "↑" : "↓"}</span>
        </span>
      </button>
    </div>
  )
}
