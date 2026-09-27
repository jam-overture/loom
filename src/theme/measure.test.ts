import { describe, expect, it } from "vitest"

import { themeVariables } from "./apply.js"
import { auditPalette, relativeLuminance, TEXT_CONTRAST_MINIMUM } from "./contrast.js"
import {
  boldPalette,
  editorialPalette,
  editorialSerifFontPack,
  comfortableStylePreset,
  STARTER_PALETTES,
} from "./library.js"
import {
  CHROMA_PLACES,
  chromaValue,
  MAX_SRGB_CHROMA,
  PALETTE_CHROMA_SLOTS,
  paletteMeasures,
  paletteScheme,
  paletteScrim,
  SCRIM_DARK_CEILING,
  slotChroma,
} from "./measure.js"
import { paletteSchema, type Palette, type ResolvedTheme } from "./theme.js"

const wearing = (palette: Palette): ResolvedTheme => ({
  palette,
  fontPack: editorialSerifFontPack,
  stylePreset: comfortableStylePreset,
})

/** A palette written in a form `channelsOf` declines to measure. */
const unmeasurable = (): Palette =>
  paletteSchema.parse({
    ...editorialPalette,
    id: "unmeasurable",
    slots: Object.fromEntries(
      Object.keys(editorialPalette.slots).map((slot) => [slot, "hsl(210 30% 40%)"])
    ),
  })

describe("slotChroma", () => {
  it("puts pure blue at the top of the scale, because that is what the scale is", () => {
    expect(slotChroma("#0000ff")).toBeCloseTo(MAX_SRGB_CHROMA / MAX_SRGB_CHROMA, 2)
  })

  /**
   * Asserted on the emitted value rather than on the float: the D65 white point
   * sRGB is defined against leaves a residue around 5e-5 on a true neutral,
   * which is two orders of magnitude under the step three decimal places
   * resolve, so what a stylesheet reads is zero.
   */
  it("calls a grey grey, at every lightness", () => {
    for (const grey of ["#000000", "#808080", "#ffffff"]) {
      expect(chromaValue(slotChroma(grey) ?? 1)).toBe("0.000")
    }
  })

  it("declines a colour it cannot parse rather than guessing at it", () => {
    expect(slotChroma("hsl(210 30% 40%)")).toBeUndefined()
    expect(slotChroma("rebeccapurple")).toBeUndefined()
  })

  /**
   * The measurement the finding is about, as a number rather than an adjective.
   * The same paint at the same opacity is luminous behind one of these and dirt
   * behind the other, and nothing in CSS could tell them apart.
   */
  it("separates the palette that has chroma to spend from the one that has not", () => {
    const bold = slotChroma(boldPalette.slots["accent-strong"] ?? "") ?? 0
    const editorial = slotChroma(editorialPalette.slots["accent-strong"] ?? "") ?? 0

    expect(bold).toBeGreaterThan(0.5)
    expect(editorial).toBeLessThan(0.15)
    expect(bold / editorial).toBeGreaterThan(4)
  })
})

describe("paletteScrim", () => {
  /**
   * The guarantee, held over every palette the library ships rather than over
   * the two somebody pictured: a wash that darkens, and an ink that reads on it.
   */
  it("gives every starter palette a dark ground and a legible ink", () => {
    for (const palette of STARTER_PALETTES) {
      const scrim = paletteScrim(palette)

      expect(scrim, palette.id).toBeDefined()
      expect(scrim?.darkens, palette.id).toBe(true)
      expect(scrim?.luminance ?? 1, palette.id).toBeLessThanOrEqual(SCRIM_DARK_CEILING)
      expect(scrim?.ratio ?? 0, palette.id).toBeGreaterThanOrEqual(TEXT_CONTRAST_MINIMUM)
    }
  })

  /**
   * Why the pair is free: it is the palette's own body-copy pair, and the
   * contrast bar already asserts that one (0074). A scrim cannot fail where the
   * page does not.
   */
  it("is the body-copy pair, whichever way round is darker", () => {
    expect(paletteScrim(editorialPalette)).toMatchObject({
      ground: "fg-default",
      foreground: "bg-canvas",
    })
    expect(paletteScrim(boldPalette)).toMatchObject({
      ground: "bg-canvas",
      foreground: "fg-default",
    })

    for (const palette of STARTER_PALETTES) {
      const scrim = paletteScrim(palette)
      const audited = auditPalette(palette).measured.find(
        (entry) =>
          entry.pairing.foreground === "fg-default" && entry.pairing.background === "bg-canvas"
      )

      expect(scrim?.ratio, palette.id).toBeCloseTo(audited?.ratio ?? 0, 6)
    }
  })

  it("declines a palette it cannot measure rather than offering a wash that might be inverted", () => {
    expect(paletteScrim(unmeasurable())).toBeUndefined()
  })
})

describe("paletteScheme", () => {
  it("reads a light palette off its own pair, and a dark one off its own", () => {
    expect(paletteScheme(editorialPalette)).toBe("light")
    expect(paletteScheme(boldPalette)).toBe("dark")
  })

  it("declines a pair it cannot read rather than calling it light", () => {
    expect(paletteScheme(unmeasurable())).toBeUndefined()
  })

  /**
   * The claim that makes the threshold unnecessary rather than merely absent.
   *
   * If any registered palette sat near the middle, "which way round is it" would
   * be a judgement and this function would owe a constant. None does: the gap
   * between the lightest dark canvas and the darkest light one is the width of
   * the scale.
   */
  it("puts every registered palette in one of two groups with nothing between them", () => {
    const canvases = STARTER_PALETTES.map((palette) => ({
      scheme: paletteScheme(palette),
      luminance: relativeLuminance(palette.slots["bg-canvas"] ?? "") ?? Number.NaN,
    }))

    expect(canvases).toHaveLength(21)
    expect(canvases.every(({ scheme }) => scheme !== undefined)).toBe(true)

    const light = canvases.filter(({ scheme }) => scheme === "light").map((it) => it.luminance)
    const dark = canvases.filter(({ scheme }) => scheme === "dark").map((it) => it.luminance)

    expect(light.length).toBeGreaterThan(0)
    expect(dark.length).toBeGreaterThan(0)
    expect(Math.min(...light)).toBeGreaterThan(0.9)
    expect(Math.max(...dark)).toBeLessThan(0.02)
  })

  /**
   * Two functions comparing one pair of colours must not be able to disagree
   * about it. `paletteScrim` reads the same ink and the same canvas to decide
   * which end of the pair a wash is drawn in; a light palette is exactly one
   * whose wash is drawn in its ink.
   */
  it("agrees with the scrim about which end of the pair is darker, on every palette", () => {
    for (const palette of STARTER_PALETTES) {
      const scrim = paletteScrim(palette)

      expect(scrim?.ground).toBe(paletteScheme(palette) === "light" ? "fg-default" : "bg-canvas")
    }
  })
})

describe("paletteMeasures", () => {
  it("measures the slots a palette puts its colour in, and no others", () => {
    const { chroma } = paletteMeasures(boldPalette)

    expect(Object.keys(chroma).sort()).toEqual([...PALETTE_CHROMA_SLOTS].sort())
  })

  it("reports which way round the palette is, beside the rest of what it measured", () => {
    expect(paletteMeasures(boldPalette).scheme).toBe("dark")
    expect(paletteMeasures(editorialPalette).scheme).toBe("light")
  })

  it("leaves a slot out when it could not be measured, rather than calling it grey", () => {
    const measures = paletteMeasures(unmeasurable())

    expect(measures.chroma).toEqual({})
    expect(measures.scrim).toBeUndefined()
    expect(measures.scheme).toBeUndefined()
  })

  it("is pure — the same palette twice measures the same", () => {
    expect(paletteMeasures(editorialPalette)).toEqual(paletteMeasures(editorialPalette))
  })
})

describe("the variables a stylesheet gets", () => {
  it("emits a unitless chroma per colour slot, so calc() can multiply by it", () => {
    const variables = themeVariables(wearing(boldPalette))

    for (const slot of PALETTE_CHROMA_SLOTS) {
      expect(variables[`--loom-${slot}-chroma`]).toMatch(/^[01]\.\d{3}$/)
    }
  })

  /**
   * A variable whose length varied with the palette would make the page
   * describing a tree longer in one palette than in another, and *the same tree
   * in every palette, byte for byte* is a promise the theme model makes (0049).
   */
  it("spends the same number of bytes on every palette", () => {
    const lengths = new Set(
      STARTER_PALETTES.map((palette) => {
        const variables = themeVariables(wearing(palette))

        return PALETTE_CHROMA_SLOTS.map((slot) => variables[`--loom-${slot}-chroma`] ?? "").join("")
          .length
      })
    )

    expect(lengths.size).toBe(1)
    expect([...lengths][0]).toBe(PALETTE_CHROMA_SLOTS.length * (CHROMA_PLACES + 2))
  })

  it("emits the scrim as a pair, from the palette's own slots", () => {
    const light = themeVariables(wearing(editorialPalette))
    const dark = themeVariables(wearing(boldPalette))

    expect(light["--loom-scrim"]).toBe(editorialPalette.slots["fg-default"])
    expect(light["--loom-scrim-fg"]).toBe(editorialPalette.slots["bg-canvas"])
    expect(dark["--loom-scrim"]).toBe(boldPalette.slots["bg-canvas"])
    expect(dark["--loom-scrim-fg"]).toBe(boldPalette.slots["fg-default"])
  })

  it("omits what it could not measure, leaving the primitive's own fallback to resolve", () => {
    const variables = themeVariables(wearing(unmeasurable()))

    expect(variables["--loom-scrim"]).toBeUndefined()
    expect(variables["--loom-accent-strong-chroma"]).toBeUndefined()
    expect(variables["--loom-bg-canvas"]).toBe("hsl(210 30% 40%)")
  })
})
