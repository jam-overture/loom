"use client"

import { useEffect } from "react"

import { THE_WINDOW } from "@/app/(demo)/_lib/the-page-itself"

/**
 * Bring the window onto the screen of a visitor who has just moved the page in
 * it from somewhere else.
 *
 * The third of this surface's scrolls and the smallest of them, and the reason
 * it exists is the half of the demonstration this product is actually unusual
 * for. Everybody shows a page changing. The inverse, as a button that really
 * puts it back, is the claim nobody else makes — and on a phone, pressing it
 * looked like nothing happening.
 *
 * ## The screen it exists for
 *
 * Measured on a production build of `demo-44`, 390 x 844, pressing the green
 * button the arrival screen offers and then **Put it back** on the card it
 * produced:
 *
 * | | |
 * | --- | --- |
 * | the record card the visitor is pressing in | `y 20`, 350 x 512 |
 * | the window, with the page back in its first palette | **`y -922`** |
 * | the stage | about 1,400px below the card |
 *
 * So the page really did go back, in two places, and neither of them was on
 * the screen of the person who asked for it. What they got was the card
 * rewriting itself under their finger — *The page is back as it was, and this
 * record is how it got there* — which is true, and is a sentence rather than
 * the thing.
 *
 * **Nothing was wrong and nothing was a regression.** `demo-44` keeps the
 * window through a change whose subject is the page itself, so the opening
 * press turns the page over in view. That press is made with the window in
 * front of the visitor. Its inverse is pressed on a card most of a screen
 * further down, and no component on this surface knew where the visitor was
 * standing when they made it: `SpotlightScroll` carries a phone *down* to a
 * mark and declines when there is no mark, which is right about the stage —
 * a configure against the root marks nothing, so there is nothing down there
 * to be carried to. `AnswerInView` declines on a phone for the other half of
 * the same reason. Neither is wrong; what neither knew is that there was now a
 * 262px window of the page 922 pixels **up**.
 *
 * ## One scroller, one opinion, in every state
 *
 * This is the property the other two components were built to keep and it is
 * why a third one is affordable. The window is hidden at `lg` and on any frame
 * too short to afford it (`globals.css`, and `globals.test.ts` asserts both),
 * and `lg` is the width at which the rail becomes a scroller of its own. So:
 *
 * | | the rail scrolls by itself | the window has a box | who moves |
 * | --- | --- | --- | --- |
 * | 1024px and up | yes | no | `AnswerInView` re-lands the card |
 * | below it | no | yes | this, to the window |
 *
 * The two never act at once, and they do not avoid each other by sharing a
 * width. Each reads the fact it actually depends on, at the moment it would
 * move something: `AnswerInView` walks up from the card to the first ancestor
 * that scrolls, and this measures the window's own box. `globals.css` argues
 * against the cheap way to read a breakpoint by name — *a media query is right
 * between a resize and a re-render and a mount-time read is not* — and a box
 * is the fact itself. A window that is not in the document at all gets the same
 * answer one line earlier, for the same reason: there is nothing to carry
 * anybody to.
 *
 * ## One read, and it is the whole of the condition
 *
 * `box.top < 0 || box.bottom > window.innerHeight` — any part of the window off
 * either edge of the screen. It is two refusals in one sentence, and the second
 * of them is the reason there is no clause for it.
 *
 * **It declines when they are already looking at the window.** The same token
 * is handed to this on the opening press, where the window is at `y 325` of an
 * 844px screen and the visitor is looking straight at it. Moving then would
 * undo the thing `demo-44` measured: the window and the button that turned the
 * page over stay at the two coordinates they were at, and what changes between
 * the two screens is the page in the window and nothing else.
 *
 * **And it declines where the window has no box**, which is the table above,
 * **without a clause of its own.** An element with no boxes reports a rect of
 * all zeros, so a window the stylesheet has taken off this screen reads as
 * `top 0, bottom 0` — inside every viewport there is, and therefore in front of
 * them. The wide layout's own measurement says so in as many words:
 * `#the-page-itself  x 0 y 0  0x0`.
 *
 * **That clause was written, and the defect matrix deleted it.** Restoring
 * *it acts on a screen the stylesheet took the window off* as a defect was
 * caught by **nothing**, because the read below already answers it — so the
 * guard was two lines that could never run and a second place for a later run
 * to disagree with this one about what *no box* means. It is a sentence here
 * instead, which is where the argument was anyway.
 *
 * **`center`, and the sibling's ceiling is not copied.** `SpotlightScroll`
 * centres a band unless it is taller than three quarters of the viewport,
 * because a band taller than that shows its middle and the mark's own chip is
 * not there. The window cannot be in that case: `globals.css` caps it at 15rem,
 * and the two sizes where that cap does not apply are the two where the window
 * is not drawn at all. So the arithmetic is quoted rather than shared, for the
 * reason this lane filed on 10 October about an abstraction with a single
 * caller.
 */
export const PageInView = ({
  /**
   * The revision the visitor's press produced, which is what makes this a
   * different landing from the last one — `the-page-itself.ts`'s `moved`, which
   * is set by the same answer that puts *now* on the caption.
   */
  token,
}: {
  readonly token: string
}) => {
  useEffect(() => {
    const onto = document.getElementById(THE_WINDOW)
    if (!(onto instanceof HTMLElement)) return

    const box = onto.getBoundingClientRect()

    /*
     * Any part of the window off either edge, which is two refusals in one
     * sentence: a visitor already looking at it is not moved, and neither is
     * one on a screen the stylesheet took the window off — a hidden element
     * reports a rect of all zeros, and all zeros is inside every viewport.
     */
    const offTheirScreen = box.top < 0 || box.bottom > window.innerHeight
    if (!offTheirScreen) return

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    onto.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "center" })
  }, [token])

  return null
}
