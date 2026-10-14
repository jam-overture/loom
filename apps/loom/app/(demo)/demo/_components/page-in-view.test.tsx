import { render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { THE_WINDOW } from "@/app/(demo)/_lib/the-page-itself"

import { PageInView } from "./page-in-view"

/**
 * The third scroll on this surface, and every decision in it is about where
 * the visitor was standing rather than about what changed.
 *
 * The defect it exists for was found with a browser and a ruler, the way the
 * other two were: on a production build of `demo-44` at 390 × 844, pressing
 * the green button and then **Put it back** on the card it produced put the
 * page back in a window at `y −922`, with the card the visitor's finger was on
 * at `y 20`. So what is asserted here is not that a function was called. It is
 * the two states this must not move in — the press that already lands in view,
 * and every screen the stylesheet takes the window off — because a scroll that
 * moves when it should not is how `demo-44`'s measured screen would be undone,
 * and a scroll that does nothing is the quietest failure this surface has.
 */

/** The height of a phone that is tall enough for the window to be drawn at all. */
const PHONE = 844

/**
 * jsdom implements neither `matchMedia`, `scrollIntoView` nor layout, and all
 * three carry a decision rather than a detail.
 *
 * The box is the fixture's whole subject, so it is given as the two numbers the
 * component reads — where the window starts, and how tall it is — rather than
 * as a viewport this would have to lay out.
 */
const browser = ({
  top,
  height,
  still = false,
  viewport = PHONE,
}: {
  /** The window's own top edge, relative to the viewport. Negative is above it. */
  readonly top: number
  /**
   * How tall the window's box is. **Nought is the real answer on two screens
   * rather than a stand-in for one**: `globals.css` takes the window off a
   * layout at `lg` and off a frame under 46rem tall with `display: none`, which
   * is an element with no box.
   */
  readonly height: number
  readonly still?: boolean
  readonly viewport?: number
}) => {
  const scrollIntoView = vi.fn()

  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduced-motion") ? still : false,
    media: query,
  }))
  vi.stubGlobal("innerHeight", viewport)

  const onto = document.createElement("section")
  onto.id = THE_WINDOW
  onto.getBoundingClientRect = (): DOMRect => ({
    top,
    bottom: top + height,
    height,
    y: top,
    left: 0,
    right: 350,
    width: 350,
    x: 0,
    toJSON: () => ({}),
  })
  onto.scrollIntoView = scrollIntoView
  document.body.append(onto)

  return { scrollIntoView }
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

describe("the visitor and the window their page moved in", () => {
  /**
   * **The screen this component exists for.** The undo is pressed on the record
   * card, 922 pixels down a phone's rail, and the page goes back in a window
   * nobody is looking at. `SpotlightScroll` declines because a root configure
   * marks nothing, and it is right: there is nothing down on the stage to carry
   * them to. There is something up.
   */
  it("carries them up to a window that moved above their screen", () => {
    const { scrollIntoView } = browser({ top: -922, height: 290 })

    render(<PageInView token="1" />)

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
  })

  /**
   * **The one state it must not move in, and it is the state the demo opens
   * with.** `demo-44`'s measurement is that the window and the green button
   * stay at `y 325` and `y 611` across the opening press, so what changes
   * between the two screens is the page in the window and nothing else. A
   * scroll here would move the screen that unit was built to hold still.
   */
  it("leaves a visitor alone when the window is already in front of them", () => {
    const { scrollIntoView } = browser({ top: 325, height: 290 })

    render(<PageInView token="1" />)

    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  /**
   * And it reads *in front of them* strictly, which is the difference between
   * carrying somebody to a window and carrying them to the top of one. A
   * window whose foot is under the fold has its caption under the fold, and the
   * caption is the sentence that says the page is as it stands.
   */
  it("acts for a window the fold cuts, not only for one above the screen", () => {
    const { scrollIntoView } = browser({ top: PHONE - 100, height: 290 })

    render(<PageInView token="1" />)

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
  })

  /**
   * **And no box is no movement, which is how the two scrolls stay out of each
   * other's way.** At `lg` the rail is a scroller of its own and `AnswerInView`
   * re-lands the card in it; at `lg` the stylesheet also takes this window off
   * the layout. Neither component reads the other, and neither reads a width:
   * one walks up for a scroller, this measures a box, and the one CSS fact
   * decides both.
   *
   * **Asserted with the box a hidden element really reports**, which is all
   * zeros — the wide shot's own measurement is `#the-page-itself x 0 y 0 0x0`.
   * That is why there is no clause for this case: a rect of zeros is inside
   * every viewport, so the one read below already answers it. A guard for it
   * was written and the defect matrix caught nothing when it was removed, which
   * is this row's whole point: the behaviour is real and the code for it was
   * not.
   */
  it("declines on every screen the stylesheet takes the window off", () => {
    const { scrollIntoView } = browser({ top: 0, height: 0 })

    render(<PageInView token="1" />)

    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  /**
   * **`center` rather than `start`, and the sibling's ceiling is not copied.**
   * `SpotlightScroll` starts a band taller than three quarters of the viewport,
   * because centring one shows its middle and the mark's chip is not there. The
   * window cannot be in that case — `globals.css` caps it at 15rem and the two
   * sizes where the cap does not apply are the two where it is not drawn — so
   * the arithmetic is quoted in a comment rather than shared with one caller.
   */
  it("centres the window rather than putting its top edge at the top", () => {
    const { scrollIntoView } = browser({ top: -922, height: 290 })

    render(<PageInView token="1" />)

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" })
  })

  it("does not animate for a visitor who asked for no motion", () => {
    const { scrollIntoView } = browser({ top: -922, height: 290, still: true })

    render(<PageInView token="1" />)

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "center" })
  })

  /**
   * A rail that re-renders is not a new landing. The token is the revision the
   * press produced (`the-page-itself.ts`), so an undo and the press it undoes
   * are two landings and a re-render is none.
   */
  it("moves again for a new landing and not for a re-render", () => {
    const { scrollIntoView } = browser({ top: -922, height: 290 })

    const view = render(<PageInView token="1" />)
    view.rerender(<PageInView token="1" />)

    expect(scrollIntoView).toHaveBeenCalledTimes(1)

    view.rerender(<PageInView token="2" />)

    expect(scrollIntoView).toHaveBeenCalledTimes(2)
  })

  /**
   * And a window that is not in the document is the same answer as a window
   * with no box, for the same reason: there is nothing to carry anybody to.
   * This is the state a renamed `id` would produce, and it must not throw —
   * the name is held in `_lib` so that it cannot happen quietly.
   */
  it("does nothing when there is no window in the document", () => {
    browser({ top: -922, height: 290 })
    document.body.replaceChildren()

    expect(() => render(<PageInView token="1" />)).not.toThrow()
  })
})
