import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { createThemeRegistry, RAMP_STEPS, TEXT_CONTRAST_MINIMUM } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { siteCount } from "./counts"

/**
 * The numbers *Making it look like yours* states in prose, held against the
 * runtime that produced them.
 *
 * Three blocks on that page are generated and cannot drift. The prose around
 * them can, and does not have the decency to fail while doing it — "seventeen
 * named slots" stays a sentence long after a slot is added.
 *
 * **Two of the sentences that used to be checked here are now produced.** This
 * file read the page back and asserted the spelled figure was the right one,
 * which kept the number true and made the page a lock: a runtime that grew an
 * eighteenth slot reddened `pnpm verify` for four surfaces until somebody
 * retyped a word. That is the 16 September finding, and the remedy it names is
 * that the page may not say the number. `_lib/counts.ts` produces both of them
 * now, spelled, and `counts.test.ts` sweeps every page for a number standing in
 * front of a counted noun — so the assertions below are that the page **asks**,
 * which cannot be right-today in the way the old pair was.
 *
 * `RAMP_STEPS` stays pinned, and the distinction is the finding's own: a ramp
 * has eight steps because eight is the shape of a ramp, not because somebody
 * put eight things in a list. It is a constant the prose may name.
 *
 * Only figures. Nothing here holds the page's argument, its tone or its
 * headings — a test that asserted the wording would be a test that had to be
 * edited every time somebody improved a sentence, and would teach the next
 * writer to stop improving them.
 */

const page = readFileSync(
  fileURLToPath(new URL("../docs/building-with-loom/theming/page.mdx", import.meta.url)),
  "utf8"
)

/**
 * Written-out numbers, because the page is prose and prose spells them.
 *
 * One entry left. `spellOut` in `_lib/counts.ts` is the general version and the
 * two figures that needed it have moved there; this stays a lookup because a
 * test that spelled its expectation with the function the page spells it with
 * would be comparing the module to itself.
 */
const WORDS: Readonly<Record<number, string>> = {
  8: "eight",
}

const wordFor = (value: number): string => {
  const word = WORDS[value]

  if (word === undefined) {
    throw new Error(`loom: the theming page's claims test has no word for ${value}`)
  }

  return word
}

describe("what the theming page claims about the vocabulary", () => {
  it("asks for the number of slots rather than spelling it", () => {
    expect(page).toContain(siteCount("palette-slots").rendered)
  })

  it("says how many steps the ramps have, and is right", () => {
    expect(page).toContain(`${wordFor(RAMP_STEPS)} steps`)
  })

  /**
   * The one that reads as an aside and was the most load-bearing: the sentence
   * about registering your own weighs the starter set against your brand, and
   * most of that set is derived — so the count moved whenever `palettes.ts`
   * grew, and the page had to be edited to keep up. It now names the noun it is
   * counting, which is what puts it inside the sweep: the old wording was "your
   * brand plus twenty-one others", and a bare number in front of *others* is
   * one no check on this site can find.
   */
  it("asks for the number of registered palettes rather than spelling it", () => {
    expect(page).toContain(siteCount("starter-palettes").rendered)
  })

  it("quotes the contrast bar as the runtime sets it", () => {
    expect(page).toContain(`**${TEXT_CONTRAST_MINIMUM}:1**`)
  })
})

describe("what the theming page shows in its code blocks", () => {
  /**
   * The three ids in the opening snippet are the ones the example beside it
   * actually wears, and all three have to resolve — a documented selection that
   * does not is a page teaching a reader to write a `theme-unresolved`
   * diagnostic.
   */
  it("names a selection the default registry resolves", () => {
    const selection = { palette: "tide", fontPack: "grotesque", stylePreset: "technical" }

    for (const [key, value] of Object.entries(selection)) {
      expect(page).toContain(`${key}: "${value}"`)
    }

    expect(createThemeRegistry().resolve(selection).ok).toBe(true)
  })

  it("imports the two runtime functions it tells a reader to call", () => {
    for (const named of ["createThemeRegistry", "STARTER_PALETTES"]) {
      expect(page).toContain(`import { ${named} } from "@jam-overture/loom"`)
    }
  })
})

describe("what the scheme section shows rather than types", () => {
  /**
   * The hole every other assertion about this section leaves open.
   *
   * `scheme.test.ts` holds every answer against a second comparison of the same
   * luminances, and `palette-scheme.test.tsx` reads all three blocks back out of
   * the document — and **both stay green if the page stops asking for any of
   * them.** A section that lost its tables and went back to a typed list of
   * palettes would pass the lot.
   *
   * So the page is read off disk, which is how the assertions above hold its
   * counts and how `_lib/content.test.ts` holds each page's metadata call: a
   * thin assertion about the one step nothing else covers.
   */
  it.each(["SchemeWorking", "PaletteSchemes", "ColourForms"])("asks for <%s /> rather than typing it", (block) => {
    expect(page).toContain(`<${block} `)
  })

  it("imports the three blocks from this route group", () => {
    expect(page).toContain(
      'import { ColourForms, PaletteSchemes, SchemeWorking } from "@/app/(docs)/_components/palette-scheme"'
    )
  })

  /**
   * The function the section is about, named in the one import a reader copies.
   * It is published from the root door, and a page telling them to reach for it
   * through `@jam-overture/loom/react` — where `themeGround` lives, one section
   * up — would be a paste that does not resolve.
   */
  it("tells a reader the door paletteScheme is published from", () => {
    expect(page).toContain('import { paletteScheme } from "@jam-overture/loom"')
  })
})
