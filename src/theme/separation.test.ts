import { describe, expect, it } from "vitest"

import { createStarterPrimitiveRegistry } from "../primitives/index.js"
import { registryPairings } from "../sdk/pairings.js"
import type { PrimitiveRegistry } from "../sdk/registry.js"

import { contrastRatio, PALETTE_TEXT_GROUNDS } from "./contrast.js"
import { minimalPalette, STARTER_PALETTES } from "./library.js"
import {
  auditSeparation,
  colourDifference,
  describeSeparationAudit,
  JUST_NOTICEABLE_DIFFERENCE,
  PALETTE_PEER_PAIRINGS,
} from "./separation.js"
import { paletteSchema, type Palette } from "./theme.js"

const withSlots = (slots: Partial<Palette["slots"]>): Palette =>
  paletteSchema.parse({ ...minimalPalette, id: "under-test", slots: { ...minimalPalette.slots, ...slots } })

const starterRegistry = (): PrimitiveRegistry => {
  const made = createStarterPrimitiveRegistry()
  if (!made.ok) throw new Error(`the starter registry did not build: ${JSON.stringify(made.error)}`)

  return made.value
}

describe("colourDifference", () => {
  /**
   * The two anchors of the scale. Black to white is 100 by construction — L*
   * runs 0 to 100 and neither colour has any chroma — so a conversion that has
   * drifted fails here before it can report a palette wrongly.
   */
  it("measures the two ends of the scale", () => {
    expect(colourDifference("#000000", "#ffffff")).toBeCloseTo(100, 5)
    expect(colourDifference("#123456", "#123456")).toBe(0)
  })

  it("does not care which colour is named first", () => {
    expect(colourDifference("#1a1a1a", "#fafafa")).toBe(colourDifference("#fafafa", "#1a1a1a"))
  })

  it("reads a three-digit hex as the six-digit one it abbreviates", () => {
    expect(colourDifference("#3a7", "#33aa77")).toBe(0)
  })

  /**
   * The reason this is not a contrast ratio, asserted rather than claimed. An
   * olive and a blue with all but the same luminance: WCAG calls them the same
   * colour and a reader does not. Measuring difference with a ratio would report
   * this pair as collapsed.
   */
  it("sees a difference in hue that a contrast ratio cannot", () => {
    expect(contrastRatio("#8a6d00", "#0079a8") ?? 0).toBeLessThan(1.01)
    expect(colourDifference("#8a6d00", "#0079a8") ?? 0).toBeGreaterThan(80)
  })

  it("declines to measure a colour it would have to guess at", () => {
    for (const colour of ["rgb(10, 10, 10)", "hsl(200 50% 40%)", "rebeccapurple", "#11223344"]) {
      expect(colourDifference(colour, "#ffffff"), colour).toBeUndefined()
    }
  })
})

describe("PALETTE_PEER_PAIRINGS", () => {
  /**
   * Every row names two slots the library really reads, which is what stops the
   * list becoming pairs chosen for their own sake. Derived from the components
   * rather than trusted, the same way `pairings.test.ts` holds
   * `PALETTE_TEXT_PAIRINGS` to the registry.
   */
  it("names only slots some primitive actually renders", () => {
    const derived = registryPairings(starterRegistry(), PALETTE_TEXT_GROUNDS)
    const rendered = new Set([
      ...derived.floating,
      ...derived.childGrounds.map((entry) => entry.ground),
      ...derived.pairings.flatMap((pairing) => [pairing.foreground, pairing.background]),
    ])

    for (const pairing of PALETTE_PEER_PAIRINGS) {
      expect(rendered.has(pairing.first), `${pairing.first} (${pairing.where})`).toBe(true)
      expect(rendered.has(pairing.second), `${pairing.second} (${pairing.where})`).toBe(true)
    }
  })

  it("pairs two different slots and says where they meet", () => {
    for (const pairing of PALETTE_PEER_PAIRINGS) {
      expect(pairing.first, pairing.where).not.toBe(pairing.second)
      expect(pairing.where.length, `${pairing.first} and ${pairing.second}`).toBeGreaterThan(0)
    }
  })

  /**
   * One row per pair, for the reason `PALETTE_TEXT_PAIRINGS` has one: the basis
   * decides whether a collapse is a defect or a palette exercising a choice,
   * and a pair listed twice has two answers to that.
   */
  it("lists each pair once, so its basis is not a matter of which row you read", () => {
    const pairs = PALETTE_PEER_PAIRINGS.map((pairing) => [pairing.first, pairing.second].sort().join("|"))

    expect(pairs).toHaveLength(new Set(pairs).size)
  })

  /** A mark that is one of the two it is meant to separate marks nothing. */
  it("never marks a pair with one of the slots in it", () => {
    for (const pairing of PALETTE_PEER_PAIRINGS) {
      if (pairing.basis !== "also-marked") continue

      expect([pairing.first, pairing.second], pairing.where).not.toContain(pairing.mark)
    }
  })
})

describe("auditSeparation", () => {
  /**
   * The collapse the library ships, palette by palette (23 August finding).
   *
   * `minimal` sets `accent` to its own `fg-default` on purpose — "black, so the
   * green is a highlight and not the biggest thing on the page" — and the
   * consequence nobody had measured is that `loom.link tone="accent"` inside a
   * paragraph is the paragraph's own colour, at rest, with no underline. Two
   * more palettes land within a JND of the same thing.
   *
   * Pinned rather than fixed here: `minimal` is the palette all four surfaces
   * wear and `loom.link` is another lane's file, so both fixes are somebody
   * else's to choose. What this assertion buys is that a fourth cannot join
   * them quietly.
   */
  it("counts the colour-only collapses exactly, so a new one cannot slip in beside them", () => {
    const collapsed = STARTER_PALETTES.flatMap((palette) =>
      auditSeparation(palette).collapsed.map(
        (entry) => `${palette.id}: ${entry.pairing.first} and ${entry.pairing.second}`
      )
    )

    expect(collapsed.sort()).toEqual([
      "blush: bg-canvas and bg-surface",
      "graphite: bg-canvas and bg-surface",
      "graphite: fg-default and accent",
      "harbour: bg-canvas and bg-surface",
      "lilac: bg-canvas and bg-surface",
      "minimal: bg-canvas and bg-surface",
      "minimal: fg-default and accent",
      "obsidian: fg-default and accent",
      "slate: bg-canvas and bg-surface",
    ])
  })

  /**
   * The claim the `also-marked` basis makes, held to account. Six palettes put
   * a card's fill within a JND of the page behind it and every one of them is
   * carried by `border-subtle` — which is `minimal`'s stated design working
   * exactly as its comment says, measured rather than taken on trust.
   */
  it("finds no marked pair whose mark has collapsed as well", () => {
    for (const palette of STARTER_PALETTES) {
      expect(auditSeparation(palette).unmarked, palette.id).toEqual([])
    }
  })

  /**
   * The point of a threshold rather than an equality test. `#101010` is not
   * `#0a0a0a` — a diff would show the change and a strict comparison would call
   * the pair separate — and no reader can see the difference, so the audit says
   * what the reader would say.
   */
  it("collapses a pair that differs by less than an eye can resolve", () => {
    const audit = auditSeparation(withSlots({ accent: "#101010" }))
    const link = audit.measured.find((entry) => entry.pairing.second === "accent")

    expect(link?.difference ?? 0).toBeGreaterThan(0)
    expect(link?.difference ?? 0).toBeLessThan(JUST_NOTICEABLE_DIFFERENCE)
    expect(link?.separated).toBe(false)
    expect(audit.collapsed).toContain(link)
  })

  it("measures every declared peer exactly once, whatever the outcome", () => {
    for (const palette of STARTER_PALETTES) {
      const audit = auditSeparation(palette)

      expect(audit.measured.length + audit.unmeasured.length, palette.id).toBe(
        PALETTE_PEER_PAIRINGS.length
      )
      expect(audit.unmeasured, palette.id).toEqual([])
    }
  })

  /**
   * The shape of the 23 August finding, as a palette can cause it: the third
   * step of the ink ramp moved onto the second. This is also the collapse that
   * 0089's second candidate fix would have produced deliberately — it takes
   * `fg-subtle` toward `fg-muted` to buy contrast against `accent-subtle` —
   * which is what makes it worth a check rather than a note.
   */
  it("catches a quiet ink moved onto the one above it", () => {
    const audit = auditSeparation(withSlots({ "fg-subtle": "#52525b" }))

    expect(audit.collapsed.map((entry) => entry.pairing.second)).toContain("fg-subtle")
    expect(describeSeparationAudit(audit)).toContain("nothing else tells them apart")
  })

  /**
   * A mark is only a defence while it is visible. Flattening the well into the
   * surface and then painting the outline the same colour turns `minimal`'s
   * bordered card — legal today, and asserted above — into a panel with no
   * edge and no fill.
   */
  it("reports a marked pair whose mark has gone as well, and does not call it colour-only", () => {
    const audit = auditSeparation(
      withSlots({ "bg-surface-muted": "#ffffff", "border-subtle": "#ffffff" })
    )

    expect(audit.unmarked.map((entry) => entry.pairing.where)).toEqual([
      "loom.code panel inside a card",
      "loom.code panel on a page; loom.callout marks the same pair harder",
    ])
    expect(audit.collapsed.map((entry) => entry.pairing.basis)).not.toContain("also-marked")
    expect(describeSeparationAudit(audit)).toContain("and their mark by")
  })

  it("tells a peer it could not measure from one that collapsed", () => {
    const audit = auditSeparation(withSlots({ "fg-muted": "hsl(0 0% 45%)" }))

    expect(audit.unmeasured.map((entry) => entry.pairing.second)).toEqual(["fg-muted", "fg-subtle"])
    expect(describeSeparationAudit(audit)).toContain("could not be measured")
  })

  it("says nothing at all about a palette with nothing wrong", () => {
    const editorial = STARTER_PALETTES.find((palette) => palette.id === "editorial")

    expect(editorial).toBeDefined()
    expect(describeSeparationAudit(auditSeparation(editorial as Palette))).toBe("")
  })
})
