import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { COLOUR_FORMS, palettesAnswering, SCHEMED_PALETTES, schemeWorkingFor } from "@/app/(docs)/_lib/scheme"

import { ColourForms, PaletteSchemes, SchemeWorking } from "./palette-scheme"

/**
 * The three blocks the scheme section is built out of, read back off the page.
 *
 * This lane's 2 October finding is that every assertion about a produced block
 * on this site is about what the **producer** computes. `scheme.test.ts` is that
 * — it holds every answer against a second comparison of the same luminances —
 * and it stays entirely green if these components print nothing at all.
 *
 * So this is the other half, written at the same time as the first rather than
 * a run later. The assertions that matter are the ones a picture cannot make:
 * that the swatch beside a verdict is painted the pair that verdict came from,
 * and that `undefined` reaches the page as the word rather than as a blank.
 */

const schemes = () => render(<PaletteSchemes />).container
const forms = () => render(<ColourForms />).container

/**
 * A hex as the CSSOM gives it back.
 *
 * jsdom normalises an inline `background-color: #ffffff` to
 * `rgb(255, 255, 255)`, so a test comparing the property to the palette's own
 * string compares two spellings rather than two colors. Converting here means
 * the expectation is parsed a second time, in this file, from the hex the
 * registry holds — which is the comparison that was wanted.
 */
const asRgb = (hex: string): string => {
  const digits = hex.replace("#", "")
  const pairs = digits.length === 3 ? [...digits].map((digit) => `${digit}${digit}`) : [0, 2, 4].map((at) => digits.slice(at, at + 2))
  const [r, g, b] = pairs.map((pair) => Number.parseInt(pair, 16))

  return `rgb(${r}, ${g}, ${b})`
}

const groupRows = (container: HTMLElement, answer: string): readonly HTMLElement[] => [
  ...(container.querySelector(`[data-scheme-group="${answer}"]`)?.querySelectorAll("li") ?? []),
] as HTMLElement[]

describe("every registered palette, under the word it answers", () => {
  it("prints a row for every palette and no more", () => {
    const container = schemes()

    expect(SCHEMED_PALETTES.length).toBeGreaterThan(1)
    expect(container.querySelectorAll("li")).toHaveLength(SCHEMED_PALETTES.length)
  })

  /**
   * In order within each group, because the groups are read as lists and a
   * shuffled one passes a membership check — the slip `entry-points.test.tsx`
   * was written for, in a second place.
   */
  it.each(["light", "dark"] as const)("prints the %s palettes, in order", (answer) => {
    const rows = groupRows(schemes(), answer)
    const expected = palettesAnswering(answer)

    expect(expected.length).toBeGreaterThan(0)
    expect(rows.map((row) => row.dataset.palette)).toEqual(expected.map((row) => row.id))
  })

  /**
   * The assertion this file exists for.
   *
   * A row is a swatch and a verdict, and the verdict is which of the swatch's
   * two colors is lighter. A table painting one palette's pair in the row of
   * another's answer is correct-looking, correct in every producer test, and
   * wrong — and the only thing that can see it is reading the style back off
   * the element the reader is looking at.
   */
  it("paints each row's swatch in that palette's own canvas and ink", () => {
    const container = schemes()

    for (const row of SCHEMED_PALETTES) {
      const pair = container.querySelector<HTMLElement>(`[data-pair="${row.id}"]`)

      expect(pair, `${row.id} has no swatch`).not.toBeNull()
      expect(pair?.style.backgroundColor, `${row.id}'s canvas`).toBe(asRgb(row.canvas))
      expect(pair?.style.color, `${row.id}'s ink`).toBe(asRgb(row.ink))
    }
  })

  it("names each palette beside its swatch", () => {
    const container = schemes()

    for (const row of SCHEMED_PALETTES) {
      expect(container.querySelector(`[data-palette-id="${row.id}"]`)?.textContent).toBe(row.id)
      expect(container.querySelector(`[data-palette="${row.id}"]`)?.textContent).toContain(row.canvas)
      expect(container.querySelector(`[data-palette="${row.id}"]`)?.textContent).toContain(row.ink)
    }
  })

  /**
   * The count under a group is the length of the list above it. A group that
   * printed no rows would otherwise read as a short answer rather than as a
   * block that lost its data.
   */
  it.each(["light", "dark"] as const)("counts the %s group as many rows as it drew", (answer) => {
    const container = schemes()

    expect(container.querySelector(`[data-scheme-count="${answer}"]`)?.textContent).toBe(
      String(palettesAnswering(answer).length)
    )
    expect(groupRows(container, answer)).toHaveLength(palettesAnswering(answer).length)
  })

  /**
   * The absence, said out loud. *No palette comes back undefined* is the
   * section's claim and the one sentence a reader cannot check by looking at
   * the swatches, so it is printed from the data and asserted here.
   */
  it("says that nothing came back undefined, and says it from the data", () => {
    const container = schemes()
    const line = container.querySelector<HTMLElement>("[data-unreadable]")

    expect(line?.dataset.unreadable).toBe("0")
    expect(line?.textContent).toContain("Every registered palette answers")
  })
})

describe("the working, for one palette", () => {
  it("prints both luminances and the answer they produce", () => {
    const working = schemeWorkingFor("minimal")
    const container = render(<SchemeWorking />).container

    expect(container.querySelector("[data-luminance='bg-canvas']")?.textContent).toBe(
      working.canvasLuminance.toFixed(3)
    )
    expect(container.querySelector("[data-luminance='fg-default']")?.textContent).toBe(
      working.inkLuminance.toFixed(3)
    )
    expect(container.querySelector(`[data-scheme-answer="${working.id}"]`)?.textContent).toBe(
      `"${String(working.scheme)}"`
    )
  })

  /**
   * The sentence and the verdict are two statements about one comparison, and a
   * block saying *the ink is lighter* above the word `"light"` would be
   * self-contradictory in the one place a reader is being taught what the
   * comparison means.
   */
  it("describes the comparison the way the answer went", () => {
    const working = schemeWorkingFor("minimal")
    const text = render(<SchemeWorking />).container.textContent ?? ""

    expect(working.scheme).toBe("light")
    expect(text).toContain("darker than the paper")
    expect(text).not.toContain("lighter than the paper")
  })

  it("works for a dark palette too, with the other wording", () => {
    const text = render(<SchemeWorking palette="midnight" />).container.textContent ?? ""

    expect(schemeWorkingFor("midnight").scheme).toBe("dark")
    expect(text).toContain("lighter than the paper")
    expect(text).toContain('"dark"')
  })
})

describe("the spellings of one pair", () => {
  it("prints a row per spelling, in order", () => {
    const rows = [...forms().querySelectorAll<HTMLElement>("tbody tr")]

    expect(COLOUR_FORMS.length).toBeGreaterThan(1)
    expect(rows.map((row) => row.dataset.colourForm)).toEqual(COLOUR_FORMS.map((form) => form.label))
  })

  it("says of every spelling that a registry takes it", () => {
    const container = forms()

    for (const form of COLOUR_FORMS) {
      const cell = container.querySelector<HTMLElement>(`[data-colour-form="${form.label}"] [data-registrable]`)

      expect(cell?.dataset.registrable, form.label).toBe("true")
      expect(cell?.textContent, form.label).toBe("yes")
    }
  })

  /**
   * `undefined` reaches the page as the word.
   *
   * A cell rendering the value itself would print nothing — React drops
   * `undefined` — and an empty cell beside a legal palette reads as a table
   * that failed to load rather than as the answer. This is the half of the
   * section a reader acts on, so it is the half worth a test.
   */
  it("prints the answer for each spelling, undefined included", () => {
    const container = forms()

    for (const form of COLOUR_FORMS) {
      expect(container.querySelector(`[data-form-answer="${form.label}"]`)?.textContent, form.label).toBe(
        form.scheme === undefined ? "undefined" : `"${form.scheme}"`
      )
    }
  })

  it("shows both outcomes, so the table is about a difference", () => {
    const answers = COLOUR_FORMS.map((form) =>
      forms().querySelector(`[data-form-answer="${form.label}"]`)?.textContent
    )

    expect(new Set(answers).size).toBeGreaterThan(1)
    expect(answers).toContain("undefined")
  })
})
