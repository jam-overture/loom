import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { MARK_ARMS, MARK_VIEW_BOX } from "./mark"

/**
 * The shell's copy of the mark, held against the file both other copies are
 * held against.
 *
 * There are three copies of this shape in the application and that is
 * deliberate: `app/icon.svg` is drawn by the browser's chrome and answers to
 * `prefers-color-scheme`, `(marketing)/_lib/chrome.ts` holds path data for
 * `loom.brand` and answers to the Loom palette, and this holds rectangles the
 * shell draws inline on a page that has no tree and therefore no `loom.brand`.
 * An image cannot do any of the other two's jobs, because it is opaque to the
 * cascade.
 *
 * What makes three copies safe is that **no copy is held against another copy**.
 * The marketing suite derives its path data from `icon.svg`'s rectangles; this
 * compares its rectangles to the same ones. The file is the source, and a change
 * to the mark has to pass through it.
 */

const ICON = readFileSync(join(process.cwd(), "app", "icon.svg"), "utf8")

const RECT = /<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)"\s*\/>/g

describe("the mark the shell draws", () => {
  it("is the same four arms the tab icon is", () => {
    const fromFile = [...ICON.matchAll(RECT)].map(([, x, y, width, height]) => ({
      x: Number(x),
      y: Number(y),
      width: Number(width),
      height: Number(height),
    }))

    expect(fromFile).toHaveLength(4)

    /**
     * As a set, because the order the file lists the arms in and the order this
     * module draws them in are both arbitrary and neither is worth pinning.
     */
    const asKey = (arm: { x: number; y: number; width: number; height: number }): string =>
      `${arm.x},${arm.y},${arm.width},${arm.height}`

    expect(new Set(MARK_ARMS.map(asKey))).toEqual(new Set(fromFile.map(asKey)))
  })

  /**
   * The arms are placed in absolute units, so a field of a different size would
   * put them somewhere else entirely — a `viewBox` that drifted would scale the
   * ring off its own centre rather than failing visibly.
   */
  it("places them in the same field", () => {
    expect(ICON).toContain(`viewBox="${MARK_VIEW_BOX}"`)
  })

  /**
   * Four arms and no more. The shape is a pinwheel interlock and the gaps
   * between the bars are what carries it: three bars still render, and no longer
   * interlock.
   */
  it("is four arms, not three that still render", () => {
    expect(MARK_ARMS).toHaveLength(4)
  })
})
