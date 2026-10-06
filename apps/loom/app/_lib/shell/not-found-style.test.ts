import { describe, expect, it } from "vitest"

import { NOT_FOUND_STYLE } from "./not-found-style"
import { SHELL_THEME_STYLE } from "./theme"

/**
 * The shell's stylesheet, held against the theme it reads from.
 *
 * This is the half of the unit a rendered test cannot see. jsdom parses no CSS,
 * so every assertion about what this page *looks* like has to be made about the
 * text of the rules — and the text is where the failure this repository keeps
 * meeting lives: a declaration naming a property nothing supplies does not
 * error, does not warn and does not render. The element simply loses its
 * padding, or its colour, and looks deliberate while doing it.
 */

/**
 * Every custom property the rules read, once each.
 *
 * A capture group is `string | undefined` under this repository's strict
 * settings, and it is not a formality here: a group that failed to capture
 * would silently drop out of the list and leave the assertion below passing on
 * a shorter one. `flatMap` over an explicit check keeps the type honest and the
 * behaviour the same.
 */
const propertiesRead = (css: string): readonly string[] => [
  ...new Set(
    [...css.matchAll(/var\((--loom-[a-z0-9-]+)/g)].flatMap((match) =>
      match[1] === undefined ? [] : [match[1]]
    )
  ),
]

describe("the shell's stylesheet", () => {
  /**
   * The assertion this file exists for, and it is mechanical rather than a list
   * somebody keeps: every property the rules read is one the mounted theme
   * carries. A hand-written list of names is the same defect one level up — it
   * goes stale the first time a rule is added and nothing says so.
   */
  it("reads only properties the mounted theme carries", () => {
    const carried = Object.keys(SHELL_THEME_STYLE)
    const read = propertiesRead(NOT_FOUND_STYLE)

    expect(read.filter((property) => !carried.includes(property))).toEqual([])
  })

  /**
   * And it actually reads some. A stylesheet that stopped reading the theme
   * would pass the assertion above vacuously, which is the one way that check
   * can be satisfied by a page that has lost its dress entirely.
   */
  it("reads the theme at all", () => {
    expect(propertiesRead(NOT_FOUND_STYLE).length).toBeGreaterThan(10)
  })

  /**
   * No colour is written here. Every one arrives through a custom property, so
   * a re-theme reaches all of it — a literal would survive the theming and be
   * the only thing on the page that did (0049).
   */
  it("writes no colour of its own", () => {
    expect(NOT_FOUND_STYLE).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(NOT_FOUND_STYLE).not.toMatch(/\b(rgba?|hsla?|oklch|color-mix)\(/i)
  })

  /**
   * No type size, spacing step or radius either.
   *
   * Lengths in `px` are allowed only as hairlines — a 1px rule and a 2px focus
   * ring, which is what the library's own primitives draw and what no spacing
   * step is meant to supply. Any other pixel length here would be a spacing or
   * type decision taken outside the theme, which is the thing this page is not
   * allowed to do.
   */
  it("takes every length but a hairline from the theme", () => {
    const HAIRLINES = ["1px", "2px"]
    const lengths = [...new Set([...NOT_FOUND_STYLE.matchAll(/\b\d+(?:\.\d+)?px\b/g)].map(([found]) => found))]

    expect(lengths.filter((length) => !HAIRLINES.includes(length))).toEqual([])
  })

  /**
   * A reader who has asked for less movement gets none. The transition is on
   * the one control on the page, so the whole of this stylesheet's motion is
   * what the query turns off.
   */
  it("stands down its motion when a reader has asked it to", () => {
    expect(NOT_FOUND_STYLE).toContain("prefers-reduced-motion: reduce")
    expect(NOT_FOUND_STYLE).toContain("transition: none")
  })
})
