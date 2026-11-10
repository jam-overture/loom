import { readFileSync } from "node:fs"
import { sequentialIdFactory, type ElementNode, type LoomNode } from "@jam-overture/loom"
import { catalogueOf } from "@jam-overture/loom/sdk"
import { PAGE_SEQUENCE, STARTER_COMPOSITIONS } from "@jam-overture/loom/primitives"
import { describe, expect, it } from "vitest"

import { READY_MADE_ANCHOR } from "./bands"
import {
  PARTS_ON_THAT_PAGE,
  readyMadeBand,
  SECTIONS_ALREADY_BUILT,
  SECTIONS_OF_A_PAGE,
} from "./ready"
import { siteRegistry } from "./registry"
import { readerCopy } from "./words"

/**
 * The band that says the sections come built, and the three figures in it.
 *
 * **The figures are the subject.** Everything else the band says is a sentence
 * about them, so the only way it can be wrong is by printing a number that has
 * stopped being true — and all three move when another lane publishes a
 * ready-made section, which is a run with no reason to open this file.
 *
 * So the cases are in two halves: the figures against the library, and the
 * **spelling** of the figures against this file's own source. The second half
 * is the one that matters over time and it is the shape `facts.test.ts`
 * arrived at the hard way — a test that compares a printed number against the
 * library is a real comparison and is therefore green the moment somebody
 * pastes today's value in, which is how `FACTS.primitives` stayed a literal
 * for two months while its check looked like a derivation.
 */

const SOURCE = readFileSync(new URL("./ready.ts", import.meta.url), "utf8")

const band = (): ElementNode => {
  const node = readyMadeBand(sequentialIdFactory("ready"))

  if (node.kind !== "element") throw new Error("the band is not an element")

  return node
}

const nodesOf = (node: LoomNode): readonly LoomNode[] =>
  node.kind === "text" ? [node] : [node, ...node.children.flatMap(nodesOf)]

const typesIn = (node: LoomNode): readonly string[] =>
  nodesOf(node).flatMap((child) => (child.kind === "element" ? [child.type] : []))

const wordsOfBand = (): string =>
  readerCopy(band())
    .map((string) => string.text)
    .join(" ")

describe("the sections that come ready built", () => {
  describe("the three figures, against the library", () => {
    it("counts every ready-made section the starter library carries", () => {
      expect(SECTIONS_ALREADY_BUILT).toBe(STARTER_COMPOSITIONS.length)
    })

    it("counts the sections of a page as the library's own page sequence", () => {
      expect(SECTIONS_OF_A_PAGE).toBe(PAGE_SEQUENCE.length)
    })

    /**
     * Counted by building the page, because that is the only honest way to say
     * how big a thing twenty-two pure functions assemble. Slots are left out,
     * so the figure is comparable with the badges one band above.
     */
    it("counts the parts of that page by building it", () => {
      const parts = PAGE_SEQUENCE.flatMap((composition) =>
        typesIn(composition.build(sequentialIdFactory("again")))
      )

      expect(PARTS_ON_THAT_PAGE).toBe(parts.length)
    })

    /**
     * The sentence beside these figures makes a claim about a **ratio**, and a
     * reader takes the point from its size. A page whose parts and sections
     * were within a few of each other would leave the claim true and pointless.
     */
    it("is a page of many more parts than sections, which is the band's whole point", () => {
      expect(PARTS_ON_THAT_PAGE / SECTIONS_OF_A_PAGE).toBeGreaterThan(5)
      expect(SECTIONS_ALREADY_BUILT).toBeGreaterThan(SECTIONS_OF_A_PAGE)
    })

    it("prints all three, and nothing the library cannot account for", () => {
      const printed = [...wordsOfBand().matchAll(/\d+/g)].map((match) => Number(match[0]))

      expect([...new Set(printed)].sort((left, right) => left - right)).toEqual(
        [SECTIONS_OF_A_PAGE, SECTIONS_ALREADY_BUILT, PARTS_ON_THAT_PAGE].sort(
          (left, right) => left - right
        )
      )
    })
  })

  /**
   * And none of the three is a digit in this file.
   */
  describe("the spelling of them, against this file", () => {
    it.each([
      ["SECTIONS_ALREADY_BUILT", "STARTER_COMPOSITIONS"],
      ["SECTIONS_OF_A_PAGE", "PAGE_SEQUENCE"],
      ["PARTS_ON_THAT_PAGE", "PAGE_SEQUENCE"],
    ])("derives %s from %s rather than writing a number", (name, source) => {
      const assignment = new RegExp(`export const ${name} =([\\s\\S]*?)\\n\\n`).exec(SOURCE)?.[1]

      expect(assignment, `${name} has no assignment in ready.ts`).toBeDefined()
      expect(assignment).toContain(source)
      expect(assignment).not.toMatch(/=\s*\d/)
    })
  })

  describe("the band itself", () => {
    it("declares the anchor a report and a shot list reach it by", () => {
      expect(band().props["anchor"]).toBe(READY_MADE_ANCHOR)
    })

    /**
     * §4d, and the rule
     * [0067](../../../../../decisions/0067-the-four-surfaces-are-one-application.md)
     * states: this surface composes registered primitives and may not grow a
     * component library of its own. A band reaching for a type the registry
     * does not hold renders nothing and says nothing about it.
     */
    it("is built from types the registry this site renders with holds", () => {
      const registered = new Set<string>(catalogueOf(siteRegistry).map(({ type }) => String(type)))
      const unknown = [...new Set(typesIn(band()))].filter((type) => !registered.has(String(type)))

      expect(unknown).toEqual([])
    })

    /**
     * **The figures are the band**, so a run that rewrote it into prose would
     * be making a claim about quantity without the quantity — which is the
     * thing `facts` on the front door exists to refuse.
     */
    it("says it with figures counted from the library rather than in a sentence", () => {
      const types = typesIn(band())

      expect(types.filter((type) => type === "loom.stat")).toHaveLength(3)
      expect(types).toContain("loom.stat-grid")
    })

    it("sends nobody anywhere, because a ready-made section is not a destination", () => {
      const hrefs = nodesOf(band()).flatMap((node) =>
        node.kind === "element" && typeof node.props["href"] === "string" ? [node.props["href"]] : []
      )

      expect(hrefs).toEqual([])
    })

    /**
     * **The one word this band may not say**, and the reason it says none of
     * the twenty-two section names.
     *
     * `voice.test.ts` sweeps every page for a price or a plan and holds the
     * maintainer's instruction of 27 September. It is swept there, over the
     * whole site; this is the same rule held at the point the band is written,
     * so a run that comes back to add the table of section names fails in the
     * file whose comment explains why it cannot — rather than in a sweep three
     * directories away that names a page.
     */
    it("names no section, because one of them is the word he took off the site", () => {
      expect(wordsOfBand().toLowerCase()).not.toContain("pricing")
      expect(STARTER_COMPOSITIONS.map(({ label }) => label)).toContain("Pricing")
    })

    /**
     * No sentence of it ends in a comma and a clause that adds no fact, which
     * is the shape `docs/positioning.md` records the maintainer banning, and
     * none runs past the thirty-word ceiling `voice.test.ts` holds the site to.
     */
    it("says nothing in the register the maintainer banned", () => {
      for (const { text } of readerCopy(band())) {
        expect(text, text).not.toMatch(/,\s+\w+(\s+\w+){0,4}$/)

        for (const sentence of text.split(/(?<=[.?!])\s+/)) {
          expect(sentence.split(/\s+/).length, sentence).toBeLessThanOrEqual(30)
        }
      }
    })

    it("names no colour of its own", () => {
      expect(JSON.stringify(band())).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i)
    })
  })
})
