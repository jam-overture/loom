import { paletteSchema, paletteScheme, relativeLuminance, STARTER_PALETTES } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import {
  COLOUR_FORMS,
  declinedForms,
  LUMINANCE_PLACES,
  palettesAnswering,
  printLuminance,
  SCHEMED_PALETTES,
  schemeWorkingFor,
  unreadablePalettes,
} from "./scheme"

/**
 * Every figure the scheme section states, recomputed a second way.
 *
 * `mounting.test.ts`' rule, applied to its sibling: a module that computes what
 * a page says is only worth having if something independent agrees with it. So
 * the answers below are checked against a comparison of two luminances done
 * here, in this file, rather than against `paletteScheme` — which is the
 * function being documented and would be agreeing with itself.
 */

/** Which way round a pair is, worked out without asking the runtime's measure. */
const comparedHere = (canvas: string, ink: string): "light" | "dark" | undefined => {
  const paper = relativeLuminance(canvas)
  const letters = relativeLuminance(ink)

  if (paper === undefined || letters === undefined) return undefined

  return letters > paper ? "dark" : "light"
}

describe("what every registered palette answers", () => {
  it("has a row for every palette a reader starts with, in the registry's order", () => {
    expect(STARTER_PALETTES.length).toBeGreaterThan(1)
    expect(SCHEMED_PALETTES.map((row) => row.id)).toEqual(STARTER_PALETTES.map((palette) => palette.id))
  })

  /**
   * The row carries the pair the answer was computed from, which is the one
   * defect a picture of this table cannot show: swatches of one palette beside
   * another's verdict look entirely correct.
   */
  it("carries each palette's own canvas and ink", () => {
    for (const row of SCHEMED_PALETTES) {
      const palette = STARTER_PALETTES.find((candidate) => candidate.id === row.id)

      expect(row.canvas, `${row.id} shows a canvas that is not its own`).toBe(palette?.slots["bg-canvas"])
      expect(row.ink, `${row.id} shows an ink that is not its own`).toBe(palette?.slots["fg-default"])
      expect(row.name).toBe(palette?.name)
    }
  })

  it("agrees with a comparison of the same two luminances made here", () => {
    for (const row of SCHEMED_PALETTES) {
      expect(row.scheme, `${row.id}`).toBe(comparedHere(row.canvas, row.ink))
    }
  })

  /**
   * Both ways round are present. A list that was all one answer would satisfy
   * every assertion above and would make the section's two groups a claim about
   * nothing.
   */
  it("finds palettes of both kinds", () => {
    expect(palettesAnswering("light").length).toBeGreaterThan(0)
    expect(palettesAnswering("dark").length).toBeGreaterThan(0)
  })

  it("puts every palette in exactly one of the three outcomes", () => {
    const grouped = [
      ...palettesAnswering("light"),
      ...palettesAnswering("dark"),
      ...unreadablePalettes,
    ]

    expect(grouped).toHaveLength(SCHEMED_PALETTES.length)
    expect(new Set(grouped.map((row) => row.id)).size).toBe(SCHEMED_PALETTES.length)
  })

  it("puts only the palettes that answer one way into that group", () => {
    for (const answer of ["light", "dark"] as const) {
      for (const row of palettesAnswering(answer)) {
        expect(row.scheme, `${row.id} is in the ${answer} group`).toBe(answer)
      }
    }
  })

  /**
   * Stated rather than asserted empty: the day a registered palette is written
   * in a form the measure declines, this goes red and the page's claim that
   * there are no gaps is the thing that has to change.
   */
  it("has no palette the measurement cannot read", () => {
    expect(unreadablePalettes).toEqual([])
  })
})

describe("the spellings a palette may be written in", () => {
  it("offers both hex forms and the four the measure declines", () => {
    expect(COLOUR_FORMS.map((form) => form.label)).toEqual([
      "six-digit hex",
      "three-digit hex",
      "hsl()",
      "rgb()",
      "a named color",
      "hex with an alpha",
    ])
  })

  /**
   * The row's whole point. A form that did not register would be a form a host
   * cannot get into this state by accident, and the table would be describing a
   * palette nobody can have.
   */
  it("shows only spellings a registry actually accepts", () => {
    for (const form of COLOUR_FORMS) {
      expect(form.registrable, `${form.label} does not register`).toBe(true)
    }
  })

  it("asks the registry about the same palette it asks the measure about", () => {
    for (const form of COLOUR_FORMS) {
      const basis = STARTER_PALETTES.find((palette) => palette.id === "midnight")
      const candidate = {
        ...basis,
        slots: { ...basis?.slots, "bg-canvas": form.canvas, "fg-default": form.ink },
      }

      expect(paletteSchema.safeParse(candidate).success).toBe(form.registrable)
      expect(paletteScheme(paletteSchema.parse(candidate))).toBe(form.scheme)
    }
  })

  /**
   * Every row is the same pair the same way round, which is what makes *four of
   * these get it wrong* a statement about the spelling rather than about the
   * colors. Checked on the hex rows, because they are the ones that can be
   * measured at all — and that is the point: the other four are the same pair
   * and cannot be checked.
   */
  it("writes one dark palette six ways", () => {
    for (const form of COLOUR_FORMS) {
      if (form.scheme !== undefined) expect(form.scheme, form.label).toBe("dark")
    }
  })

  /**
   * A negative control, and it is here because of what the column cannot catch.
   *
   * Every row answers *yes*, so `registrable` hardcoded to `true` in the module
   * would satisfy the assertion above and the component's test as well — the
   * expected value and the actual would both be right for the wrong reason.
   * Closing that properly would mean putting a row on the page that does not
   * register, which would weaken the one sentence the table is making.
   *
   * So the question is shown to have two answers instead. A palette built the
   * same way, wearing a string that is not a color, is refused — which is what
   * makes the six yeses above a measurement rather than a constant.
   */
  it("is asking a question the schema can answer no to", () => {
    const basis = STARTER_PALETTES.find((palette) => palette.id === "midnight")
    const nonsense = {
      ...basis,
      slots: { ...basis?.slots, "bg-canvas": "not a color at all", "fg-default": "#f3f4f7" },
    }

    expect(paletteSchema.safeParse(nonsense).success).toBe(false)
  })

  it("declines four of the six", () => {
    expect(declinedForms.map((form) => form.label)).toEqual(["hsl()", "rgb()", "a named color", "hex with an alpha"])
  })
})

describe("the working, for one palette", () => {
  it("reads the luminances the measure itself compares", () => {
    const working = schemeWorkingFor("minimal")

    expect(working.canvasLuminance).toBe(relativeLuminance(working.canvas))
    expect(working.inkLuminance).toBe(relativeLuminance(working.ink))
  })

  it("answers what the comparison of those two numbers says", () => {
    for (const row of SCHEMED_PALETTES) {
      const working = schemeWorkingFor(row.id)
      const lighter = working.inkLuminance > working.canvasLuminance ? "dark" : "light"

      expect(working.scheme, row.id).toBe(lighter)
    }
  })

  it("refuses an id no registry has", () => {
    expect(() => schemeWorkingFor("not-a-palette")).toThrow(/not a registered palette/)
  })

  it("prints a luminance to the places the section shows", () => {
    expect(printLuminance(1)).toBe(`1.${"0".repeat(LUMINANCE_PLACES)}`)
    expect(printLuminance(0.00420001).split(".")[1]).toHaveLength(LUMINANCE_PLACES)
  })
})
