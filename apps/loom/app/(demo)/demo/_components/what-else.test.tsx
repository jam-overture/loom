import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { WHAT_ELSE_SENTENCE } from "@/app/(demo)/_lib/what-else"

import { WhatElseToAsk } from "./what-else"

/**
 * The 92 pixels at the end of the demonstration, and what they are spent on.
 *
 * `what-else.test.ts` holds *when* the rail has an ending. What is held here
 * is that the ending is a claim and a way back rather than a second copy of
 * the controls, and that it does not take the footer's job from it.
 */

const END = { count: 4, sentence: WHAT_ELSE_SENTENCE, label: "4 more changes to ask for" }

describe("the end of the demonstration", () => {
  /**
   * The half of the brief's objective nothing else on this surface says. Every
   * card speaks about itself — this ask, this verdict, this undo — and a
   * stranger can read the whole sequence without ever meeting the claim.
   */
  it("says why the record matters, under the card that is the evidence for it", () => {
    render(<WhatElseToAsk end={END} />)

    expect(screen.getByText(WHAT_ELSE_SENTENCE)).toBeTruthy()
  })

  /**
   * The ask panel and its green button are above the viewport at this moment —
   * measured at `y −470` on a production build at 1280 × 900 — so the way back
   * is the whole point of the row. It lands on the panel itself rather than on
   * a heading above it.
   */
  it("offers the way back to the controls, by the count that is still on offer", () => {
    render(<WhatElseToAsk end={END} />)

    const link = screen.getByRole("link", { name: /4 more changes to ask for/i })

    expect(link.getAttribute("href")).toBe("#ask")
  })

  /**
   * There is room for one thing here and a second primary control is the
   * defect `ask-panel.tsx` was built to fix: a rail with two primaries has
   * none. This row presses nothing and submits nothing.
   */
  it("presses nothing — it is a way back, not a second set of controls", () => {
    const { container } = render(<WhatElseToAsk end={END} />)

    expect(container.querySelectorAll("button").length).toBe(0)
    expect(container.querySelectorAll("form").length).toBe(0)
  })

  /**
   * The footer keeps the one way out of the demo. Saying it twice on one
   * screen is how a footer stops being read at all, which is this lane's own
   * rule — and on the one-press path both of them are in view together.
   */
  it("does not repeat the footer's way out", () => {
    const { container } = render(<WhatElseToAsk end={END} />)

    expect(container.textContent).not.toMatch(/docs/i)
    expect(container.querySelectorAll('a[href^="/docs"]').length).toBe(0)
  })
})
