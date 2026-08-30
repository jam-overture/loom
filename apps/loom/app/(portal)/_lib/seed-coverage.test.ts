import { describe, expect, it } from "vitest"

import {
  buildElement,
  buildText,
  createTree,
  outlineTree,
  sequentialIdFactory,
  type LoomTree,
} from "@loom/runtime"

import { coverageOf, readCoverage } from "./seed-coverage"

/**
 * A page of prose lines over one id space, so a tree derived from the seed
 * shares its ids — which is the condition `compareTrees` needs to be a
 * comparison of two states of one node rather than a structural guess (0003).
 *
 * Derived trees are built by rewriting the seed's own children, the way
 * `audit-view.test.ts` builds its drifted pair. A delta would be the honest
 * route to a served tree and is the wrong tool here: `coverageOf` takes two
 * trees and has no opinion about how the second one came about, so plumbing a
 * delta through would test `applyDelta` and cost every fixture a `Result`
 * unwrap.
 */
const pageOf = (labels: readonly string[]): LoomTree => {
  const ids = sequentialIdFactory("cov")

  return createTree(
    buildElement(ids, {
      type: "loom.prose",
      children: labels.map((label) =>
        buildElement(ids, { type: "loom.prose", children: [buildText(ids, label)] })
      ),
    }),
    ids
  )
}

/** The same page with its leading children dropped, ids otherwise untouched. */
const without = (tree: LoomTree, count: number): LoomTree => ({
  ...tree,
  root: { ...tree.root, children: tree.root.children.slice(count) },
})

describe("coverageOf", () => {
  it("counts every part of the seed, the root among them", () => {
    /* root + 2 prose + 2 text. */
    const seed = pageOf(["one", "two"])

    expect(outlineTree(seed.root)).toHaveLength(5)
    expect(coverageOf(seed, seed)).toEqual({ started: 5, checked: 5, dropped: 0 })
  })

  it("counts a part removed since as one the checkup could not compare", () => {
    const seed = pageOf(["one", "two"])

    /* The prose node and the text inside it both leave. */
    expect(coverageOf(seed, without(seed, 1))).toEqual({ started: 5, checked: 3, dropped: 2 })
  })

  it("counts nothing as checked when the whole page has been rebuilt", () => {
    const seed = pageOf(["one", "two"])

    expect(coverageOf(seed, without(seed, 2))).toEqual({ started: 5, checked: 1, dropped: 4 })
  })

  it("does not count a part that merely changed as one it could not compare", () => {
    const seed = pageOf(["one"])
    const louder: LoomTree = {
      ...seed,
      root: { ...seed.root, props: { tone: "loud" } },
    }

    expect(coverageOf(seed, louder).dropped).toBe(0)
  })

  it("does not count a part added since as one the page started with", () => {
    const seed = pageOf(["one"])
    const ids = sequentialIdFactory("later")
    const grown: LoomTree = {
      ...seed,
      root: {
        ...seed.root,
        children: [
          ...seed.root.children,
          buildElement(ids, { type: "loom.prose", children: [buildText(ids, "new")] }),
        ],
      },
    }

    expect(coverageOf(seed, grown)).toEqual({ started: 3, checked: 3, dropped: 0 })
  })

  /**
   * The finding, executed. `Loom lessons` filed this on 25 August as Exercise D
   * of lesson 16, and it is the reason this module exists: a seed that is wrong
   * about a part, and a later change that removes that part, is a checkup that
   * agrees over evidence that is gone.
   *
   * `auditSnapshot` is not run here and does not need to be — its behaviour is
   * the runtime's and is already covered there. What is asserted is the property
   * that makes its silence *reportable*, which is the half the portal owns: the
   * part the seed was wrong about is no longer in the served tree, so nothing
   * compared it, and coverage is the only thing on the screen that says so.
   */
  it("reports the part a later removal put out of the checkup's reach", () => {
    const seed = pageOf(["the line the seed is wrong about", "another"])
    const coverage = coverageOf(seed, without(seed, 1))

    expect(coverage.dropped).toBeGreaterThan(0)
    expect(coverage.checked).toBeLessThan(coverage.started)
    expect(readCoverage(coverage)).toContain("cannot vouch for")
  })
})

describe("readCoverage", () => {
  it("says the whole starting shape was checked when nothing has gone", () => {
    expect(readCoverage({ started: 12, checked: 12, dropped: 0 })).toBe(
      "All 12 parts this page started with are still on it, and every one was checked."
    )
  })

  it("reads as a sentence at one part", () => {
    expect(readCoverage({ started: 1, checked: 1, dropped: 0 })).toBe(
      "The one part this page started with is still on it, and it was checked."
    )
  })

  it("names what it cannot vouch for, in the singular", () => {
    expect(readCoverage({ started: 12, checked: 11, dropped: 1 })).toBe(
      "1 part of the 12 this page started with has been removed since. That one is the part this check cannot vouch for: removing something takes away the only thing there was to compare it against."
    )
  })

  it("names what it cannot vouch for, in the plural", () => {
    expect(readCoverage({ started: 12, checked: 9, dropped: 3 })).toBe(
      "3 parts of the 12 this page started with have been removed since. Those are the parts this check cannot vouch for: removing something takes away the only thing there was to compare it against."
    )
  })

  /**
   * The reading is what a person meets, so it is asserted whole rather than by
   * its pieces — the 24 August lesson, which cost this lane three defects that
   * every `toContain` in the file happily passed.
   *
   * The clause this unit removed is the one asserted absent. "Nothing on it is
   * unexplained" was warm, readable, and a claim the audit cannot support; a
   * test that a sentence is *gone* is the only thing that stops it coming back
   * in the next pass that is trying to be friendly.
   */
  it("never claims the page is explained, in any shape", () => {
    const readings = [0, 1, 3, 11].map((dropped) =>
      readCoverage({ started: 12, checked: 12 - dropped, dropped })
    )

    for (const reading of readings) {
      expect(reading).not.toContain("unexplained")
      expect(reading).not.toContain("everything")
      expect(reading.endsWith(".")).toBe(true)
    }
  })

  /** No runtime word reaches a reader who has not asked for one. */
  it("says none of seed, snapshot, fold, node or revision", () => {
    for (const dropped of [0, 1, 4]) {
      const reading = readCoverage({ started: 12, checked: 12 - dropped, dropped }).toLowerCase()

      for (const word of ["seed", "snapshot", "fold", "node", "revision", "tree"]) {
        expect(reading).not.toContain(word)
      }
    }
  })
})
