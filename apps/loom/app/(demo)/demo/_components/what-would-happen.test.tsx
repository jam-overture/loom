import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { PlainChange } from "@/app/(demo)/_lib/plain-change"

import { WhatWouldHappen } from "./what-would-happen"

/**
 * The line a visitor answers from.
 *
 * `plain-change.test.ts` holds *which* words; this holds that they reach the
 * screen quoted, in order, with the count of the ones that did not fit — and
 * that a change with nothing to quote does not draw an empty row where the
 * words would be.
 */

const REMOVAL: PlainChange = {
  sentence: "This comes off the page, and everything under it goes too.",
  words: ["3,400", "24", "92%"],
  more: 0,
}

const SETTING: PlainChange = {
  sentence: "How the whole page looks changes. Not a word on it changes.",
  words: [],
  more: 0,
}

describe("what allowing this would do", () => {
  it("says it in one sentence and quotes the page's own words", () => {
    render(<WhatWouldHappen lines={[REMOVAL]} />)

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
    render(<WhatWouldHappen lines={[{ ...REMOVAL, more: 8 }]} />)

    expect(screen.getByText("and 8 more")).toBeTruthy()
  })

  it("draws no words at all for a change that has none", () => {
    const { container } = render(<WhatWouldHappen lines={[SETTING]} />)

    expect(screen.getByText(/Not a word on it changes/)).toBeTruthy()
    expect(container.textContent).not.toContain("“")
  })

  /** One line per operation, in the order they would be applied (0001). */
  it("keeps a two-step proposal two steps long, in order", () => {
    render(<WhatWouldHappen lines={[REMOVAL, SETTING]} />)

    const items = screen.getAllByRole("listitem")

    expect(items).toHaveLength(2)
    expect(items[0]?.textContent).toContain("comes off the page")
    expect(items[1]?.textContent).toContain("How the whole page looks")
  })

  /**
   * Nothing rather than an empty frame. An applied change has no proposal left
   * to picture, and a heading over nothing is the clutter this rail has spent
   * six runs being cut back from.
   */
  it("renders nothing when there is nothing to say", () => {
    const { container } = render(<WhatWouldHappen lines={[]} />)

    expect(container.textContent).toBe("")
  })
})
