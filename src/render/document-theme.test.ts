import { describe, expect, it } from "vitest"

import { editorialPalette, STARTER_PALETTES } from "../theme/library.js"
import { createThemeRegistry } from "../theme/registry.js"
import { paletteSchema, type ResolvedTheme, type ThemeSelection } from "../theme/theme.js"

import { themeDocumentCss } from "./document-theme.js"
import { themeGround, themeStyle } from "./theme.js"

/**
 * The rule a host puts on its own document, and the one declaration in it that
 * nothing in a rendered page was carrying.
 *
 * The load-bearing assertion is the sweep: `color-scheme` comes out for every
 * registered palette, and it comes out as the palette's own answer rather than a
 * constant — which is the whole of the defect, because a dark page under the
 * light default is a black canvas with a light scrollbar beside it and nothing
 * anywhere reports it.
 */

const editorial: ThemeSelection = {
  palette: "editorial",
  fontPack: "editorial-serif",
  stylePreset: "comfortable",
} as ThemeSelection

const bold: ThemeSelection = {
  palette: "bold",
  fontPack: "bold-sans",
  stylePreset: "airy-modern",
} as ThemeSelection

const themes = createThemeRegistry()

const resolve = (selection: ThemeSelection): ResolvedTheme => {
  const resolved = themes.resolve(selection)
  if (!resolved.ok) throw new Error(`the registry refused ${selection.palette}`)

  return resolved.value
}

/** The property names the rule declares, in the order it declares them. */
const propertiesOf = (css: string): readonly string[] =>
  [...css.matchAll(/^ {2}([a-z0-9-]+):/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]]
  )

describe("themeDocumentCss", () => {
  it("is a :root rule, because :root is the document element and a page cannot render one", () => {
    const css = themeDocumentCss(resolve(editorial))

    expect(css.startsWith(":root {")).toBe(true)
    expect(css.trimEnd().endsWith("}")).toBe(true)
  })

  /**
   * Both halves, and nothing of its own.
   *
   * Two serialisations of one resolved theme, so the only thing that can go
   * wrong between them is the serialising — a key written into CSS
   * unconverted, or a value dropped. Both are silent: the declaration is
   * discarded by the parser and the page renders as though nobody had styled
   * it.
   */
  it("declares every property themeStyle mounts and every one themeGround returns", () => {
    const theme = resolve(bold)

    const expected = [
      ...Object.keys(themeStyle(theme)),
      ...Object.keys(themeGround(theme) ?? {}).map((key) =>
        key.replace(/[A-Z]/g, (capital) => `-${capital.toLowerCase()}`)
      ),
    ]

    const declared = propertiesOf(themeDocumentCss(theme))

    expect(new Set(declared)).toEqual(new Set(expected))
    expect(declared).toHaveLength(expected.length)
  })

  /**
   * `backgroundColor: #0a0a0a` is not a declaration any browser applies, and
   * nothing reports that it was thrown away.
   */
  it("leaves no camelCase property in the CSS", () => {
    expect(themeDocumentCss(resolve(bold))).not.toMatch(/^ {2}[a-z]+[A-Z]/m)
  })

  /** A custom property is already CSS; lowering it would be a no-op that looked safe. */
  it("passes custom properties through unaltered", () => {
    const css = themeDocumentCss(resolve(bold))

    expect(css).toContain("  --loom-bg-canvas: #0a0a0a;")
    expect(css).not.toMatch(/--loom-[a-z-]*[A-Z]/)
  })

  /**
   * The defect, swept.
   *
   * Every registered palette declares `color-scheme`, and the dark ones say
   * `dark`. A page is the palette's and so is the furniture beside it; a
   * constant in a host's stylesheet is right for one palette and silently wrong
   * for the next, which is the class of mistake the ground exists to end.
   */
  it("carries the palette's own color-scheme for every registered palette", () => {
    const base = resolve(editorial)

    const schemes = STARTER_PALETTES.map((palette) => {
      const match = /^ {2}color-scheme: (light|dark);$/m.exec(
        themeDocumentCss({ ...base, palette })
      )

      return match?.[1]
    })

    expect(schemes).toHaveLength(21)
    expect(schemes.every((scheme) => scheme !== undefined)).toBe(true)
    expect(new Set(schemes)).toEqual(new Set(["light", "dark"]))

    const boldScheme = /^ {2}color-scheme: (light|dark);$/m.exec(themeDocumentCss(resolve(bold)))

    expect(boldScheme?.[1]).toBe("dark")
  })

  /**
   * The ramp reaches the rule, which is the one argument it takes.
   *
   * A host mounting a theme on its document is mounting the same variables a
   * surface mounts, and a fixed ramp is a real choice a host makes — so a rule
   * that always served `fluid` would quietly re-decide it.
   */
  it("mounts the ramp it is given", () => {
    const theme = resolve(bold)

    expect(themeDocumentCss(theme, "fixed")).not.toBe(themeDocumentCss(theme, "fluid"))
    expect(themeDocumentCss(theme, "fixed")).toBe(
      [
        ":root {",
        ...Object.entries(themeStyle(theme, "fixed")).map(
          ([key, value]) => `  ${key}: ${String(value)};`
        ),
        ...Object.entries(themeGround(theme) ?? {}).map(
          ([key, value]) =>
            `  ${key.replace(/[A-Z]/g, (capital) => `-${capital.toLowerCase()}`)}: ${String(value)};`
        ),
        "}",
      ].join("\n")
    )
  })

  /**
   * A palette whose body-copy pair cannot be read gets no ground rather than a
   * guessed one, and the variables are unaffected by that — so the rule is
   * still returned, carrying the half a host cannot write for itself. The
   * alternative costs a page its whole palette to avoid mis-stating one
   * declaration of it.
   */
  it("returns the rule without a ground when the palette's pair cannot be read", () => {
    const unreadable = createThemeRegistry({
      palettes: [
        paletteSchema.parse({
          ...editorialPalette,
          id: "unreadable",
          slots: Object.fromEntries(
            Object.keys(editorialPalette.slots).map((slot) => [slot, "hsl(210 30% 40%)"])
          ),
        }),
      ],
    }).resolve({ ...editorial, palette: "unreadable" } as ThemeSelection)

    expect(unreadable.ok).toBe(true)
    if (!unreadable.ok) return

    const css = themeDocumentCss(unreadable.value)

    expect(css).not.toContain("color-scheme")
    expect(css).toContain("  background-color: hsl(210 30% 40%);")
    expect(propertiesOf(css).length).toBeGreaterThan(2)
  })
})
