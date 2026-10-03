import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import {
  buildText,
  PALETTE_SLOTS,
  sequentialIdFactory,
  STARTER_PALETTES,
  gatePolicySchema,
} from "@jam-overture/loom"
import { compositionById, STARTER_COMPOSITIONS, STARTER_PRIMITIVES } from "@jam-overture/loom/primitives"

import { registeredTypeCount, bandCount, nodesIn } from "./compositions"
import { COUNT_EXEMPTIONS, SITE_COUNTS, countPhrasePattern, siteCount, spellOut } from "./counts"
import { outsideFences } from "./fences/spans"
import { docsPagesIn, writtenDocsSections } from "./nav"
import { KNOB_ORDER } from "./policy/knobs"
import { readPageSource } from "./search/headings"

/**
 * The numbers the site states about Loom, and the rule that they are counted.
 *
 * Three different failures are checked here and they fail for different
 * reasons, which is why this is three blocks rather than one sweep:
 *
 * 1. **A count that is wrong about its own subject.** Every value is re-derived
 *    from a second expression, so `counts.ts` reading the wrong length is red.
 * 2. **A page that types the number instead of rendering it.** The sweep, over
 *    every written page rather than the one somebody was editing.
 * 3. **An exemption that has outlived its sentence.** A phrase let through by
 *    name has to still be on the page, or the exemption goes.
 */

/** Every written page, as (section, page, source). */
const writtenPages = writtenDocsSections.flatMap((section) =>
  docsPagesIn(section).map((page) => ({
    section: section.slug,
    page: page.slug,
    /** Fenced code blanked: a `.max(12)` a reader is meant to copy is not prose. */
    source: outsideFences(readPageSource(section.slug, page.slug)).join(" "),
  }))
)

/**
 * Everything this route group wrote for a reader to read, as (where, text).
 *
 * The pages are the obvious half and were the whole of the first version of
 * this sweep. They are not where the second stale number was: the rail's
 * summary for *What AI may change* promised **thirteen settings** beside a page
 * that said fourteen, and no amount of reading `page.mdx` would have found it.
 *
 * **Both halves read what an author wrote, not what the site produces.** That
 * is the one decision in this file worth arguing with, and it was got wrong
 * first. Reading the produced caption looked stronger — it is, after all, what
 * a reader sees — and it refuses the fix: a caption built as
 * `` `${spellOut(bandNodesIn("pricing"), "Word")} nodes…` `` produces *Forty-four
 * nodes* and is indistinguishable from the hand-typed version it replaced. The
 * number is allowed to be in the output. It is not allowed to be in the file.
 *
 * So:
 *
 * - **the pages**, as `page.mdx`, fenced code blanked — a `.max(12)` a reader
 *   is meant to copy is not prose;
 * - **this route group's own modules**, as their **string and template
 *   literals** with comments stripped. The rail's titles and summaries, every
 *   example's title, caption and words, and every sentence a knob or a check
 *   carries are all literals in a `.ts` file, and a number interpolated into
 *   one is not one typed into it.
 *
 * Doc comments are out, deliberately: the note above `bandCount` says *"Forty-four
 * today"* on purpose and a module's own notes are allowed to be of their day.
 * Generated output is out because regenerating it is the fix. `counts.ts` is out
 * because it holds the exempted phrases, and a file listing what may not be
 * written would otherwise refuse itself.
 */
const flat = (text: string): string => text.replace(/\s+/g, " ").trim()

/** Comments removed, so a module's own notes are not read as its copy. */
const withoutComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/[^\n]*/g, (_, before: string) => before)

const LITERAL = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/gs

const literalsIn = (source: string): readonly string[] =>
  [...withoutComments(source).matchAll(LITERAL)].map((match) => flat(match[1] ?? match[2] ?? match[3] ?? ""))

/** This route group's own modules, minus its tests, its generated output and the registry. */
const EXCLUDED = /\.test\.tsx?$|[/\\]compiled[/\\]|[/\\]counts\.ts$/

const moduleFiles = (): readonly string[] => {
  const walk = (directory: string): readonly string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name)

      if (entry.isDirectory()) return walk(path)

      return /\.tsx?$/.test(entry.name) && !EXCLUDED.test(path) ? [path] : []
    })

  return walk(fileURLToPath(new URL("..", import.meta.url)))
}

const readerText: readonly { readonly where: string; readonly text: string }[] = [
  ...writtenPages.map((page) => ({ where: `${page.section}/${page.page}`, text: page.source })),
  ...moduleFiles().flatMap((path) =>
    literalsIn(readFileSync(path, "utf8")).map((text) => ({
      where: path.slice(path.indexOf("(docs)") + "(docs)/".length),
      text,
    }))
  ),
]

/**
 * A second opinion on each value, from somewhere other than `counts.ts`.
 *
 * This is the failure this lane keeps meeting — *a check derived from the thing
 * it checks cannot see it shrink* — and it bites here in a specific way: a
 * count reading `STARTER_PALETTES.length` where it meant `PALETTE_SLOTS.length`
 * would put a plausible number on the page, and a test comparing the registry
 * to itself would be green about it. So each expected value is spelled a
 * different way: a different module where one exists, a different property
 * where one does not.
 */
const SECOND_OPINION: Readonly<Record<string, number>> = {
  /** `compositions.ts` reads the same array for the bands page. */
  "starter-primitives": registeredTypeCount,
  /** Off the schema that produces the slot list, not off the list. */
  "palette-slots": PALETTE_SLOTS.filter((slot) => slot.length > 0).length,
  /** By id, so a duplicated palette is a different number here. */
  "starter-palettes": new Set(STARTER_PALETTES.map((palette) => palette.id)).size,
  /** The order the page prints them in, which is a hand-written list. */
  "policy-settings": KNOB_ORDER.length,
  "starter-bands": bandCount,
  /** The example's caption counts the same subtree a second time. */
  "pricing-band-nodes": nodesIn(compositionById("pricing")?.build(sequentialIdFactory("second")) ?? buildText(sequentialIdFactory("empty"), "")),
}

describe("the numbers this site states about Loom", () => {
  it("reads each one off the thing it counts", () => {
    for (const count of SITE_COUNTS) {
      expect(SECOND_OPINION[count.id], `${count.id} has no second opinion`).toBeDefined()
      expect(count.value, `${count.id} — ${count.of}`).toBe(SECOND_OPINION[count.id])
    }
  })

  /**
   * The sizes themselves, asserted once, so this file says out loud what the
   * site is currently claiming. These are the only literals in it.
   */
  it("is claiming the sizes it is claiming", () => {
    expect(siteCount("starter-primitives").value).toBe(STARTER_PRIMITIVES.length)
    expect(siteCount("palette-slots").value).toBe(17)
    expect(siteCount("starter-palettes").value).toBe(21)
    expect(siteCount("policy-settings").value).toBe(Object.keys(gatePolicySchema.shape).length)
    expect(siteCount("starter-bands").value).toBe(STARTER_COMPOSITIONS.length)
    expect(siteCount("pricing-band-nodes").value).toBeGreaterThan(STARTER_COMPOSITIONS.length / 2)
  })

  it("counts nothing twice", () => {
    expect(new Set(SITE_COUNTS.map((count) => count.id)).size).toBe(SITE_COUNTS.length)
  })

  it("gives every count a noun a reader would say", () => {
    for (const count of SITE_COUNTS) {
      expect(count.nouns.length, count.id).toBeGreaterThan(0)

      for (const noun of count.nouns) {
        expect(noun, `${count.id} — a noun with a capital or a space is the runtime's word, not a reader's`).toMatch(
          /^[a-z]+$/
        )
      }
    }
  })
})

describe("the page that states one", () => {
  it("renders it rather than typing it", () => {
    for (const count of SITE_COUNTS) {
      for (const where of count.claimedOn) {
        const found = writtenPages.find((candidate) => candidate.section === where.section && candidate.page === where.page)

        expect(found, `${where.section}/${where.page} is not a written page`).toBeDefined()
        expect(
          found?.source,
          `${where.section}/${where.page} claims ${count.id} and never asks for ${count.rendered}`
        ).toContain(count.rendered)
      }
    }
  })
})

/**
 * What the sweep is actually looking at.
 *
 * This is the block that would have been left out, and this lane has the ledger
 * entry to prove it: *a test derived from the list it checks cannot see the
 * list shrink* was filed on 28 September and the subject here is built by
 * walking a directory. Every assertion above is about what the sweep **finds**,
 * and all of them stay green when it stops looking — a `moduleFiles()` that
 * returns nothing sweeps nothing and reports no defects.
 *
 * So the subject is held from below: a floor on each half, a file from each
 * place one could be dropped, and two canaries whose only home is one half or
 * the other.
 */
describe("the sweep's subject", () => {
  it("reads every written page", () => {
    expect(writtenPages.length).toBe(writtenDocsSections.flatMap((section) => docsPagesIn(section)).length)
    expect(writtenPages.length).toBeGreaterThan(15)

    for (const page of writtenPages) expect(page.source.length, `${page.section}/${page.page}`).toBeGreaterThan(500)
  })

  it("reads this route group's own modules, from each place one lives", () => {
    const paths = moduleFiles().map((path) => path.slice(path.indexOf("(docs)") + "(docs)/".length))

    expect(paths.length).toBeGreaterThan(40)

    for (const required of [
      "_lib/nav.ts",
      "_lib/examples/catalogue.ts",
      "_lib/policy/knobs.ts",
      "_lib/arrival/route.ts",
      "_components/sidebar.tsx",
    ]) {
      expect(paths, `${required} is not being swept`).toContain(required)
    }
  })

  it("leaves out only tests, generated output and the registry", () => {
    for (const path of moduleFiles()) {
      expect(path, path).not.toMatch(EXCLUDED)
    }

    expect(EXCLUDED.test("app/(docs)/_lib/counts.ts")).toBe(true)
    expect(EXCLUDED.test("app/(docs)/_lib/nav.test.ts")).toBe(true)
    expect(EXCLUDED.test("app/(docs)/_lib/fences/compiled/x.ts")).toBe(true)
  })

  /**
   * And it is reading the words rather than the code around them. One canary
   * per half, each a sentence with exactly one home: a literal regex that
   * matched nothing, or a page reader that read the wrong file, leaves one of
   * these missing while every other test in this file stays green.
   */
  it("has the words in it, from both halves and from all three kinds of literal", () => {
    const everything = readerText.map((subject) => subject.text).join(" ")

    expect(everything, "a page's prose").toContain("Loom is **two packages**")
    expect(everything, "a module's own copy, in double quotes").toContain("The second list you write")

    /**
     * And from a backtick, which is the one kind that matters most and is the
     * easiest to lose: a sentence that *derives* its number is a template
     * literal by necessity, so a reader of literals that skipped backticks
     * would read every hand-typed sentence on this site and none of the fixed
     * ones — green, and blind to exactly the files this unit changed.
     */
    expect(everything, "a module's own copy, in a template literal").toContain("none of them written here")
    expect(everything, "a knob's sentence, in a template literal").toContain("well past anything a page ought to be")
  })
})

describe("everything this site wrote for a reader", () => {
  /**
   * The sweep. A number in front of a counted noun, anywhere on the site.
   *
   * It refuses the **shape**, not the stale value. `ninety-eight primitives` is
   * red because the library has more than that; `ninety-nine primitives` is red
   * too, because it is the same sentence one week earlier and nothing would say
   * so when the hundredth lands — which it did, on the day this shipped.
   */
  it("writes no counted size as a number", () => {
    const exemptAnywhere = (where: string, phrase: string): boolean =>
      COUNT_EXEMPTIONS.some(
        (allowed) =>
          where === `${allowed.section}/${allowed.page}` && allowed.phrase.toLowerCase() === phrase.toLowerCase()
      )

    const typed: string[] = []

    for (const subject of readerText) {
      for (const count of SITE_COUNTS) {
        for (const hit of subject.text.matchAll(countPhrasePattern(count.nouns))) {
          const phrase = hit[0].replace(/\s+/g, " ")

          if (exemptAnywhere(subject.where, phrase)) continue

          typed.push(`${subject.where}: "${phrase}" — produce it from ${count.id}`)
        }
      }
    }

    expect(typed, typed.join("\n")).toEqual([])
  })
})

describe("an exemption", () => {
  it("names a written page", () => {
    for (const allowed of COUNT_EXEMPTIONS) {
      expect(
        writtenPages.some((page) => page.section === allowed.section && page.page === allowed.page),
        `${allowed.section}/${allowed.page}`
      ).toBe(true)
    }
  })

  /**
   * And its sentence is still there. An exemption outliving the phrase it was
   * written for is a hole nobody can see: the page that earned it has been
   * rewritten, and the next sentence to use those words inherits a pass that
   * was never argued for it.
   */
  it("is still earning it", () => {
    for (const allowed of COUNT_EXEMPTIONS) {
      const page = writtenPages.find(
        (candidate) => candidate.section === allowed.section && candidate.page === allowed.page
      )

      expect(
        page?.source.toLowerCase().includes(allowed.phrase.toLowerCase()),
        `${allowed.section}/${allowed.page} no longer says "${allowed.phrase}" — the exemption goes with the sentence`
      ).toBe(true)
    }
  })

  it("says why", () => {
    for (const allowed of COUNT_EXEMPTIONS) {
      expect(allowed.because.length, allowed.phrase).toBeGreaterThan(60)
    }
  })

  /**
   * One at a time. A phrase exempted on a page where it never appeared would
   * pass every check above, and would be a standing permission to write it.
   */
  it("is matched by the sweep it is exempt from", () => {
    for (const allowed of COUNT_EXEMPTIONS) {
      const matched = SITE_COUNTS.some((count) => countPhrasePattern(count.nouns).test(allowed.phrase))

      expect(matched, `"${allowed.phrase}" is not a phrase the sweep would have caught`).toBe(true)
    }
  })
})

/**
 * The speller, which is the only thing in this unit that can be wrong in a way
 * nobody notices.
 *
 * Everything else here either reads a length or refuses a pattern. `spellOut`
 * produces the word a reader sees, so an off-by-one in its tens table puts
 * *eighty-nine* where the page should have said *ninety-nine* — correct
 * machinery, wrong sentence, nothing red. The cases below are the boundaries
 * plus every value this site currently states.
 */
describe("spelling a number the way prose spells it", () => {
  it("spells the ones the site is stating today", () => {
    expect(SITE_COUNTS.map((count) => `${count.id}: ${spellOut(count.value)}`)).toEqual([
      "starter-primitives: one hundred and two",
      "palette-slots: seventeen",
      "starter-palettes: twenty-one",
      "policy-settings: fourteen",
      "pricing-band-nodes: forty-four",
      "starter-bands: fifty-two",
    ])
  })

  it("spells each shape of number once", () => {
    const cases: readonly [number, string][] = [
      [0, "zero"],
      [1, "one"],
      [9, "nine"],
      [10, "ten"],
      [13, "thirteen"],
      [19, "nineteen"],
      [20, "twenty"],
      [21, "twenty-one"],
      [30, "thirty"],
      [90, "ninety"],
      [99, "ninety-nine"],
      [100, "one hundred"],
      [101, "one hundred and one"],
      [102, "one hundred and two"],
      [110, "one hundred and ten"],
      [115, "one hundred and fifteen"],
      [120, "one hundred and twenty"],
      [342, "three hundred and forty-two"],
      [999, "nine hundred and ninety-nine"],
    ]

    for (const [value, word] of cases) expect(spellOut(value), String(value)).toBe(word)
  })

  /**
   * And refuses what it cannot spell, rather than handing back a digit. A
   * sentence reading *"the 1004 primitives"* in the middle of spelled prose is
   * the kind of thing that ships; a build that stops is not.
   */
  it("refuses a number it has no words for", () => {
    for (const value of [1000, -1, 1.5, Number.NaN]) {
      expect(() => spellOut(value), String(value)).toThrow(/knows how to spell/)
    }
  })

  /**
   * The spelled form of every count is a phrase the sweep would catch, which is
   * the loop closed: the word this component renders is the word a page is
   * refused for typing.
   */
  it("produces words the sweep would refuse if a page typed them", () => {
    for (const count of SITE_COUNTS) {
      if (count.value < 10) continue

      const phrase = `${spellOut(count.value)} ${count.nouns[0]}`

      expect(countPhrasePattern(count.nouns).test(phrase), phrase).toBe(true)
    }
  })
})
