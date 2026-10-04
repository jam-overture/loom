import { render } from "@testing-library/react"
import { readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { screenSource } from "@/app/(portal)/_lib/screen-source"

import { CardGrid, Columns, Measured, Screen } from "./screen"

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

describe("the element a measure is", () => {
  /**
   * The reason the prop exists. Fourteen of the fifteen places a measure is
   * wanted are a screen's opening `<header>`, and the landmark is not
   * decoration: it is what a screen reader offers to jump to.
   */
  it("renders the element it is given, so a header stays a header", () => {
    const { container } = render(
      <Measured as="header" className="gap-2">
        <h1>Your pages</h1>
      </Measured>
    )

    expect(container.querySelector("header")).not.toBeNull()
    expect(container.querySelector("header")?.className).toContain("max-w-[68ch]")
  })

  it("is still a div when nothing says otherwise", () => {
    const { container } = render(<Measured>a sentence</Measured>)

    expect(container.firstElementChild?.tagName).toBe("DIV")
  })
})

describe("a list of cards that fills the width", () => {
  /**
   * The property, and the only one worth asserting about a grid in jsdom: the
   * number of columns is the browser's answer to `auto-fill`, which jsdom does
   * not compute. What a test can hold is that the track is written to fill
   * rather than to a fixed count — `auto-fill` and `1fr` — because a
   * `grid-cols-3` written here would be three columns at 390px too.
   */
  it("fills the width it is given rather than taking a fixed number of columns", () => {
    const { container } = render(
      <CardGrid min={320}>
        <li>one</li>
      </CardGrid>
    )

    const columns = (container.firstElementChild as HTMLElement).style.gridTemplateColumns

    expect(columns).toContain("auto-fill")
    expect(columns).toContain("320px")
    expect(columns).toContain("1fr")
  })

  /**
   * The inner `min(100%, …)`, which is the whole difference between a grid and
   * a horizontal scrollbar. Without it a 320px track on a 300px screen is a
   * track wider than its grid, and the card goes off the side of the phone.
   */
  it("never asks for a column wider than the grid itself", () => {
    const { container } = render(
      <CardGrid min={520}>
        <li>one</li>
      </CardGrid>
    )

    expect((container.firstElementChild as HTMLElement).style.gridTemplateColumns).toContain(
      "min(100%"
    )
  })

  it("is a list, so a card is one of several rather than a stack of divs", () => {
    const { container } = render(
      <CardGrid min={320}>
        <li>one</li>
        <li>two</li>
      </CardGrid>
    )

    expect(container.firstElementChild?.tagName).toBe("UL")
    expect(container.querySelectorAll("li")).toHaveLength(2)
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
 * This was a counted ceiling of 29 rather than a ban, because sixteen screens
 * still carried one. **The sixteen are converted**, so the ceiling is now 1 and
 * the one left is named below. What it stops is unchanged and is the only
 * direction that ever mattered: the number going **up**.
 *
 * It counts comment-free source now. At 29 it did not, and three of the last
 * four "caps" it was counting were the words `max-w-3xl` inside this file's own
 * explanation of why screens should not have one — a ceiling that a paragraph
 * can raise is a ceiling that drifts away from the thing it bounds.
 */
describe("the caps that are left", () => {
  const GROUP = join(process.cwd(), "app", "(portal)")

  const sourcesUnder = (directory: string): readonly string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name)

      if (entry.isDirectory()) return sourcesUnder(path)
      if (!entry.name.endsWith(".tsx") || entry.name.includes(".test.")) return []

      return [screenSource(path)]
    })

  const capped = sourcesUnder(GROUP).flatMap((source) =>
    [...source.matchAll(/max-w-(xl|2xl|3xl|4xl)\b/gu)].map((match) => match[0])
  )

  it("finds the lane to sweep, so an empty sweep cannot pass as clean", () => {
    expect(sourcesUnder(GROUP).length).toBeGreaterThan(40)
  })

  /**
   * **29 on 3 October, 1 the same evening.** Counted over every `.tsx` in the
   * lane rather than over its screens — components carry them too, and a cap
   * inside a card is the same defect one level down.
   *
   * The survivor is the one-item list on `/portal/pages/[treeId]/proposed/
   * [proposalId]` that holds the decision card, and it is deliberate rather
   * than missed: that screen's subject is two full-width drawings of a page,
   * and the card under them is a paragraph, a verdict and two buttons. It is
   * the one place in this group where a cap is doing the job `Measured` does
   * everywhere else, on something that is not quite prose.
   *
   * **Lower it when something converts; never raise it.** A run that finds this
   * failing because the count went up has put a cap back.
   */
  it("is never more than the 1 that is left", () => {
    expect(capped.length).toBeLessThanOrEqual(1)
  })
})
