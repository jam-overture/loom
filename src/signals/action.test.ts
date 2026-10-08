import { describe, expect, it } from "vitest"

import type { JsonObject } from "../json.js"
import { nodeId, primitiveType, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  ACTION_STANDINGS,
  describeActionStanding,
  pageActionOf,
  pageReadingOf,
  type PartDeclarations,
  type ReaderTally,
} from "./index.js"

/**
 * Built on the reading rather than on counters, because that is what the
 * function takes: a tree and a window's rows go in one end, what readers did
 * comes out of the other, and nothing in between reaches a store or a browser.
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

const actionOf = (tree: LoomTree, counters: readonly ReaderTally[]) =>
  pageActionOf(pageReadingOf(tree, counters, NOTHING_DECLARED))

const partIn = (page: ReturnType<typeof pageActionOf>, name: string) =>
  page.parts.find((part) => part.nodeId === nodeId(name))

/**
 * A pricing band with a button in it, and a band below with nothing but words.
 *
 * The shape every claim here is about: a control is a leaf and reports its own
 * presses, the band above it is what reports the readers, and the heading is the
 * part that must never be called untouched.
 */
const PAGE = element("page", "loom.stack", {}, [
  element("pricing", "loom.section", {}, [
    element("buy", "loom.button"),
    element("pricecopy", "loom.text"),
  ]),
  element("quiet", "loom.section", {}, [element("quietcopy", "loom.text")]),
])

/**
 * A hundred readers arrive, forty reach the pricing band and ten of them press
 * the button; nobody does anything in the band below.
 *
 * `engaged` on the band and `activations` on the button is 0167's filing rule as
 * a store writes it, and the whole of what this module has to read correctly.
 */
const TEN_PRESSED: readonly ReaderTally[] = [
  tally("page", { views: 100, reached: 100, engaged: 10 }),
  tally("pricing", { views: 40, reached: 40, engaged: 10 }),
  tally("buy", { views: 40, reached: 40, activations: 14 }),
  tally("pricecopy", { views: 40, reached: 40 }),
  tally("quiet", { views: 30, reached: 30 }),
  tally("quietcopy", { views: 30, reached: 30 }),
]

describe("pageActionOf", () => {
  it("says what share of the readers who reached a band did something in it", () => {
    const page = actionOf(treeOf(PAGE), TEN_PRESSED)

    expect(partIn(page, "pricing")).toMatchObject({
      standing: "acted",
      reached: 40,
      within: 10,
      share: 0.25,
    })
  })

  it("names the band readers reached and did nothing in", () => {
    const page = actionOf(treeOf(PAGE), TEN_PRESSED)

    expect(partIn(page, "quiet")).toMatchObject({
      standing: "untouched",
      reached: 30,
      within: 0,
      share: 0,
    })
    expect(page.mostIgnored?.nodeId).toEqual(nodeId("quiet"))
  })

  it("answers how many readers did anything at all on the page, off the root's own row", () => {
    const page = actionOf(treeOf(PAGE), TEN_PRESSED)

    expect(page.whole).toMatchObject({
      nodeId: nodeId("page"),
      reached: 100,
      within: 10,
      share: 0.1,
    })
  })

  /**
   * The double-count case the lane's standard names, and the one this module
   * exists to get right: a press is one `activations` on the control and one
   * `engaged` on every addressed ancestor (0167), so the reader is in the
   * control's row and in the band's row and in the root's row.
   */
  describe("a press is never counted twice", () => {
    it("credits the control with the occurrence and the band with the reader, never both", () => {
      const page = actionOf(treeOf(PAGE), TEN_PRESSED)

      expect(partIn(page, "buy")).toMatchObject({
        uses: 14,
        within: 0,
        counts: { activations: 14, opens: 0, closes: 0, completions: 0 },
      })
      expect(partIn(page, "pricing")).toMatchObject({ uses: 0, within: 10 })
    })

    it("publishes no page-wide total of the readers who acted", () => {
      const page = actionOf(treeOf(PAGE), TEN_PRESSED)

      /**
       * Ten readers pressed once each. `within` summed over the band and the
       * root above it is twenty, which is the number a page total would print —
       * one reader charged once per level they acted inside. The root's own row
       * is the only answer and says ten.
       */
      const summed = page.parts.reduce((total, part) => total + (part.within ?? 0), 0)

      expect(summed).toBe(20)
      expect(page.whole?.within).toBe(10)
      expect(page).not.toHaveProperty("within")
      expect(page).not.toHaveProperty("acted")
    })

    it("keeps the root out of the ranking it would win on every page", () => {
      const nothing: readonly ReaderTally[] = [
        tally("page", { views: 100, reached: 100 }),
        tally("pricing", { views: 40, reached: 40 }),
        tally("buy", { views: 40, reached: 40 }),
        tally("pricecopy", { views: 40, reached: 40 }),
        tally("quiet", { views: 30, reached: 30 }),
        tally("quietcopy", { views: 30, reached: 30 }),
      ]

      const page = actionOf(treeOf(PAGE), nothing)

      expect(page.whole?.standing).toBe("untouched")
      expect(page.mostIgnored?.nodeId).toEqual(nodeId("pricing"))
    })
  })

  describe("a leaf has no inside, so its share is not a measurement", () => {
    it("withholds the share of a control nobody pressed rather than calling it untouched", () => {
      const unpressed: readonly ReaderTally[] = [
        tally("page", { views: 100, reached: 100 }),
        tally("pricing", { views: 40, reached: 40 }),
        tally("buy", { views: 40, reached: 40 }),
      ]

      expect(partIn(actionOf(treeOf(PAGE), unpressed), "buy")).toMatchObject({
        bearsParts: false,
        standing: "unknown",
        within: 0,
        share: undefined,
      })
    })

    it("says the same of a heading, which is the part nobody could have pressed", () => {
      expect(partIn(actionOf(treeOf(PAGE), TEN_PRESSED), "pricecopy")).toMatchObject({
        standing: "unknown",
        share: undefined,
      })
    })

    it("counts the parts whose share it withheld, so a reading accounts for all of them", () => {
      const page = actionOf(treeOf(PAGE), TEN_PRESSED)

      expect(page.leaves).toBe(3)
      expect(page.parts.filter((part) => part.share === undefined)).toHaveLength(3)
    })
  })

  describe("occurrences are not readers", () => {
    it("publishes uses per reader as an intensity that may exceed one", () => {
      expect(partIn(actionOf(treeOf(PAGE), TEN_PRESSED), "buy")).toMatchObject({
        usesPerReader: 14 / 40,
      })

      const twice: readonly ReaderTally[] = [
        tally("page", { views: 10, reached: 10, engaged: 10 }),
        tally("pricing", { views: 10, reached: 10, engaged: 10 }),
        tally("buy", { views: 10, reached: 10, activations: 25 }),
      ]

      expect(partIn(actionOf(treeOf(PAGE), twice), "buy")?.usesPerReader).toBe(2.5)
    })

    it("withholds the intensity where nothing was used rather than printing a nought", () => {
      expect(partIn(actionOf(treeOf(PAGE), TEN_PRESSED), "quiet")).toMatchObject({
        uses: 0,
        usesPerReader: undefined,
      })
    })

    it("withholds it where nobody reached the part, so nothing divides by zero", () => {
      const delegatedOnly: readonly ReaderTally[] = [
        tally("page", { views: 5, reached: 5, engaged: 5 }),
        tally("pricing", { views: 5, reached: 0, engaged: 5 }),
        tally("buy", { views: 5, reached: 0, activations: 5 }),
      ]

      const page = actionOf(treeOf(PAGE), delegatedOnly)

      expect(partIn(page, "buy")).toMatchObject({ usesPerReader: undefined, uses: 5 })
      expect(partIn(page, "pricing")).toMatchObject({ share: undefined, standing: "acted" })
    })
  })

  describe("an ask opened and shut again", () => {
    const DISCLOSURE = element("page", "loom.stack", {}, [
      element("ask", "loom.disclosure", {}, [element("askbody", "loom.text")]),
    ])

    it("is a share of the openings and not of the readers", () => {
      const opened: readonly ReaderTally[] = [
        tally("page", { views: 50, reached: 50, engaged: 20 }),
        tally("ask", { views: 50, reached: 50, opens: 20, closes: 18 }),
      ]

      expect(partIn(actionOf(treeOf(DISCLOSURE), opened), "ask")).toMatchObject({
        standing: "acted",
        uses: 38,
        shutAgain: 0.9,
      })
    })

    it("is uncapped, because a revision that renders it open makes closes the page never opened", () => {
      const alreadyOpen: readonly ReaderTally[] = [
        tally("page", { views: 50, reached: 50, engaged: 30 }),
        tally("ask", { views: 50, reached: 50, opens: 4, closes: 30 }),
      ]

      expect(partIn(actionOf(treeOf(DISCLOSURE), alreadyOpen), "ask")?.shutAgain).toBe(7.5)
    })

    it("is withheld where nothing was opened", () => {
      const nothing: readonly ReaderTally[] = [tally("ask", { views: 50, reached: 50 })]

      expect(partIn(actionOf(treeOf(DISCLOSURE), nothing), "ask")?.shutAgain).toBeUndefined()
    })
  })

  describe("what cannot be spoken for", () => {
    it("is unknown where no row named the part, which is not nobody acting", () => {
      const partial: readonly ReaderTally[] = [tally("page", { views: 10, reached: 10 })]
      const page = actionOf(treeOf(PAGE), partial)

      expect(partIn(page, "quiet")).toMatchObject({
        standing: "unknown",
        reached: undefined,
        within: undefined,
        share: undefined,
        uses: 0,
      })
    })

    it("is unknown where a part reported something other than coming into view", () => {
      const delegatedOnly: readonly ReaderTally[] = [
        tally("page", { views: 10, reached: 10 }),
        tally("quiet", { views: 10, reached: 0 }),
      ]

      expect(partIn(actionOf(treeOf(PAGE), delegatedOnly), "quiet")).toMatchObject({
        standing: "unknown",
        reached: 0,
        share: undefined,
      })
    })

    it("is unknown everywhere in a window with no views at all", () => {
      const page = actionOf(treeOf(PAGE), [])

      expect(page.views).toBe(0)
      expect(page.standings).toEqual({ acted: 0, untouched: 0, unknown: 6 })
      expect(page.mostIgnored).toBeNull()
    })
  })

  describe("a sender that does not walk", () => {
    it("is named, because every share on the page is then a nought that means nothing", () => {
      const unwalked: readonly ReaderTally[] = [
        tally("page", { views: 100, reached: 100 }),
        tally("pricing", { views: 40, reached: 40 }),
        tally("buy", { views: 40, reached: 40, activations: 30 }),
        tally("quiet", { views: 30, reached: 30 }),
      ]

      const page = actionOf(treeOf(PAGE), unwalked)

      expect(page.unwalked).toBe(true)
      expect(page.whole?.share).toBe(0)
      expect(partIn(page, "pricing")?.standing).toBe("untouched")
    })

    it("is false on a page whose uses were credited to somebody", () => {
      expect(actionOf(treeOf(PAGE), TEN_PRESSED).unwalked).toBe(false)
    })

    it("is false on a page where nothing happened at all, which is not a broken sender", () => {
      const quiet: readonly ReaderTally[] = [
        tally("page", { views: 100, reached: 100 }),
        tally("pricing", { views: 40, reached: 40 }),
      ]

      expect(actionOf(treeOf(PAGE), quiet).unwalked).toBe(false)
      expect(actionOf(treeOf(PAGE), []).unwalked).toBe(false)
    })
  })

  describe("the ranking", () => {
    it("takes the headcount and not the share", () => {
      const twoBands: readonly ReaderTally[] = [
        tally("page", { views: 1000, reached: 1000, engaged: 1 }),
        /** Two readers in three ignored it: a worse ratio, a smaller problem. */
        tally("pricing", { views: 3, reached: 3 }),
        /** Four hundred readers ignored it. */
        tally("quiet", { views: 400, reached: 400 }),
      ]

      expect(actionOf(treeOf(PAGE), twoBands).mostIgnored?.nodeId).toEqual(nodeId("quiet"))
    })

    it("keeps the first in reading order on a tie", () => {
      const tied: readonly ReaderTally[] = [
        tally("page", { views: 50, reached: 50, engaged: 1 }),
        tally("pricing", { views: 20, reached: 20 }),
        tally("quiet", { views: 20, reached: 20 }),
      ]

      expect(actionOf(treeOf(PAGE), tied).mostIgnored?.nodeId).toEqual(nodeId("pricing"))
    })

    it("is null where nothing is untouched", () => {
      const acted: readonly ReaderTally[] = [
        tally("page", { views: 10, reached: 10, engaged: 10 }),
        tally("pricing", { views: 10, reached: 10, engaged: 10 }),
        tally("quiet", { views: 10, reached: 10, engaged: 2 }),
      ]

      expect(actionOf(treeOf(PAGE), acted).mostIgnored).toBeNull()
    })
  })

  describe("the reading it is taken off", () => {
    it("drops another revision's counters rather than crediting them", () => {
      const foreign: readonly ReaderTally[] = [
        tally("page", { views: 100, reached: 100, engaged: 50 }),
        { ...tally("pricing", { views: 40, reached: 40, engaged: 40 }), revision: 2 },
      ]

      const page = actionOf(treeOf(PAGE), foreign)

      expect(partIn(page, "pricing")).toMatchObject({
        standing: "unknown",
        within: undefined,
      })
    })

    it("carries the tree and the revision it was read against", () => {
      const page = actionOf(treeOf(PAGE, 7), [])

      expect(page).toMatchObject({ treeId: TREE, revision: 7 })
    })

    it("has a part for every element node, in reading order", () => {
      expect(actionOf(treeOf(PAGE), TEN_PRESSED).parts.map((part) => part.nodeId)).toEqual([
        nodeId("page"),
        nodeId("pricing"),
        nodeId("buy"),
        nodeId("pricecopy"),
        nodeId("quiet"),
        nodeId("quietcopy"),
      ])
    })

    it("has no root to report where the revision's root is not an element", () => {
      const page = pageActionOf({
        treeId: TREE,
        revision: 1,
        views: 0,
        parts: [],
        roles: [],
        standings: { read: 0, skipped: 0, unknown: 0 },
        foreign: 0,
        orphaned: [],
        duplicated: [],
      })

      expect(page.whole).toBeNull()
      expect(page.leaves).toBe(0)
    })
  })

  describe("the standings", () => {
    it("has a sentence for every member and no member without one", () => {
      expect(ACTION_STANDINGS).toEqual(["acted", "untouched", "unknown"])

      for (const standing of ACTION_STANDINGS) {
        expect(describeActionStanding(standing)).not.toBe("")
      }
    })

    it("counts every part exactly once", () => {
      const page = actionOf(treeOf(PAGE), TEN_PRESSED)
      const counted = ACTION_STANDINGS.reduce((total, at) => total + page.standings[at], 0)

      expect(counted).toBe(page.parts.length)
      expect(page.standings).toEqual({ acted: 3, untouched: 1, unknown: 2 })
    })
  })
})
