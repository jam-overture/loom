import { render } from "@testing-library/react"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { Columns, Measured, Screen } from "./screen"

describe("a screen's width", () => {
  /**
   * The whole point. Eighteen screens capped themselves at 768px and six at
   * 576, so on a 1280 display more than half of it was empty and everything
   * stacked. A screen is as wide as the display now.
   */
  it("is not capped at a reading measure", () => {
    const { container } = render(<Screen>page</Screen>)
    const root = container.firstElementChild

    expect(root?.className).toContain("w-full")
    expect(root?.className).not.toMatch(/max-w-(xl|2xl|3xl|4xl)\b/u)
  })

  /**
   * There is still a bound, and it is not about reading: a card grid on a
   * 3440-pixel display becomes eleven columns of thumbnail, and a row of eleven
   * is a different screen from a row of four.
   */
  it("stops widening somewhere past any display a page is reviewed on", () => {
    const { container } = render(<Screen>page</Screen>)

    expect(container.firstElementChild?.className).toContain("max-w-[90rem]")
  })

  it("lets a screen add layout without letting it take the width back", () => {
    const { container } = render(<Screen className="lg:flex-row">page</Screen>)
    const root = container.firstElementChild

    expect(root?.className).toContain("lg:flex-row")
    expect(root?.className).toContain("max-w-[90rem]")
  })
})

describe("the measure on the words", () => {
  /**
   * In `ch` and not pixels, because the measure is about characters: a reader's
   * eye returns to the left margin by counting, so the number moves with the
   * font and the size.
   */
  it("is counted in characters", () => {
    const { container } = render(<Measured>words</Measured>)

    expect(container.firstElementChild?.className).toContain("max-w-[68ch]")
  })
})

describe("a screen's main subject and what sits beside it", () => {
  /**
   * Not a row of equals. One of these is the queue somebody came for and the
   * others are a paragraph and a button; an even split leaves two short panels
   * beside a long one and a column of white under them.
   */
  it("gives the main subject twice the room", () => {
    const { container } = render(<Columns main={<p>main</p>} beside={<p>rail</p>} />)
    const [first, second] = [...(container.firstElementChild?.children ?? [])]

    expect(first?.className).toContain("flex-[2]")
    expect(second?.className).toContain("flex-1")
  })

  /**
   * Source order is reading order, so the main column is first in the markup and
   * lands on the left without the row being reversed — which is the rule the
   * whole lane is held to, and the one a two-column layout is most tempted to
   * break.
   */
  it("puts the main subject first in the markup", () => {
    const { container } = render(<Columns main={<p>main</p>} beside={<p>rail</p>} />)

    expect(container.textContent).toBe("mainrail")
    expect(container.innerHTML).not.toContain("reverse")
  })

  /**
   * An empty rail is not drawn. A screen with nothing beside its subject should
   * be one column, not one column and a column of air — which is what a
   * `beside` defaulting to an empty fragment would have produced.
   */
  it("draws one column when there is nothing to put beside it", () => {
    const { container } = render(<Columns main={<p>main</p>} />)

    expect(container.querySelector(".lg\\:flex-row")).toBeNull()
    expect(container.textContent).toBe("main")
  })
})

/**
 * **The rule, swept over the lane rather than remembered per screen.**
 *
 * The caps are the defect, so a screen that writes one back in is the
 * regression — and it would look completely reasonable in review, because every
 * one of the twenty-four that existed did.
 *
 * This is a counted ceiling rather than a ban: sixteen screens still carry one
 * and will until each is moved onto `Screen`. What it stops is the number
 * going **up**, which is the only direction that matters while the rest are
 * being converted.
 */
describe("the caps that are left", () => {
  const GROUP = join(process.cwd(), "app", "(portal)")

  const sourcesUnder = (directory: string): readonly string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name)

      if (entry.isDirectory()) return sourcesUnder(path)
      if (!entry.name.endsWith(".tsx") || entry.name.includes(".test.")) return []

      return [readFileSync(path, "utf8")]
    })

  const capped = sourcesUnder(GROUP).flatMap((source) =>
    [...source.matchAll(/max-w-(xl|2xl|3xl|4xl)\b/gu)].map((match) => match[0])
  )

  it("finds the lane to sweep, so an empty sweep cannot pass as clean", () => {
    expect(sourcesUnder(GROUP).length).toBeGreaterThan(40)
  })

  /**
   * **29 on 3 October**, counted over every `.tsx` in the lane rather than over
   * its screens — components carry them too, and a cap inside a card is the
   * same defect one level down.
   *
   * **Lower it when something converts; never raise it.** A run that finds this
   * failing because the count went up has put a cap back.
   */
  it("is never more than the 29 still waiting to be converted", () => {
    expect(capped.length).toBeLessThanOrEqual(29)
  })
})
