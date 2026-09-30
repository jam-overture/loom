import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { contrastRatio, sequentialIdFactory, STARTER_PALETTES, TEXT_CONTRAST_MINIMUM } from "@jam-overture/loom"
import { compositionById } from "@jam-overture/loom/primitives"
import { themeGround, themeStyle, THEME_PROP_KEY } from "@jam-overture/loom/react"
import { describe, expect, it } from "vitest"

import {
  buildExcerpt,
  CONTRAST_BAR,
  EXCERPT_IDS,
  EXCERPT_PART,
  HOUSE_PALETTE_ID,
  houseGround,
  mountedGround,
  MOUNTED_SELECTION,
  mountedTheme,
  mountedVariableCount,
  printRatio,
  ratioOnHouseGround,
  ratioOnThemeGround,
} from "./mounting"

/**
 * The demonstration under *Putting it on a page*, held to being a
 * demonstration.
 *
 * The section makes one claim — a frame that keeps its own ground makes the
 * tree's ink unreadable, and `themeGround` is what fixes it — and the claim is
 * carried entirely by two numbers. A palette edited tomorrow could leave both
 * frames looking fine, every existing test green, and the prose around them
 * describing a failure the reader is not being shown. So the interesting tests
 * here are the two that assert the demonstration still **demonstrates**: one
 * side has to fail the bar and the other has to clear it.
 *
 * Everything else is recomputed a second way rather than compared against this
 * module's own answer, which is the rule this site has now filed three times:
 * a check whose expected value comes from the thing it checks moves when the
 * defect moves and stays green.
 */

const paletteNamed = (id: string) => {
  const palette = STARTER_PALETTES.find((candidate) => candidate.id === id)

  expect(palette, `"${id}" is not a registered palette`).toBeDefined()

  return palette
}

describe("the demonstration still demonstrates", () => {
  it("fails the contrast bar on the frame that kept its own ground", () => {
    expect(ratioOnHouseGround).toBeLessThan(TEXT_CONTRAST_MINIMUM)
  })

  it("clears it on the frame that asked the theme", () => {
    expect(ratioOnThemeGround).toBeGreaterThanOrEqual(TEXT_CONTRAST_MINIMUM)
  })

  /**
   * Not decoration. Two palettes a few points apart would satisfy both tests
   * above and show a reader almost nothing, and the section's opening sentence
   * says the words are *not there* rather than that they are a little faint.
   */
  it("is a difference somebody can see across a room", () => {
    expect(ratioOnThemeGround / ratioOnHouseGround).toBeGreaterThan(10)
  })

  it("measures the bar the rest of the page measures", () => {
    expect(CONTRAST_BAR).toBe(TEXT_CONTRAST_MINIMUM)
  })
})

describe("what the two frames are made of", () => {
  it("sets both frames' ink from the theme, so only the paper differs", () => {
    const palette = paletteNamed(String(MOUNTED_SELECTION["palette"]))

    expect(mountedGround.color).toBe(palette?.slots["fg-default"])
  })

  it("takes the theme's ground from the theme's own canvas", () => {
    const palette = paletteNamed(String(MOUNTED_SELECTION["palette"]))

    expect(mountedGround.backgroundColor).toBe(palette?.slots["bg-canvas"])
  })

  it("takes the house ground from the palette this site is built with", () => {
    expect(houseGround).toBe(paletteNamed(HOUSE_PALETTE_ID)?.slots["bg-canvas"])
  })

  it("mounts a theme the registry really resolves, through the runtime's own function", () => {
    expect(mountedTheme.palette.id).toBe(MOUNTED_SELECTION["palette"])
    expect(mountedGround).toEqual(themeGround(mountedTheme))
  })

  /**
   * The reserved key rather than a literal `"loom:theme"`. A page that told a
   * reader to write one string while the site resolved another would be wrong
   * in the one way this site cannot afford.
   */
  it("names the theme under the reserved prop the runtime reads", () => {
    expect(THEME_PROP_KEY).toBe("loom:theme")
  })

  it("reports how many properties themeStyle hands over, and counts them", () => {
    expect(mountedVariableCount).toBe(Object.keys(themeStyle(mountedTheme)).length)
    expect(mountedVariableCount).toBeGreaterThan(0)
  })

  it("measures each ratio with the function the palette audit uses", () => {
    expect(ratioOnHouseGround).toBe(contrastRatio(mountedGround.color, houseGround))
    expect(ratioOnThemeGround).toBe(contrastRatio(mountedGround.color, mountedGround.backgroundColor))
  })

  it("prints a ratio the way the audit above it prints one", () => {
    expect(printRatio(4.5)).toBe("4.5:1")
    expect(printRatio(16.129872158898056)).toBe("16.1:1")
  })
})

describe("the excerpt", () => {
  /**
   * The test that makes the section evidence rather than illustration. A
   * hand-built stand-in of the same shape would render, keep its ids and look
   * identical — it was caught by mutation on the bands page and not by any
   * check, which is why this compares node for node.
   */
  it("is the library's own band and not a copy of it", () => {
    const composition = compositionById(EXCERPT_PART)

    expect(composition).toBeDefined()
    expect(buildExcerpt().root).toEqual(composition?.build(sequentialIdFactory(EXCERPT_IDS)))
  })

  /**
   * The whole reason `themeGround` exists is that there is no root primitive
   * above the excerpt. A band that had grown one would make the section's
   * argument false without changing a word of it.
   */
  it("is not rooted at the primitive that mounts a theme", () => {
    expect(buildExcerpt().root.type).not.toBe("loom.page")
  })

  /** A band painting its own surface would hide the ground the section is about. */
  it("declares no tone of its own, so it sits on the frame's ground", () => {
    expect(buildExcerpt().root.props["tone"]).toBeUndefined()
  })

  it("names no theme, because an excerpt wears the frame's", () => {
    expect(buildExcerpt().root.props[THEME_PROP_KEY]).toBeUndefined()
  })
})

describe("what the page says about it", () => {
  const page = readFileSync(
    fileURLToPath(new URL("../docs/building-with-loom/theming/page.mdx", import.meta.url)),
    "utf8"
  )

  it("names both functions a host calls", () => {
    expect(page).toContain("themeStyle(theme)")
    expect(page).toContain("themeGround(theme)")
  })

  /**
   * The section prints two ratios and they are the component's, computed. A
   * digit typed into the prose beside them would be a second opinion about a
   * measurement, and the one on the page is the one that would be believed.
   */
  it("states neither ratio in prose", () => {
    const section = page.slice(page.indexOf("## Putting it on a page"))

    for (const ratio of [ratioOnHouseGround, ratioOnThemeGround]) {
      expect(section).not.toContain(printRatio(ratio))
      expect(section).not.toContain(ratio.toFixed(2))
    }
  })
})
