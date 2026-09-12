import { describe, expect, it } from "vitest"

import { RUNTIME_WORDS, readsPlainly, runtimeWordsIn } from "./plain-language"

/**
 * The guard, guarded.
 *
 * A detector that has quietly stopped matching passes for ever and reports
 * nothing, which is worse than one that fails — this lane disarmed a demo guard
 * exactly that way on 8 September by renaming the thing it looked for. Three
 * test files now lean on this one, so the cost of it silently matching nothing
 * is three screens' worth of rule and no failure anywhere.
 */
describe("runtimeWordsIn", () => {
  it("finds a runtime word wherever it sits in a sentence", () => {
    expect(runtimeWordsIn("Folding the seed reproduces the snapshot.")).toEqual([
      "folding",
      "seed",
      "snapshot",
    ])
  })

  it("finds one at the start of a sentence, capitalised", () => {
    expect(runtimeWordsIn("Revision 4 no longer applies.")).toEqual(["revision"])
  })

  it("says a plain sentence is plain", () => {
    expect(runtimeWordsIn("Deletes the card “Autumn arrivals” and the 3 pieces inside it.")).toEqual(
      []
    )
  })

  /**
   * The half a stemming rule would get wrong, and the reason the list is
   * written out. `proposal` is the portal's own word for the thing this whole
   * surface is about; a `prop` rule that caught it would ban the subject of
   * every screen.
   */
  it("does not find a word inside a longer one", () => {
    expect(runtimeWordsIn("A proposal about the treatment of a heading, unlogged.")).toEqual([])
  })

  /** Punctuation and quotation marks are not letters, and must not hide a word. */
  it("finds one against a quote mark, a full stop and a bracket", () => {
    expect(runtimeWordsIn("“tree”, (node).")).toEqual(["node", "tree"])
  })

  it("lets a caller keep a word the portal has made its own", () => {
    expect(runtimeWordsIn("Revision 4 replaced revision 3.", ["revision"])).toEqual([])
    expect(readsPlainly("Revision 4 was folded from the seed.", ["revision"])).toBe(false)
  })

  /**
   * The list is the rule. If it were ever emptied — a bad merge, a refactor that
   * moved the words somewhere else — every assertion leaning on this module
   * would pass over nothing and report green.
   */
  it("holds enough words for an empty list to be noticed", () => {
    expect(RUNTIME_WORDS.length).toBeGreaterThan(15)
    expect(RUNTIME_WORDS).toContain("delta")
  })
})
