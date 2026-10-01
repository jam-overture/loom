import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { PlainChange } from "@/app/(demo)/_lib/plain-change"

import { PlainReading } from "./plain-reading"

/**
 * The line a visitor answers from, and — since it outlived the question — the
 * line that tells them what they allowed.
 *
 * `plain-change.test.ts` holds *which* words and in which tense; this holds that
 * they reach the screen quoted, in order, with the count of the ones that did
 * not fit, that a change with nothing to quote does not draw an empty row where
 * the words would be, and that the two states are drawn in the two colors the
 * marks on the stage use.
 */

const REMOVAL: PlainChange = {
  sentence: "This comes off the page, and everything under it goes too.",
  words: ["3,400", "24", "92%"],
  more: 0,
}

const REMOVED: PlainChange = {
  sentence: "This came off the page, and everything under it went too.",
  words: ["3,400", "24", "92%"],
  more: 0,
}

const SETTING: PlainChange = {
  sentence: "How the whole page looks changes. Not a word on it changes.",
  words: [],
  more: 0,
}

describe("the plain reading of a change", () => {
  it("says it in one sentence and quotes the page's own words", () => {
    render(<PlainReading lines={[REMOVAL]} />)

    expect(screen.getByText(/This comes off the page/)).toBeTruthy()
    expect(screen.getByText("“3,400”")).toBeTruthy()
    expect(screen.getByText("“92%”")).toBeTruthy()
  })

  /**
   * Three quoted words out of eleven read as a change to three things unless
   * the rest are counted. The count is the difference between a preview and a
   * claim.
   */
  it("counts the words it could not fit", () => {
    render(<PlainReading lines={[{ ...REMOVAL, more: 8 }]} />)

    expect(screen.getByText("and 8 more")).toBeTruthy()
  })

  it("draws no words at all for a change that has none", () => {
    const { container } = render(<PlainReading lines={[SETTING]} />)

    expect(screen.getByText(/Not a word on it changes/)).toBeTruthy()
    expect(container.textContent).not.toContain("“")
  })

  /** One line per operation, in the order they would be applied (0001). */
  it("keeps a two-step proposal two steps long, in order", () => {
    render(<PlainReading lines={[REMOVAL, SETTING]} />)

    const items = screen.getAllByRole("listitem")

    expect(items).toHaveLength(2)
    expect(items[0]?.textContent).toContain("comes off the page")
    expect(items[1]?.textContent).toContain("How the whole page looks")
  })

  /**
   * Nothing rather than an empty frame. A card with no reading to show has no
   * proposal left to picture, and a heading over nothing is the clutter this
   * rail has spent six runs being cut back from.
   */
  it("renders nothing when there is nothing to say", () => {
    const { container } = render(<PlainReading lines={[]} />)

    expect(container.textContent).toBe("")
  })

  /**
   * The color is the whole of what the tone changes, and it is the color of
   * the ring the same change left on the stage. A landed change drawn in the
   * waiting color says the question is still open.
   */
  it("draws a waiting change in the waiting color, by default", () => {
    const { container } = render(<PlainReading lines={[REMOVAL]} />)

    expect(container.querySelector("ul")?.className).toContain("border-awaiting-ink")
  })

  it("draws a landed change in the applied color", () => {
    const { container } = render(<PlainReading lines={[REMOVED]} tone="applied" />)

    expect(container.querySelector("ul")?.className).toContain("border-applied-ink")
    expect(container.querySelector("ul")?.className).not.toContain("border-awaiting-ink")
  })

  /** The words are the page's either way; only the verb moves. */
  it("quotes the same words for a change that has already happened", () => {
    render(<PlainReading lines={[REMOVED]} tone="applied" />)

    expect(screen.getByText(/This came off the page/)).toBeTruthy()
    expect(screen.getByText("“3,400”")).toBeTruthy()
  })
})
