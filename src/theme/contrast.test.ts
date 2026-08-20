import { describe, expect, it } from "vitest"

import {
  auditPalette,
  contrastRatio,
  describePaletteAudit,
  PALETTE_TEXT_PAIRINGS,
  TEXT_CONTRAST_MINIMUM,
} from "./contrast.js"
import { minimalPalette, STARTER_PALETTES } from "./library.js"
import { paletteSchema, type Palette } from "./theme.js"

const withSlots = (slots: Partial<Palette["slots"]>): Palette =>
  paletteSchema.parse({ ...minimalPalette, id: "under-test", slots: { ...minimalPalette.slots, ...slots } })

describe("contrastRatio", () => {
  it("measures the two ends of the scale", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5)
    expect(contrastRatio("#7a7a7a", "#7a7a7a")).toBeCloseTo(1, 5)
  })

  it("does not care which colour is named first", () => {
    expect(contrastRatio("#1a1a1a", "#fafafa")).toBe(contrastRatio("#fafafa", "#1a1a1a"))
  })

  it("reads a three-digit hex as the six-digit one it abbreviates", () => {
    expect(contrastRatio("#000", "#fff")).toBe(contrastRatio("#000000", "#ffffff"))
    expect(contrastRatio("#3a7", "#fff")).toBe(contrastRatio("#33aa77", "#ffffff"))
  })

  /**
   * The colour schema accepts more than hex, and every other form is answered
   * with `undefined` rather than a guess — see the note in `contrast.ts`. A
   * check that cannot measure something says so; it does not pass it.
   */
  it("declines to measure a colour it would have to guess at", () => {
    for (const colour of ["rgb(10, 10, 10)", "hsl(200 50% 40%)", "rebeccapurple", "#11223344"]) {
      expect(contrastRatio(colour, "#ffffff"), colour).toBeUndefined()
    }
  })
})

describe("auditPalette", () => {
  it("passes every palette Loom ships, which is 0074 restated as a function", () => {
    for (const palette of STARTER_PALETTES) {
      const audit = auditPalette(palette)

      expect(describePaletteAudit(audit), palette.id).toBe("")
      expect(audit.failures).toEqual([])
      expect(audit.unmeasured).toEqual([])
      expect(audit.measured).toHaveLength(PALETTE_TEXT_PAIRINGS.length)
    }
  })

  it("catches the failure the schema cannot see: a subtle nobody can read", () => {
    const audit = auditPalette(withSlots({ "fg-subtle": "#e8e8e8" }))

    expect(audit.failures.map((entry) => entry.pairing.foreground)).toEqual([
      "fg-subtle",
      "fg-subtle",
      "fg-subtle",
    ])
    for (const failure of audit.failures) expect(failure.ratio).toBeLessThan(TEXT_CONTRAST_MINIMUM)
  })

  it("names where the failure shows up, not just which two slots it is", () => {
    const described = describePaletteAudit(auditPalette(withSlots({ "fg-subtle": "#e8e8e8" })))

    expect(described).toContain("under-test: fg-subtle on bg-canvas (loom.footer note")
    expect(described).toContain(":1, under 4.5:1")
  })

  /**
   * The mistake this exists to catch, from `minimal`'s own history: `accent`
   * paints the primary button, so putting the button's mint there is the obvious
   * move, and it takes every eyebrow, kicker and disclosure marker down with it.
   */
  it("refuses a palette that puts a fill colour in the slot read as text", () => {
    const audit = auditPalette(withSlots({ accent: "#72e3ad" }))

    expect(audit.failures.map((entry) => entry.pairing.where)).toContain(
      "loom.section eyebrow, loom.link current"
    )
  })

  it("tells a pairing it could not measure from one that failed", () => {
    const audit = auditPalette(withSlots({ "fg-muted": "hsl(0 0% 45%)" }))

    expect(audit.failures).toEqual([])
    expect(audit.unmeasured.map((entry) => entry.pairing.background)).toEqual([
      "bg-canvas",
      "bg-surface",
    ])
    expect(describePaletteAudit(audit)).toContain("could not be measured")
  })

  it("measures every pairing exactly once, whatever the outcome", () => {
    const audit = auditPalette(withSlots({ "fg-muted": "hsl(0 0% 45%)", "fg-subtle": "#e8e8e8" }))

    expect(audit.measured.length + audit.unmeasured.length).toBe(PALETTE_TEXT_PAIRINGS.length)
  })

  /**
   * Every pairing names slots a primitive actually reads together. A pairing
   * invented for the table would be a bar chosen for its own sake, and the two
   * ends of one are never the same slot — a colour on itself is 1:1 and would
   * fail every palette ever written.
   */
  it("pairs a foreground with a background and never with itself", () => {
    for (const pairing of PALETTE_TEXT_PAIRINGS) {
      expect(pairing.foreground, pairing.where).not.toBe(pairing.background)
      expect(pairing.where.length, `${pairing.foreground} on ${pairing.background}`).toBeGreaterThan(0)
    }
  })
})
