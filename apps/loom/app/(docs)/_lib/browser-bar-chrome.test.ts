import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { SITE_BAR, THEME_COLOR_NAME } from "./theme"

/**
 * The two colors this site hands the browser, held against the two it paints.
 *
 * *The bar above your page* tells a reader to take the bar's color from
 * `themeGround`, and this site cannot: its chrome is application furniture with
 * no theme mounted on it (0067), so there is no resolved theme to read a ground
 * off and `SITE_BAR` is a transcription of `--surface-page` out of
 * `globals.css`.
 *
 * Which makes it exactly the shape 0197 is about — one decision, two copies, in
 * two files the framework cannot hold together — and `house-theme.test.ts`'s
 * answer is the only one available: hold them together here, by reading the
 * stylesheet. The failure this exists to prevent is a palette change that moves
 * the page and leaves the bar behind, which nothing else on this site could
 * see: a bar one shade off its page is the *off-by-a-shade* outcome the theming
 * page counts nineteen of, and nobody files it.
 */

const globals = (): string => readFileSync(fileURLToPath(new URL("../globals.css", import.meta.url)), "utf8")

/**
 * What `--surface-page` is inside one selector's block.
 *
 * Read by taking the text from the selector to the end of its block and then
 * the first declaration in it, rather than by a single pattern over the whole
 * file: there are two `--surface-page` declarations and a regex for one of them
 * would have matched the other just as happily, which is the defect this is
 * meant to catch rather than reproduce.
 */
const surfacePageUnder = (selector: string): string => {
  const source = globals()
  const at = source.indexOf(`${selector} {`)

  if (at === -1) throw new Error(`loom: globals.css has no "${selector}" block, so the bar has nothing to match`)

  const block = source.slice(at, source.indexOf("\n  }", at))
  const declared = /--surface-page:\s*(#[0-9a-f]{3,8})/i.exec(block)

  if (declared?.[1] === undefined) {
    throw new Error(`loom: "${selector}" declares no --surface-page, so the bar cannot be checked against it`)
  }

  return declared[1]
}

describe("the color the browser's bar is told to be", () => {
  /**
   * The whole point. A bar is meant to look like the page continuing upward, so
   * the one correct value is the color the top of the page is — which for this
   * site's chrome is `--surface-page` and not `--surface-sunken`, not the ink,
   * and not a hex somebody liked.
   */
  it("is the page's own surface, under each of the two themes", () => {
    expect(SITE_BAR.light).toBe(surfacePageUnder(":root"))
    expect(SITE_BAR.dark).toBe(surfacePageUnder('[data-theme="dark"]'))
  })

  /**
   * Two colors and not one, which is the assertion that fails if a later edit
   * collapses the record to a single constant and leaves one theme unbarred.
   */
  it("is a different color for each theme", () => {
    expect(SITE_BAR.light).not.toBe(SITE_BAR.dark)
    expect(Object.keys(SITE_BAR).sort()).toEqual(["dark", "light"])
  })

  it("is written as hex, which is the form the meta and the audit both read", () => {
    for (const [theme, colour] of Object.entries(SITE_BAR)) {
      expect(colour, `the ${theme} bar is not hex`).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  /**
   * The name is the seam between three files — the layout renders the element,
   * the inline script finds it before paint, the toggle finds it on every press
   * — and it is the browser's own name rather than ours to choose.
   */
  it("goes out under the name the browser reads", () => {
    expect(THEME_COLOR_NAME).toBe("theme-color")
  })
})
