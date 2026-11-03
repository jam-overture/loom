import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { minimalSansFontPack } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { coloursIn, HOUSE_THEME, housePalette, LIGHT_SELECTOR } from "./chrome-palette"
import { selectorDeclarations } from "./chrome-css"
import { docsExamples } from "./examples/catalogue"
import { docsThemes } from "./loom/registry"

/**
 * The house theme, and the two ways this site could quietly stop wearing it.
 *
 * Converting a surface to a theme is not one change, it is two that have to
 * agree: the trees name three registered ids, and the chrome around them is
 * hand-written CSS transcribed from the same three documents. Nothing in the
 * framework can hold those together — chrome is application furniture and has
 * no theme mounted on it (0067) — so it is held together here or not at all.
 */

const THEME_PROP = "loom:theme"

/**
 * One statement of the three ids, in `chrome-palette.ts`, because the chrome
 * check needs the same triple to read a ground off and two copies of it is the
 * hazard this whole file is about.
 */
const HOUSE = HOUSE_THEME

const globals = (): string =>
  readFileSync(fileURLToPath(new URL("../globals.css", import.meta.url)), "utf8")

const themeOf = (id: string): Record<string, unknown> => {
  const example = docsExamples.get(id)
  if (example === undefined) throw new Error(`no example is registered as "${id}"`)

  const declared = example.build().root.props[THEME_PROP]

  if (typeof declared !== "object" || declared === null || Array.isArray(declared)) {
    throw new Error(`"${id}" names no theme on its root`)
  }

  return declared as Record<string, unknown>
}

/**
 * The examples that exist *because* they are not the house theme.
 *
 * `themed-tree` shows that three ids on the root change everything below them,
 * and `a-derived-theme` shows a combination nobody on this project chose by
 * hand. Neither can make its point while matching the page around it, so both
 * are exempt from the rule below — and the assertion after it holds them to the
 * opposite rule instead, so an exemption is a claim rather than a hole. Adding
 * an id here without a page that turns on the difference is how this list stops
 * meaning anything.
 */
const DELIBERATELY_OTHER = ["themed-tree", "a-derived-theme"] as const

describe("the theme the examples wear", () => {
  it("is the house theme on every example but the ones about themes", () => {
    for (const id of docsExamples.keys()) {
      if (DELIBERATELY_OTHER.some((exempt) => exempt === id)) continue

      expect(themeOf(id), `"${id}" is not on the house theme`).toEqual(HOUSE)
    }
  })

  it("is deliberately not the house theme on the examples about themes", () => {
    for (const id of DELIBERATELY_OTHER) {
      expect(themeOf(id), `"${id}" is exempt but wears the house theme anyway`).not.toEqual(HOUSE)
    }
  })

  /**
   * The exemption list is a list of ids, and an id that stops naming an example
   * would exempt nothing while still looking like it does.
   */
  it("exempts only examples that exist", () => {
    for (const id of DELIBERATELY_OTHER) {
      expect(docsExamples.has(id), `"${id}" is exempt and is not registered`).toBe(true)
    }
  })

  /**
   * The assertion that would have caught the `bold` example rendering pale
   * grey on white for as long as it did. A page that does not paint its canvas
   * borrows the frame's, so an example only *looks* right while its theme and
   * the docs chrome happen to agree — which is exactly the coincidence a page
   * about themes must not depend on.
   */
  it("paints its own canvas rather than borrowing the frame's", () => {
    for (const id of docsExamples.keys()) {
      const example = docsExamples.get(id)
      if (example === undefined) throw new Error(id)

      expect(example.build().root.props["fills"], `"${id}" does not fill`).toBe(true)
    }
  })

  it("names ids the registry actually has", () => {
    for (const id of docsExamples.keys()) {
      const declared = themeOf(id)

      expect(docsThemes.resolve(declared).ok, `"${id}" names a theme the registry refused`).toBe(
        true
      )
    }
  })
})

describe("the chrome around them", () => {
  /**
   * The reason the fonts are vendored rather than loaded through `next/font`.
   *
   * A font pack names a family as a plain string, and a theme is data — it
   * cannot know what a surface loaded or under what generated name. So the
   * only thing that makes the *examples* render in Geist is a `@font-face`
   * declared under the exact family the pack asks for. Rename the file, switch
   * to a hashed family, and the chrome would still look right while every
   * example silently fell back — which is precisely the failure nobody would
   * notice from a screenshot of the chrome.
   */
  it("declares a face under the family name the font pack asks for", () => {
    const wanted = minimalSansFontPack.headingFamily.split(",")[0]?.trim()

    expect(wanted).toBe("Geist")
    expect(globals()).toContain(`font-family: "${wanted}"`)
  })

  /** Compared with runs of whitespace flattened, because the stylesheet wraps it. */
  it("gives the body the font pack's own stack, so it falls back the same way", () => {
    const flatten = (value: string): string => value.replace(/\s+/g, " ")

    expect(flatten(globals())).toContain(flatten(minimalSansFontPack.bodyFamily))
  })

  /**
   * The one line that turns the library outline-first, transcribed. If a later
   * change gives the docs chrome a grey fill back, the site stops looking like
   * the theme it says it wears, and no other test here would notice.
   */
  /**
   * **Read off the palette and not off a hex typed here**, which is the 3
   * November change and the reason this file no longer proves the chrome by
   * itself. `expect(globals()).toContain("--surface-page: #ffffff")` fails when
   * somebody edits the stylesheet, which nobody was worried about, and passes
   * for ever when the palette moves, which is the only thing it was written
   * for. `chrome-palette.ts` holds every colour in the sheet against its slot;
   * what is left here is the pair of claims that module cannot make, because
   * they are about what the *palette* decided rather than whether the chrome
   * followed it.
   */
  const chrome = (): ReadonlyMap<string, string> => coloursIn(selectorDeclarations(globals(), LIGHT_SELECTOR))

  it("keeps its structural surfaces on the page color", () => {
    const canvas = housePalette.slots["bg-canvas"]

    expect(housePalette.slots["bg-surface"], "the palette stopped being outline-first").toBe(canvas)
    expect(housePalette.slots["bg-overlay"]).toBe(canvas)

    for (const variable of ["--surface-page", "--surface-sunken", "--surface-raised"]) {
      expect(chrome().get(variable), `${variable} is not the canvas`).toBe(canvas)
    }
  })

  it("spends the green only where the palette spends it", () => {
    expect(housePalette.slots["accent"], "accent is ink, and a brand green in it would be the page's largest element").toBe(
      housePalette.slots["fg-default"]
    )

    expect(chrome().get("--accent")).toBe(housePalette.slots["accent"])
    expect(chrome().get("--accent-ring")).toBe(housePalette.slots["border-accent"])
    expect(chrome().get("--accent-ring")).not.toBe(chrome().get("--accent"))
  })
})

/**
 * The boundary between prose and the things the site generates.
 *
 * Markdown tables need `display: block` to scroll on a phone rather than widen
 * the page. A table a component built needs the opposite, and needs its own
 * borders and padding rather than prose's on top of them. Both were true for a
 * fortnight and nothing failed, because "it rendered" is true of a table with
 * dead space beside it and two sets of borders inside it.
 *
 * Held as a source assertion rather than a rendered one on purpose: the suite
 * that renders these components runs in jsdom, which parses no stylesheet, so a
 * DOM test here would assert nothing and read as though it did.
 */
describe("what prose styling is allowed to reach", () => {
  const GUARD = ":not(.not-prose *)"

  /**
   * Both directions, because either one alone passes on a broken sheet: the
   * guarded selector could be added and the unguarded one left in place beside
   * it, and the unguarded one would still win everything it used to.
   */
  it("guards every prose table rule against generated markup", () => {
    const source = globals()

    for (const selector of [".prose table", ".prose th", ".prose td"]) {
      expect(source).toContain(`${selector}${GUARD}`)

      const unguarded = new RegExp(`\\${selector.replace(" ", "\\s+")}\\s*[,{]`)

      expect(source).not.toMatch(unguarded)
    }
  })

  it("still lets a markdown table scroll rather than widen the page", () => {
    const source = globals()
    const rule = source.slice(source.indexOf(`.prose table${GUARD}`))

    expect(rule.slice(0, rule.indexOf("}"))).toContain("overflow-x: auto")
    expect(rule.slice(0, rule.indexOf("}"))).toContain("display: block")
  })
})
