import { describe, expect, it } from "vitest"

import type { JsonObject } from "../json.js"
import { nodeId, primitiveType, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import { pageReadingOf, readingProgressOf, type PartDeclarations, type ReaderTally } from "./index.js"

/**
 * Built on the reading rather than on counters, because that is what the
 * function takes: a tree and a window's rows go in one end, a page's falls come
 * out of the other, and nothing in between reaches a store or a browser.
 */

const element = (
  name: string,
  type: string,
  props: JsonObject = {},
  children: readonly LoomNode[] = []
): ElementNode => ({
  kind: "element",
  id: nodeId(name),
  type: primitiveType(type),
  props,
  children,
})

const treeOf = (root: ElementNode, revision = 1): LoomTree => ({
  treeId: TREE,
  schemaVersion: TREE_SCHEMA_VERSION,
  revision,
  root,
})

const NOTHING_DECLARED: PartDeclarations = {
  copyFor: () => undefined,
  typesWithRole: () => [],
}

const tally = (name: string, counters: Partial<ReaderTally> = {}): ReaderTally => ({
  treeId: TREE,
  revision: 1,
  nodeId: nodeId(name),
  type: primitiveType("loom.section"),
  views: 0,
  reached: 0,
  engaged: 0,
  dwellMs: 0,
  activations: 0,
  opens: 0,
  closes: 0,
  completions: 0,
  ...counters,
})

/** Five bands under one root, which is the page the question was asked about. */
const PAGE = element("page", "loom.stack", {}, [
  element("one", "loom.section"),
  element("two", "loom.section"),
  element("three", "loom.section"),
  element("four", "loom.section"),
  element("five", "loom.section"),
])

const progressOf = (tree: LoomTree, counters: readonly ReaderTally[]) =>
  readingProgressOf(pageReadingOf(tree, counters, NOTHING_DECLARED))

/** A reader who got to band four and left: the sentence the module exists for. */
const LEAVING_AT_FIVE: readonly ReaderTally[] = [
  tally("page", { views: 100, reached: 100 }),
  tally("one", { views: 100, reached: 100 }),
  tally("two", { views: 96, reached: 96 }),
  tally("three", { views: 90, reached: 90 }),
  tally("four", { views: 84, reached: 84 }),
  tally("five", { views: 12, reached: 12 }),
]

const runFor = (progress: ReturnType<typeof readingProgressOf>, parent: string) =>
  progress.runs.find((run) => run.parentId === nodeId(parent))

describe("readingProgressOf", () => {
  it("names the pair a page loses most of its readers between", () => {
    const progress = progressOf(treeOf(PAGE), LEAVING_AT_FIVE)

    expect(progress.steepest).toMatchObject({
      after: nodeId("four"),
      before: nodeId("five"),
      reached: 84,
      lost: 72,
    })
    expect(progress.steepest?.share).toBeCloseTo(72 / 84)
  })

  it("reports every fall in the run, in reading order", () => {
    const run = runFor(progressOf(treeOf(PAGE), LEAVING_AT_FIVE), "page")

    expect(run?.stops.map((stop) => [stop.after, stop.before, stop.lost])).toEqual([
      [nodeId("one"), nodeId("two"), 4],
      [nodeId("two"), nodeId("three"), 6],
      [nodeId("three"), nodeId("four"), 6],
      [nodeId("four"), nodeId("five"), 72],
    ])
  })

  it("says how far down the page any reader got", () => {
    const run = runFor(progressOf(treeOf(PAGE), LEAVING_AT_FIVE), "page")

    expect(run?.furthest).toEqual(nodeId("five"))
  })

  it("names the last part anybody reached when the rest of the page reported nothing", () => {
    const run = runFor(
      progressOf(treeOf(PAGE), [
        tally("page", { views: 10, reached: 10 }),
        tally("one", { views: 10, reached: 10 }),
        tally("two", { views: 4, reached: 4 }),
      ]),
      "page"
    )

    expect(run?.furthest).toEqual(nodeId("two"))
    expect(run?.stops.at(-1)).toMatchObject({ after: nodeId("two"), before: nodeId("three"), lost: 4, share: 1 })
  })

  /**
   * The denominator is the part they reached, never the page's views and never
   * the page views counted at the door. Both ends of this ratio are `reached`
   * counts off the same rows, which is what makes it survive the over-count the
   * counts themselves carry (0147, 0219).
   */
  it("divides the readers lost by the readers who reached the part before", () => {
    const [stop] = runFor(
      progressOf(treeOf(PAGE), [
        tally("page", { views: 80, reached: 80 }),
        tally("one", { views: 40, reached: 40 }),
        tally("two", { views: 10, reached: 10 }),
      ]),
      "page"
    )?.stops ?? []

    expect(stop).toMatchObject({ reached: 40, lost: 30 })
    expect(stop?.share).toBeCloseTo(0.75)
  })

  describe("what cannot anchor a stop", () => {
    /**
     * A band a press was delegated to that no `viewed` ever named. Its `reached`
     * is 0 and a reader plainly had it in front of them, so a cliff drawn on it
     * is a cliff nobody fell off.
     */
    it("passes over a part that reported something other than a view", () => {
      const run = runFor(
        progressOf(treeOf(PAGE), [
          tally("page", { views: 50, reached: 50 }),
          tally("one", { views: 50, reached: 50 }),
          tally("two", { views: 3, reached: 0, engaged: 3 }),
          tally("three", { views: 40, reached: 40 }),
        ]),
        "page"
      )

      expect(run?.stops.map((stop) => [stop.after, stop.before])).toEqual([
        [nodeId("one"), nodeId("three")],
        [nodeId("three"), nodeId("four")],
      ])
      expect(run?.steps.find((step) => step.nodeId === nodeId("two"))).toMatchObject({
        standing: "unknown",
        reached: 0,
        anchors: false,
      })
    })

    it("counts the parts it passed over, where a reading can see them", () => {
      const progress = progressOf(treeOf(PAGE), [
        tally("page", { views: 50, reached: 50 }),
        tally("one", { views: 50, reached: 50 }),
        tally("two", { views: 3, reached: 0, engaged: 3 }),
      ])

      expect(progress.unanchored).toEqual([nodeId("two")])
    })

    /** A part with no row at all is a statement — nobody got here — and anchors. */
    it("treats a part nothing reported as reached by nobody", () => {
      const run = runFor(
        progressOf(treeOf(PAGE), [
          tally("page", { views: 9, reached: 9 }),
          tally("one", { views: 9, reached: 9 }),
        ]),
        "page"
      )

      expect(run?.steps.find((step) => step.nodeId === nodeId("two"))).toMatchObject({
        standing: "skipped",
        reached: 0,
        anchors: true,
      })
      expect(run?.stops).toHaveLength(1)
    })
  })

  describe("a window with nothing in it", () => {
    /**
     * The refusal `unknown` already makes one level down, made once here. A
     * reading with no views would otherwise be a page of runs whose every part
     * looks abandoned, which is a statement about readers who were not there.
     */
    it("answers nothing about a revision no view reported", () => {
      const progress = progressOf(treeOf(PAGE), [])

      expect(progress).toMatchObject({ views: 0, runs: [], steepest: null, unanchored: [], gained: 0 })
    })

    it("carries the tree and revision of the reading it was handed", () => {
      const progress = progressOf(treeOf(PAGE, 7), [])

      expect(progress).toMatchObject({ treeId: TREE, revision: 7 })
    })

    it("reports no steepest fall for a page every reader read to the end", () => {
      const progress = progressOf(treeOf(PAGE), [
        tally("page", { views: 5, reached: 5 }),
        tally("one", { views: 5, reached: 5 }),
        tally("two", { views: 5, reached: 5 }),
        tally("three", { views: 5, reached: 5 }),
        tally("four", { views: 5, reached: 5 }),
        tally("five", { views: 5, reached: 5 }),
      ])

      expect(progress.steepest).toBeNull()
      expect(runFor(progress, "page")?.stops).toEqual([])
    })
  })

  describe("runs", () => {
    /** Nesting, which is the reason a page-wide sequence of `reached` is not a curve. */
    const NESTED = element("page", "loom.stack", {}, [
      element("first", "loom.section", {}, [
        element("inside", "loom.heading"),
        element("deeper", "loom.button"),
      ]),
      element("second", "loom.section"),
    ])

    /**
     * The double-count case for this module. A part deep inside the first band
     * is reached by fewer readers than the second band, and in reading order it
     * comes first — so a page-wide comparison reads it as a fall and then as a
     * rise, and the same reader's progress is counted at two depths.
     */
    it("compares a part against its siblings and never against its cousins", () => {
      const progress = progressOf(treeOf(NESTED), [
        tally("page", { views: 100, reached: 100 }),
        tally("first", { views: 100, reached: 100 }),
        tally("inside", { views: 90, reached: 90 }),
        tally("deeper", { views: 20, reached: 20 }),
        tally("second", { views: 80, reached: 80 }),
      ])

      expect(runFor(progress, "page")?.stops).toEqual([
        { after: nodeId("first"), before: nodeId("second"), reached: 100, lost: 20, share: 0.2 },
      ])
      expect(runFor(progress, "first")?.stops).toEqual([
        { after: nodeId("inside"), before: nodeId("deeper"), reached: 90, lost: 70, share: 70 / 90 },
      ])
      expect(progress.gained).toBe(0)
    })

    it("makes every part a step in at most one run", () => {
      const progress = progressOf(treeOf(NESTED), [
        tally("page", { views: 10, reached: 10 }),
        tally("first", { views: 10, reached: 10 }),
      ])

      const seen = progress.runs.flatMap((run) => run.steps.map((step) => step.nodeId))

      expect(seen).toEqual([...new Set(seen)])
      expect(seen).not.toContain(nodeId("page"))
    })

    /** A stop is between two parts, so a parent with one child has nowhere for one. */
    it("leaves out a run of one, and keeps the runs that have a pair", () => {
      const wrapped = element("page", "loom.stack", {}, [
        element("only", "loom.section", {}, [element("alone", "loom.heading")]),
        element("other", "loom.section"),
      ])

      const progress = progressOf(treeOf(wrapped), [
        tally("page", { views: 4, reached: 4 }),
        tally("only", { views: 4, reached: 4 }),
      ])

      expect(progress.runs.map((run) => run.parentId)).toEqual([nodeId("page")])
    })

    it("carries the depth of the steps rather than of the parent", () => {
      const progress = progressOf(treeOf(NESTED), [
        tally("page", { views: 10, reached: 10 }),
        tally("first", { views: 10, reached: 10 }),
        tally("inside", { views: 8, reached: 8 }),
        tally("deeper", { views: 2, reached: 2 }),
      ])

      expect(runFor(progress, "page")?.depth).toBe(1)
      expect(runFor(progress, "first")?.depth).toBe(2)
    })
  })

  describe("a rise, which scrolling cannot produce", () => {
    const ARRIVING_LOW: readonly ReaderTally[] = [
      tally("page", { views: 60, reached: 60 }),
      tally("one", { views: 20, reached: 20 }),
      tally("two", { views: 50, reached: 50 }),
      tally("three", { views: 30, reached: 30 }),
    ]

    it("reports a later part more readers reached as a rise and not as a negative fall", () => {
      const run = runFor(progressOf(treeOf(PAGE), ARRIVING_LOW), "page")

      expect(run?.gained).toBe(1)
      expect(run?.stops.every((stop) => stop.lost > 0)).toBe(true)
    })

    it("adds the rises of every run into the page's own count", () => {
      expect(progressOf(treeOf(PAGE), ARRIVING_LOW).gained).toBe(1)
    })
  })

  describe("ranking the steepest", () => {
    /**
     * By readers lost rather than by the share of them, because *where does this
     * page lose readers* is a question about readers. A deep run's parts have
     * fewer readers to lose, so ranking by share puts the smallest band on the
     * page at the top of every screen for ever.
     */
    it("prefers the fall that lost more readers over the one that lost a larger share", () => {
      const progress = progressOf(treeOf(PAGE), [
        tally("page", { views: 100, reached: 100 }),
        tally("one", { views: 100, reached: 100 }),
        tally("two", { views: 60, reached: 60 }),
        tally("three", { views: 4, reached: 4 }),
        tally("four", { views: 4, reached: 4 }),
      ])

      expect(progress.steepest).toMatchObject({ after: nodeId("two"), before: nodeId("three"), lost: 56 })
    })

    it("prefers the larger share when two falls lost the same readers", () => {
      const progress = progressOf(treeOf(PAGE), [
        tally("page", { views: 100, reached: 100 }),
        tally("one", { views: 100, reached: 100 }),
        tally("two", { views: 50, reached: 50 }),
      ])

      expect(progress.steepest).toMatchObject({
        after: nodeId("two"),
        before: nodeId("three"),
        lost: 50,
        share: 1,
      })
    })

    /**
     * Two runs with the same fall in them, which is the only way two can be
     * identical: an equal `lost` and an equal `share` need an equal denominator
     * too, and one run cannot fall to the same number twice without rising in
     * between.
     */
    it("keeps the first in reading order when two falls are identical", () => {
      const twins = element("page", "loom.stack", {}, [
        element("left", "loom.section", {}, [
          element("lx", "loom.heading"),
          element("ly", "loom.heading"),
        ]),
        element("right", "loom.section", {}, [
          element("rx", "loom.heading"),
          element("ry", "loom.heading"),
        ]),
      ])

      const progress = progressOf(treeOf(twins), [
        tally("page", { views: 40, reached: 40 }),
        tally("left", { views: 40, reached: 40 }),
        tally("lx", { views: 40, reached: 40 }),
        tally("ly", { views: 20, reached: 20 }),
        tally("right", { views: 40, reached: 40 }),
        tally("rx", { views: 40, reached: 40 }),
        tally("ry", { views: 20, reached: 20 }),
      ])

      expect(runFor(progress, "right")?.stops).toEqual([
        { after: nodeId("rx"), before: nodeId("ry"), reached: 40, lost: 20, share: 0.5 },
      ])
      expect(progress.steepest).toMatchObject({ after: nodeId("lx"), before: nodeId("ly"), lost: 20 })
    })
  })

  /**
   * The rows of another revision are the mistake that makes *before versus after
   * a change* unreadable, and the reading already filters them — so this is here
   * to say that the filtering is upstream and this module does not undo it.
   */
  it("reads nothing into a revision whose counters were filed under another", () => {
    const tree = treeOf(PAGE, 2)
    const progress = readingProgressOf(
      pageReadingOf(tree, LEAVING_AT_FIVE, NOTHING_DECLARED)
    )

    expect(progress).toMatchObject({ revision: 2, views: 0, runs: [], steepest: null })
  })
})
