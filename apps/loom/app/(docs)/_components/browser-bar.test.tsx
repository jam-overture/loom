import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  BAR_COMBINATIONS,
  BAR_OUTCOMES,
  BAR_ROWS,
  combinationsThatAre,
  distinctCanvases,
  mediaPairServes,
  PAIR_DARK_ID,
  PAIR_LIGHT_ID,
  pairVerdictLine,
  unpaintableBars,
} from "@/app/(docs)/_lib/browser-bar"

import { BarOutcomes, BarPicture } from "./browser-bar"

/**
 * The two blocks the browser-bar section is built out of, read back off the page.
 *
 * `browser-bar.test.ts` holds every figure against a second computation and
 * stays entirely green if these components print nothing at all. This is the
 * other half, written at the same time rather than a run later, which is this
 * lane's 2 October finding applied in advance.
 *
 * The assertions that matter here are the ones a picture cannot make. The whole
 * subject is **two colors being the same color or not**, so a component that
 * painted both halves of a stack from one value would produce a perfectly
 * plausible image of the thing working, and the only place that shows up is a
 * property read off the element.
 */

/**
 * A hex as the CSSOM gives it back.
 *
 * `palette-scheme.test.tsx`'s helper and its reason: jsdom normalises an inline
 * `background-color: #ffffff` to `rgb(255, 255, 255)`, so comparing the
 * property to the registry's string compares two spellings rather than two
 * colors. Parsing here means the expectation is derived a second time in this
 * file.
 */
const asRgb = (hex: string): string => {
  const digits = hex.replace("#", "")
  const pairs =
    digits.length === 3
      ? [...digits].map((digit) => `${digit}${digit}`)
      : [0, 2, 4].map((at) => digits.slice(at, at + 2))
  const [r, g, b] = pairs.map((pair) => Number.parseInt(pair, 16))

  return `rgb(${r}, ${g}, ${b})`
}

const outcomes = () => render(<BarOutcomes />).container

const picture = (palette: string, machine: "light" | "dark") =>
  render(<BarPicture palette={palette} machine={machine} />).container

/** What `themeGround` hands back for a palette, as the module recorded it. */
const asPaintedBy = (id: string): string => {
  const painted = BAR_ROWS.find((row) => row.id === id)?.painted

  if (painted === undefined) throw new Error(`"${id}" has no painted ground to assert against`)

  return painted
}

const bandsOf = (container: HTMLElement, label: string) => ({
  bar: container.querySelector<HTMLElement>(`[data-stack-bar="${label}"]`),
  page: container.querySelector<HTMLElement>(`[data-stack-page="${label}"]`),
})

describe("one palette under one machine, drawn both ways", () => {
  /**
   * The defect, as the two properties that hold it. The left stack's bar is the
   * machine's color over the tree's page, and those are two different values —
   * a component that painted the bar from the page would draw the fixed version
   * twice and the picture would look entirely reasonable.
   */
  it("paints the pair's bar from the machine and its page from the tree", () => {
    const container = picture(PAIR_DARK_ID, "light")
    const { bar, page } = bandsOf(container, "pair")

    expect(bar?.style.backgroundColor).toBe(asRgb(mediaPairServes.light))
    expect(page?.style.backgroundColor).toBe(asRgb(asPaintedBy(PAIR_DARK_ID)))
    expect(bar?.style.backgroundColor).not.toBe(page?.style.backgroundColor)
  })

  /** And the fixed version is one color in both bands, which is the point of it. */
  it("paints both of the ground's bands the color the page is", () => {
    const container = picture(PAIR_DARK_ID, "light")
    const { bar, page } = bandsOf(container, "ground")
    const painted = asRgb(asPaintedBy(PAIR_DARK_ID))

    expect(bar?.style.backgroundColor).toBe(painted)
    expect(page?.style.backgroundColor).toBe(painted)
  })

  /**
   * The hexes are printed beneath each swatch rather than inside it, which is
   * the fix for a block that was legible only where the two colors differed.
   * The assertion is that both are there in the `exact` case too, where the
   * band they used to sit in is the same color as the text would have been.
   */
  it("prints both hexes under every stack, including where they are equal", () => {
    const container = picture(PAIR_LIGHT_ID, "light")
    const painted = asPaintedBy(PAIR_LIGHT_ID)

    expect(container.querySelector('[data-stack-hexes="pair"]')?.textContent).toBe(`${painted} over ${painted}`)
    expect(container.querySelector('[data-stack-hexes="ground"]')?.textContent).toBe(`${painted} over ${painted}`)
  })

  /**
   * And no seam is drawn between the bands. A border there would be a line the
   * browser does not draw, in the one case whose meaning is that there is no
   * line, so the swatch carries one outline around the pair and none between.
   */
  it("draws no divider between the bar and the page", () => {
    const container = picture(PAIR_DARK_ID, "light")

    for (const label of ["pair", "ground"]) {
      const band = container.querySelector(`[data-stack-bar="${label}"]`)

      expect(band?.className, `the ${label} bar draws a divider`).not.toMatch(/border/)
    }
  })

  /**
   * The hexes are printed as well as painted, because a reader checking the
   * picture against the table needs the values and a swatch does not carry one.
   */
  it("prints both hexes beside the stacks", () => {
    const container = picture(PAIR_DARK_ID, "light")

    expect(container.querySelector(`[data-pair-served="${PAIR_DARK_ID}"]`)?.textContent).toBe(
      mediaPairServes.light
    )
    expect(container.querySelector(`[data-ground-served="${PAIR_DARK_ID}"]`)?.textContent).toBe(
      asPaintedBy(PAIR_DARK_ID)
    )
  })

  /**
   * The one palette-and-machine pairing where the pair happens to be right, so
   * the component is held to drawing agreement as well as disagreement.
   */
  it("draws the nominated palette's own setting as one color throughout", () => {
    const container = picture(PAIR_LIGHT_ID, "light")
    const pair = bandsOf(container, "pair")

    expect(pair.bar?.style.backgroundColor).toBe(pair.page?.style.backgroundColor)
    expect(container.querySelector("[data-picture-outcome]")?.getAttribute("data-picture-outcome")).toBe("exact")
  })

  it("carries the outcome the data gives that pairing", () => {
    for (const [palette, machine, expected] of [
      [PAIR_DARK_ID, "light", "inverted"],
      [PAIR_DARK_ID, "dark", "exact"],
      ["editorial", "light", "off-by-a-shade"],
    ] as const) {
      const container = picture(palette, machine)

      expect(
        container.querySelector("[data-picture-outcome]")?.getAttribute("data-picture-outcome"),
        `${palette} on a ${machine} machine`
      ).toBe(expected)
    }
  })

  /**
   * A palette the registry does not have is a page that would otherwise render
   * a stack of two blank bands, which reads as a styling bug rather than as a
   * missing palette.
   */
  it("refuses a palette it has no row for", () => {
    expect(() => picture("not-a-palette", "light")).toThrow(/not-a-palette/)
  })
})

describe("every palette under both machines, grouped by how it comes out", () => {
  it("prints a row for each of the three outcomes and no more", () => {
    const container = outcomes()

    expect(container.querySelectorAll("[data-outcome]")).toHaveLength(BAR_OUTCOMES.length)
  })

  /**
   * The counts, read off the page and compared to the lists. The numbers are
   * the argument the section makes, and a component printing a hard-coded `2`
   * is the one failure the prose around it could not reveal.
   */
  it("prints each outcome's count from the list it describes", () => {
    const container = outcomes()

    for (const outcome of BAR_OUTCOMES) {
      expect(
        container.querySelector(`[data-outcome-count="${outcome}"]`)?.textContent,
        `the ${outcome} count`
      ).toBe(String(combinationsThatAre(outcome).length))
    }
  })

  /** Each row's sample stack is one of the pairings that row is counting. */
  it("illustrates each outcome with a pairing that lands in it", () => {
    const container = outcomes()

    for (const outcome of BAR_OUTCOMES) {
      const printed = container
        .querySelector(`[data-outcome-example="${outcome}"]`)
        ?.textContent?.replace(/^e\.g\. /, "")
      const belongs = combinationsThatAre(outcome).some(
        (combination) => printed === `${combination.paletteId} on a ${combination.machine} machine`
      )

      expect(belongs, `the ${outcome} row illustrates "${printed ?? "nothing"}"`).toBe(true)
    }
  })

  it("prints the two figures the pair's arithmetic rests on", () => {
    const container = outcomes()

    expect(container.querySelector("[data-bar-rows]")?.textContent).toBe(String(BAR_ROWS.length))
    expect(container.querySelector("[data-distinct-canvases]")?.textContent).toBe(String(distinctCanvases))
  })

  it("prints the verdict the module computes rather than a sentence of its own", () => {
    const container = outcomes()

    expect(container.querySelector("[data-pair-verdict]")?.textContent).toBe(pairVerdictLine(BAR_COMBINATIONS))
  })

  /**
   * The absence, stated. With no unpaintable palette the sentence is the claim
   * that there is no gap, and `browser-bar.test.ts` holds the other branch of
   * the same conditional.
   */
  it("says plainly that no registered palette has to be left silent", () => {
    const container = outcomes()
    const line = container.querySelector("[data-unpaintable]")

    expect(line?.getAttribute("data-unpaintable")).toBe(String(unpaintableBars.length))
    expect(line?.textContent).toContain("Every registered palette has a ground to offer")
  })
})
