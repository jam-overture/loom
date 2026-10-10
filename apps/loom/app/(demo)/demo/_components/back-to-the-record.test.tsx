import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { reachFor } from "@/app/(demo)/_lib/reach"

import { BackToTheRecord } from "./back-to-the-record"

/**
 * The bar that offers a stacked layout its record back.
 *
 * The defect it exists for was found with a browser and a ruler, like the two
 * scroll components beside it: at 390×844, answering the primary ask left the
 * record card at y ≈ −4,281 and nothing on screen pointing at it. So what is
 * asserted here is not that a component renders — it is the judgements that
 * decide whether a visitor on a phone ever gets back to the thing the demo is
 * about. Whether it is offered at all, when it appears, when it goes away, what
 * it says, and where pressing it lands.
 *
 * The wide-screen exemption is the one decision *not* asserted here, because it
 * is not in this file: it is a media query in `globals.css`, and
 * `globals.test.ts` holds it.
 */

const RECORD = "demo-record-1"

type Watcher = {
  /**
   * Report what the browser's observer would have reported.
   *
   * `top` is the card's own `boundingClientRect.top`, in the viewport's
   * coordinates, and it is a parameter rather than a constant because the
   * component reads a direction off it. Negative is a card the visitor has
   * scrolled past; the default is the state this bar was built for.
   */
  readonly report: (intersecting: boolean, top?: number) => void
  readonly observed: () => readonly Element[]
  readonly disconnected: () => number
  readonly scrollIntoView: ReturnType<typeof vi.fn>
}

/**
 * jsdom implements neither `IntersectionObserver`, `matchMedia` nor
 * `scrollIntoView`. The first is the whole mechanism and the other two each
 * carry a decision, so all three are stubbed rather than shimmed away.
 */
const browser = ({
  still = false,
  card = true,
}: { readonly still?: boolean; readonly card?: boolean } = {}): Watcher => {
  const scrollIntoView = vi.fn()
  const observed: Element[] = []
  let disconnected = 0
  type Entry = {
    readonly isIntersecting: boolean
    readonly boundingClientRect: { readonly top: number }
  }
  let announce: ((entries: readonly Entry[]) => void) | undefined

  vi.stubGlobal("matchMedia", (query: string) => ({ matches: still, media: query }))
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: (entries: readonly Entry[]) => void) {
        announce = callback
      }
      observe(element: Element) {
        observed.push(element)
      }
      disconnect() {
        disconnected += 1
      }
      unobserve() {}
    }
  )

  if (card) {
    const element = document.createElement("li")
    element.id = RECORD
    element.scrollIntoView = scrollIntoView
    document.body.append(element)
  }

  return {
    report: (intersecting, top = -1) =>
      act(() => announce?.([{ isIntersecting: intersecting, boundingClientRect: { top } }])),
    observed: () => observed,
    disconnected: () => disconnected,
    scrollIntoView,
  }
}

const bar = (): HTMLElement => {
  const element = document.querySelector(".loom-reach")
  if (!(element instanceof HTMLElement)) throw new Error("the way back was never rendered")

  return element
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

describe("the way back to the record", () => {
  /**
   * The bar is present from the first render and hidden by a stylesheet, rather
   * than mounted when it is wanted. That is what lets it slide rather than
   * appear, and `data-away` is the single thing the CSS reads.
   */
  it("is out of the way until the record has actually left the screen", () => {
    const watcher = browser()

    render(<BackToTheRecord recordId={RECORD} tone="applied" />)

    expect(bar().dataset["away"]).toBe("false")

    watcher.report(false)

    expect(bar().dataset["away"]).toBe("true")
  })

  it("gets out of the way again when the visitor scrolls back to it themselves", () => {
    const watcher = browser()

    render(<BackToTheRecord recordId={RECORD} tone="applied" />)
    watcher.report(false)
    watcher.report(true)

    expect(bar().dataset["away"]).toBe("false")
  })

  /**
   * **The arrow points at the record, which is not always upwards.**
   *
   * Every state that could reach this bar when it was written was produced by
   * a press that carried the visitor *down* the page to a mark, so the arrow
   * was a literal `↑`. The demo now opens with a change to the page itself:
   * nothing scrolls, and the record lands below the visitor — measured at
   * 390 × 844, the card's top at y 981 of an 844px viewport. An arrow pointing
   * away from the thing the button goes to is an instruction to scroll the
   * wrong way, and it is the one part of this bar a visitor reads as a
   * direction rather than as words.
   */
  it("points up at a record the visitor has scrolled past", () => {
    const watcher = browser()

    render(<BackToTheRecord recordId={RECORD} tone="applied" />)
    watcher.report(false, -4281)

    expect(bar().textContent).toContain("↑")
    expect(bar().textContent).not.toContain("↓")
  })

  it("points down at a record the visitor has not reached yet", () => {
    const watcher = browser()

    render(<BackToTheRecord recordId={RECORD} tone="applied" />)
    watcher.report(false, 981)

    expect(bar().textContent).toContain("↓")
    expect(bar().textContent).not.toContain("↑")
  })

  /**
   * And it turns round without the bar having to be hidden and shown again,
   * which is the state a stacked layout spends most of its time in: one
   * scroller, a card that passes the visitor, and an observer still reporting
   * the same `false`.
   */
  it("turns round when the card passes the visitor", () => {
    const watcher = browser()

    render(<BackToTheRecord recordId={RECORD} tone="applied" />)
    watcher.report(false, 981)
    watcher.report(false, -120)

    expect(bar().textContent).toContain("↑")
  })

  /** The card, and nothing else: the bar has one question and it is about that one. */
  it("watches the card it offers to return to", () => {
    const watcher = browser()

    render(<BackToTheRecord recordId={RECORD} tone="awaiting" />)

    expect(watcher.observed()).toHaveLength(1)
    expect(watcher.observed()[0]?.id).toBe(RECORD)
  })

  it("stops watching when the change it was about is gone", () => {
    const watcher = browser()
    const view = render(<BackToTheRecord recordId={RECORD} tone="applied" />)

    view.unmount()

    expect(watcher.disconnected()).toBe(1)
  })

  /**
   * `start`, because the card is what was asked for and the top of it is where
   * the account begins. `nearest` would stop as soon as its last line cleared
   * the fold, which on an applied card is the undo with nothing above it.
   */
  it("puts the top of the record at the top of the screen, and animates unless motion is unwelcome", () => {
    const watcher = browser()

    render(<BackToTheRecord recordId={RECORD} tone="applied" />)
    watcher.report(false)
    fireEvent.click(screen.getByRole("button"))

    expect(watcher.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" })
  })

  it("does not animate for a visitor who has asked it not to", () => {
    const watcher = browser({ still: true })

    render(<BackToTheRecord recordId={RECORD} tone="applied" />)
    watcher.report(false)
    fireEvent.click(screen.getByRole("button"))

    expect(watcher.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" })
  })

  /**
   * The tone is the surface's one teaching device — the dot here, the ring on
   * the band and the badge on the card are one colour — and it also decides
   * which of the two things this bar has to say is true.
   */
  it("says what a held change is waiting for, and offers the answer rather than a receipt", () => {
    const watcher = browser()

    render(<BackToTheRecord recordId={RECORD} tone="awaiting" />)
    watcher.report(false)

    const text = screen.getByRole("button").textContent ?? ""

    expect(text).toContain(reachFor("awaiting").said)
    expect(text).toContain(reachFor("awaiting").action)
    expect(bar().innerHTML).toContain("bg-awaiting-ink")
  })

  it("says an applied change was written down, in the colour of the mark on the page", () => {
    const watcher = browser()

    render(<BackToTheRecord recordId={RECORD} tone="applied" />)
    watcher.report(false)

    expect(screen.getByRole("button").textContent ?? "").toContain(reachFor("applied").said)
    expect(bar().innerHTML).toContain("bg-applied-ink")
  })

  /**
   * A record card that is not in the document is not a failure state worth
   * handling loudly — the bar simply never has anything to offer, and must not
   * throw on the way to finding that out.
   */
  it("offers nothing, and breaks nothing, when there is no card to return to", () => {
    const watcher = browser({ card: false })

    render(<BackToTheRecord recordId={RECORD} tone="applied" />)

    expect(watcher.observed()).toHaveLength(0)
    expect(bar().dataset["away"]).toBe("false")
  })
})
