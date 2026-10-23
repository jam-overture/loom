import { describe, expect, it } from "vitest"

import { apiEntries } from "./api/reference"
import {
  britishNameExamples,
  britishSpellingsIn,
  britishSpellingsInName,
  packageBritishNames,
} from "./spelling"
import { readerPages } from "./voice"

/**
 * The two readers, and the names the exemption is made of.
 *
 * The sweep over the pages is `voice.test.ts`. This is the half about the
 * package: that there really are names spelled the British way, that the site
 * says so, and that the two matchers are not the same read — which is the one
 * thing here that was a defect before it was a test.
 */

describe("the two readers", () => {
  it("reads a British spelling in a sentence and ignores a word that merely contains one", () => {
    expect(britishSpellingsIn("The colours are grey.")).toEqual(["colours", "grey"])
    expect(britishSpellingsIn("A greyhound in the centreboard theatregoing crowd")).toEqual([])
    expect(britishSpellingsIn("The theatre is in the centre of town")).toEqual([
      "theatre",
      "centre",
    ])
  })

  it("reads a British spelling inside an identifier, where a sentence reader cannot", () => {
    expect(britishSpellingsInName("PrimitiveBehaviours")).toEqual(["behaviours"])
    expect(britishSpellingsIn("PrimitiveBehaviours")).toEqual([])
  })

  /**
   * Called twice, on purpose. A `/g` matcher kept between calls carries a
   * `lastIndex`, so the second answer is about an offset the caller never
   * passed, and a sweep over a list of names returns neither the right answer
   * nor the same one twice. Two identical calls returning two identical
   * answers is the whole of that regression.
   */
  it("answers the same question the same way twice", () => {
    const names = ["ThemeCatalogueEntry", "RenderDiagnostic", "colour", "IrreversibilityReason"]

    expect(names.map(britishSpellingsInName)).toEqual(names.map(britishSpellingsInName))
    expect(names.map(britishSpellingsInName)).toEqual([["catalogue"], [], ["colour"], []])
  })

  /**
   * `IrreversibilityReason` is the case that says why an identifier is split
   * into words rather than searched through. Nothing in it is British: *…ty*
   * and *Re…* meet at a word join and spell `tyre`, and a matcher with the
   * boundaries dropped cannot tell that join from a real one.
   * `securityRealm` is the same join in an ordinary name, so the case is a
   * shape rather than one unlucky export.
   */
  it("does not read a British spelling across the join between two words", () => {
    expect(britishSpellingsInName("IrreversibilityReason")).toEqual([])
    expect(britishSpellingsInName("securityRealm")).toEqual([])
    expect(britishSpellingsInName("BEHAVIOUR_NAMES")).toEqual(["behaviour"])
    expect(britishSpellingsInName("catalogueOf")).toEqual(["catalogue"])
  })

  it("finds nothing in text with no British spelling in it", () => {
    expect(britishSpellingsIn("The colors are gray and the behavior is analyzed.")).toEqual([])
  })
})

describe("the names the package spells the British way", () => {
  it("is read off the published surface and is not empty", () => {
    expect(packageBritishNames.length).toBeGreaterThan(20)

    for (const name of packageBritishNames) {
      expect(britishSpellingsInName(name).length, name).toBeGreaterThan(0)
    }
  })

  /**
   * Every one of them is really published, which is the property that makes the
   * exemption safe to have. `publishedNames` is where the list comes from, so
   * this asserts the join rather than the filter: a name in this list that no
   * entry point offers would be an exemption for a word nobody has to type.
   */
  it("names nothing the package does not publish", () => {
    const offered = new Set(
      apiEntries.flatMap((entry) =>
        entry.groups.flatMap((group) => group.symbols.map((symbol) => symbol.name))
      )
    )

    for (const name of packageBritishNames) {
      expect(offered.has(name), name).toBe(true)
    }
  })

  /**
   * The regression test for the boundary bug `spelling.ts` describes under
   * `matcher`. A name with the spelling in the middle of it is invisible to the
   * sentence reader and has to be visible to the name reader, or the exemption
   * this whole rule leans on reads as two names out of seventeen hundred.
   */
  it("is mostly names no sentence reader could see", () => {
    const inside = packageBritishNames.filter((name) => britishSpellingsIn(name).length === 0)

    expect(inside.length).toBeGreaterThan(20)
    expect(inside).toContain("PrimitiveBehaviours")
  })
})

describe("the examples the reference prints", () => {
  it("are real published names, one per spelling, and none of them twice", () => {
    const examples = britishNameExamples()

    expect(examples.length).toBeGreaterThan(2)
    expect(new Set(examples).size).toBe(examples.length)

    for (const name of examples) {
      expect(packageBritishNames, name).toContain(name)
    }

    /* One per word, so the sentence cannot show a reader two names that make
       the same point. `catalogue` and `catalogued` are one word here. */
    const spellings = examples.flatMap((name) => britishSpellingsInName(name))

    expect(new Set(spellings).size).toBe(spellings.length)
    expect(examples.length).toBeLessThan(6)
  })

  /**
   * And the reference's front page really tells a reader, which is the half of
   * this rule that is not enforcement. Checked by what the page says rather
   * than by the component, because what a reader gets is what the page says —
   * and the words come back through the same reader the sweep uses, so a band
   * dropped from the page takes this with it.
   */
  it("are explained on the page a reader meets several of these names on", () => {
    const landing = readerPages().find((page) => page.id === "api-reference")

    expect(landing).toBeDefined()

    const words = (landing?.words ?? "").toLowerCase()

    expect(words).toContain("british")
    expect(words).toContain("us english")
    expect(words).toContain("the spelling is part of the name")
  })
})
