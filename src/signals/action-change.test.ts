import { describe, expect, it } from "vitest"

import type { JsonObject } from "../json.js"
import { nodeId, OTHER_TREE, primitiveType, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  ACTION_CHANGE_SILENCES,
  ACTION_MOVEMENTS,
  actionChangeOf,
  describeActionChangeSilence,
  describeActionMovement,
  describeInsideMovement,
  INSIDE_MOVEMENTS,
  pageReadingOf,
  type ActionChange,
  type ComparedAction,
  type PartDeclarations,
  type ReaderTally,
} from "./index.js"

/**
 * Built from two trees and two windows of counters, because that is what the
 * function takes: nothing here reaches a store, a clock or a browser, and the
 * two readings of what readers did are derived inside it so no test can hand it
 * a mismatched pair.
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

const treeOf = (root: ElementNode, revision: number, treeId = TREE): LoomTree => ({
  treeId,
  schemaVersion: TREE_SCHEMA_VERSION,
  revision,
  root,
})

const NOTHING_DECLARED: PartDeclarations = {
  copyFor: () => undefined,
  typesWithRole: () => [],
}

const tally = (name: string, revision: number, counters: Partial<ReaderTally> = {}): ReaderTally => ({
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

const changeOf = (
  was: { tree: LoomTree; counters: readonly ReaderTally[] },
  now: { tree: LoomTree; counters: readonly ReaderTally[] }
): ActionChange =>
  actionChangeOf(
    pageReadingOf(was.tree, was.counters, NOTHING_DECLARED),
    pageReadingOf(now.tree, now.counters, NOTHING_DECLARED)
  )

const comparedIn = (change: ActionChange, name: string): ComparedAction | undefined =>
  change.compared.find((part) => part.nodeId === nodeId(name))

/**
 * A pricing band with a button in it, and a band below with nothing but words.
 *
 * The same shape `action.test.ts` reasons over, so the two suites disagree about
 * nothing: a control is a leaf and reports its own presses, the band above it
 * reports the readers, and the heading is the part that must never be called
 * untouched.
 */
const PAGE = (): ElementNode =>
  element("page", "loom.stack", {}, [
    element("pricing", "loom.section", {}, [
      element("buy", "loom.button"),
      element("pricecopy", "loom.text"),
    ]),
    element("quiet", "loom.section", {}, [element("quietcopy", "loom.text")]),
  ])

/** Forty readers reach the pricing band and do nothing; six of thirty use the band below. */
const BEFORE: readonly ReaderTally[] = [
  tally("page", 1, { views: 100, reached: 100, engaged: 6 }),
  tally("pricing", 1, { views: 40, reached: 40, engaged: 0 }),
  tally("buy", 1, { views: 40, reached: 40 }),
  tally("pricecopy", 1, { views: 40, reached: 40 }),
  tally("quiet", 1, { views: 30, reached: 30, engaged: 6, opens: 9 }),
  tally("quietcopy", 1, { views: 30, reached: 30 }),
]

/** Twenty of fifty now act in the pricing band, and the band below has stopped being used. */
const AFTER: readonly ReaderTally[] = [
  tally("page", 2, { views: 100, reached: 100, engaged: 20 }),
  tally("pricing", 2, { views: 50, reached: 50, engaged: 20 }),
  tally("buy", 2, { views: 50, reached: 50, activations: 24 }),
  tally("pricecopy", 2, { views: 50, reached: 50 }),
  tally("quiet", 2, { views: 30, reached: 30, engaged: 0 }),
  tally("quietcopy", 2, { views: 30, reached: 30 }),
]

const WAS = { tree: treeOf(PAGE(), 1), counters: BEFORE }
const NOW = { tree: treeOf(PAGE(), 2), counters: AFTER }

describe("actionChangeOf", () => {
  it("says the band readers reached and touched nothing is used now", () => {
    const change = changeOf(WAS, NOW)

    expect(comparedIn(change, "pricing")).toMatchObject({
      movement: "taken-up",
      inside: "kept",
      shareRatio: null,
    })

    expect(comparedIn(change, "pricing")?.was).toMatchObject({ standing: "untouched", share: 0 })
    expect(comparedIn(change, "pricing")?.now).toMatchObject({ standing: "acted", share: 0.4 })
  })

  it("says the band readers used has stopped being used", () => {
    expect(comparedIn(changeOf(WAS, NOW), "quiet")).toMatchObject({
      movement: "abandoned",
      inside: "kept",
      shareRatio: 0,
    })
  })

  it("ranks the ask the change got answered by the readers the page has now", () => {
    const change = changeOf(WAS, NOW)

    expect(change.mostTakenUp?.nodeId).toBe(nodeId("pricing"))
    expect(change.mostAbandoned?.nodeId).toBe(nodeId("quiet"))
  })

  it("compares the root against itself and calls that the page's own figure", () => {
    const change = changeOf(WAS, NOW)

    expect(change.whole?.nodeId).toBe(nodeId("page"))
    expect(change.whole?.movement).toBe("held")
    expect(change.whole?.shareRatio).toBeCloseTo(10 / 3)
    expect(change.mostTakenUp).not.toBe(change.whole)
    expect(change.stillUntouched).not.toContain(change.whole)
  })

  it("counts every compared part exactly once by movement and once by shape", () => {
    const change = changeOf(WAS, NOW)
    const added = (counted: Readonly<Record<string, number>>) =>
      Object.values(counted).reduce((sum, one) => sum + one, 0)

    expect(added(change.movements)).toBe(change.compared.length)
    expect(added(change.insides)).toBe(change.compared.length)
  })

  it("leaves a part no row named on either side out of the comparison", () => {
    const sparse = changeOf(
      { tree: WAS.tree, counters: [tally("page", 1, { views: 10, reached: 10, engaged: 2 })] },
      { tree: NOW.tree, counters: [tally("page", 2, { views: 10, reached: 10, engaged: 4 })] }
    )

    expect(sparse.compared.map((part) => part.nodeId)).toEqual([nodeId("page")])
    expect(sparse.movements.unknown).toBe(0)
  })
})

describe("the shape a change gave a part", () => {
  /** The button, wrapped in a label it did not have before. */
  const WRAPPED = element("page", "loom.stack", {}, [
    element("pricing", "loom.section", {}, [
      element("buy", "loom.button", {}, [element("buylabel", "loom.text")]),
      element("pricecopy", "loom.text"),
    ]),
    element("quiet", "loom.section", {}, [element("quietcopy", "loom.text")]),
  ])

  const wrapped = {
    tree: treeOf(WRAPPED, 2),
    counters: [
      tally("page", 2, { views: 100, reached: 100, engaged: 20 }),
      tally("pricing", 2, { views: 50, reached: 50, engaged: 20 }),
      tally("buy", 2, { views: 50, reached: 50, engaged: 9, activations: 24 }),
      tally("buylabel", 2, { views: 50, reached: 50 }),
      tally("pricecopy", 2, { views: 50, reached: 50 }),
      tally("quiet", 2, { views: 30, reached: 30, engaged: 0 }),
      tally("quietcopy", 2, { views: 30, reached: 30 }),
    ],
  }

  it("says a share appeared because the part gained an inside, not because readers acted", () => {
    const buy = comparedIn(changeOf(WAS, wrapped), "buy")

    expect(buy).toMatchObject({ inside: "gained", shareRatio: null })
    expect(buy?.was.share).toBeUndefined()
    expect(buy?.now.share).toBe(9 / 50)
  })

  it("says a share stopped being measurable because the part lost its inside", () => {
    const flattened = {
      tree: treeOf(
        element("page", "loom.stack", {}, [
          element("pricing", "loom.section"),
          element("quiet", "loom.section", {}, [element("quietcopy", "loom.text")]),
        ]),
        2
      ),
      counters: AFTER,
    }

    const pricing = comparedIn(changeOf(WAS, flattened), "pricing")

    expect(pricing).toMatchObject({ inside: "lost", shareRatio: null })
    expect(pricing?.now.share).toBeUndefined()
  })

  /**
   * The property that makes the warning on {@link InsideMovement} a statement
   * about where to look rather than a hazard: `untouched` on the earlier side
   * requires that side to have borne parts, so the shape change cannot arrive
   * wearing the movement this module exists to report.
   */
  it("never reports a part that gained an inside as taken up", () => {
    for (const change of [changeOf(WAS, wrapped), changeOf(wrapped, WAS), changeOf(WAS, NOW)]) {
      for (const part of change.compared) {
        if (part.inside === "gained") expect(part.movement).not.toBe("taken-up")
      }
    }
  })

  /** The other half of it, and the reason a ratio is withheld rather than computed. */
  it("publishes a share ratio only where the part's shape was kept", () => {
    for (const change of [changeOf(WAS, wrapped), changeOf(wrapped, WAS), changeOf(WAS, NOW)]) {
      for (const part of change.compared) {
        if (part.shareRatio !== null) expect(part.inside).toBe("kept")
      }
    }
  })
})

describe("what the comparison refuses to publish", () => {
  /**
   * The double count this module could have, and the only one available to it:
   * a ratio of two windows' counts. The straddle (0147) does not divide out of
   * one, so the published keys are pinned rather than argued about — a field
   * added here is a decision and not an oversight.
   */
  it("publishes no ratio or difference of two windows' counts", () => {
    const change = changeOf(WAS, NOW)

    expect(Object.keys(change).sort()).toEqual([
      "added",
      "compared",
      "insides",
      "mostAbandoned",
      "mostTakenUp",
      "movements",
      "readings",
      "removed",
      "revisions",
      "silence",
      "stillUntouched",
      "treeId",
      "whole",
    ])

    expect(Object.keys(change.compared[0] ?? {}).sort()).toEqual([
      "inside",
      "movement",
      "nodeId",
      "now",
      "role",
      "shareRatio",
      "type",
      "usesRatio",
      "was",
    ])
  })

  it("offers no page-wide total of readers who acted", () => {
    const change = changeOf(WAS, NOW)

    expect(Object.keys(change)).not.toContain("actors")
    expect(Object.keys(change)).not.toContain("within")
    expect(change.whole?.now.within).toBe(20)
  })
})

describe("the figures that survive two windows", () => {
  it("compares how much each reader used a part, and never how many used it", () => {
    const opened = {
      tree: NOW.tree,
      counters: AFTER.map((counter) =>
        counter.nodeId === nodeId("quiet")
          ? { ...counter, engaged: 6, opens: 18, views: 30, reached: 30 }
          : counter
      ),
    }

    const quiet = comparedIn(changeOf(WAS, opened), "quiet")

    expect(quiet?.was.usesPerReader).toBeCloseTo(9 / 30)
    expect(quiet?.now.usesPerReader).toBeCloseTo(18 / 30)
    expect(quiet?.usesRatio).toBeCloseTo(2)
  })

  it("withholds the use ratio where a side used nothing", () => {
    expect(comparedIn(changeOf(WAS, NOW), "quiet")?.usesRatio).toBeNull()
  })
})

describe("a sender that does not report where actions happened", () => {
  /** Presses on the button, and nobody credited anywhere: a batch with no `within`. */
  const unwalked = {
    tree: NOW.tree,
    counters: [
      tally("page", 2, { views: 100, reached: 100 }),
      tally("pricing", 2, { views: 50, reached: 50 }),
      tally("buy", 2, { views: 50, reached: 50, activations: 24 }),
      tally("pricecopy", 2, { views: 50, reached: 50 }),
      tally("quiet", 2, { views: 30, reached: 30 }),
      tally("quietcopy", 2, { views: 30, reached: 30 }),
    ],
  }

  it("refuses the comparison and says which window is at fault on its own reading", () => {
    const change = changeOf(WAS, unwalked)

    expect(change.silence).toBe("unwalked")
    expect(change.readings.was.unwalked).toBe(false)
    expect(change.readings.now.unwalked).toBe(true)
  })

  it("would otherwise have reported the page as abandoned", () => {
    const change = changeOf(WAS, unwalked)

    expect(comparedIn(change, "quiet")?.movement).toBe("abandoned")
  })

  it("keeps the occurrence figures, which need no ancestry", () => {
    const change = changeOf(WAS, unwalked)

    expect(comparedIn(change, "buy")?.now.uses).toBe(24)
    expect(comparedIn(change, "buy")?.now.usesPerReader).toBe(24 / 50)
  })
})

describe("the reasons a comparison answers nothing", () => {
  it("refuses two trees outright and counts nothing", () => {
    const change = changeOf(WAS, {
      tree: treeOf(PAGE(), 2, OTHER_TREE),
      counters: [],
    })

    expect(change.silence).toBe("different-trees")
    expect(change.compared).toEqual([])
    expect(change.added).toEqual([])
    expect(change.removed).toEqual([])
    expect(change.whole).toBeNull()
  })

  it("names a window with no page views and still says what the change did to the tree", () => {
    const change = changeOf(WAS, {
      tree: treeOf(
        element("page", "loom.stack", {}, [
          element("pricing", "loom.section", {}, [element("buy", "loom.button")]),
          element("extra", "loom.section", {}, [element("extracopy", "loom.text")]),
        ]),
        2
      ),
      counters: [],
    })

    expect(change.silence).toBe("nothing-measured")
    expect(change.removed.map((part) => part.nodeId)).toContain(nodeId("quiet"))
    expect(change.added).toEqual([])
  })

  it("names a change that left no part of the page as it was", () => {
    const change = changeOf(WAS, {
      tree: treeOf(element("fresh", "loom.stack", {}, [element("freshband", "loom.section")]), 2),
      counters: [
        tally("fresh", 2, { views: 10, reached: 10, engaged: 3 }),
        tally("freshband", 2, { views: 10, reached: 10 }),
      ],
    })

    expect(change.silence).toBe("dissolved")
    expect(change.compared).toEqual([])
    expect(change.added.map((part) => part.nodeId)).toEqual([
      nodeId("fresh"),
      nodeId("freshband"),
    ])
  })

  it("says nothing is wrong where both windows read the same page", () => {
    expect(changeOf(WAS, NOW).silence).toBeNull()
  })
})

describe("counting the same thing twice", () => {
  /**
   * One reading handed in as both sides. Every movement is *the standing did not
   * move* and every ratio is 1 or withheld — the comparison of a window with
   * itself, which is the shape a caller gets wrong first.
   */
  it("compares a reading with itself without moving anything", () => {
    const change = changeOf(NOW, NOW)

    expect(change.movements["taken-up"]).toBe(0)
    expect(change.movements.abandoned).toBe(0)
    expect(change.mostTakenUp).toBeNull()
    expect(change.mostAbandoned).toBeNull()
    expect(change.whole?.shareRatio).toBe(1)
    expect(change.added).toEqual([])
    expect(change.removed).toEqual([])
  })

  /**
   * A caller that concatenated two windows instead of letting the store add
   * them. The reading drops every row but the first and says so, so the
   * comparison is the single-row one exactly rather than a doubling that would
   * halve every share.
   */
  it("gives a doubled window of counters the same answer as the single one", () => {
    const doubled = changeOf(
      { tree: WAS.tree, counters: [...BEFORE, ...BEFORE] },
      { tree: NOW.tree, counters: [...AFTER, ...AFTER] }
    )

    expect(doubled.compared).toEqual(changeOf(WAS, NOW).compared)
    expect(doubled.readings.now.parts.length).toBe(changeOf(WAS, NOW).readings.now.parts.length)
  })

  /** Three parts, so a sum over the movements cannot pass by being one. */
  it("counts a part under one movement and one shape and never two", () => {
    const change = changeOf(WAS, NOW)

    for (const part of change.compared) {
      expect(ACTION_MOVEMENTS.filter((movement) => movement === part.movement)).toHaveLength(1)
      expect(INSIDE_MOVEMENTS.filter((movement) => movement === part.inside)).toHaveLength(1)
    }

    expect(change.compared.length).toBeGreaterThan(2)
  })
})

describe("the published vocabularies", () => {
  it("describes every member of every set, and never twice the same way", () => {
    const lines = [
      ...ACTION_MOVEMENTS.map(describeActionMovement),
      ...INSIDE_MOVEMENTS.map(describeInsideMovement),
      ...ACTION_CHANGE_SILENCES.map(describeActionChangeSilence),
    ]

    expect(lines.every((line) => line.length > 0)).toBe(true)
    expect(new Set(lines).size).toBe(lines.length)
  })
})
