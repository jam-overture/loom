import { describe, expect, it } from "vitest"

import { minimalPalette, minimalSansFontPack, preciseStylePreset } from "@jam-overture/loom"
import { themeDocumentCss } from "@jam-overture/loom/react"

import { GEIST_HREF, SHELL_GROUND, SHELL_ROOT_CSS, SHELL_SELECTION, shellTheme } from "./theme"

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
   * The `:root` rule, held against the framework's answer for this theme.
   *
   * The serialising moved into `themeDocumentCss` on 1 November and the cases
   * that hold it — every property declared, no camelCase surviving, a `:root`
   * rule rather than a bare list — moved with it, to
   * `src/render/document-theme.test.ts`. What is this module's to assert is
   * that the shell asks for the rule instead of composing one, which is the
   * thing a re-theme or a fourth declaration on `ThemeGround` would silently
   * leave behind here.
   *
   * Held as equality rather than by reading the CSS, because a weaker check
   * passes against a hand-rolled copy that happens to agree today, and the
   * reason the copy went is that it would not have agreed tomorrow.
   */
  it("mounts the rule the framework composes, rather than one of its own", () => {
    expect(SHELL_ROOT_CSS).toBe(themeDocumentCss(shellTheme))
  })
})
