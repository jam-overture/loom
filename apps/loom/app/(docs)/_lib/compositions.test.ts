import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { buildElement, buildSlot, buildText, sequentialIdFactory } from "@jam-overture/loom"
import {
  COMPOSITION_PARTS,
  compositionById,
  STARTER_COMPOSITIONS,
  STARTER_PRIMITIVES,
} from "@jam-overture/loom/primitives"
import { describe, expect, it } from "vitest"

import { docsExamples } from "./examples/catalogue"
import {
  bandCount,
  bandNodesIn,
  bandParts,
  catalogueTypeCount,
  largestBandPart,
  nodesIn,
  pageBandCount,
  partCount,
  partsWithSeveralDesigns,
  registeredTypeCount,
} from "./compositions"

/**
 * The parts table, against the library rather than against itself.
 *
 * **Every expectation here is derived a second way**, and that is the whole
 * design of the file. On 28 September this site measured what the obvious
 * version of these tests is worth: a check whose expected value comes out of the
 * thing it checks moves when the defect moves and stays green. Dropping a
 * surface from a list made the footer stop offering it and killed no test that
 * read the same list.
 *
 * So nothing below asks `_lib/compositions.ts` what it thinks. The expectations
 * come from `STARTER_COMPOSITIONS` and `COMPOSITION_PARTS` — the library's own
 * two lists — filtered here rather than through the helpers the module under test
 * calls. A row silently missing from the table is the defect these are written
 * to catch, and the totals below are what catch it.
 */

/** Designs of a part, worked out here rather than asked for. */
const designsOf = (part: string): readonly { readonly id: string }[] =>
  STARTER_COMPOSITIONS.filter((composition) => composition.part === part)

const pageSource = (): string =>
  readFileSync(
    fileURLToPath(new URL("../docs/building-with-loom/starting-from-a-band/page.mdx", import.meta.url)),
    "utf8"
  )

describe("counting nodes", () => {
  it("counts a text node as one", () => {
    const ids = sequentialIdFactory("count")

    expect(nodesIn(buildText(ids, "one"))).toBe(1)
  })

  it("counts an element, its slots and everything inside them", () => {
    const ids = sequentialIdFactory("count")

    /* element + slot + heading + text + prose + text */
    const node = buildElement(ids, {
      type: "loom.section",
      children: [
        buildSlot(ids, "heading", [
          buildElement(ids, { type: "loom.heading", props: { level: 2 }, children: [buildText(ids, "Title")] }),
        ]),
        buildElement(ids, { type: "loom.prose", children: [buildText(ids, "A sentence.")] }),
      ],
    })

    expect(nodesIn(node)).toBe(6)
  })
})

describe("the counts the page states", () => {
  it("has something to count, so nothing here passes on an empty library", () => {
    expect(STARTER_COMPOSITIONS.length).toBeGreaterThan(10)
    expect(COMPOSITION_PARTS.length).toBeGreaterThan(10)
  })

  it("is the number of bands the library ships", () => {
    expect(bandCount).toBe(STARTER_COMPOSITIONS.length)
  })

  it("is the number of parts the library names", () => {
    expect(partCount).toBe(COMPOSITION_PARTS.length)
  })

  it("offers one canonical design per part, so a page sequence has no hole in it", () => {
    expect(pageBandCount).toBe(COMPOSITION_PARTS.length)
  })

  it("counts the catalogue's types against everything registered", () => {
    const used = new Set(STARTER_COMPOSITIONS.flatMap((composition) => composition.uses))

    expect(catalogueTypeCount).toBe(used.size)
    expect(registeredTypeCount).toBe(STARTER_PRIMITIVES.length)
    expect(catalogueTypeCount).toBeLessThanOrEqual(registeredTypeCount)
  })
})

describe("the parts table", () => {
  it("names every part the library names, in the library's order", () => {
    expect(bandParts.map((row) => row.part)).toEqual([...COMPOSITION_PARTS])
  })

  it("numbers the positions from one with no gaps", () => {
    expect(bandParts.map((row) => row.position)).toEqual(COMPOSITION_PARTS.map((_part, index) => index + 1))
  })

  /**
   * The row that catches a missing row.
   *
   * Every band is a design of exactly one part, so the designs across the table
   * have to add up to the whole library. Drop a part from the table and the
   * designs it carried go with it and this fails — which the per-row check below
   * cannot do, because a row that is not there is a row nothing iterates.
   */
  it("accounts for every band in the library exactly once", () => {
    const listed = bandParts.flatMap((row) => row.designs.map((design) => design.id))

    expect([...listed].sort()).toEqual([...STARTER_COMPOSITIONS.map((composition) => composition.id)].sort())
  })

  it("gives each part its own designs, canonical first", () => {
    for (const row of bandParts) {
      expect(row.designs.map((design) => design.id), row.part).toEqual(
        designsOf(row.part).map((design) => design.id)
      )
      expect(row.designs[0]?.id, row.part).toBe(row.part)
    }
  })

  it("takes each part's label and promise from its canonical design", () => {
    for (const row of bandParts) {
      const canonical = compositionById(row.part)

      expect(row.label, row.part).toBe(canonical?.label)
      expect(row.promise, row.part).toBe(canonical?.promise)
    }
  })

  it("says how many nodes each canonical design builds, and none of them is one", () => {
    for (const row of bandParts) {
      const canonical = compositionById(row.part)
      const built = canonical?.build(sequentialIdFactory(`check${row.position}`))

      expect(row.nodes, row.part).toBe(built === undefined ? -1 : nodesIn(built))
      expect(row.nodes, row.part).toBeGreaterThan(1)
    }
  })

  it("names the parts with more than one design, and there are some", () => {
    expect(partsWithSeveralDesigns.length).toBeGreaterThan(0)
    expect(partsWithSeveralDesigns.map((row) => row.part)).toEqual(
      COMPOSITION_PARTS.filter((part) => designsOf(part).length > 1)
    )
  })

  it("names the biggest band, measured against every other", () => {
    const biggest = Math.max(...bandParts.map((row) => row.nodes))

    expect(largestBandPart.nodes).toBe(biggest)
  })

  it("answers for one part by name, and refuses one it does not have", () => {
    expect(bandNodesIn("pricing")).toBe(bandParts.find((row) => row.part === "pricing")?.nodes)
    expect(() => bandNodesIn("nonesuch")).toThrow(/not a part of a page/)
  })
})

/**
 * **The page states no number of its own.**
 *
 * This is the rule the module exists to serve, held as a property rather than as
 * a habit. Every count above is a digit that was true the day it was written and
 * will be wrong the week after somebody adds a band — so a page that typed one
 * would be the one kind of staleness nothing on this site can see, because prose
 * does not fail.
 *
 * The forbidden set is **derived from the counts themselves**, so a number this
 * module starts reporting is covered without anybody adding a line. Only counts
 * of ten or more are checked: a single digit appears in a prop, a heading level
 * and a confidence of `1`, and a check that flagged those would be a check people
 * work around.
 */
describe("the page that reads these", () => {
  const counted = [bandCount, partCount, catalogueTypeCount, registeredTypeCount, largestBandPart.nodes, bandNodesIn("pricing")]

  it("asks for each of them through a component", () => {
    expect(pageSource()).toContain("<BandCount")
    expect(pageSource()).toContain("<BandNodes")
    expect(pageSource()).toContain("<BandParts />")
    expect(pageSource()).toContain("<BandDesigns />")
  })

  it("types none of them as a digit", () => {
    for (const count of counted.filter((value) => value >= 10)) {
      expect(pageSource(), `the page writes ${count} out`).not.toMatch(new RegExp(`\\b${count}\\b`))
    }
  })

  /**
   * And not as a word either, which is the spelling this page reached for first.
   * The list is the English for each derived count rather than a set somebody
   * remembered, so it moves with them.
   */
  it("types none of them as a word", () => {
    const tens = ["", "ten", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]
    const units = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"]

    for (const count of counted.filter((value) => value >= 10 && value < 100)) {
      const tensPart = tens[Math.floor(count / 10)] ?? ""
      const unitPart = units[count % 10] ?? ""
      const word = unitPart === "" ? tensPart : `${tensPart}-${unitPart}`

      expect(pageSource().toLowerCase(), `the page says "${word}"`).not.toContain(word)
    }
  })
})

/**
 * **The two examples on the page really are the library's bands.**
 *
 * This is the test a mutation run demanded. The page's whole claim is that the
 * screen below it was built by `@jam-overture/loom-primitives` and not by this
 * repository — and replacing the band in the catalogue with a hand-built tree of
 * the same shape passed every check the site had. It rendered, it had no
 * diagnostics, its id was still referenced by the page, and the caption still
 * said the library built it. Nothing anywhere compared the two.
 *
 * So these do. Both examples build from a deterministic id factory, and the
 * band's nodes are minted before the page root that holds them — arguments are
 * evaluated first — so building the same bands from a fresh factory of the same
 * name gives back a subtree that is equal node for node, ids included. A drifting
 * band is a red test; a hand-substituted one is a red test; a band whose ids stop
 * being deterministic is a red test, which matters because the propose-a-change
 * box beside the example addresses nodes by id.
 */
describe("the examples the page shows", () => {
  const bandsUnder = (exampleId: string, namespace: string, parts: readonly string[]): void => {
    const example = docsExamples.get(exampleId)

    expect(example, exampleId).toBeDefined()

    const root = example?.build().root

    expect(root?.kind).toBe("element")

    const ids = sequentialIdFactory(namespace)
    const expected = parts.map((part) => compositionById(part)?.build(ids))

    expect(expected.every((node) => node !== undefined), parts.join(", ")).toBe(true)
    expect(root?.kind === "element" ? root.children : []).toEqual(expected)
  }

  it("shows one band, built by the library", () => {
    bandsUnder("a-band-dropped-in-whole", "bandwhole", ["pricing"])
  })

  it("shows three bands, in the order the page sequence puts them", () => {
    bandsUnder("a-page-that-started-from-bands", "frombands", ["hero", "features", "cta"])
  })

  it("names the parts it shows in the order the library does", () => {
    const shown = ["hero", "features", "cta"]

    expect(shown).toEqual(COMPOSITION_PARTS.filter((part) => shown.includes(part)))
  })
})
