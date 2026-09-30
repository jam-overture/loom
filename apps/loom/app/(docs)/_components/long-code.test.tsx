import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { LongCode } from "./long-code"

/**
 * What a fold may and may not do.
 *
 * The one property worth a test is the one a fold usually gets wrong: **the
 * text is all there while it is closed.** A component that rendered the first
 * forty lines and swapped in the rest on a click would look identical in a
 * screenshot, pass any test that clicks the button first, and quietly break the
 * copy button, find-in-page and the search index — which is the whole reason the
 * quickstart could not simply be abridged.
 */
const WALL = Array.from({ length: 300 }, (_, line) => `line ${line + 1}`).join("\n")

const fold = () =>
  render(
    <LongCode lines={300} label="quickstart.mts">
      <pre>{WALL}</pre>
    </LongCode>
  )

describe("a folded code block", () => {
  it("holds every line while it is shut", () => {
    const { container } = fold()

    expect(container.textContent).toContain("line 1")
    expect(container.textContent).toContain("line 300")
  })

  it("starts shut, so nothing jumps when the page hydrates", () => {
    const { container } = fold()

    expect(container.querySelector("[data-long-code]")?.getAttribute("data-long-code")).toBe(
      "collapsed"
    )
    expect(screen.getByRole("button").getAttribute("aria-expanded")).toBe("false")
  })

  it("says how much it is holding back, and what of", () => {
    fold()

    expect(screen.getByRole("button").textContent).toBe("Show all 300 lines of quickstart.mts")
  })

  it("opens and shuts again", () => {
    const { container } = fold()
    const button = screen.getByRole("button")

    fireEvent.click(button)

    expect(container.querySelector("[data-long-code]")?.getAttribute("data-long-code")).toBe("open")
    expect(button.getAttribute("aria-expanded")).toBe("true")
    expect(button.textContent).toBe("Show less")

    fireEvent.click(button)

    expect(container.querySelector("[data-long-code]")?.getAttribute("data-long-code")).toBe(
      "collapsed"
    )
  })

  /** The button and the region it opens, tied together for a screen reader. */
  it("names the region it controls", () => {
    const { container } = fold()
    const controls = screen.getByRole("button").getAttribute("aria-controls")

    expect(controls).toBeTruthy()
    expect(container.querySelector(`#${CSS.escape(controls ?? "")}`)).not.toBeNull()
  })

  /**
   * Shutting it puts the reader back at the top of the panel.
   *
   * jsdom implements no scrolling at all, so the method is attached for the
   * length of the test rather than asserted against a layout — which is the
   * whole of what can honestly be checked here: that it is asked for, on the
   * right element, and only on the way shut.
   */
  it("goes back to the top of the block when it shuts, and not when it opens", () => {
    const { container } = fold()
    const region = container.firstElementChild as HTMLElement
    const calls: unknown[] = []

    Object.defineProperty(region, "scrollIntoView", {
      configurable: true,
      value: (options: unknown) => calls.push(options),
    })

    fireEvent.click(screen.getByRole("button"))
    expect(calls).toEqual([])

    fireEvent.click(screen.getByRole("button"))
    expect(calls).toEqual([{ block: "start", behavior: "auto" }])
  })

  it("clamps the height only while it is shut", () => {
    const { container } = fold()
    const region = () => container.querySelector("[data-long-code]")

    expect(region()?.className).toContain("max-h-")

    fireEvent.click(screen.getByRole("button"))

    expect(region()?.className).not.toContain("max-h-")
  })
})
