import { describe, expect, it } from "vitest"

import { themeVariables } from "./apply.js"
import {
  boldPalette,
  editorialPalette,
  editorialSerifFontPack,
  comfortableStylePreset,
  STARTER_PALETTES,
} from "./library.js"
import { createThemeRegistry, describeThemeError } from "./registry.js"
import {
  auditPalette,
  contrastRatio,
  describePaletteAudit,
  PALETTE_TEXT_PAIRINGS,
} from "./contrast.js"
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

  it("holds every starter palette to the same shape", () => {
    /**
     * Iterated rather than listed, so a palette added to the starter set is
     * held to the slot contract without anyone remembering to add it here.
     * It was two named palettes until `minimal` arrived and showed why.
     */
    for (const palette of STARTER_PALETTES) {
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

/**
 * A palette can be well-formed and still unusable, and nothing above catches it.
 * The slot schema checks that every slot holds a colour; it has no idea which
 * slots are read as text on which other slots, so a palette whose accent is a
 * pale mint registers, resolves, re-themes and renders every eyebrow on the page
 * at 1.6:1.
 *
 * These are the pairings `src/primitives` actually puts together — read off the
 * components rather than imagined — held to WCAG AA for body text. It is the
 * check that decides where a green goes, and it ran before `minimal` was
 * written rather than after.
 */
describe("what the library reads against what", () => {
  /**
   * The pairings and the maths moved into `contrast.ts` (0076) so a host can run
   * the same bar against its own palettes, which `createThemeRegistry` lets it
   * substitute wholesale. What is left here is the assertion that the palettes
   * Loom ships clear it, plus the two facts about `minimal` that are about this
   * palette rather than about the bar.
   */
  const contrast = (a: string, b: string): number => {
    const ratio = contrastRatio(a, b)
    if (ratio === undefined) throw new Error(`cannot measure "${a}" on "${b}"`)

    return ratio
  }

  it("meets AA on every pairing a primitive puts together, in every registered palette", () => {
    for (const palette of STARTER_PALETTES) {
      const audit = auditPalette(palette)

      expect(describePaletteAudit(audit)).toBe("")
      expect(audit.measured).toHaveLength(PALETTE_TEXT_PAIRINGS.length)
    }
  })

  it("keeps the house palette's green out of the slot that is read as text", () => {
    /**
     * The mint reads at 1.58:1 on white, so it can be a border and can never be
     * a letterform. Asserted as the specific value because the swap is tempting
     * and silent: `accent` paints the primary button, so putting the button
     * colour there is the *obvious* move, and it takes every eyebrow, kicker and
     * disclosure marker on the page down with it.
     */
    const minimal = STARTER_PALETTES.find((palette) => palette.id === "minimal")
    if (!minimal) throw new Error("minimal palette is not registered")

    expect(minimal.slots["border-accent"]).toBe("#72e3ad")
    expect(contrast(minimal.slots["border-accent"] ?? "", minimal.slots["bg-canvas"] ?? "")).toBeLessThan(3)
    expect(minimal.slots.accent).not.toBe(minimal.slots["border-accent"])

    /** The green still has to be visibly green where it does appear. */
    expect(contrast(minimal.slots["accent-strong"] ?? "", minimal.slots["accent-subtle"] ?? "")).toBeGreaterThanOrEqual(4.5)
  })

  it("defines its components by their border rather than by a fill", () => {
    /**
     * The outline-first instruction, as the one assertion that can hold it.
     * `bg-surface` is the fill behind a card, a nav, a footer and a hero panel,
     * so `bg-surface === bg-canvas` is what makes all of them outlined — and it
     * only works while `border-subtle` is actually visible, since it is now the
     * only thing separating a card from the page.
     *
     * `bg-surface-muted` is deliberately *not* held to this. It is a functional
     * fill — the well behind a missing image, a monogram — and a placeholder the
     * colour of the page is a placeholder nobody can see.
     */
    const minimal = STARTER_PALETTES.find((palette) => palette.id === "minimal")
    if (!minimal) throw new Error("minimal palette is not registered")

    expect(minimal.slots["bg-surface"]).toBe(minimal.slots["bg-canvas"])
    expect(contrast(minimal.slots["border-subtle"] ?? "", minimal.slots["bg-canvas"] ?? "")).toBeGreaterThan(1.15)
    expect(minimal.slots["bg-surface-muted"]).not.toBe(minimal.slots["bg-canvas"])
  })

  /**
   * The ramp has to stay a ramp. Darkening `fg-subtle` to clear AA moves it
   * towards `fg-muted`, and a palette where the two are the same colour has
   * spent a slot on nothing — the assertion that would have caught it if the
   * repair had been taken one step further.
   */
  it("keeps the three ink slots distinct after the subtle one was darkened", () => {
    for (const palette of STARTER_PALETTES) {
      const [subtle, muted, base] = [
        palette.slots["fg-subtle"] ?? "",
        palette.slots["fg-muted"] ?? "",
        palette.slots["fg-default"] ?? "",
      ]

      expect(new Set([subtle, muted, base]).size, palette.id).toBe(3)

      const canvas = palette.slots["bg-canvas"] ?? ""

      expect(contrast(subtle, canvas), palette.id).toBeLessThan(contrast(muted, canvas))
      expect(contrast(muted, canvas), palette.id).toBeLessThan(contrast(base, canvas))
    }
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

    /**
     * The house theme leads each list, and the other two hand-authored ones
     * follow it. What comes after is range — asserted by count rather than by
     * name, so adding a palette is one number here rather than a list to
     * re-type, while the three a surface actually wears stay pinned.
     */
    expect(catalogue.palettes.map((entry) => entry.id).slice(0, 3)).toEqual([
      "minimal",
      "editorial",
      "bold",
    ])
    expect(catalogue.fontPacks.map((entry) => entry.id).slice(0, 3)).toEqual([
      "minimal-sans",
      "editorial-serif",
      "bold-sans",
    ])
    expect(catalogue.stylePresets.map((entry) => entry.id).slice(0, 3)).toEqual([
      "precise",
      "comfortable",
      "airy-modern",
    ])

    expect(catalogue.palettes).toHaveLength(21)
    expect(catalogue.fontPacks).toHaveLength(20)
    expect(catalogue.stylePresets).toHaveLength(10)

    /**
     * Every id is unique, which `createThemeRegistry` enforces by overwriting
     * rather than refusing — so a duplicate would silently drop a palette from
     * the catalogue rather than fail here.
     */
    for (const group of [catalogue.palettes, catalogue.fontPacks, catalogue.stylePresets]) {
      expect(new Set(group.map((entry) => entry.id)).size).toBe(group.length)
    }

    /**
     * Every entry, not just the first. A description is all a model has when it
     * is choosing, so an id registered without one is an id it can only guess at.
     */
    for (const group of [catalogue.palettes, catalogue.fontPacks, catalogue.stylePresets]) {
      for (const entry of group) expect(entry.description.length, entry.id).toBeGreaterThan(0)
    }
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
