"use client"

import { useEffect } from "react"

import { LOOM_NODE_ATTRIBUTE } from "@loom/runtime/react"

/**
 * Bring the marked node into view.
 *
 * The mark itself is a stylesheet and needs no script (see `_lib/spotlight.ts`).
 * This is the one part that genuinely does: three of the demo's five changes act
 * below the fold, so a visitor could press a button, have the page change
 * exactly as promised, and watch nothing at all.
 *
 * **On a wide screen it always scrolls, and on a narrow one only for a change
 * that has already landed.** That is not a preference about small screens; the
 * two layouts have different scrollers. Wide, the stage scrolls inside itself
 * and the rail does not move, so bringing a band into view costs the visitor
 * nothing. Narrow, the two panes are stacked in one document — so scrolling to a
 * change the Gate is *holding* would carry the visitor away from the two buttons
 * it is waiting on, which is the one thing that must stay under their thumb.
 */
export const SpotlightScroll = ({
  nodeId,
  /**
   * What made this a different change from the last one. The effect must re-run
   * when a visitor asks for something new and must not re-run because the rail
   * re-rendered, and the node id alone cannot tell those apart — asking twice
   * for the same band is a real second answer.
   */
  token,
  whenStacked,
}: {
  readonly nodeId: string
  readonly token: string
  readonly whenStacked: boolean
}) => {
  useEffect(() => {
    const element = document.querySelector(`[${LOOM_NODE_ATTRIBUTE}="${nodeId}"]`)
    if (!(element instanceof HTMLElement)) return

    const stacked = !window.matchMedia("(min-width: 1024px)").matches
    if (stacked && !whenStacked) return

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    /*
     * A band taller than the viewport cannot be centred — centring it shows the
     * middle, which is where the mark's own chip is not. The hero on a phone is
     * exactly this: the change lands, the page scrolls, and a visitor is left
     * looking at the one part of the band that says nothing about it.
     */
    const taller = element.getBoundingClientRect().height > window.innerHeight * 0.75

    element.scrollIntoView({
      behavior: still ? "auto" : "smooth",
      block: taller ? "start" : "center",
    })
  }, [nodeId, token, whenStacked])

  return null
}
