import { render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ANSWER_ARRIVES } from "@/app/(demo)/_lib/arrival"

import { AnswerInView } from "./answer-in-view"

/**
 * The rail's own scroll, and every decision in it that a stylesheet cannot make.
 *
 * The defect this exists for was found with a browser and a ruler: at 1440×800,
 * the first press of the primary ask left *Apply this change* and *No thanks*
 * sixty-nine pixels below the fold. So what is asserted here is not that a
 * function was called — it is the three judgements that decide whether a visitor
 * ever sees the question they were asked. Which scroller moves, how far, and
 * whether it moves at all on a layout where a second opinion about scrolling
 * would fight the first.
 */

const RECORD = "demo-record-1"

/**
 * jsdom implements neither `matchMedia` nor `scrollIntoView`, and both carry a
 * decision rather than a detail.
 */
const browser = ({ wide, still = false }: { readonly wide: boolean; readonly still?: boolean }) => {
  const scrollIntoView = vi.fn()

  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("min-width") ? wide : still,
    media: query,
  }))

  const card = document.createElement("li")
  card.id = RECORD
  card.scrollIntoView = scrollIntoView
  document.body.append(card)

  return { scrollIntoView }
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

describe("the card waiting on an answer", () => {
  it("is brought into the rail's view on a wide screen", () => {
    const { scrollIntoView } = browser({ wide: true })

    render(<AnswerInView recordId={RECORD} token="1" />)

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
  })

  /**
   * **The top of the scroller, and it used to be the minimum movement.**
   *
   * `nearest` was argued as the kindest thing to do to a visitor who has just
   * pressed something, and measured against a production build it is what left
   * the ask panel on screen above the card — with the caution pinned to the
   * rail's top edge, in amber, over the question it is about. `arrival.ts`
   * carries the numbers and the other half of the decision; what is asserted
   * here is that this component reads it rather than holding an opinion of its
   * own, because the two drifting apart is the defect.
   */
  it("carries the card to the top of the scroller, and animates unless motion is unwelcome", () => {
    const { scrollIntoView } = browser({ wide: true })

    render(<AnswerInView recordId={RECORD} token="1" />)

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: ANSWER_ARRIVES })
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" })
  })

  it("does not animate for a visitor who asked for no motion", () => {
    const { scrollIntoView } = browser({ wide: true, still: true })

    render(<AnswerInView recordId={RECORD} token="1" />)

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: ANSWER_ARRIVES })
  })

  /**
   * Stacked too, and that is the case it matters most in: the rail leads the
   * document, so the card is a full panel of asks below the button that
   * produced it. `SpotlightScroll` sits this exact state out — a held change
   * must not drag the shared scroller to the marked band, because that carries
   * the visitor away from these buttons — so nothing else is moving and there
   * is no fight to have.
   */
  it("brings the answer into view on a stacked layout as well", () => {
    const { scrollIntoView } = browser({ wide: false })

    render(<AnswerInView recordId={RECORD} token="1" />)

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
  })

  /**
   * A rail that re-renders is not a new question. A visitor asked the same
   * thing twice — ask, decline, ask again — is, and the record id alone cannot
   * tell those apart.
   */
  it("scrolls again for a new question and not for a re-render", () => {
    const { scrollIntoView } = browser({ wide: true })

    const view = render(<AnswerInView recordId={RECORD} token="1" />)
    view.rerender(<AnswerInView recordId={RECORD} token="1" />)

    expect(scrollIntoView).toHaveBeenCalledTimes(1)

    view.rerender(<AnswerInView recordId={RECORD} token="2" />)

    expect(scrollIntoView).toHaveBeenCalledTimes(2)
  })

  /** A card that is not on the page yet is not an error worth throwing over. */
  it("does nothing when there is no such card", () => {
    browser({ wide: true })

    expect(() => render(<AnswerInView recordId="nothing-here" token="1" />)).not.toThrow()
  })
})
