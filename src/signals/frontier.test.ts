import { describe, expect, it } from "vitest"

import type { JsonObject } from "../json.js"
import type { PrimitiveRole } from "../role.js"
import { nodeId, primitiveType, RIDERS, SKIERS, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode, SlotNode, TextNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  largestUnreachedIn,
  pageFrontierOf,
  pageReadingOf,
  unreachedWordsIn,
  wordsReadIn,
  type PageFrontier,
  type PartDeclarations,
  type ReaderTally,
} from "./index.js"

/**
 * The frontier is a pure function of a reading, so the fixtures are the three
 * things a reading is made of — a tree, a window's counters and what the
 * registry declared — and nothing here reaches a store, a clock or a browser.
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

const text = (name: string, value: string): TextNode => ({
  kind: "text",
  id: nodeId(name),
  value,
})

const slot = (name: string, children: readonly LoomNode[]): SlotNode => ({
  kind: "slot",
  id: nodeId(name),
  name: "children" as SlotNode["name"],
  children,
})

const treeOf = (root: ElementNode, revision = 1): LoomTree => ({
  treeId: TREE,
  schemaVersion: TREE_SCHEMA_VERSION,
  revision,
  root,
})

const declaring = (
  copy: Readonly<Record<string, readonly string[]>>,
  roles: Readonly<Partial<Record<PrimitiveRole, readonly string[]>>> = {}
): PartDeclarations => ({
  copyFor: (type) => copy[type],
  typesWithRole: (role) => (roles[role] ?? []).map((type) => primitiveType(type)),
})

const DECLARED = declaring(
  {
    "loom.stack": [],
    "loom.section": [],
    "loom.heading": ["value"],
    "loom.button": ["label"],
  },
  { heading: ["loom.heading"] }
)

const tally = (name: string, type: string, counters: Partial<ReaderTally> = {}): ReaderTally => ({
  treeId: TREE,
  revision: 1,
  nodeId: nodeId(name),
  type: primitiveType(type),
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

/**
 * A heading, a pricing band three parts deep behind a slot, an about band with
 * one heading in it, and a footer. The slot is deliberate: it is a node with
 * children and is never a part, so it is what the containment has to pass
 * through (0368 clause 4).
 */
const PAGE = element("page", "loom.stack", {}, [
  element("hero", "loom.heading", { value: "Winter range" }),
  element("pricing", "loom.section", {}, [
    slot("pricingslot", [
      element("row", "loom.section", {}, [
        element("price", "loom.heading", { value: "From 240" }),
        element("buy", "loom.button", { label: "Buy a pass" }),
      ]),
    ]),
  ]),
  element("about", "loom.section", {}, [
    element("blurb", "loom.heading", { value: "Who we are" }),
  ]),
  element("footer", "loom.section", {}, [text("legal", "All rights reserved")]),
])

const reached = (name: string, type: string, views: number): ReaderTally =>
  tally(name, type, { views, reached: views })

const frontierFor = (tallies: readonly ReaderTally[]): PageFrontier =>
  pageFrontierOf(pageReadingOf(treeOf(PAGE), tallies, DECLARED))

const partAt = (frontier: PageFrontier, name: string) =>
  frontier.frontier.find((part) => part.nodeId === nodeId(name))

/** The page's root, its heading and its about band were reached, and nothing else was. */
const TOP_ONLY: readonly ReaderTally[] = [
  reached("page", "loom.stack", 12),
  reached("hero", "loom.heading", 11),
  reached("about", "loom.section", 7),
]

describe("pageFrontierOf", () => {
  /**
   * The reason the module exists. Six parts of this page reported nothing and
   * there are three places the reading of it stopped, so a screen drawn on the
   * standings count would say *six* about a page with three things to fix.
   */
  it("reports one place the reading stopped rather than every part behind it", () => {
    const frontier = frontierFor(TOP_ONLY)

    expect(frontier.unseen).toBe(6)
    expect(frontier.frontier.map((part) => part.nodeId)).toEqual([
      nodeId("pricing"),
      nodeId("blurb"),
      nodeId("footer"),
    ])
    expect(partAt(frontier, "pricing")?.unseen).toBe(4)
    expect(partAt(frontier, "blurb")?.unseen).toBe(1)
    expect(partAt(frontier, "footer")?.unseen).toBe(1)
  })

  /**
   * The invariant the whole reading rests on, and the one arrangement of it that
   * can double-count: a part behind two nested places a reading stopped. Every
   * unreached part belongs to exactly one of them, so these two figures are the
   * same number in every window.
   */
  it("accounts for every unreached part exactly once", () => {
    const windows: readonly (readonly ReaderTally[])[] = [
      TOP_ONLY,
      [],
      [reached("buy", "loom.button", 5)],
      [reached("page", "loom.stack", 9)],
      [reached("page", "loom.stack", 9), reached("row", "loom.section", 2)],
      [
        reached("page", "loom.stack", 9),
        reached("pricing", "loom.section", 8),
        reached("price", "loom.heading", 1),
      ],
    ]

    for (const tallies of windows) {
      const reading = pageReadingOf(treeOf(PAGE), tallies, DECLARED)
      const frontier = pageFrontierOf(reading)
      const summed = frontier.frontier.reduce((total, part) => total + part.unseen, 0)

      expect(summed).toBe(reading.standings.skipped)
      expect(summed).toBe(frontier.unseen)
    }
  })

  it("carries the page's standings and its size, so a share needs no second call", () => {
    const frontier = frontierFor(TOP_ONLY)

    expect(frontier.parts).toBe(9)
    expect(frontier.read).toBe(3)
    expect(frontier.unknown).toBe(0)
    expect(frontier.views).toBe(12)
    expect(frontier.treeId).toBe(TREE)
    expect(frontier.revision).toBe(1)
  })

  /**
   * The containment is the nearest *addressed* ancestor, so the slot between the
   * pricing band and the row inside it is passed through — and the parts behind
   * the slot are still accounted for by the band.
   */
  it("passes a slot through when it names what a part stopped inside", () => {
    const frontier = frontierFor([reached("page", "loom.stack", 4)])

    expect(partAt(frontier, "pricing")?.withinId).toBe(nodeId("page"))
    expect(frontier.frontier.some((part) => part.nodeId === nodeId("pricingslot"))).toBe(false)
    expect(partAt(frontier, "pricing")?.unseen).toBe(4)
  })

  /**
   * The slot is between the pricing band and the row inside it, so a reading
   * that stopped at the row is the one case where the containing part and the
   * tree parent are different nodes — and the tree parent is a node this
   * reading has no row for.
   */
  it("names the containing part of a place behind a slot, and never the slot", () => {
    const reading = pageReadingOf(
      treeOf(PAGE),
      [reached("page", "loom.stack", 7), reached("pricing", "loom.section", 6)],
      DECLARED
    )
    const frontier = pageFrontierOf(reading)

    expect(partAt(frontier, "row")?.withinId).toBe(nodeId("pricing"))
    expect(partAt(frontier, "row")?.within).toBe("read")
    expect(reading.parts.find((part) => part.nodeId === nodeId("row"))?.parentId).toBe(
      nodeId("pricingslot")
    )
    expect(partAt(frontier, "row")?.unseen).toBe(3)
  })

  it("says what the reading had reached before it stopped", () => {
    const frontier = frontierFor(TOP_ONLY)

    expect(partAt(frontier, "pricing")?.within).toBe("read")
    expect(partAt(frontier, "blurb")?.withinId).toBe(nodeId("about"))
    expect(partAt(frontier, "blurb")?.within).toBe("read")
  })

  /**
   * A container that reported something other than a view is a sharper sentence
   * than a container that was read: a reader plainly had it in front of them and
   * the counter that would say so is missing.
   */
  it("tells a stop inside a read part from one inside a part nothing can be said about", () => {
    const frontier = frontierFor([
      reached("page", "loom.stack", 6),
      tally("about", "loom.section", { views: 6, reached: 0, activations: 3 }),
    ])

    expect(partAt(frontier, "blurb")?.within).toBe("unknown")
    expect(partAt(frontier, "pricing")?.within).toBe("read")
  })

  /** Nothing was measured, so nothing was skipped — and so nothing stopped. */
  it("has no frontier at all for a page no view reported on", () => {
    const frontier = frontierFor([])

    expect(frontier.views).toBe(0)
    expect(frontier.frontier).toEqual([])
    expect(frontier.unseen).toBe(0)
    expect(frontier.unknown).toBe(9)
  })

  /**
   * Two forms of one page are two populations and `parts.ts` reads neither
   * rather than adding them (0284, 0297). The refusal arrives here as every
   * part unknown, which is the right empty answer and not an empty page.
   */
  it("is empty where the reading refused a window holding two audiences", () => {
    const reading = pageReadingOf(
      treeOf(PAGE),
      [
        { ...reached("page", "loom.stack", 4), audienceId: SKIERS },
        { ...reached("page", "loom.stack", 3), audienceId: RIDERS },
      ],
      DECLARED
    )
    const frontier = pageFrontierOf(reading)

    expect(reading.audiences).toHaveLength(2)
    expect(frontier.frontier).toEqual([])
    expect(frontier.unknown).toBe(9)
  })

  it("names a part readers reached and went past the whole of", () => {
    const frontier = frontierFor(TOP_ONLY)

    expect(frontier.passedOver).toEqual([nodeId("about")])
  })

  /**
   * `page` holds parts that were reached, so it is not passed over however much
   * of it went unseen — and a part with an `unknown` inside it cannot be
   * claimed either way.
   */
  it("withholds passed over where a part inside cannot be spoken for", () => {
    const frontier = frontierFor([
      reached("page", "loom.stack", 6),
      reached("about", "loom.section", 6),
      tally("blurb", "loom.heading", { views: 6, reached: 0, dwellMs: 900 }),
    ])

    expect(frontier.passedOver).toEqual([])
    expect(frontier.unknown).toBe(1)
  })

  /**
   * A part that said nothing while a reader was demonstrably below it is a
   * primitive not spreading its identity attributes, and the arithmetic has to
   * survive it: the places the reading stopped nest, and each unreached part is
   * still behind exactly one of them.
   */
  it("names a part that reported nothing with a read part inside it, and nests around it", () => {
    const reading = pageReadingOf(
      treeOf(PAGE),
      [reached("page", "loom.stack", 9), reached("row", "loom.section", 4)],
      DECLARED
    )
    const frontier = pageFrontierOf(reading)

    expect(frontier.notReporting).toEqual([nodeId("pricing")])
    expect(partAt(frontier, "pricing")?.reportedBelow).toBe(1)
    expect(partAt(frontier, "pricing")?.beneath).toBe(3)
    expect(partAt(frontier, "pricing")?.unseen).toBe(1)
    expect(frontier.frontier.map((part) => part.nodeId)).toEqual([
      nodeId("hero"),
      nodeId("pricing"),
      nodeId("price"),
      nodeId("buy"),
      nodeId("about"),
      nodeId("footer"),
    ])
    expect(frontier.frontier.reduce((total, part) => total + part.unseen, 0)).toBe(
      reading.standings.skipped
    )
  })

  /** A window whose only row is deep in the page: one place the reading stopped, and it is the page. */
  it("reads a page whose root reported nothing as one place the reading stopped", () => {
    const frontier = frontierFor([reached("buy", "loom.button", 5)])

    expect(frontier.frontier.map((part) => part.nodeId)).toEqual([nodeId("page")])
    expect(partAt(frontier, "page")?.withinId).toBeNull()
    expect(partAt(frontier, "page")?.within).toBeNull()
    expect(partAt(frontier, "page")?.unseen).toBe(8)
    expect(partAt(frontier, "page")?.reportedBelow).toBe(1)
    expect(frontier.notReporting).toEqual([nodeId("page"), nodeId("pricing"), nodeId("row")])
  })

  it("carries the orphaned count, because a wrong pair reads as a page readers stopped at the top of", () => {
    const reading = pageReadingOf(
      treeOf(PAGE),
      [reached("page", "loom.stack", 4), reached("gone", "loom.section", 3)],
      DECLARED
    )

    expect(pageFrontierOf(reading).orphaned).toBe(1)
  })

  /**
   * The frontier counts parts of a tree rather than rows, so a window handed in
   * twice cannot inflate it: the reading has already dropped the repeat and said
   * so (0158).
   */
  it("reads the same frontier from a window whose rows were handed in twice", () => {
    const once = pageReadingOf(treeOf(PAGE), TOP_ONLY, DECLARED)
    const twice = pageReadingOf(treeOf(PAGE), [...TOP_ONLY, ...TOP_ONLY], DECLARED)

    expect(twice.duplicated).toHaveLength(3)
    expect(pageFrontierOf(twice)).toEqual(pageFrontierOf(once))
  })
})

describe("the words nobody reached", () => {
  it("gathers the words of every part behind each place the reading stopped", () => {
    const frontier = frontierFor(TOP_ONLY)

    expect(partAt(frontier, "pricing")?.words).toEqual(["From 240", "Buy a pass"])
    expect(partAt(frontier, "blurb")?.words).toEqual(["Who we are"])
    expect(partAt(frontier, "footer")?.words).toEqual(["All rights reserved"])
  })

  it("reads in reading order and partitions against the words that were read", () => {
    const reading = pageReadingOf(treeOf(PAGE), TOP_ONLY, DECLARED)
    const frontier = pageFrontierOf(reading)

    expect(unreachedWordsIn(frontier)).toEqual([
      "From 240",
      "Buy a pass",
      "Who we are",
      "All rights reserved",
    ])
    expect(wordsReadIn(reading)).toEqual(["Winter range"])
    for (const word of unreachedWordsIn(frontier)) {
      expect(wordsReadIn(reading)).not.toContain(word)
    }
  })

  /**
   * Every word of the page belongs to exactly one part and every unreached part
   * to exactly one place the reading stopped, so a word cannot be reported
   * twice however the page nests.
   */
  it("says each word once where the places the reading stopped are nested", () => {
    const frontier = frontierFor([
      reached("page", "loom.stack", 9),
      reached("row", "loom.section", 4),
    ])
    const words = unreachedWordsIn(frontier)

    expect(words).toEqual([
      "Winter range",
      "From 240",
      "Buy a pass",
      "Who we are",
      "All rights reserved",
    ])
    expect(new Set(words).size).toBe(words.length)
  })

  it("is empty where nothing was measured", () => {
    expect(unreachedWordsIn(frontierFor([]))).toEqual([])
  })
})

describe("largestUnreachedIn", () => {
  it("orders by what one place costs the page, and keeps reading order on a tie", () => {
    const frontier = frontierFor(TOP_ONLY)

    expect(largestUnreachedIn(frontier).map((part) => part.nodeId)).toEqual([
      nodeId("pricing"),
      nodeId("blurb"),
      nodeId("footer"),
    ])
  })

  /**
   * The two figures a place carries order a page differently, and the one a
   * fix-list wants is what the place **costs**. The pricing band holds three
   * parts and has lost one of them, because a reader reported reach on the row
   * inside it; the about band holds one and has lost both.
   */
  it("orders by what a place costs the page and never by what is inside it", () => {
    const frontier = frontierFor([
      reached("page", "loom.stack", 9),
      reached("row", "loom.section", 4),
    ])

    expect(partAt(frontier, "pricing")?.beneath).toBe(3)
    expect(partAt(frontier, "pricing")?.unseen).toBe(1)
    expect(partAt(frontier, "about")?.beneath).toBe(1)
    expect(partAt(frontier, "about")?.unseen).toBe(2)
    expect(largestUnreachedIn(frontier, 1).map((part) => part.nodeId)).toEqual([nodeId("about")])
  })

  it("takes the first few where a caller asked for them", () => {
    expect(largestUnreachedIn(frontierFor(TOP_ONLY), 1).map((part) => part.nodeId)).toEqual([
      nodeId("pricing"),
    ])
  })

  it("is empty where the reading stopped nowhere", () => {
    expect(largestUnreachedIn(frontierFor([]))).toEqual([])
  })
})

describe("the shape of a page it is read over", () => {
  /**
   * One place the reading stopped, accounting for five hundred parts, each with
   * words of its own. The accumulation has to be one pass: gathering the words
   * by rebuilding an array per part behind it is quadratic, which is the shape
   * rule 4 keeps out of these readings.
   */
  it("reads a deep chain behind one stop in a single pass", () => {
    const chain = (depth: number): ElementNode =>
      depth === 0
        ? element("deep0", "loom.heading", { value: "word0" })
        : element(`deep${depth}`, "loom.heading", { value: `word${depth}` }, [chain(depth - 1)])

    const root = element("root", "loom.stack", {}, [chain(500)])
    const tree: LoomTree = {
      treeId: TREE,
      schemaVersion: TREE_SCHEMA_VERSION,
      revision: 1,
      root,
    }
    const reading = pageReadingOf(tree, [reached("root", "loom.stack", 3)], DECLARED)

    const began = performance.now()
    const frontier = pageFrontierOf(reading)
    const took = performance.now() - began

    expect(frontier.parts).toBe(502)
    expect(frontier.frontier).toHaveLength(1)
    expect(frontier.frontier[0]?.nodeId).toBe(nodeId("deep500"))
    expect(frontier.frontier[0]?.unseen).toBe(501)
    expect(unreachedWordsIn(frontier)).toHaveLength(501)
    expect(took).toBeLessThan(250)
  })

  it("reads a wide page as one place per child the reading stopped at", () => {
    const children = Array.from({ length: 2_000 }, (_, at) =>
      element(`wide${at}`, "loom.heading", { value: `word${at}` })
    )
    const tree: LoomTree = {
      treeId: TREE,
      schemaVersion: TREE_SCHEMA_VERSION,
      revision: 1,
      root: element("root", "loom.stack", {}, children),
    }
    const reading = pageReadingOf(tree, [reached("root", "loom.stack", 3)], DECLARED)
    const frontier = pageFrontierOf(reading)

    expect(frontier.frontier).toHaveLength(2_000)
    expect(frontier.unseen).toBe(2_000)
    expect(frontier.frontier.every((part) => part.unseen === 1)).toBe(true)
    expect(frontier.passedOver).toEqual([nodeId("root")])
  })
})
