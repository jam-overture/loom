import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { minimalSansFontPack } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { DEFAULT_THEME, SITE_THEMES } from "./site"

/**
 * The face the theme names, held against the face the layout loads.
 *
 * This is the one part of wearing a theme that no other test on this site can
 * see. Every assertion in `pages.test.ts` reads markup, and the markup is
 * identical whether or not Geist exists — a primitive emits
 * `font-family: var(--loom-body-family)` either way, and the custom property
 * holds the same literal stack either way. The difference is only in what a
 * browser resolves that stack to, so a dropped or renamed font link would leave
 * every other check green and quietly render the fallback.
 *
 * It matters more here than on any other surface: this page is a tree all the
 * way to its edges, so every character on it is drawn by a primitive reading
 * the pack's family rather than by furniture styling itself.
 */

const layout = readFileSync(fileURLToPath(new URL("../layout.tsx", import.meta.url)), "utf8")

/**
 * What the file *imports*, not what it says.
 *
 * The layout's own comment names `next/font` and the `geist` package in order to
 * explain why neither is used, so a check for those strings anywhere in the file
 * matches the prose arguing against them.
 */
const imports = layout
  .split("\n")
  .filter((line) => line.startsWith("import "))
  .join("\n")

/** The first family in a CSS stack, unquoted — the one a `@font-face` must match. */
const firstFamily = (stack: string): string =>
  (stack.split(",")[0] ?? "").trim().replace(/^["']|["']$/g, "")

describe("the font the site actually renders in", () => {
  it("is the pack the default theme selects", () => {
    expect(SITE_THEMES[DEFAULT_THEME].selection["fontPack"]).toBe(minimalSansFontPack.id)
  })

  /**
   * The assertion the bundled loaders fail. `next/font` mints `__Geist_1a2b3c`
   * and the `geist` package mints `GeistSans`; the pack asks for `Geist`, and a
   * stack is matched by name, so either would download the file and render the
   * fallback anyway.
   */
  it("is served under the name the pack names, not a minted one", () => {
    const family = firstFamily(minimalSansFontPack.bodyFamily)

    expect(family).toBe("Geist")
    expect(layout).toContain(`family=${family}:`)
    expect(imports).not.toMatch(/next\/font|"geist/)
  })

  it("loads every weight the pack uses, and no more", () => {
    const weights = [...new Set([minimalSansFontPack.bodyWeight, minimalSansFontPack.headingWeight])]
      .sort((a, b) => a - b)
      .join(";")

    expect(layout).toContain(`wght@${weights}`)
  })

  it("takes the same family for headings and body, which is what the pack does", () => {
    expect(firstFamily(minimalSansFontPack.headingFamily)).toBe(
      firstFamily(minimalSansFontPack.bodyFamily)
    )
  })

  it("keeps a fallback behind it, so a failed request is a near-neighbour", () => {
    expect(minimalSansFontPack.bodyFamily.split(",").length).toBeGreaterThan(1)
    expect(layout).toContain("display=swap")
  })
})
