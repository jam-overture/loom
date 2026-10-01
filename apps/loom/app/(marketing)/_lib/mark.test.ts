import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { boldPalette, minimalPalette } from "@jam-overture/loom"

import { MARK_PATH } from "./chrome"

/**
 * The browser-tab mark, held against the palettes it borrows its two colors
 * from.
 *
 * **This site has never had one.** `tools/prerender/metadata.ts` has supported
 * Next's `icon` convention since it was written and nothing ever filled it, so
 * every tab showing any of the four surfaces has carried the browser's blank
 * page glyph.
 *
 * ## Why this file has literal color in it, on the one surface whose rule is
 * that nothing does
 *
 * Every other assertion this lane makes about color is that there is none —
 * `pages.test.ts` sweeps the served markup for a hex value and fails on one.
 * That rule exists because a tree is themed at render and a literal would
 * survive the theming.
 *
 * **A favicon is drawn by the browser's chrome, outside the page**, and no
 * custom property reaches it. There is no theme to read, so a literal is not a
 * shortcut here; it is the only thing available.
 *
 * What is available instead is to stop the literal being *arbitrary*: both
 * values are read out of the registered palettes rather than restated, so the
 * mark cannot drift from the site. `#0a0a0a` is `minimal`'s ink and also
 * `bold`'s canvas — one value doing both jobs is why the mark reads as the
 * site's black rather than as a black somebody picked.
 */

const ICON = readFileSync(join(process.cwd(), "app", "icon.svg"), "utf8")

describe("the tab mark", () => {
  /**
   * The light case is the default rather than a media query, so a browser that
   * reports no preference — and a renderer that ignores the query entirely,
   * which several do — still gets the mark the maintainer asked for.
   */
  it("is the site's own ink, not a black somebody picked", () => {
    expect(ICON).toContain(`fill: ${minimalPalette.slots["fg-default"]}`)
  })

  /**
   * A black glyph on a transparent ground disappears into dark browser chrome,
   * which is the failure a tab icon cannot report. The dark case is `bold`'s
   * ink for the same reason the light case is `minimal`'s: the site already
   * owns both values.
   */
  it("survives dark browser chrome", () => {
    expect(ICON).toContain("prefers-color-scheme: dark")
    expect(ICON).toContain(`fill: ${boldPalette.slots["fg-default"]}`)
  })

  /**
   * Four arms and a square field. The mark is a pinwheel interlock — four bars
   * woven into a ring — and at 16px the gaps between them are what carries it.
   * Losing an arm would leave three bars that still render and no longer
   * interlock.
   */
  it("is four arms in a square field", () => {
    expect(ICON).toContain('viewBox="0 0 32 32"')
    expect(ICON.match(/<rect /g)?.length).toBe(4)
  })

  /**
   * A tab icon is announced by whatever the page's title says, but the file is
   * also served on its own address and reached directly, so it carries a name.
   */
  it("says what it is to something that cannot see it", () => {
    expect(ICON).toContain('role="img"')
    expect(ICON).toContain('aria-label="Loom"')
  })
})

/**
 * The tab icon and the bar mark are the same four arms and deliberately not the
 * same artefact — a file for the browser's chrome, path data for the page,
 * because the two answer to different color axes (`prefers-color-scheme`
 * against the Loom palette). Two copies of one shape is a thing that drifts,
 * and this is the cheapest guard against it: derive the path from the file's
 * own rectangles and fail if they disagree.
 */
describe("the mark in the bar and the mark in the tab", () => {
  const RECT = /<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)"\s*\/>/g

  /**
   * `rect(x, y, w, h)` as the four moves a path makes to draw the same box.
   *
   * One closing form — `H{x}` — so the two copies are written the same way. A
   * box can be closed with `h-{w}` too, and an arm spelled that way drew an
   * identical shape and failed this test, which is the right outcome for a
   * guard whose whole job is that two copies do not drift.
   */
  const asPath = (x: number, y: number, w: number, h: number): string =>
    `M${x} ${y}h${w}v${h}H${x}z`

  it("draws the same four arms", () => {
    const fromFile = [...ICON.matchAll(RECT)].map(([, x, y, w, h]) =>
      asPath(Number(x), Number(y), Number(w), Number(h))
    )

    expect(fromFile).toHaveLength(4)

    /**
     * Compared as a set of arms rather than as one string, because the order
     * the file lists them in and the order the path draws them in are both
     * arbitrary and neither is worth pinning.
     */
    expect(new Set(MARK_PATH.split(" M").map((arm, index) => (index === 0 ? arm : `M${arm}`)))).toEqual(
      new Set(fromFile)
    )
  })
})
