import type { ReactElement } from "react"
import { describe, expect, it } from "vitest"

import { createStarterPrimitiveRegistry } from "../primitives/index.js"
import { libraryStylesheet } from "../primitives/stylesheet.js"
import { registryPairings } from "../sdk/pairings.js"
import type { PrimitiveRegistry } from "../sdk/registry.js"

import { contrastRatio, PALETTE_TEXT_GROUNDS } from "./contrast.js"
import { minimalPalette, STARTER_PALETTES } from "./library.js"
import {
  auditMarkGroundings,
  auditSeparation,
  colourDifference,
  describeMarkAudit,
  describeSeparationAudit,
  JUST_NOTICEABLE_DIFFERENCE,
  PALETTE_MARK_GROUNDINGS,
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

/**
 * What the library really draws, as text. `libraryStylesheet` is typed as a
 * `ReactElement` with unknown props, so the children are named here rather than
 * asserted away at each use.
 */
const emittedStylesheet = (): string =>
  (libraryStylesheet() as ReactElement<{ readonly children: string }>).props.children

describe("PALETTE_MARK_GROUNDINGS", () => {
  /**
   * Every slot named here is one the emitted stylesheet really reads, which is
   * the same guard the peer list has and for the same reason: a grounding
   * nobody draws is a row that can only ever fail for its own sake.
   */
  it("names only slots the library's stylesheet actually reads", () => {
    const css = emittedStylesheet()

    for (const grounding of PALETTE_MARK_GROUNDINGS) {
      for (const slot of [grounding.mark, ...grounding.grounds]) {
        expect(css, `${slot} (${grounding.where})`).toContain(`var(--loom-${slot})`)
      }
    }
  })

  /** A line measured against itself is a line measured against nothing. */
  it("never grounds a mark on itself, and says where each one is drawn", () => {
    for (const grounding of PALETTE_MARK_GROUNDINGS) {
      expect(grounding.grounds, grounding.where).not.toContain(grounding.mark)
      expect(grounding.grounds.length, grounding.mark).toBeGreaterThan(0)
      expect(new Set(grounding.grounds).size, grounding.mark).toBe(grounding.grounds.length)
      expect(grounding.where.length, grounding.mark).toBeGreaterThan(0)
    }
  })

  /** One row per mark, so which grounds it answers to is not a matter of which row you read. */
  it("lists each mark once", () => {
    const marks = PALETTE_MARK_GROUNDINGS.map((grounding) => grounding.mark)

    expect(marks).toHaveLength(new Set(marks).size)
  })
})

describe("auditMarkGroundings", () => {
  /**
   * The gate, and what it cost to be able to write it. Eight of the palettes
   * below shipped a `border-subtle` edge within a just-noticeable difference of
   * a fill it is drawn on — `linen` drew it in the well's own colour, ΔE 0.00,
   * and `clay` at 0.37 — and every test in this file was green throughout,
   * because the only thing that ever measured a border measured it as a defence
   * for a pair of fills that were not in trouble.
   */
  it("finds no line the library declares and a starter palette does not draw", () => {
    for (const palette of STARTER_PALETTES) {
      expect(describeMarkAudit(auditMarkGroundings(palette)), palette.id).toBe("")
    }
  })

  it("measures every declared mark against every ground it is drawn on", () => {
    const expected = PALETTE_MARK_GROUNDINGS.reduce((total, grounding) => total + grounding.grounds.length, 0)

    for (const palette of STARTER_PALETTES) {
      expect(auditMarkGroundings(palette).measured.length, palette.id).toBe(expected)
    }
  })

  /**
   * The blind spot this function exists for, planted deliberately: a well that
   * is plainly a different colour from the surface around it, outlined in the
   * well's own colour. `auditSeparation` passes the pair — the fills tell a
   * reader the two apart and it never has to ask about the mark — and the border
   * the primitive declares draws nothing. This is the shape of what eight
   * starter palettes were doing.
   */
  it("does not let a visible fill difference stand in for a line that is not there", () => {
    const mutedWell = minimalPalette.slots["bg-surface-muted"] ?? ""
    const palette = withSlots({ "border-subtle": mutedWell })
    const pair = auditSeparation(palette).measured.find(
      (entry) => entry.pairing.where === "loom.code panel inside a card"
    )

    expect(mutedWell).toMatch(/^#[0-9a-f]{6}$/)
    expect(pair?.difference ?? 0).toBeGreaterThan(JUST_NOTICEABLE_DIFFERENCE)
    expect(pair?.separated).toBe(true)
    expect(auditSeparation(palette).unmarked).toEqual([])

    const marks = auditMarkGroundings(palette)

    expect(marks.invisible.map((entry) => entry.ground)).toEqual(["bg-surface-muted"])
    expect(describeMarkAudit(marks)).toContain("the line is not there")
    expect(describeMarkAudit(marks)).toContain("loom.card")
  })

  /**
   * A line whose colour cannot be measured is reported rather than passed. The
   * safe direction, and the same one `MeasuredPeer` takes for a mark it cannot
   * read: a defence that cannot be measured is not counted as one.
   */
  it("counts a colour it cannot measure as a line it cannot find", () => {
    const marks = auditMarkGroundings(withSlots({ "border-default": "rgb(200, 200, 200)" }))

    expect(marks.invisible.map((entry) => entry.grounding.mark)).toEqual([
      "border-default",
      "border-default",
      "border-default",
    ])
    expect(marks.invisible.every((entry) => entry.difference === undefined)).toBe(true)
    expect(describeMarkAudit(marks)).toContain("could not be measured")
  })
})

describe("the border ramp", () => {
  /**
   * The gap 0204 relies on, guarded because this run narrowed it. Eight palettes
   * had `border-subtle` moved off the fill it had collapsed onto, and on two of
   * them — `clay` and `linen` — the move was toward `border-default`, taking the
   * gap between the two tiers from about 5.9 to 2.97 and 2.70.
   *
   * What is asserted is the floor and not the ramp's intended size. Whether the
   * tier ought to offer something between `border-default` (ΔE 4 to 15 from its
   * grounds) and `border-strong` (74 to 98) is the open half of the 29 September
   * finding and is the palette author's call; that two tiers a table puts on one
   * page are not the same colour is not.
   */
  it("keeps the three border tiers a just-noticeable difference apart", () => {
    for (const palette of STARTER_PALETTES) {
      for (const [lower, upper] of [
        ["border-subtle", "border-default"],
        ["border-default", "border-strong"],
      ] as const) {
        expect(
          colourDifference(palette.slots[lower] ?? "", palette.slots[upper] ?? "") ?? 0,
          `${palette.id}: ${lower} against ${upper}`
        ).toBeGreaterThanOrEqual(JUST_NOTICEABLE_DIFFERENCE)
      }
    }
  })
})
