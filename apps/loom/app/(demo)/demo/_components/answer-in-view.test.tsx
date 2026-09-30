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
const browser = ({
  wide,
  still = false,
  railScrolls = true,
}: {
  readonly wide: boolean
  readonly still?: boolean
  /**
   * Whether the card sits in a scroller of its own, which on this layout is the
   * rail at `lg` and the document below it. It is a separate knob from `wide`
   * on purpose: the component reads the scroller and never the width, and a
   * fixture that could not tell the two apart would pass whichever one it read.
   */
  readonly railScrolls?: boolean
}) => {
  const scrollIntoView = vi.fn()

  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("min-width") ? wide : still,
    media: query,
  }))

  const rail = document.createElement("div")
  rail.style.overflowY = railScrolls ? "auto" : "visible"

  const card = document.createElement("li")
  card.id = RECORD
  card.scrollIntoView = scrollIntoView
  rail.append(card)
  document.body.append(rail)

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

/**
 * And the same component one press later, for the card the answer landed.
 *
 * The rail keeps the scroll it took for the question; answering it takes the
 * caution out of the panel and puts the green button back, and everything above
 * the card ends up 91px shorter than it was when that scroll was taken. So the
 * payoff frame — the **Applied** badge, the ask in quotation marks, the account
 * of what happened and the offer to put it back — drifts up under the fold,
 * unless the card happens to be short enough that the browser clamps the scroll
 * away first. `arrival.ts` carries the measurements.
 *
 * What is asserted here is the one judgement that is not arithmetic: **where
 * this movement must not happen**, and that the component decides it by reading
 * the scroller rather than the viewport.
 */
describe("the card the visitor's answer landed", () => {
  it("is put back at the top of a rail that scrolls by itself", () => {
    const { scrollIntoView } = browser({ wide: true })

    render(<AnswerInView recordId={RECORD} token="2" onlyWhereTheRailScrolls />)

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: ANSWER_ARRIVES })
  })

  /**
   * **The one state where a second opinion about scrolling would fight the
   * first.** An applied change is exactly the case `SpotlightScroll` acts on:
   * on a phone it carries the visitor down to the mark on the stage — measured
   * at `scrollY` 4,685, with the card 3,863px above them — and one scroller
   * pulled two ways is settled by whichever effect ran last.
   */
  it("declines where the rail is not its own scroller and something else owns the one there is", () => {
    const { scrollIntoView } = browser({ wide: false, railScrolls: false })

    render(<AnswerInView recordId={RECORD} token="2" onlyWhereTheRailScrolls />)

    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  /**
   * **The scroller and not the width**, and this is the row that says so: a
   * wide viewport whose rail does not scroll gets nothing. `globals.css` argues
   * against reading a media query at mount by name — *a media query is right
   * between a resize and a re-render and a mount-time read is not* — and the
   * fact this depends on is the scroller, of which a width is only a proxy.
   */
  it("reads the scroller rather than the viewport", () => {
    const { scrollIntoView } = browser({ wide: true, railScrolls: false })

    render(<AnswerInView recordId={RECORD} token="2" onlyWhereTheRailScrolls />)

    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  /**
   * And the question keeps both layouts, which is the asymmetry rather than an
   * oversight: a hold is the state `SpotlightScroll` sits out, so there is
   * nothing to yield to.
   */
  it("does not impose the scroller rule on the question", () => {
    const { scrollIntoView } = browser({ wide: false, railScrolls: false })

    render(<AnswerInView recordId={RECORD} token="1" />)

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
  })
})
