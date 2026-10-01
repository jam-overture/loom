import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { SITE_COUNTS, siteCount, spellOut } from "@/app/(docs)/_lib/counts"

import { Count } from "./count"

/**
 * The element that puts a counted size on a page.
 *
 * `_lib/counts.test.ts` holds the numbers and sweeps the pages. What is left
 * for here is the bit between them, which is small and is the bit a reader
 * actually sees: the three spellings, and that **nothing else comes with
 * them**. An element that rendered a `<span>` would still pass every check in
 * the other file and would put a styled box in the middle of a sentence.
 */

const shown = (element: React.ReactElement): string => render(element).container.textContent ?? ""

describe("a counted size on a page", () => {
  it("renders the digit by default", () => {
    expect(shown(<Count of="starter-primitives" />)).toBe(String(siteCount("starter-primitives").value))
  })

  it("renders the word when the sentence spells its numbers", () => {
    expect(shown(<Count of="palette-slots" as="word" />)).toBe(spellOut(siteCount("palette-slots").value))
  })

  it("capitalises it for a sentence that opens on it", () => {
    expect(shown(<Count of="policy-settings" as="Word" />)).toBe("Fourteen")
  })

  /**
   * And brings no markup. The whole argument for this component is that an
   * author reaches for it as readily as they would reach for typing the number,
   * which stops being true the moment it changes how the sentence looks.
   */
  it("brings no element with it, in any of its three spellings", () => {
    const expected = (count: (typeof SITE_COUNTS)[number], as: "digit" | "word" | "Word"): string => {
      const word = spellOut(count.value)

      if (as === "digit") return String(count.value)

      return as === "Word" ? `${word.slice(0, 1).toUpperCase()}${word.slice(1)}` : word
    }

    for (const count of SITE_COUNTS) {
      for (const as of ["digit", "word", "Word"] as const) {
        const { container } = render(<Count of={count.id} as={as} />)

        expect(container.querySelectorAll("*").length, `${count.id} as ${as}`).toBe(0)
        expect(container.textContent, `${count.id} as ${as}`).toBe(expected(count, as))
      }
    }
  })
})
