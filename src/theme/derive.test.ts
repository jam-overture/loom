import { describe, expect, it } from "vitest"

import { auditPalette, contrastRatio, TEXT_CONTRAST_MINIMUM } from "./contrast.js"
import {
  canCarryText,
  derivePalette,
  derivePaletteChecked,
  hslHex,
  solveLightness,
  type PaletteSpec,
} from "./derive.js"
import { DERIVED_PALETTES } from "./palettes.js"
import { PALETTE_SLOTS } from "./theme.js"

const spec = (over: Partial<PaletteSpec> = {}): PaletteSpec => ({
  id: "test",
  name: "Test",
  description: "A palette derived in a test.",
  mode: "light",
  canvas: { hue: 220, saturation: 14 },
  accent: { hue: 232, saturation: 58 },
  secondary: { hue: 258, saturation: 62 },
  ...over,
})

describe("hslHex", () => {
  it("agrees with the values a colour picker gives", () => {
    expect(hslHex(0, 0, 0)).toBe("#000000")
    expect(hslHex(0, 0, 100)).toBe("#ffffff")
    expect(hslHex(0, 100, 50)).toBe("#ff0000")
    expect(hslHex(120, 100, 50)).toBe("#00ff00")
    expect(hslHex(240, 100, 50)).toBe("#0000ff")
  })

  it("emits six-digit hex, which is the only form the bar can measure", () => {
    for (const hue of [0, 37, 180, 359]) {
      expect(hslHex(hue, 45, 62)).toMatch(/^#[0-9a-f]{6}$/)
      expect(contrastRatio(hslHex(hue, 45, 62), "#ffffff")).toBeDefined()
    }
  })
})

describe("solveLightness", () => {
  it("lands above the target it was given", () => {
    for (const hue of [12, 96, 204, 300]) {
      const solved = solveLightness(hue, 60, "#ffffff", 4.75, true)

      expect(contrastRatio(solved, "#ffffff") ?? 0).toBeGreaterThanOrEqual(4.75)
    }
  })

  it("stops at the lightest colour that clears it, rather than going to black", () => {
    /**
     * The property that keeps a derived palette *coloured*. A solver that
     * overshoots gives every palette a near-black accent, and five palettes
     * that differ only in a hue nobody can see are one palette.
     */
    const solved = solveLightness(210, 66, "#ffffff", 4.75, true)

    expect(contrastRatio(solved, "#ffffff") ?? 0).toBeLessThan(6)
    expect(solved).not.toBe("#000000")
  })

  it("searches upwards for ink on a dark ground", () => {
    const solved = solveLightness(190, 76, "#0d1117", 4.75, false)

    expect(contrastRatio(solved, "#0d1117") ?? 0).toBeGreaterThanOrEqual(4.75)
    expect(contrastRatio(solved, "#ffffff") ?? 0).toBeLessThan(4.75)
  })
})

describe("derivePalette", () => {
  it("fills every slot the schema requires", () => {
    const palette = derivePalette(spec())

    for (const slot of PALETTE_SLOTS) expect(palette.slots[slot], slot).toBeDefined()
  })

  it("clears the audit at every hue, which is the claim the whole tool makes", () => {
    /**
     * Twenty-four hues around the wheel, in both modes. A rule that happens to
     * work at the eighteen hues this library shipped is not a rule — the
     * failure it guards against is a host deriving at hue 47 and getting a page
     * that fails two pairings nobody re-ran the audit for.
     */
    for (let hue = 0; hue < 360; hue += 15) {
      for (const mode of ["light", "dark"] as const) {
        const { clean } = derivePaletteChecked(
          spec({
            mode,
            canvas: { hue, saturation: 16 },
            accent: { hue: (hue + 20) % 360, saturation: 62 },
            secondary: { hue: (hue + 180) % 360, saturation: 70 },
          })
        )

        expect(clean, `hue ${hue} in ${mode}`).toBe(true)
      }
    }
  })

  it("clears it at zero saturation too, where there is no hue to lean on", () => {
    for (const mode of ["light", "dark"] as const) {
      const { clean } = derivePaletteChecked(
        spec({
          mode,
          canvas: { hue: 0, saturation: 0 },
          accent: { hue: 0, saturation: 0 },
          secondary: { hue: 0, saturation: 0 },
          extremeAccent: true,
        })
      )

      expect(clean, mode).toBe(true)
    }
  })

  it("is pure — the same spec twice gives the same colours", () => {
    expect(derivePalette(spec()).slots).toEqual(derivePalette(spec()).slots)
  })

  it("keeps the second colour saturated, because nothing reads text on it", () => {
    /**
     * `loom.hero`'s aurora paints `brand-secondary` and `accent-strong` as
     * large fields, and the finding of 20 August is what happens when a slot
     * that gets painted is solved as if it were text. Neither is solved against
     * the canvas here, and this is the assertion that keeps it that way.
     */
    const palette = derivePalette(spec({ secondary: { hue: 12, saturation: 84 } }))
    const secondary = palette.slots["brand-secondary"] ?? ""
    const [, r, g, b] = /^#(..)(..)(..)$/.exec(secondary)?.map((part) => parseInt(part, 16)) ?? []

    expect(Math.max(r ?? 0, g ?? 0, b ?? 0) - Math.min(r ?? 0, g ?? 0, b ?? 0)).toBeGreaterThan(60)
  })

  it("darkens a bright accent hue rather than letting it fail", () => {
    /**
     * The behaviour a host is most likely to be surprised by, asserted so it is
     * documented rather than discovered: a brand yellow handed to `accent`
     * comes back dark enough to read, not the yellow they asked for.
     */
    const palette = derivePalette(spec({ accent: { hue: 52, saturation: 100 } }))

    expect(
      contrastRatio(palette.slots.accent ?? "", palette.slots["bg-canvas"] ?? "") ?? 0
    ).toBeGreaterThanOrEqual(TEXT_CONTRAST_MINIMUM)
    expect(palette.slots.accent).not.toBe(hslHex(52, 100, 50))
  })
})

describe("canCarryText", () => {
  it("answers the question a host is actually asking about their brand colour", () => {
    /** `minimal`'s mint on its paper: the case the house palette had to solve. */
    expect(canCarryText("#72e3ad", "#ffffff")).toBe(false)
    expect(canCarryText("#176e44", "#ffffff")).toBe(true)
  })
})

describe("the palettes this library ships", () => {
  it("are literals, and every one of them still clears the bar", () => {
    /**
     * The audit runs over `STARTER_PALETTES` in `theme.test.ts` as well. It runs
     * again here against the derived set specifically, because the two can drift
     * apart: a palette hand-tuned after derivation is exactly the change this
     * catches, and hand-tuning one is allowed — the literals are the source of
     * truth, not the tool.
     */
    expect(DERIVED_PALETTES).toHaveLength(18)

    for (const palette of DERIVED_PALETTES) {
      expect(auditPalette(palette).failures, palette.id).toEqual([])
    }
  })

  it("keeps the accent slot as ink in every one of them", () => {
    /**
     * The rule the aurora finding was about, asserted across the set rather
     * than argued in a comment. `accent` is read as text by `loom.section`'s
     * eyebrow, `loom.faq`'s marker and `loom.link`'s current item, so a palette
     * whose accent cannot carry text is a palette with unreadable eyebrows.
     */
    for (const palette of DERIVED_PALETTES) {
      expect(canCarryText(palette.slots.accent ?? "", palette.slots["bg-canvas"] ?? ""), palette.id).toBe(true)
    }
  })

  it("gives every one a distinct identity, so the catalogue is not one palette twenty times", () => {
    const canvases = DERIVED_PALETTES.map((palette) => palette.slots["bg-canvas"])
    const accents = DERIVED_PALETTES.map((palette) => palette.slots.accent)

    expect(new Set(canvases).size).toBe(canvases.length)
    expect(new Set(accents).size).toBe(accents.length)
  })
})
