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
  it("passes every palette Loom ships on the painted bar, which is 0074 restated as a function", () => {
    for (const palette of STARTER_PALETTES) {
      const audit = auditPalette(palette)

      expect(audit.failures, palette.id).toEqual([])
      expect(audit.unmeasured, palette.id).toEqual([])
      expect(audit.measured).toHaveLength(PALETTE_TEXT_PAIRINGS.length)
    }
  })

  /**
   * The composed shortfall, palette by palette and pairing by pairing (0089).
   *
   * Pinned rather than skipped, and this is the assertion that stops the second
   * list becoming somewhere to put an inconvenient failure: a ninth palette
   * joining, or a third pairing dropping under the bar, fails here. The nine
   * below are the known state of the library on the day 0089 was written, and
   * they are what the record proposes moving.
   */
  it("counts the composed shortfall exactly, so a new one cannot slip in beside it", () => {
    const shortfall = STARTER_PALETTES.flatMap((palette) =>
      auditPalette(palette).composedFailures.map(
        (entry) => `${palette.id}: ${entry.pairing.foreground} on ${entry.pairing.background}`
      )
    )

    expect(shortfall.sort()).toEqual([
      "bold: fg-subtle on accent-subtle",
      "carbon: fg-subtle on accent-subtle",
      "ember: fg-subtle on accent-subtle",
      "forest: fg-subtle on accent-subtle",
      "midnight: fg-subtle on accent-subtle",
      "obsidian: fg-subtle on accent-subtle",
      "plum: accent on accent-subtle",
      "plum: fg-subtle on accent-subtle",
      "slate: fg-subtle on accent-subtle",
    ])
  })

  it("says a composed failure out loud rather than leaving the description empty", () => {
    const described = describePaletteAudit(auditPalette(minimalPalette))
    const carbon = STARTER_PALETTES.find((palette) => palette.id === "carbon")

    expect(described).toBe("")
    expect(carbon).toBeDefined()
    expect(describePaletteAudit(auditPalette(carbon as Palette))).toContain(
      "composed, reported not asserted"
    )
  })

  it("catches the failure the schema cannot see: a subtle nobody can read", () => {
    const audit = auditPalette(withSlots({ "fg-subtle": "#e8e8e8" }))

    /**
     * `fg-subtle` reaches all four grounds; a pairing a primitive paints is
     * declared `painted` even where a tree could also compose it, so the two
     * lists partition the four rather than overlapping on them.
     */
    expect(audit.failures.map((entry) => entry.pairing.background)).toEqual([
      "bg-surface",
      "bg-surface-muted",
    ])
    expect(audit.composedFailures.map((entry) => entry.pairing.background).sort()).toEqual([
      "accent-subtle",
      "bg-canvas",
    ])
    for (const failure of [...audit.failures, ...audit.composedFailures]) {
      expect(failure.ratio).toBeLessThan(TEXT_CONTRAST_MINIMUM)
    }
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

    /**
     * A mint in `accent` fails as ink wherever it lands, and the two lists
     * catch different halves of that: `loom.quote` paints it on a surface
     * itself, and every eyebrow in the library composes it onto whatever it
     * sits in. Both halves are asserted, because a fix that quieted one and
     * left the other would still be a page of unreadable kickers.
     */
    expect(audit.failures.map((entry) => entry.pairing.where)).toContain("loom.quote attribution")
    expect(audit.composedFailures.map((entry) => entry.pairing.where)).toContain(
      "loom.section eyebrow, loom.link current"
    )
  })

  it("tells a pairing it could not measure from one that failed", () => {
    const audit = auditPalette(withSlots({ "fg-muted": "hsl(0 0% 45%)" }))

    expect(audit.failures).toEqual([])
    expect(audit.composedFailures).toEqual([])
    expect(audit.unmeasured.map((entry) => entry.pairing.background).sort()).toEqual([
      "accent-subtle",
      "bg-canvas",
      "bg-surface",
      "bg-surface-muted",
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

  /**
   * One row per pair, because the basis is what decides whether a failure is
   * asserted or reported and a pair listed twice has two answers to that. The
   * duplicate that prompted this had `fg-default on bg-canvas` painted and then
   * composed, and the composed row is the one a lookup would have found.
   */
  it("lists each pair once, so its basis is not a matter of which row you read", () => {
    const pairs = PALETTE_TEXT_PAIRINGS.map((pairing) => `${pairing.foreground}|${pairing.background}`)

    expect(pairs).toHaveLength(new Set(pairs).size)
  })
})
