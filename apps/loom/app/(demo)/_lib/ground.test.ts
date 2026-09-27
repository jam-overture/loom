import { describe, expect, it } from "vitest"

import {
  contrastRatio,
  createThemeRegistry,
  STARTER_PALETTES,
  TEXT_CONTRAST_MINIMUM,
  type ResolvedTheme,
} from "@loom/runtime"

import { demoPagePalette, pageColour, pageGround } from "./ground"
import { DEMO_ALTERNATE_THEME, DEMO_STARTING_THEME } from "./page-tree"
import { demoThemes } from "./registry"

/**
 * The page's own colours, and the two copies of them this lane used to hold.
 *
 * The assertion this file exists for is the last one, and it is a measurement
 * rather than a preference: on 26 September the excerpt inside a question was
 * painting the page's ink on the demo chrome's white at **1.10:1**, which is not
 * a contrast failure so much as an absence. Every other test here exists so that
 * cannot come back by a different route — a palette named twice, a slot read
 * from one place and drawn from another, a `color-scheme` that says light while
 * the ground is navy.
 */

const themeFor = (selection: unknown): ResolvedTheme => {
  const resolved = demoThemes.resolve(selection)
  if (!resolved.ok) throw new Error(`unresolved: ${resolved.error.code}`)

  return resolved.value
}

describe("the palette the page wears", () => {
  /**
   * **The drift guard**, and the only one that would have caught the share
   * card. That file named `editorialPalette` in an import and explained in a
   * comment that it was doing so because the tree names it; when the tree
   * stopped naming it, nothing anywhere disagreed.
   */
  it("is the one the tree's root node names, resolved rather than written down", () => {
    expect(demoPagePalette.id).toBe(DEMO_STARTING_THEME["palette"])
  })

  it("is a registered palette", () => {
    expect(STARTER_PALETTES.map((palette) => palette.id)).toContain(demoPagePalette.id)
  })

  it("hands out the palette's own value for a slot", () => {
    expect(pageColour("bg-canvas")).toBe(demoPagePalette.slots["bg-canvas"])
    expect(pageColour("fg-default")).toBe(demoPagePalette.slots["fg-default"])
  })
})

describe("the ground a frame standing in for the page paints", () => {
  it("is the page's canvas and the page's ink, off one palette", () => {
    const theme = themeFor(DEMO_STARTING_THEME)
    const ground = pageGround(theme)

    expect(ground?.backgroundColor).toBe(theme.palette.slots["bg-canvas"])
    expect(ground?.color).toBe(theme.palette.slots["fg-default"])
  })

  /**
   * The starting theme is dark and the one the re-theme preset moves to is
   * light, so the two rows below are the demo's own round trip and not two
   * arbitrary palettes.
   */
  it("says which way round the palette is", () => {
    expect(pageGround(themeFor(DEMO_STARTING_THEME))?.colorScheme).toBe("dark")
    expect(pageGround(themeFor(DEMO_ALTERNATE_THEME))?.colorScheme).toBe("light")
  })

  it("is nothing at all when the tree names no theme", () => {
    expect(pageGround(undefined)).toBeUndefined()
  })

  /**
   * A palette whose colours cannot be measured still gets a ground — the two
   * hex-or-not values are the palette's either way — and gets no opinion about
   * `color-scheme`, so the stylesheet's own stands rather than this file
   * guessing from something it could not read.
   */
  it("declines to guess a scheme it cannot measure", () => {
    const unreadable = {
      ...demoPagePalette,
      slots: { ...demoPagePalette.slots, "fg-default": "color(display-p3 1 1 1)" },
    }
    const theme = { ...themeFor(DEMO_STARTING_THEME), palette: unreadable }

    expect(pageGround(theme)?.backgroundColor).toBe(demoPagePalette.slots["bg-canvas"])
    expect(pageGround(theme)?.colorScheme).toBeUndefined()
  })

  /**
   * **The measurement.** Every palette a visitor can put this page into — by
   * pressing the re-theme preset, or by naming one in free text, which the
   * model may do because the whole registry is in its catalogue — and in each
   * one the excerpt's ink lands on the excerpt's ground above the body-text
   * bar.
   *
   * Against the code this replaced, `midnight` scores **1.10** here.
   */
  it.each(STARTER_PALETTES.map((palette) => palette.id))(
    "keeps the excerpt readable under %s",
    (id) => {
      const theme = themeFor({ ...DEMO_STARTING_THEME, palette: id })
      const ground = pageGround(theme)

      expect(ground).toBeDefined()
      expect(contrastRatio(ground?.color ?? "", ground?.backgroundColor ?? "")).toBeGreaterThan(
        TEXT_CONTRAST_MINIMUM
      )
    }
  )

  /**
   * The demo registers the starter library whole (`registry.ts`), so the sweep
   * above is the sweep over everything reachable. Pinned, because a registry
   * that quietly stopped offering palettes would make that sweep pass by
   * measuring nothing.
   */
  it("sweeps every palette the demo offers", () => {
    const registered = createThemeRegistry().catalogue().palettes.length

    expect(registered).toBe(STARTER_PALETTES.length)
    expect(demoThemes.catalogue().palettes.length).toBe(registered)
    expect(registered).toBeGreaterThan(1)
  })
})
