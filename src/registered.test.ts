import { describe, expect, it } from "vitest"

import { describeRegistered, nearestRegistered, NEAREST_REGISTERED } from "./registered.js"

/**
 * The twenty-one palettes this repository starts from, in the order the starter
 * library registers them — which is the order the sentence used to print and the
 * thing being argued against.
 */
const PALETTES = [
  "minimal",
  "editorial",
  "bold",
  "paper",
  "slate",
  "sage",
  "blush",
  "harbour",
  "citrus",
  "lilac",
  "graphite",
  "clay",
  "linen",
  "midnight",
  "carbon",
  "plum",
  "forest",
  "ember",
  "dusk",
  "obsidian",
  "tide",
] as const

const SOURCES = [
  "catalogue.services",
  "catalogue.products",
  "crm.contacts",
  "billing.invoices",
  "analytics.pageviews",
] as const

describe("ranking the registered ids by how near they are", () => {
  it("puts a misspelling's own id first", () => {
    expect(nearestRegistered("sunsett", ["minimal", "sunset", "slate"])[0]).toBe("sunset")
  })

  it("answers a half-typed name with the id it is the start of", () => {
    expect(nearestRegistered("cat", SOURCES, 2)).toEqual([
      "catalogue.services",
      "catalogue.products",
    ])
  })

  /**
   * The case containment exists for, stated as the comparison that fails without
   * it: `crm.contacts` is the nearer string by edit distance and the wrong answer.
   */
  it("prefers a containing id over a nearer one that shares nothing", () => {
    expect(nearestRegistered("cat", ["crm.contacts", "catalogue.services"], 1)).toEqual([
      "catalogue.services",
    ])
  })

  it("ranks on spelling and claims nothing about meaning", () => {
    expect(nearestRegistered("sunset", PALETTES, 5)).not.toContain("ember")
  })

  it("keeps registration order between ids that are equally near", () => {
    expect(nearestRegistered("zzzz", ["aaaa", "bbbb", "cccc"], 2)).toEqual(["aaaa", "bbbb"])
  })

  it("ignores case on both sides", () => {
    expect(nearestRegistered("EDITORIAL", PALETTES, 1)).toEqual(["editorial"])
  })

  it("returns every id when the registry is shorter than the limit", () => {
    expect(nearestRegistered("x", ["one", "two"], 5)).toHaveLength(2)
  })

  it("never returns more than the limit", () => {
    expect(nearestRegistered("x", PALETTES)).toHaveLength(NEAREST_REGISTERED)
    expect(nearestRegistered("x", PALETTES, 3)).toHaveLength(3)
  })

  it("returns nothing for a limit of zero or less", () => {
    expect(nearestRegistered("x", PALETTES, 0)).toEqual([])
    expect(nearestRegistered("x", PALETTES, -1)).toEqual([])
  })

  /**
   * An id a tree can carry, because `""` satisfies the schema that parses one.
   * There is nothing to be near, so the only non-arbitrary answer is the order
   * they were registered in.
   */
  it("falls back to registration order when nothing was asked for", () => {
    expect(nearestRegistered("", PALETTES, 3)).toEqual(["minimal", "editorial", "bold"])
  })

  it("does not reorder the list it was given", () => {
    const available = [...PALETTES]
    nearestRegistered("tide", available)

    expect(available).toEqual([...PALETTES])
  })
})

describe("the clause a refusal ends on", () => {
  it("says so in a word when nothing is registered", () => {
    expect(describeRegistered("sunset", [])).toBe("none")
  })

  it("prints a registry that fits whole, with no count after it", () => {
    expect(describeRegistered("x", ["one", "two"])).toBe("one, two")
  })

  /**
   * Ranking is how the few are chosen, so a list that chooses nothing keeps the
   * host's own order. Under a rule that ranked unconditionally this would read
   * `slate, bold, minimal`, and the same registry would print differently for
   * every id somebody mistyped.
   */
  it("leaves a whole list in the order it was registered in", () => {
    expect(describeRegistered("slate", ["minimal", "bold", "slate"])).toBe("minimal, bold, slate")
  })

  /**
   * The count is the half that keeps the clause honest. Five ids and nothing else
   * read as the first five somebody registered, and a reader who believed that
   * would go looking for the other sixteen in the wrong place.
   */
  it("says how many a capped list is standing in for", () => {
    const clause = describeRegistered("sunset", PALETTES)

    expect(clause).toContain("(nearest 5 of 21)")
    expect(clause.split(",")).toHaveLength(NEAREST_REGISTERED)
  })

  it("costs 83 characters where the whole list cost 193", () => {
    const whole = `No palette "sunset". Registered: ${PALETTES.join(", ")}.`
    const bounded = `No palette "sunset". Registered: ${describeRegistered("sunset", PALETTES)}.`

    expect(whole.length).toBe(193)
    expect(bounded.length).toBe(83)
  })

  /**
   * One over the cap, and the cap gives way. Eliding a single id costs more
   * characters than printing it — measured on the six sources a lesson
   * registers, where capping at five saved exactly one character and lost a
   * name — so the clause prints all six.
   */
  it("prints a registry one over the cap whole rather than hiding one id", () => {
    const six = [
      "fail.params",
      "fail.answer",
      "fail.threw",
      "fail.unavailable",
      "fail.refused",
      "fine.empty",
    ]

    expect(describeRegistered("nowhere", six)).toBe(six.join(", "))
    expect(describeRegistered("nowhere", six)).not.toContain("nearest")
  })

  it("starts eliding at two over the cap, where it pays", () => {
    const seven = Array.from({ length: 7 }, (_, index) => `source.number-${index}`)

    expect(describeRegistered("source.number-0", seven)).toContain("(nearest 5 of 7)")
  })

  /**
   * The property that matters as a deployment grows: a host with a palette per
   * brand pays the same characters as this repository's starter library.
   */
  it("costs the same at a hundred registered ids as at twenty-one", () => {
    const hundred = Array.from({ length: 100 }, (_, index) => `brand-${index}`)

    expect(describeRegistered("brand-7", hundred)).toBe(
      "brand-7, brand-70, brand-71, brand-72, brand-73 (nearest 5 of 100)"
    )
  })
})
