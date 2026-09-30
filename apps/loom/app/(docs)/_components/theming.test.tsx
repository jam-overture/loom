import {
  auditPalette,
  describePaletteAudit,
  PALETTE_SLOTS,
  PALETTE_TEXT_PAIRINGS,
  STARTER_PALETTES,
} from "@jam-overture/loom"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { BrandColor, brandDerivation } from "./brand-color"
import { ContrastAudit, contrastAuditFacts } from "./contrast-audit"
import { PaletteSlots } from "./palette-slots"

/**
 * What the three generated blocks on *Making it look like yours* actually say.
 *
 * The page's argument is that a palette is checkable rather than asserted, so
 * these tests are written against the runtime rather than against the markup:
 * every expectation below recomputes what it wants from `@jam-overture/loom` and
 * compares. A slot added to the palette schema, a palette whose contrast
 * regresses, or a derivation that stops solving all show up here as a diff,
 * which is the only reason the page is allowed to print numbers at all.
 */

const hexesIn = (container: HTMLElement): readonly string[] =>
  [...container.querySelectorAll("[data-swatch]")].flatMap((element) => {
    const value = element.getAttribute("data-swatch")

    return value === null ? [] : [value]
  })

describe("the slot table", () => {
  it("has a row for every slot a palette must declare", () => {
    render(<PaletteSlots />)

    for (const slot of PALETTE_SLOTS) {
      expect(screen.getAllByText(slot).length).toBeGreaterThan(0)
    }
  })

  it("paints each swatch the color the palette actually holds", () => {
    const { container } = render(<PaletteSlots />)
    const painted = new Set(hexesIn(container))

    for (const id of ["minimal", "editorial", "bold"]) {
      const palette = STARTER_PALETTES.find((candidate) => candidate.id === id)

      expect(palette).toBeDefined()

      for (const slot of PALETTE_SLOTS) {
        expect(painted.has(palette?.slots[slot] ?? "")).toBe(true)
      }
    }
  })

  it("names the three palettes it is showing and no others", () => {
    render(<PaletteSlots />)

    expect(screen.getAllByText("minimal").length).toBeGreaterThan(0)
    expect(screen.getAllByText("editorial").length).toBeGreaterThan(0)
    expect(screen.getAllByText("bold").length).toBeGreaterThan(0)
    expect(screen.queryByText("tide")).toBeNull()
  })
})

describe("the contrast audit", () => {
  it("counts what the runtime counts", () => {
    const audits = STARTER_PALETTES.map((palette) => auditPalette(palette))

    expect(contrastAuditFacts.palettes).toBe(STARTER_PALETTES.length)
    expect(contrastAuditFacts.pairings).toBe(PALETTE_TEXT_PAIRINGS.length)
    expect(contrastAuditFacts.painted + contrastAuditFacts.composed).toBe(PALETTE_TEXT_PAIRINGS.length)
    expect(contrastAuditFacts.palettesWithPaintedFailures).toBe(
      audits.filter((audit) => audit.failures.length > 0).length
    )
    expect(contrastAuditFacts.palettesWithComposedFailures).toBe(
      audits.filter((audit) => audit.composedFailures.length > 0).length
    )
  })

  /**
   * The one the page would be dishonest without. A docs site that summarized a
   * clean bill of health over palettes the runtime reports failures on is the
   * exact fault `describePaletteAudit` was written to prevent.
   */
  it("prints the runtime's own words for every palette with something to report", () => {
    const { container } = render(<ContrastAudit />)

    const reported = STARTER_PALETTES.filter(
      (palette) => auditPalette(palette).composedFailures.length > 0
    )

    expect(reported.length).toBeGreaterThan(0)

    for (const palette of reported) {
      const printed = container.querySelector(`[data-audit="${palette.id}"]`)

      expect(printed?.textContent).toBe(describePaletteAudit(auditPalette(palette)))
    }
  })

  it("shows the four figures the section is about", () => {
    const { container } = render(<ContrastAudit />)

    const figure = (name: string): string | undefined =>
      container.querySelector(`[data-figure="${name}"] p`)?.textContent ?? undefined

    expect(figure("palettes")).toBe(String(contrastAuditFacts.palettes))
    expect(figure("pairings")).toBe(String(contrastAuditFacts.pairings))
    expect(figure("painted-failures")).toBe(String(contrastAuditFacts.palettesWithPaintedFailures))
    expect(figure("composed-failures")).toBe(String(contrastAuditFacts.palettesWithComposedFailures))
  })
})

describe("the brand color", () => {
  /**
   * The claim the section is built on. If a brand color this saturated ever
   * starts clearing the bar on a near-white canvas, the prose beside it is
   * wrong and this fails rather than the reader finding out.
   */
  it("finds the brand color cannot be ink and the derived accent can", () => {
    expect(brandDerivation.brandCanCarryText).toBe(false)
    expect(brandDerivation.accentCanCarryText).toBe(true)
    expect(brandDerivation.brandRatio).toBeLessThan(brandDerivation.bar)
    expect(brandDerivation.accentRatio).toBeGreaterThanOrEqual(brandDerivation.bar)
  })

  it("derives a palette that clears every painted pairing", () => {
    expect(brandDerivation.clean).toBe(true)
  })

  it("puts the brand color somewhere rather than discarding it", () => {
    const { container } = render(<BrandColor />)
    const painted = hexesIn(container)

    expect(painted).toContain(brandDerivation.borderAccent)
    expect(painted).toContain(brandDerivation.brandSecondary)
  })

  it("prints both measured ratios beside the two colors", () => {
    render(<BrandColor />)

    expect(screen.getByText(new RegExp(`${brandDerivation.brandRatio.toFixed(2)}:1`))).toBeTruthy()
    expect(screen.getByText(new RegExp(`${brandDerivation.accentRatio.toFixed(2)}:1`))).toBeTruthy()
    expect(screen.getByText(/cannot be ink/)).toBeTruthy()
    expect(screen.getByText(/can be ink/)).toBeTruthy()
  })
})
