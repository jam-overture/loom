import { describe, expect, it } from "vitest"

import { minimalPalette, minimalSansFontPack, preciseStylePreset } from "@jam-overture/loom"

import {
  GEIST_HREF,
  SHELL_GROUND,
  SHELL_ROOT_CSS,
  SHELL_SELECTION,
  SHELL_THEME_STYLE,
  shellTheme,
} from "./theme"

/**
 * What the shell knows about how the product looks.
 *
 * The module throws on a theme that does not resolve, so the import above is
 * itself the first assertion: a selection naming an id the library does not
 * register fails the build rather than serving a page in the browser's defaults,
 * which is the defect this unit closes.
 */

describe("the shell's theme", () => {
  /**
   * The house theme the maintainer specified on 19 August, held against the
   * library's own registered objects rather than against the marketing site's
   * default.
   *
   * Deliberately not against `(marketing)/_lib/site.ts`. Both name the same
   * triple because both are consumers of one documented fact — `library.ts`
   * registers it in the library so every host with an argumentless registry can
   * reach it — and a test that held the shell to another lane's constant would
   * fail inside that lane's pull request the first time they re-themed the front
   * door. The divergence is a question for the maintainer (0232), not a gate on
   * somebody else's work.
   */
  it("is the house theme, by the ids the library registers", () => {
    expect(SHELL_SELECTION).toEqual({
      palette: minimalPalette.id,
      fontPack: minimalSansFontPack.id,
      stylePreset: preciseStylePreset.id,
    })
  })

  it("resolved to the three objects those ids name", () => {
    expect(shellTheme.palette.id).toBe(minimalPalette.id)
    expect(shellTheme.fontPack.id).toBe(minimalSansFontPack.id)
    expect(shellTheme.stylePreset.id).toBe(preciseStylePreset.id)
  })

  /**
   * The ground is the palette's canvas, which is what the root primitive paints
   * on a page that has one. A frame holding its own ground while the tree's
   * palette moved under it cost a 1.10:1 reading once (0197); the shell takes
   * both halves from the same resolved theme so the two cannot disagree.
   */
  it("paints the palette's own paper and ink", () => {
    expect(SHELL_GROUND.backgroundColor).toBe(minimalPalette.slots["bg-canvas"])
    expect(SHELL_GROUND.color).toBe(minimalPalette.slots["fg-default"])
  })

  /**
   * The font pack names `Geist` literally and Loom never fetches a font, so the
   * host supplies the face under the name the stack asks for. A request for a
   * family the stack does not name downloads a face nothing can match — the page
   * then renders the fallback and looks entirely deliberate while doing it.
   */
  it("serves the face the font pack actually names", () => {
    expect(shellTheme.fontPack.bodyFamily.startsWith("Geist,")).toBe(true)
    expect(GEIST_HREF).toContain("family=Geist:")
  })

  /**
   * Both weights the pack uses, and no third. A heading at 700 falling back to a
   * synthesised bold is the kind of difference nobody reports and everybody
   * sees.
   */
  it("serves both of the weights the pack uses", () => {
    expect(GEIST_HREF).toContain(`wght@${minimalSansFontPack.bodyWeight};${minimalSansFontPack.headingWeight}`)
  })

  /**
   * The `:root` rule, held against the style object it is serialised from.
   *
   * Two serialisations of one resolved theme, so the only thing that can go
   * wrong between them is the serialising — a camelCase key written into CSS
   * unconverted, or a value dropped. Both are silent: the declaration is
   * discarded by the parser and the element renders as though nobody had styled
   * it, which is this unit's own defect arriving one layer down.
   */
  it("serialises every property it mounts, and nothing else", () => {
    const declared = [...SHELL_ROOT_CSS.matchAll(/^ {2}([a-z0-9-]+):/gm)].map(([, property]) => property)

    const expected = [
      ...Object.keys(SHELL_THEME_STYLE),
      ...Object.keys(SHELL_GROUND).map((key) => key.replace(/[A-Z]/g, (capital) => `-${capital.toLowerCase()}`)),
    ]

    expect(new Set(declared)).toEqual(new Set(expected))
    expect(declared).toHaveLength(expected.length)
  })

  /**
   * No camelCase survives the conversion. `backgroundColor: #fff` is not a
   * declaration any browser applies, and nothing reports it.
   */
  it("leaves no camelCase property in the CSS", () => {
    expect(SHELL_ROOT_CSS).not.toMatch(/^ {2}[a-z]+[A-Z]/m)
  })

  /**
   * And it is a `:root` rule rather than a bare list of declarations, which is
   * the whole reason it exists: `:root` is the document element, and a page
   * outside every route group cannot render an `<html>` of its own to put them
   * on.
   */
  it("is a :root rule", () => {
    expect(SHELL_ROOT_CSS.startsWith(":root {")).toBe(true)
    expect(SHELL_ROOT_CSS.trimEnd().endsWith("}")).toBe(true)
  })
})
