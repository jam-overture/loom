import { describe, expect, it } from "vitest"

import type { JsonObject } from "../json.js"
import { nodeId, OTHER_TREE, primitiveType, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  pageReadingOf,
  readingChangeOf,
  type PartDeclarations,
  type ReaderTally,
  type ReadingChange,
} from "./index.js"

/**
 * Built from two trees and two windows of counters, because that is what the
 * function takes. Nothing here reaches a store, a clock or a browser, and
 * nothing added to a payload is under test because nothing was added to one.
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

const treeOf = (root: ElementNode, revision: number): LoomTree => ({
  treeId: TREE,
  schemaVersion: TREE_SCHEMA_VERSION,
  revision,
  root,
})

const NOTHING_DECLARED: PartDeclarations = {
  copyFor: () => undefined,
  typesWithRole: () => [],
}

/** A library that declares `heading` as the one copy prop, so a rewording is visible. */
const HEADINGS_DECLARED: PartDeclarations = {
  copyFor: () => ["heading"],
  typesWithRole: () => [],
}

const tally = (name: string, revision: number, counters: Partial<ReaderTally>): ReaderTally => ({
  treeId: TREE,
  revision,
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

/** A page of a root and three bands, which is the shape every case below varies. */
const bands = (...names: readonly string[]): ElementNode =>
  element(
    "page",
    "loom.stack",
    {},
    names.map((name) => element(name, "loom.section"))
  )

/** Each name's `reached`, which is also its `views`, so a reading has a floor. */
const reach = (revision: number, counts: Readonly<Record<string, number>>): readonly ReaderTally[] =>
  Object.entries(counts).map(([name, reached]) => tally(name, revision, { views: reached, reached }))

const changeOf = (
  was: { readonly tree: LoomTree; readonly counters: readonly ReaderTally[] },
  now: { readonly tree: LoomTree; readonly counters: readonly ReaderTally[] },
  declarations: PartDeclarations = NOTHING_DECLARED
): ReadingChange =>
  readingChangeOf(
    pageReadingOf(was.tree, was.counters, declarations),
    pageReadingOf(now.tree, now.counters, declarations)
  )

const stopBetween = (change: ReadingChange, after: string, before: string) =>
  change.stops.find((stop) => stop.after === nodeId(after) && stop.before === nodeId(before))

const fateBetween = (change: ReadingChange, after: string, before: string) =>
  change.incomparable.filter(
    (pair) => pair.after === nodeId(after) && pair.before === nodeId(before)
  )

const THREE = bands("one", "two", "three")

/** Six in ten readers left at the third band. */
const BEFORE = {
  tree: treeOf(THREE, 4),
  counters: reach(4, { page: 100, one: 100, two: 100, three: 40 }),
}

/** The same page after a change: four in ten do. */
const AFTER = {
  tree: treeOf(THREE, 5),
  counters: reach(5, { page: 200, one: 200, two: 200, three: 120 }),
}

describe("readingChangeOf", () => {
  describe("the sentence it exists for", () => {
    it("says what share of readers no longer stop at a pair", () => {
      const stop = stopBetween(changeOf(BEFORE, AFTER), "two", "three")

      expect(stop?.was.share).toBeCloseTo(0.6)
      expect(stop?.now.share).toBeCloseTo(0.4)
      expect(stop?.improvement).toBeCloseTo(0.2)
    })

    it("puts the improvement in readers at the volume the page has now", () => {
      expect(stopBetween(changeOf(BEFORE, AFTER), "two", "three")?.readersKept).toBeCloseTo(40)
    })

    it("names the pair the change keeps most readers at", () => {
      expect(changeOf(BEFORE, AFTER).mostKept).toMatchObject({
        after: nodeId("two"),
        before: nodeId("three"),
      })
      expect(changeOf(BEFORE, AFTER).mostLost).toBeNull()
    })

    it("carries both progress readings, so a consumer finds each side's steepest fall", () => {
      const change = changeOf(BEFORE, AFTER)

      expect(change.progress.was.steepest).toMatchObject({ after: nodeId("two"), before: nodeId("three") })
      expect(change.progress.now.steepest).toMatchObject({ after: nodeId("two"), before: nodeId("three") })
      expect(change.revisions).toEqual({ was: 4, now: 5 })
    })

    it("reads an improvement backwards as a loss when the two readings are swapped", () => {
      const change = changeOf(AFTER, BEFORE)

      expect(stopBetween(change, "two", "three")?.improvement).toBeCloseTo(-0.2)
      expect(change.mostKept).toBeNull()
      expect(change.mostLost).toMatchObject({ after: nodeId("two"), before: nodeId("three") })
    })
  })

  describe("shares, never counts", () => {
    /**
     * The defect this whole module is shaped to avoid: twice the traffic and
     * the same reading is not a change, and every absolute count says it is.
     */
    it("reports no change when twice as many readers behaved identically", () => {
      const doubled = {
        tree: treeOf(THREE, 5),
        counters: reach(5, { page: 200, one: 200, two: 200, three: 80 }),
      }
      const change = changeOf(BEFORE, doubled)

      expect(stopBetween(change, "two", "three")?.improvement).toBe(0)
      expect(stopBetween(change, "two", "three")?.beyondOneReader).toBe(false)
      expect(change.mostKept).toBeNull()
      expect(change.mostLost).toBeNull()
    })

    it("reports a change when the same readers behaved differently", () => {
      const fewer = {
        tree: treeOf(THREE, 5),
        counters: reach(5, { page: 100, one: 100, two: 100, three: 70 }),
      }

      expect(stopBetween(changeOf(BEFORE, fewer), "two", "three")?.improvement).toBeCloseTo(0.3)
    })
  })

  describe("two readings, not two revisions", () => {
    /** The same question with the tree held still: this week against last week. */
    it("compares two windows of one revision with nothing added, removed or moved", () => {
      const change = changeOf(
        { tree: treeOf(THREE, 4), counters: reach(4, { page: 100, one: 100, two: 100, three: 40 }) },
        { tree: treeOf(THREE, 4), counters: reach(4, { page: 50, one: 50, two: 50, three: 35 }) }
      )

      expect(change.parts).toMatchObject({ shared: 4, added: [], removed: [], moved: [], reworded: [] })
      expect(change.incomparable).toEqual([])
      expect(change.stops).toHaveLength(2)
      expect(stopBetween(change, "two", "three")?.improvement).toBeCloseTo(0.3)
    })
  })

  describe("a pair the change dissolved", () => {
    it("calls a pair absent when one of its parts is not in the other revision", () => {
      const change = changeOf(BEFORE, {
        tree: treeOf(bands("one", "two"), 5),
        counters: reach(5, { page: 100, one: 100, two: 100 }),
      })

      expect(fateBetween(change, "two", "three")).toEqual([
        expect.objectContaining({ side: "was", fate: "absent", reached: 100 }),
      ])
    })

    it("calls a pair absent when the change added one of its parts", () => {
      const change = changeOf(BEFORE, {
        tree: treeOf(bands("one", "two", "three", "four"), 5),
        counters: reach(5, { page: 100, one: 100, two: 100, three: 40, four: 10 }),
      })

      expect(fateBetween(change, "three", "four")).toEqual([
        expect.objectContaining({ side: "now", fate: "absent" }),
      ])
    })

    /** The commonest change anybody will make, and the one a drop-it-silently reading loses. */
    it("calls a pair separated when something was inserted into the gap readers left at", () => {
      const change = changeOf(BEFORE, {
        tree: treeOf(bands("one", "two", "offer", "three"), 5),
        counters: reach(5, { page: 100, one: 100, two: 100, offer: 90, three: 60 }),
      })

      expect(fateBetween(change, "two", "three")).toEqual([
        expect.objectContaining({ side: "was", fate: "separated", reached: 100, share: 0.6 }),
      ])
      expect(stopBetween(change, "two", "three")).toBeUndefined()
    })

    it("calls a pair moved when its parts are no longer children of one part", () => {
      const change = changeOf(BEFORE, {
        tree: treeOf(
          element("page", "loom.stack", {}, [
            element("one", "loom.section"),
            element("two", "loom.section", {}, [element("three", "loom.section")]),
          ]),
          5
        ),
        counters: reach(5, { page: 100, one: 100, two: 100, three: 40 }),
      })

      expect(fateBetween(change, "two", "three")).toEqual([
        expect.objectContaining({ side: "was", fate: "moved" }),
      ])
      expect(change.parts.moved).toEqual([nodeId("three")])
    })

    it("calls a pair reordered when a move swapped it, and says so from both sides", () => {
      const change = changeOf(BEFORE, {
        tree: treeOf(bands("one", "three", "two"), 5),
        counters: reach(5, { page: 100, one: 100, three: 90, two: 50 }),
      })

      expect(fateBetween(change, "two", "three")).toEqual([
        expect.objectContaining({ side: "was", fate: "reordered" }),
      ])
      expect(fateBetween(change, "three", "two")).toEqual([
        expect.objectContaining({ side: "now", fate: "reordered" }),
      ])
    })

    /** A press delegated to a band no `viewed` named: not zero, unknown (0221). */
    it("calls a pair unanchorable when one end reported something other than a view", () => {
      const change = changeOf(BEFORE, {
        tree: treeOf(THREE, 5),
        counters: [
          ...reach(5, { page: 100, one: 100, two: 100 }),
          tally("three", 5, { views: 0, reached: 0, activations: 7 }),
        ],
      })

      expect(fateBetween(change, "two", "three")).toEqual([
        expect.objectContaining({ side: "was", fate: "unanchorable" }),
      ])
    })

    /**
     * The lie in the direction nobody checks: a share of 0.6 beside a pair
     * nobody reached reads as a fall that was fixed.
     */
    it("refuses to read a pair nobody now reaches as a fall that was fixed", () => {
      const change = changeOf(BEFORE, {
        tree: treeOf(THREE, 5),
        counters: reach(5, { page: 100, one: 100 }),
      })

      expect(fateBetween(change, "two", "three")).toEqual([
        expect.objectContaining({ side: "was", fate: "unreached", reached: 100, share: 0.6 }),
      ])
      expect(stopBetween(change, "two", "three")).toBeUndefined()
    })

    it("files an unreached pair on whichever side somebody reached", () => {
      const change = changeOf(
        { tree: treeOf(THREE, 4), counters: reach(4, { page: 100, one: 100 }) },
        { tree: treeOf(THREE, 5), counters: reach(5, { page: 100, one: 100, two: 100, three: 40 }) }
      )

      expect(fateBetween(change, "two", "three")).toEqual([
        expect.objectContaining({ side: "now", fate: "unreached", reached: 100, share: 0.6 }),
      ])
    })
  })

  describe("what it refuses to compare at all", () => {
    it("answers nothing about two different pages, not even their parts", () => {
      const other: LoomTree = { ...treeOf(THREE, 5), treeId: OTHER_TREE }
      const change = readingChangeOf(
        pageReadingOf(BEFORE.tree, BEFORE.counters, NOTHING_DECLARED),
        pageReadingOf(other, [], NOTHING_DECLARED)
      )

      expect(change.silence).toBe("different-trees")
      expect(change.parts).toMatchObject({ shared: 0, added: [], removed: [] })
      expect(change.stops).toEqual([])
      expect(change.incomparable).toEqual([])
    })

    /** A naive subtraction would report that a page nobody has opened fixed every fall. */
    it("compares no share against a window that held no views, and still says what the change did to the page", () => {
      const change = changeOf(BEFORE, {
        tree: treeOf(bands("one", "two", "three", "four"), 5),
        counters: [],
      })

      expect(change.silence).toBe("nothing-measured")
      expect(change.stops).toEqual([])
      expect(change.mostKept).toBeNull()
      expect(change.parts).toMatchObject({ shared: 4, added: [nodeId("four")], removed: [] })
    })
  })

  describe("one reader's worth", () => {
    it("holds a move smaller than one reader off the headline", () => {
      const change = changeOf(
        { tree: treeOf(THREE, 4), counters: reach(4, { page: 3, one: 3, two: 3, three: 1 }) },
        { tree: treeOf(THREE, 5), counters: reach(5, { page: 2, one: 2, two: 2, three: 1 }) }
      )
      const stop = stopBetween(change, "two", "three")

      expect(stop?.improvement).toBeCloseTo(2 / 3 - 1 / 2)
      expect(stop?.resolution).toBeCloseTo(1 / 2)
      expect(stop?.beyondOneReader).toBe(false)
      expect(change.mostKept).toBeNull()
    })

    it("counts a move of exactly one reader as a move", () => {
      const change = changeOf(
        { tree: treeOf(THREE, 4), counters: reach(4, { page: 10, one: 10, two: 10, three: 5 }) },
        { tree: treeOf(THREE, 5), counters: reach(5, { page: 10, one: 10, two: 10, three: 6 }) }
      )

      expect(stopBetween(change, "two", "three")?.beyondOneReader).toBe(true)
      expect(change.mostKept).toMatchObject({ after: nodeId("two"), before: nodeId("three") })
    })

    it("reports the resolution off whichever side counted fewer readers", () => {
      expect(stopBetween(changeOf(BEFORE, AFTER), "two", "three")?.resolution).toBeCloseTo(1 / 100)
    })
  })

  describe("ranking", () => {
    const FOUR = bands("one", "two", "three", "four")

    /**
     * 0221 ranks a fall by readers lost rather than by share, and a comparison
     * ranks by readers kept for the same reason: a pair three readers out of
     * four stopped at is a worse rate and a smaller problem.
     */
    it("prefers the pair that kept more readers over the one with the larger share", () => {
      const change = changeOf(
        {
          tree: treeOf(FOUR, 4),
          counters: reach(4, { page: 1000, one: 1000, two: 1000, three: 600, four: 4 }),
        },
        {
          tree: treeOf(FOUR, 5),
          counters: reach(5, { page: 1000, one: 1000, two: 1000, three: 800, four: 4 }),
        }
      )

      expect(change.mostKept).toMatchObject({ after: nodeId("two"), before: nodeId("three") })
      expect(change.mostKept?.readersKept).toBeCloseTo(200)
    })

    it("names the pair the change lost most readers at as well as the one it kept them at", () => {
      const change = changeOf(
        {
          tree: treeOf(FOUR, 4),
          counters: reach(4, { page: 100, one: 100, two: 90, three: 80, four: 70 }),
        },
        {
          tree: treeOf(FOUR, 5),
          counters: reach(5, { page: 100, one: 100, two: 99, three: 40, four: 39 }),
        }
      )

      expect(change.mostKept).toMatchObject({ after: nodeId("one"), before: nodeId("two") })
      expect(change.mostLost).toMatchObject({ after: nodeId("two"), before: nodeId("three") })
    })

    /** Two runs, each losing half its readers, each keeping a quarter of them back. */
    const TWO_RUNS = element("page", "loom.stack", {}, [
      element("left", "loom.section", {}, [
        element("a", "loom.section"),
        element("b", "loom.section"),
      ]),
      element("right", "loom.section", {}, [
        element("c", "loom.section"),
        element("d", "loom.section"),
      ]),
    ])

    it("keeps the first in reading order when two pairs kept exactly the same readers", () => {
      const change = changeOf(
        {
          tree: treeOf(TWO_RUNS, 4),
          counters: reach(4, { page: 100, left: 100, right: 100, a: 100, b: 50, c: 100, d: 50 }),
        },
        {
          tree: treeOf(TWO_RUNS, 5),
          counters: reach(5, { page: 100, left: 100, right: 100, a: 100, b: 75, c: 100, d: 75 }),
        }
      )

      expect(stopBetween(change, "a", "b")?.readersKept).toBeCloseTo(25)
      expect(stopBetween(change, "c", "d")?.readersKept).toBeCloseTo(25)
      expect(change.mostKept).toMatchObject({ after: nodeId("a"), before: nodeId("b") })
    })
  })

  describe("what the change did to the page", () => {
    it("counts the parts added, removed, moved and shared", () => {
      const change = changeOf(
        { tree: treeOf(bands("one", "two", "three"), 4), counters: reach(4, { page: 10, one: 10 }) },
        {
          tree: treeOf(
            element("page", "loom.stack", {}, [
              element("one", "loom.section"),
              element("two", "loom.section", {}, [element("three", "loom.section")]),
              element("four", "loom.section"),
            ]),
            5
          ),
          counters: reach(5, { page: 10, one: 10 }),
        }
      )

      expect(change.parts).toMatchObject({
        shared: 4,
        added: [nodeId("four")],
        removed: [],
        moved: [nodeId("three")],
      })
    })

    it("names the parts whose own words are not the words they were", () => {
      const change = changeOf(
        {
          tree: treeOf(
            element("page", "loom.stack", {}, [
              element("one", "loom.section", { heading: "Pricing" }),
              element("two", "loom.section", { heading: "Proof" }),
            ]),
            4
          ),
          counters: reach(4, { page: 10, one: 10 }),
        },
        {
          tree: treeOf(
            element("page", "loom.stack", {}, [
              element("one", "loom.section", { heading: "What it costs" }),
              element("two", "loom.section", { heading: "Proof" }),
            ]),
            5
          ),
          counters: reach(5, { page: 10, one: 10 }),
        },
        HEADINGS_DECLARED
      )

      expect(change.parts.reworded).toEqual([nodeId("one")])
      expect(change.parts.unreadable).toBe(0)
    })

    /** 0122's bargain: *nobody has said* is a different answer from *nothing changed*. */
    it("counts the parts whose words nothing could read rather than calling them unchanged", () => {
      const page = element("page", "loom.stack", {}, [
        element("one", "loom.section", { heading: "Pricing" }),
      ])
      const change = changeOf(
        { tree: treeOf(page, 4), counters: reach(4, { page: 10, one: 10 }) },
        { tree: treeOf(page, 5), counters: reach(5, { page: 10, one: 10 }) }
      )

      expect(change.parts.reworded).toEqual([])
      expect(change.parts.unreadable).toBe(1)
    })
  })

  describe("the double count", () => {
    /**
     * One reader who got past two bands is in both pairs' figures, which is why
     * there is no page-level total of readers kept: adding the stops would
     * report them twice, and the sum would look like the headline.
     */
    it("has no page-level total of the readers a change kept", () => {
      const change = changeOf(
        {
          tree: treeOf(bands("one", "two", "three"), 4),
          counters: reach(4, { page: 100, one: 100, two: 50, three: 25 }),
        },
        {
          tree: treeOf(bands("one", "two", "three"), 5),
          counters: reach(5, { page: 100, one: 100, two: 90, three: 80 }),
        }
      )

      expect(change.stops).toHaveLength(2)
      expect(Object.keys(change)).not.toContain("readersKept")
      expect(change.stops.every((stop) => stop.readersKept > 0)).toBe(true)
    })

    it("reports each pair of siblings exactly once, compared or not", () => {
      const change = changeOf(BEFORE, {
        tree: treeOf(bands("one", "three", "two", "four"), 5),
        counters: reach(5, { page: 100, one: 100, three: 90, two: 50, four: 10 }),
      })
      const keys = [
        ...change.stops.map((stop) => `compared:${stop.after}>${stop.before}`),
        ...change.incomparable.map((pair) => `${pair.side}:${pair.after}>${pair.before}`),
      ]

      expect(new Set(keys).size).toBe(keys.length)
    })
  })
})
