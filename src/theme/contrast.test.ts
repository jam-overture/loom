import { describe, expect, it } from "vitest"

import {
  auditPalette,
  channelsOf,
  contrastRatio,
  describePaletteAudit,
  PALETTE_TEXT_PAIRINGS,
  relativeLuminance,
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
   * What is left after 0365: a named colour, which is vocabulary rather than
   * arithmetic, and anything carrying an alpha below opaque, whose contrast is
   * not a property of the pair at all. Plus the strings that are not colours.
   * A check that cannot measure something says so; it does not pass it.
   */
  it("declines to measure a colour it would have to guess at", () => {
    for (const colour of [
      "rebeccapurple",
      "transparent",
      "currentcolor",
      "#11223344",
      "#1234",
      "rgba(10, 10, 10, 0.5)",
      "hsl(200 50% 40% / 0.5)",
      "#12345",
      "rgb(1, 2 3)",
      "hsl(none 30% 11%)",
      "not a colour at all",
    ]) {
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
     * `fg-subtle` reaches every ground the ramp is held to; a pairing a
     * primitive paints is declared `painted` even where a tree could also
     * compose it, so the two lists partition the five rather than overlapping
     * on them.
     */
    expect(audit.failures.map((entry) => entry.pairing.background)).toEqual([
      "bg-surface",
      "bg-surface-muted",
    ])
    expect(audit.composedFailures.map((entry) => entry.pairing.background).sort()).toEqual([
      "accent-subtle",
      "bg-canvas",
      "bg-overlay",
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

  /**
   * What the slot was worth before today, stated as a test. `bg-overlay` is the
   * one surface in the ramp whose name invites the wrong value: *overlay* reads
   * as a dark wash to anyone who has written a modal, and a host palette that
   * fills it that way under a light page renders every `loom.overlay` as dark
   * ink on a dark veil. `paletteSchema` sees a valid colour; before this row
   * existed `auditPalette` measured the slot in no pairing at all and answered
   * with an empty `failures`, which is what a clean palette answers with.
   */
  it("catches a host that reads bg-overlay as a dark wash, which nothing measured before", () => {
    const audit = auditPalette(withSlots({ "bg-overlay": "#1a1a1a" }))

    expect(audit.failures.map((entry) => entry.pairing.where)).toEqual([
      "loom.overlay content over its scrim",
    ])
    expect(audit.failures[0]?.ratio).toBeLessThan(TEXT_CONTRAST_MINIMUM)
  })

  it("tells a pairing it could not measure from one that failed", () => {
    const audit = auditPalette(withSlots({ "fg-muted": "rebeccapurple" }))

    expect(audit.failures).toEqual([])
    expect(audit.composedFailures).toEqual([])
    expect(audit.unmeasured.map((entry) => entry.pairing.background).sort()).toEqual([
      "accent-subtle",
      "bg-canvas",
      "bg-overlay",
      "bg-surface",
      "bg-surface-muted",
    ])
    expect(describePaletteAudit(audit)).toContain("could not be measured")
  })

  it("measures every pairing exactly once, whatever the outcome", () => {
    const audit = auditPalette(withSlots({ "fg-muted": "rebeccapurple", "fg-subtle": "#e8e8e8" }))

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

/**
 * The spellings `colourSchema` admits, and what each one now measures (0365).
 *
 * The table these are drawn from is the 4 October finding's: one dark canvas
 * under one light ink, written six ways, of which four used to lose every
 * measurement Loom makes. The claim under test is not *the parser works* — it
 * is that **which way round a pair is does not depend on how it was spelled**,
 * which is the property a host loses when a form is declined.
 *
 * Every expectation here is a fixed number, so the suite needs no browser.
 * The arithmetic was separately checked against Chromium's own CSS engine over
 * 1,034 colours; what that run established and why it is not a test is in the
 * record and in `reports/2026-11-08-framework-a-palette-written-six-ways.md`.
 */
describe("channelsOf, over the forms a palette may be written in", () => {
  /** The pair from the finding's table, in all six spellings. */
  const DARK_CANVAS = ["#111827", "#123", "hsl(220 30% 11%)", "rgb(17 24 39)", "#111827ff", "rgb(17, 24, 39)"]

  it("reads hex of three, four, six and eight digits, the alpha forms when they are opaque", () => {
    expect(channelsOf("#111827")).toEqual([17, 24, 39])
    expect(channelsOf("#123")).toEqual([17, 34, 51])
    expect(channelsOf("#111827ff")).toEqual([17, 24, 39])
    expect(channelsOf("#123f")).toEqual([17, 34, 51])
  })

  /**
   * The case that made declining every alpha too broad a rule: `ff` composites
   * to exactly the colour under it, so there was never anything to guess at.
   */
  it("reads an opaque alpha as the colour it composites to, in every notation", () => {
    for (const opaque of ["#111827ff", "#111827FF", "rgba(17, 24, 39, 1)", "rgb(17 24 39 / 1)", "rgb(17 24 39 / 100%)"]) {
      expect(channelsOf(opaque), opaque).toEqual([17, 24, 39])
    }
  })

  it("declines an alpha below opaque, however it is written", () => {
    for (const translucent of ["#11223344", "#1234", "rgba(17, 24, 39, 0.5)", "rgb(17 24 39 / 50%)", "hsl(220 30% 11% / 0.3)", "hsla(220, 30%, 11%, 0)"]) {
      expect(channelsOf(translucent), translucent).toBeUndefined()
    }
  })

  it("reads rgb() in both of CSS's syntaxes, as numbers or as percentages", () => {
    expect(channelsOf("rgb(17 24 39)")).toEqual([17, 24, 39])
    expect(channelsOf("rgb(17, 24, 39)")).toEqual([17, 24, 39])
    expect(channelsOf("RGB(17 24 39)")).toEqual([17, 24, 39])

    const [r, g, b] = channelsOf("rgb(0% 50% 100%)") ?? []
    expect(r).toBeCloseTo(0, 10)
    expect(g).toBeCloseTo(127.5, 10)
    expect(b).toBeCloseTo(255, 10)
  })

  /** CSS clamps rather than refusing, and so does this. */
  it("clamps an rgb() component outside the range instead of declining it", () => {
    expect(channelsOf("rgb(300 -20 40)")).toEqual([255, 0, 40])
    expect(channelsOf("rgb(-5% 120% 50%)")?.slice(0, 2)).toEqual([0, 255])
  })

  it("reads hsl() in both syntaxes, and in all four of CSS's angle units", () => {
    const expected = channelsOf("hsl(220 30% 11%)")

    expect(expected?.map((value) => Math.round(value))).toEqual([20, 25, 36])
    for (const same of ["hsl(220, 30%, 11%)", "hsl(220deg 30% 11%)", "hsla(220, 30%, 11%, 1)", "HSL(220 30% 11%)"]) {
      expect(channelsOf(same), same).toEqual(expected)
    }
    for (const unit of ["hsl(0.6111111111111111turn 30% 11%)", "hsl(244.44444444444446grad 30% 11%)"]) {
      const channels = channelsOf(unit)
      expect(channels, unit).toBeDefined()
      channels?.forEach((value, at) => expect(value, `${unit} channel ${at}`).toBeCloseTo(expected?.[at] ?? 0, 6))
    }
  })

  /**
   * The six rows of the finding's table, which is the whole point of the unit:
   * a pair's direction is a fact about the colours and not about the notation.
   */
  it("answers the same dark canvas however the host spelled it", () => {
    const luminances = DARK_CANVAS.map((colour) => relativeLuminance(colour))

    for (const [at, luminance] of luminances.entries()) {
      expect(luminance, DARK_CANVAS[at]).toBeDefined()
      expect(luminance, DARK_CANVAS[at]).toBeLessThan(0.05)
    }
  })

  it("wraps a hue the long way round and the negative way, as CSS does", () => {
    const base = channelsOf("hsl(40 50% 50%)")

    for (const same of ["hsl(400 50% 50%)", "hsl(-320 50% 50%)", "hsl(760 50% 50%)"]) {
      channelsOf(same)?.forEach((value, at) => expect(value, same).toBeCloseTo(base?.[at] ?? 0, 9))
    }
  })

  it("reads a grey written as hsl() as having no colour in it", () => {
    const [r, g, b] = channelsOf("hsl(220 0% 45%)") ?? []

    expect(r).toBeCloseTo(g ?? 0, 10)
    expect(g).toBeCloseTo(b ?? 0, 10)
  })

  /**
   * A named colour is the one form left that is **vocabulary rather than
   * arithmetic**, and 0365 declines it on that ground rather than on risk.
   * Asserted so that the day the table arrives, this is the test that says so.
   */
  it("declines a named colour, which is the table this module does not own", () => {
    for (const named of ["midnightblue", "whitesmoke", "rebeccapurple", "white", "transparent", "currentcolor"]) {
      expect(channelsOf(named), named).toBeUndefined()
    }
  })

  /**
   * Five and seven digits are what `colourSchema`'s own `{3,8}` lets through
   * and no browser accepts. Measuring one would be measuring a colour that
   * renders as nothing.
   */
  it("declines a hex length no browser accepts, which the schema still admits", () => {
    for (const illegal of ["#12345", "#1234567"]) {
      expect(
        paletteSchema.safeParse({ ...minimalPalette, slots: { ...minimalPalette.slots, "bg-canvas": illegal } }).success,
        illegal
      ).toBe(true)
      expect(channelsOf(illegal), illegal).toBeUndefined()
    }
  })

  /** Shorter than the schema's own floor, so these never reach a palette. */
  it("declines a hex too short for the schema to admit at all", () => {
    for (const short of ["#1", "#12", "#"]) {
      expect(channelsOf(short), short).toBeUndefined()
    }
  })

  it("refuses a string that mixes the two syntaxes rather than half-reading it", () => {
    for (const mixed of ["rgb(1, 2 3)", "rgb(1 2, 3)", "rgba(1, 2, 3, 1, 4)", "rgb(1 2 3 4)", "rgb(1 2 3 / / 1)"]) {
      expect(channelsOf(mixed), mixed).toBeUndefined()
    }
  })

  it("declines a component that is not a number, including CSS's own none", () => {
    for (const unreadable of ["rgb(none 2 3)", "hsl(none 30% 11%)", "rgb(a b c)", "rgb(1px 2 3)", "hsl(220 30px 11%)", "rgb()", "rgb(1 2)"]) {
      expect(channelsOf(unreadable), unreadable).toBeUndefined()
    }
  })

  it("declines a colour space the schema would not have admitted anyway", () => {
    for (const other of ["oklch(50% 0.1 200)", "lab(50% 20 30)", "color(srgb 1 0 0)", "not a colour at all", ""]) {
      expect(channelsOf(other), other).toBeUndefined()
    }
  })

  /**
   * The audit is where a host meets this, and the 4 October finding measured
   * the loss there: a palette whose every slot is `hsl()` came back
   * `26 unmeasured, 0 failures` — a palette that had quietly lost every number.
   */
  it("measures a palette written entirely in hsl(), where it used to report every pairing unmeasured", () => {
    const inHsl = paletteSchema.parse({
      ...minimalPalette,
      id: "in-hsl",
      slots: Object.fromEntries(
        Object.entries(minimalPalette.slots).map(([slot, colour]) => {
          const channels = channelsOf(colour as string) ?? [0, 0, 0]

          return [slot, `rgb(${channels.map((value) => Math.round(value)).join(" ")})`]
        })
      ),
    })

    const audit = auditPalette(inHsl)

    expect(audit.unmeasured).toEqual([])
    expect(audit.measured.length).toBe(PALETTE_TEXT_PAIRINGS.length)
    expect(audit.failures).toEqual([])
  })
})
