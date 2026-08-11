import { describe, expect, it } from "vitest"

import { themeVariables } from "./apply.js"
import { boldPalette, editorialPalette, editorialSerifFontPack, comfortableStylePreset } from "./library.js"
import { createThemeRegistry, describeThemeError } from "./registry.js"
import { PALETTE_SLOTS, paletteSchema, themeSelectionSchema } from "./theme.js"

const registry = createThemeRegistry()

const resolved = () => {
  const result = registry.resolve(
    themeSelectionSchema.parse({
      palette: "editorial",
      fontPack: "editorial-serif",
      stylePreset: "comfortable",
    })
  )
  if (!result.ok) throw new Error(result.error.code)

  return result.value
}

describe("palette schema", () => {
  it("requires every slot, so no palette can leave a primitive unstyled", () => {
    const missing = { ...editorialPalette.slots }
    delete (missing as Record<string, string>)["accent-subtle"]

    expect(paletteSchema.safeParse({ ...editorialPalette, slots: missing }).success).toBe(false)
  })

  it("holds both starter palettes to the same shape", () => {
    for (const palette of [editorialPalette, boldPalette]) {
      for (const slot of PALETTE_SLOTS) {
        expect(palette.slots[slot], `${palette.id} is missing ${slot}`).toBeDefined()
      }
    }
  })

  it("rejects a colour that is not a colour", () => {
    const slots = { ...editorialPalette.slots, accent: "not a colour" }

    expect(paletteSchema.safeParse({ ...editorialPalette, slots }).success).toBe(false)
  })
})

describe("themeVariables", () => {
  it("emits one custom property per palette slot", () => {
    const variables = themeVariables(resolved())

    for (const slot of PALETTE_SLOTS) {
      expect(variables[`--loom-${slot}`]).toBe(editorialPalette.slots[slot])
    }
  })

  it("numbers the type and spacing ramps from one", () => {
    const variables = themeVariables(resolved())

    expect(variables["--loom-scale-1"]).toBe(`${editorialSerifFontPack.scaleRamp[0]}px`)
    expect(variables["--loom-spacing-1"]).toBe(`${comfortableStylePreset.spacingScale[0]}px`)
    expect(variables[`--loom-scale-${editorialSerifFontPack.scaleRamp.length}`]).toBeDefined()
    expect(variables[`--loom-scale-${editorialSerifFontPack.scaleRamp.length + 1}`]).toBeUndefined()
  })

  it("emits radii, motion and density", () => {
    const variables = themeVariables(resolved())

    expect(variables["--loom-radius-md"]).toBe("12px")
    expect(variables["--loom-motion-fast"]).toBe("150ms")
    expect(variables["--loom-density"]).toBe("comfortable")
  })

  it("omits the accent family when the pack declares none", () => {
    expect(themeVariables(resolved())["--loom-accent-family"]).toBeUndefined()
  })

  it("is pure — the same theme twice gives the same variables", () => {
    expect(themeVariables(resolved())).toEqual(themeVariables(resolved()))
  })

  it("changes every colour and nothing else when only the palette changes", () => {
    const light = themeVariables(resolved())

    const swapped = registry.resolve(
      themeSelectionSchema.parse({
        palette: "bold",
        fontPack: "editorial-serif",
        stylePreset: "comfortable",
      })
    )
    if (!swapped.ok) throw new Error(swapped.error.code)
    const dark = themeVariables(swapped.value)

    for (const slot of PALETTE_SLOTS) {
      expect(dark[`--loom-${slot}`]).not.toBe(light[`--loom-${slot}`])
    }
    expect(dark["--loom-scale-1"]).toBe(light["--loom-scale-1"])
    expect(dark["--loom-radius-md"]).toBe(light["--loom-radius-md"])
  })
})

describe("theme registry", () => {
  it("resolves three registered ids", () => {
    expect(resolved().palette.id).toBe("editorial")
    expect(resolved().fontPack.id).toBe("editorial-serif")
    expect(resolved().stylePreset.id).toBe("comfortable")
  })

  it("refuses an unregistered id and says what is available", () => {
    const result = registry.resolve(
      themeSelectionSchema.parse({
        palette: "chartreuse",
        fontPack: "editorial-serif",
        stylePreset: "comfortable",
      })
    )

    expect(!result.ok && result.error.code).toBe("unknown-palette")
    expect(!result.ok && describeThemeError(result.error)).toContain("editorial")
  })

  it("names the malformed field rather than the whole selection", () => {
    const result = registry.resolve({ palette: "Editorial", fontPack: "x", stylePreset: "y" } as never)

    expect(!result.ok && result.error.code).toBe("malformed-selection")
  })

  it("offers a catalogue a model can choose from", () => {
    const catalogue = registry.catalogue()

    expect(catalogue.palettes.map((entry) => entry.id)).toEqual(["editorial", "bold"])
    expect(catalogue.palettes[0]?.description.length).toBeGreaterThan(0)
    expect(catalogue.stylePresets).toHaveLength(2)
  })

  it("takes a host's own vocabulary in place of the starter one", () => {
    const custom = createThemeRegistry({ palettes: [boldPalette] })

    expect(custom.catalogue().palettes.map((entry) => entry.id)).toEqual(["bold"])
    expect(
      custom.resolve(
        themeSelectionSchema.parse({
          palette: "editorial",
          fontPack: "editorial-serif",
          stylePreset: "comfortable",
        })
      ).ok
    ).toBe(false)
  })
})
