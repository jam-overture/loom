import { describe, expect, it } from "vitest"

import type { TreeId } from "../ids.js"
import type { JsonObject } from "../json.js"
import { PRIMITIVE_ROLES } from "../role.js"
import { nodeId, OTHER_TREE, primitiveType, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  describeSenderSilence,
  librarySendersOf,
  pageFrontierOf,
  pageReadingOf,
  SENDER_SILENCES,
  SILENT_EXAMPLES,
  type KindSenders,
  type LibrarySenders,
  type PageReading,
  type PartDeclarations,
  type ReaderTally,
} from "./index.js"

/**
 * Built on real readings rather than on hand-written rows, like every other
 * library census here: a tree and a window's counters go in one end and a kind
 * of part's silence comes out of the other, so a fixture cannot assert a state
 * the pipeline could not produce.
 *
 * The one thing every fixture below is careful about is the thing the 11
 * November entry caught four fixtures in this lane doing by accident — a page
 * whose bands report and whose stack does not **is** the defect. Here that is
 * the subject rather than the mistake, and the pages meant to be sound say so.
 */

const NO_DECLARATIONS: PartDeclarations = {
  copyFor: () => undefined,
  typesWithRole: () => [],
}

const SECTIONS_HEAD: PartDeclarations = {
  copyFor: () => undefined,
  typesWithRole: (role) => (role === "heading" ? [primitiveType("loom.section")] : []),
}

const element = (
  name: string,
  type: string,
  children: readonly LoomNode[] = [],
  props: JsonObject = {}
): ElementNode => ({
  kind: "element",
  id: nodeId(name),
  type: primitiveType(type),
  props,
  children,
})

const treeOf = (root: ElementNode, revision = 1, treeId: TreeId = TREE): LoomTree => ({
  treeId,
  schemaVersion: TREE_SCHEMA_VERSION,
  revision,
  root,
})

const tally = (name: string, counts: Partial<ReaderTally>, tree: LoomTree): ReaderTally => ({
  treeId: tree.treeId,
  revision: tree.revision,
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
  ...counts,
})

/** A reader reached it. */
const reached = (name: string, tree: LoomTree): ReaderTally =>
  tally(name, { views: 4, reached: 4 }, tree)

/** It reported something that was not a view, which is what makes a part `unknown`. */
const acted = (name: string, tree: LoomTree): ReaderTally =>
  tally(name, { views: 4, reached: 0, activations: 2 }, tree)

/**
 * A stack holding a band that holds a heading, which is the shape the defect
 * needs: something that can be silent, with something under it that can witness
 * it.
 */
const page = ({ revision = 1, treeId = TREE }: { revision?: number; treeId?: TreeId } = {}) =>
  treeOf(
    element("page", "loom.stack", [
      element("band", "loom.band", [element("heading", "loom.section")]),
    ]),
    revision,
    treeId
  )

const readingOf = (
  tree: LoomTree,
  counters: readonly ReaderTally[],
  declarations: PartDeclarations = NO_DECLARATIONS
): PageReading => pageReadingOf(tree, counters, declarations)

const typeRow = (senders: LibrarySenders, type: string): KindSenders | undefined =>
  senders.byType.find((row) => row.kind.by === "type" && row.kind.type === type)

const roleRow = (senders: LibrarySenders, role: string | null): KindSenders | undefined =>
  senders.byRole.find((row) => row.kind.by === "role" && row.kind.role === role)

/** What the per-page fault says, which this census must agree with exactly. */
const faultedParts = (readings: readonly PageReading[]): number =>
  readings.reduce((total, reading) => total + pageFrontierOf(reading).notReporting.length, 0)

describe("which of a deployment's components are silent", () => {
  it("names the kind of the part that said nothing with a reader below it", () => {
    const tree = page()
    const reading = readingOf(tree, [reached("band", tree), reached("heading", tree)])

    const senders = librarySendersOf([reading])

    expect(typeRow(senders, "loom.stack")).toMatchObject({
      placements: 1,
      witnessed: 1,
      silent: 1,
      share: 1,
      atMost: 1,
      silence: null,
    })
    expect(senders.silent).toBe(1)
    expect(senders.worstSender?.kind).toEqual({ by: "type", type: primitiveType("loom.stack") })
  })

  it("agrees with the per-page fault term for term", () => {
    const tree = page()
    const other = page({ treeId: OTHER_TREE })
    const readings = [
      readingOf(tree, [reached("band", tree), reached("heading", tree)]),
      readingOf(other, [reached("heading", other)]),
    ]

    expect(faultedParts(readings)).toBe(3)
    expect(librarySendersOf(readings).silent).toBe(3)
  })

  it("holds a page whose senders work at nought rather than withholding it", () => {
    const tree = page()
    const reading = readingOf(tree, [
      reached("page", tree),
      reached("band", tree),
      reached("heading", tree),
    ])

    const senders = librarySendersOf([reading])

    expect(typeRow(senders, "loom.stack")).toMatchObject({
      witnessed: 1,
      silent: 0,
      share: 0,
      atMost: 0,
      silence: null,
    })
    expect(senders.worstSender).toBeNull()
    expect(faultedParts([reading])).toBe(0)
  })
})

describe("the three states a placement can be in", () => {
  it("adds to the placements, with a leaf out of the denominator", () => {
    const tree = page()
    const senders = librarySendersOf([
      readingOf(tree, [reached("band", tree), reached("heading", tree)]),
    ])

    for (const row of [...senders.byType, ...senders.byRole]) {
      expect(row.leaves + row.unwitnessed + row.witnessed).toBe(row.placements)
    }

    expect(typeRow(senders, "loom.section")).toMatchObject({
      placements: 1,
      leaves: 1,
      witnessed: 0,
      silence: "unwitnessable",
      share: null,
      atMost: null,
    })
  })

  /**
   * The mutation this kills is the obvious one: `silent / placements` instead of
   * `silent / witnessed`. The fixture is built so the two differ — one silent
   * stack and three leaves of the same type on the page beneath it.
   */
  it("divides by the places the defect could be seen on and never by the places the kind stands", () => {
    const tree = treeOf(
      element("page", "loom.stack", [
        element("one", "loom.stack", [element("a", "loom.section")]),
        element("two", "loom.stack"),
        element("three", "loom.stack"),
      ])
    )
    const senders = librarySendersOf([readingOf(tree, [reached("a", tree)])])

    expect(typeRow(senders, "loom.stack")).toMatchObject({
      placements: 4,
      leaves: 2,
      unwitnessed: 0,
      witnessed: 2,
      silent: 2,
    })
    expect(typeRow(senders, "loom.stack")?.share).toBe(1)
    expect(typeRow(senders, "loom.stack")?.share).not.toBe(2 / 4)
  })

  it("calls a window with no reader below anything unwitnessed rather than sound", () => {
    const tree = page()
    const senders = librarySendersOf([readingOf(tree, [])])

    expect(senders.witnessed).toBe(0)
    expect(senders.silent).toBe(0)
    expect(typeRow(senders, "loom.stack")).toMatchObject({
      placements: 1,
      leaves: 0,
      unwitnessed: 1,
      witnessed: 0,
      share: null,
      atMost: null,
      silence: "unwitnessed",
    })
  })

  it("tells a kind that could never be checked from one nobody has been under yet", () => {
    const tree = page()
    const senders = librarySendersOf([readingOf(tree, [])])

    expect(typeRow(senders, "loom.section")?.silence).toBe("unwitnessable")
    expect(typeRow(senders, "loom.band")?.silence).toBe("unwitnessed")
  })
})

describe("the bracket the indeterminate placements open", () => {
  it("keeps a part that reported something other than a view out of the claim and inside the ceiling", () => {
    const tree = page()
    const senders = librarySendersOf([
      readingOf(tree, [acted("page", tree), reached("band", tree), reached("heading", tree)]),
    ])

    expect(typeRow(senders, "loom.stack")).toMatchObject({
      witnessed: 1,
      silent: 0,
      indeterminate: 1,
      share: 0,
      atMost: 1,
    })
    expect(faultedParts([readingOf(tree, [acted("page", tree), reached("band", tree)])])).toBe(0)
  })

  it("closes the bracket to a point where nothing is indeterminate", () => {
    const tree = page()
    const senders = librarySendersOf([
      readingOf(tree, [reached("band", tree), reached("heading", tree)]),
    ])
    const row = typeRow(senders, "loom.stack")

    expect(row?.indeterminate).toBe(0)
    expect(row?.share).toBe(row?.atMost)
  })
})

describe("the pages one silent component costs", () => {
  it("counts the trees it is silent in, which is the figure the per-page fault cannot give", () => {
    const first = page({ treeId: TREE })
    const second = page({ treeId: OTHER_TREE })
    const senders = librarySendersOf([
      readingOf(first, [reached("band", first), reached("heading", first)]),
      readingOf(second, [reached("band", second), reached("heading", second)]),
    ])

    expect(typeRow(senders, "loom.stack")).toMatchObject({
      placements: 2,
      trees: 2,
      revisions: 2,
      silent: 2,
      silentTrees: 2,
    })
    expect(senders.pages).toBe(2)
    expect(senders.trees).toBe(2)
  })

  it("counts two revisions of one page as one tree to go and look at", () => {
    const first = page({ revision: 1 })
    const second = page({ revision: 2 })
    const senders = librarySendersOf([
      readingOf(first, [reached("band", first), reached("heading", first)]),
      readingOf(second, [reached("band", second), reached("heading", second)]),
    ])

    expect(typeRow(senders, "loom.stack")).toMatchObject({
      revisions: 2,
      trees: 1,
      silent: 2,
      silentTrees: 1,
    })
  })

  it("hands over a few of the silent nodes as examples and never the whole list", () => {
    const tree = treeOf(
      element(
        "page",
        "loom.stack",
        Array.from({ length: SILENT_EXAMPLES + 3 }, (_, at) =>
          element(`band${String(at)}`, "loom.band", [
            element(`heading${String(at)}`, "loom.section"),
          ])
        )
      )
    )
    const counters = Array.from({ length: SILENT_EXAMPLES + 3 }, (_, at) =>
      reached(`heading${String(at)}`, tree)
    )
    const row = typeRow(librarySendersOf([readingOf(tree, counters)]), "loom.band")

    expect(row?.silent).toBe(SILENT_EXAMPLES + 3)
    expect(row?.examples).toHaveLength(SILENT_EXAMPLES)
    expect(row?.examples[0]).toBe(nodeId("band0"))
  })
})

describe("counting one page twice", () => {
  it("drops the second reading of a revision and reports it", () => {
    const tree = page()
    const reading = readingOf(tree, [reached("band", tree), reached("heading", tree)])

    const once = librarySendersOf([reading])
    const twice = librarySendersOf([reading, reading])

    expect(twice.duplicated).toBe(1)
    expect(once.duplicated).toBe(0)
    expect(twice.pages).toBe(once.pages)
    expect(twice.placements).toBe(once.placements)
    expect(twice.witnessed).toBe(once.witnessed)
    expect(twice.silent).toBe(once.silent)
    expect(typeRow(twice, "loom.stack")).toEqual(typeRow(once, "loom.stack"))
  })

  it("keeps two revisions of one page, which are two readings and not a duplicate", () => {
    const first = page({ revision: 1 })
    const second = page({ revision: 2 })
    const senders = librarySendersOf([
      readingOf(first, [reached("band", first), reached("heading", first)]),
      readingOf(second, [reached("band", second), reached("heading", second)]),
    ])

    expect(senders.duplicated).toBe(0)
    expect(senders.silent).toBe(2)
  })
})

describe("the order the rows come in", () => {
  /**
   * By the count of places and not by the share, which is 0221's rule and
   * 0257's: a kind silent in its one and only place is a perfect share and a
   * smaller errand than one silent in two of three.
   */
  it("puts the kind silent in the most places first, whatever its share", () => {
    const tree = treeOf(
      element("page", "loom.root", [
        element("a", "loom.band", [element("a1", "loom.section")]),
        element("b", "loom.band", [element("b1", "loom.section")]),
        element("c", "loom.band", [element("c1", "loom.section")]),
        element("d", "loom.aside", [element("d1", "loom.section")]),
      ])
    )
    const senders = librarySendersOf([
      readingOf(tree, [
        reached("page", tree),
        reached("a1", tree),
        reached("b1", tree),
        reached("c", tree),
        reached("c1", tree),
        reached("d1", tree),
      ]),
    ])

    expect(typeRow(senders, "loom.band")).toMatchObject({ silent: 2, witnessed: 3 })
    expect(typeRow(senders, "loom.aside")).toMatchObject({ silent: 1, witnessed: 1, share: 1 })
    expect(senders.byType[0]?.kind).toEqual({ by: "type", type: primitiveType("loom.band") })
    expect(senders.worstSender?.kind).toEqual({ by: "type", type: primitiveType("loom.band") })
  })

  it("sorts a kind with no share at all after one whose senders all work", () => {
    const tree = treeOf(
      element("page", "loom.stack", [
        element("band", "loom.band", [element("heading", "loom.section")]),
      ])
    )
    const senders = librarySendersOf([
      readingOf(tree, [reached("page", tree), reached("band", tree), reached("heading", tree)]),
    ])
    const order = senders.byType.map((row) => (row.kind.by === "type" ? row.kind.type : ""))

    expect(order.indexOf(primitiveType("loom.stack"))).toBeLessThan(
      order.indexOf(primitiveType("loom.section"))
    )
  })
})

describe("the role rows", () => {
  it("gives every role in the vocabulary a row and names the ones nothing plays", () => {
    const tree = page()
    const senders = librarySendersOf([
      readingOf(tree, [reached("band", tree), reached("heading", tree)], SECTIONS_HEAD),
    ])

    expect(senders.byRole).toHaveLength(PRIMITIVE_ROLES.length + 1)
    expect(roleRow(senders, "heading")).toMatchObject({ placements: 1, silence: "unwitnessable" })

    for (const row of senders.byRole) {
      if (row.placements === 0) expect(row.silence).toBe("unplaced")
    }
  })

  it("files the silent stack under the row for parts whose type declares no role", () => {
    const tree = page()
    const senders = librarySendersOf([
      readingOf(tree, [reached("band", tree), reached("heading", tree)], SECTIONS_HEAD),
    ])

    expect(roleRow(senders, null)).toMatchObject({ silent: 1, witnessed: 2, placements: 2 })
    expect(senders.byType.every((row) => row.kind.by === "type")).toBe(true)
  })

  it("names a type two readings disagree about the role of", () => {
    const tree = page()
    const other = page({ treeId: OTHER_TREE })
    const senders = librarySendersOf([
      readingOf(tree, [reached("heading", tree)], SECTIONS_HEAD),
      readingOf(other, [reached("heading", other)], NO_DECLARATIONS),
    ])

    expect(senders.roleDisagreed).toEqual([primitiveType("loom.section")])
  })
})

describe("the silence vocabulary", () => {
  it("is closed and every member has a sentence", () => {
    expect(SENDER_SILENCES).toEqual(["unplaced", "unwitnessable", "unwitnessed"])

    for (const silence of SENDER_SILENCES) {
      expect(describeSenderSilence(silence)).toMatch(/\S/)
    }

    expect(new Set(SENDER_SILENCES.map(describeSenderSilence)).size).toBe(SENDER_SILENCES.length)
  })

  it("answers nothing of the kind before anything about readers", () => {
    const senders = librarySendersOf([])

    expect(senders.byType).toEqual([])
    expect(roleRow(senders, null)?.silence).toBe("unplaced")
    expect(senders.pages).toBe(0)
    expect(senders.worstSender).toBeNull()
  })
})
