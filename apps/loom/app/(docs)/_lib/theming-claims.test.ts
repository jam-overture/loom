import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import {
  createThemeRegistry,
  PALETTE_SLOTS,
  RAMP_STEPS,
  STARTER_PALETTES,
  TEXT_CONTRAST_MINIMUM,
} from "@loom/runtime"
import { describe, expect, it } from "vitest"

/**
 * The numbers *Making it look like yours* states in prose, held against the
 * runtime that produced them.
 *
 * Three blocks on that page are generated and cannot drift. The prose around
 * them can, and does not have the decency to fail while doing it — "seventeen
 * named slots" stays a sentence long after a slot is added. So the sentences
 * that carry a figure are read back off the file here and checked, which is the
 * cheapest way to let a page speak in words rather than in components without
 * becoming the copy that rots.
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

/** Written-out numbers, because the page is prose and prose spells them. */
const WORDS: Readonly<Record<number, string>> = {
  8: "eight",
  17: "seventeen",
  21: "twenty-one",
}

const wordFor = (value: number): string => {
  const word = WORDS[value]

  if (word === undefined) {
    throw new Error(`loom: the theming page's claims test has no word for ${value}`)
  }

  return word
}

describe("what the theming page claims about the vocabulary", () => {
  it("says how many slots a palette declares, and is right", () => {
    expect(page).toContain(`${wordFor(PALETTE_SLOTS.length)} named slots`)
  })

  it("says how many steps the ramps have, and is right", () => {
    expect(page).toContain(`${wordFor(RAMP_STEPS)} steps`)
  })

  /**
   * The one that reads as an aside and is the most load-bearing: the sentence
   * about registering your own says shipping the starter set alongside it is
   * "your brand plus twenty-one others". Eighteen of those are derived, so the
   * count moves whenever `palettes.ts` grows.
   */
  it("says how many palettes come registered, and is right", () => {
    expect(page).toContain(`${wordFor(STARTER_PALETTES.length)} others`)
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
      expect(page).toContain(`import { ${named} } from "@loom/runtime"`)
    }
  })
})
