import { describe, expect, it } from "vitest"

import type { JsonObject } from "../json.js"
import type { PrimitiveRole } from "../role.js"
import { copyIn } from "../sdk/copy.js"
import { nodeId, OTHER_TREE, primitiveType, TREE } from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode, TextNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import { pageReadingOf, wordsReadIn, type PartDeclarations, type ReaderTally } from "./index.js"

/**
 * The join is a pure function of three things a server holds, so the fixtures
 * are those three things: a tree, a window's counters, and what the registry
 * declared. Nothing here touches a store or a browser.
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

/** A two-line double, which is the bargain 0114 and 0122 both struck. */
const declaring = (
  copy: Readonly<Record<string, readonly string[]>>,
  roles: Readonly<Partial<Record<PrimitiveRole, readonly string[]>>> = {}
): PartDeclarations => ({
  copyFor: (type) => copy[type],
  typesWithRole: (role) => (roles[role] ?? []).map((type) => primitiveType(type)),
})

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

const partFor = (reading: ReturnType<typeof pageReadingOf>, name: string) =>
  reading.parts.find((part) => part.nodeId === nodeId(name))

const roleRow = (reading: ReturnType<typeof pageReadingOf>, role: PrimitiveRole | null) =>
  reading.roles.find((row) => row.role === role)

/** Heading, band with a button inside it, and a band nobody reaches. */
const PAGE = element("page", "loom.stack", {}, [
  element("hero", "loom.heading", { value: "Winter range" }),
  element("pricing", "loom.section", {}, [
    element("buy", "loom.button", { label: "Buy" }),
  ]),
  element("footer", "loom.section", {}, [text("legal", "All rights reserved")]),
])

describe("pageReadingOf", () => {
  it("reads every element node as a part, in reading order, with its depth", () => {
    const reading = pageReadingOf(treeOf(PAGE), [], NOTHING_DECLARED)

    expect(reading.parts.map((part) => part.nodeId)).toEqual([
      nodeId("page"),
      nodeId("hero"),
      nodeId("pricing"),
      nodeId("buy"),
      nodeId("footer"),
    ])
    expect(reading.parts.map((part) => part.depth)).toEqual([0, 1, 1, 2, 1])
    expect(partFor(reading, "buy")?.parentId).toBe(nodeId("pricing"))
  })

  it("leaves text and slot nodes out, because no signal can ever name one", () => {
    const reading = pageReadingOf(treeOf(PAGE), [], NOTHING_DECLARED)

    expect(reading.parts.some((part) => part.nodeId === nodeId("legal"))).toBe(false)
  })

  it("says nothing about any part when the window held no views", () => {
    const reading = pageReadingOf(treeOf(PAGE), [], NOTHING_DECLARED)

    expect(reading.views).toBe(0)
    expect(reading.standings).toEqual({ read: 0, skipped: 0, unknown: 5 })
    expect(reading.parts.every((part) => part.counters === undefined)).toBe(true)
  })

  /**
   * The point of the whole join: a part nobody reached has no row, so only the
   * tree can say it was there to be reached.
   */
  it("tells a part readers skipped from a part nothing was reported about", () => {
    const reading = pageReadingOf(
      treeOf(PAGE),
      [
        tally("page", "loom.stack", { views: 12, reached: 12 }),
        tally("hero", "loom.heading", { views: 11, reached: 11, dwellMs: 9_000 }),
        tally("pricing", "loom.section", { views: 4, reached: 4, dwellMs: 20_000 }),
      ],
      NOTHING_DECLARED
    )

    expect(reading.views).toBe(12)
    expect(partFor(reading, "pricing")?.standing).toBe("read")
    expect(partFor(reading, "footer")?.standing).toBe("skipped")
    expect(partFor(reading, "buy")?.standing).toBe("skipped")
    expect(reading.standings).toEqual({ read: 3, skipped: 2, unknown: 0 })
  })

  /**
   * The sentence `PartStanding` now carries, held to the arithmetic rather than
   * left as a claim: `skipped` and the view floor are read off the same rows, so
   * a window cannot report visits and no part at once. The portal lane designed,
   * wrote and commented a state for it before a test found it unreachable.
   */
  it("cannot report every part skipped, because the rows that would say so are the rows that set the floor", () => {
    const reading = pageReadingOf(
      treeOf(PAGE),
      [tally("page", "loom.stack", { views: 9, reached: 9 })],
      NOTHING_DECLARED
    )

    expect(reading.standings.skipped).toBe(reading.parts.length - 1)
    expect(reading.standings).toEqual({ read: 1, skipped: 4, unknown: 0 })
  })

  it("reports every part skipped only when a row names a node the page does not have, which the reading also says", () => {
    const reading = pageReadingOf(
      treeOf(PAGE),
      [tally("gone", "loom.section", { views: 9, reached: 9 })],
      NOTHING_DECLARED
    )

    expect(reading.standings).toEqual({ read: 0, skipped: 5, unknown: 0 })
    expect(reading.orphaned).toEqual([nodeId("gone")])
  })

  it("will not call a part skipped when something other than a view named it", () => {
    const reading = pageReadingOf(
      treeOf(PAGE),
      [
        tally("page", "loom.stack", { views: 6, reached: 6 }),
        tally("pricing", "loom.section", { views: 2, engaged: 2 }),
      ],
      NOTHING_DECLARED
    )

    expect(partFor(reading, "pricing")?.standing).toBe("unknown")
    expect(partFor(reading, "footer")?.standing).toBe("skipped")
  })

  /**
   * A batch with no view key adds occurrences and no views (0146), so a window
   * of nothing but uncorrelated batches has counters and no denominator. The
   * reading must not read that as a page everybody skipped.
   */
  it("holds back every standing when the counters carry occurrences and no views", () => {
    const reading = pageReadingOf(
      treeOf(PAGE),
      [tally("hero", "loom.heading", { dwellMs: 4_000 })],
      NOTHING_DECLARED
    )

    expect(reading.views).toBe(0)
    expect(reading.standings).toEqual({ read: 0, skipped: 0, unknown: 5 })
    expect(partFor(reading, "hero")?.counters?.dwellMs).toBe(4_000)
  })

  it("takes the view floor from the largest row, never the sum of them", () => {
    const reading = pageReadingOf(
      treeOf(PAGE),
      [
        tally("page", "loom.stack", { views: 9, reached: 9 }),
        tally("hero", "loom.heading", { views: 8, reached: 8 }),
        tally("pricing", "loom.section", { views: 3, reached: 3 }),
      ],
      NOTHING_DECLARED
    )

    expect(reading.views).toBe(9)
  })
})

describe("what the registry adds", () => {
  it("names the role a part's type declared, and null where it declared none", () => {
    const reading = pageReadingOf(
      treeOf(PAGE),
      [],
      declaring({}, { heading: ["loom.heading"] })
    )

    expect(partFor(reading, "hero")?.role).toBe("heading")
    expect(partFor(reading, "pricing")?.role).toBeNull()
  })

  it("reads a part's own declared copy and its direct text children, and nothing below", () => {
    const reading = pageReadingOf(
      treeOf(PAGE),
      [],
      declaring({ "loom.heading": ["value"], "loom.button": ["label"], "loom.section": [] })
    )

    expect(partFor(reading, "hero")?.copy.words).toEqual(["Winter range"])
    expect(partFor(reading, "footer")?.copy.words).toEqual(["All rights reserved"])
    expect(partFor(reading, "pricing")?.copy.words).toEqual([])
    expect(partFor(reading, "buy")?.copy.words).toEqual(["Buy"])
  })

  it("names what nobody declared rather than reporting a part as wordless", () => {
    const reading = pageReadingOf(treeOf(PAGE), [], NOTHING_DECLARED)

    expect(partFor(reading, "hero")?.copy.unread).toEqual([
      { nodeId: nodeId("hero"), type: primitiveType("loom.heading"), props: ["value"] },
    ])
    expect(partFor(reading, "hero")?.copy.words).toEqual([])
  })

  /**
   * The partition that makes a role row addable: every word on the page belongs
   * to exactly one part, so no caller can read a headline twice by adding a
   * band to the heading inside it.
   */
  it("partitions the page's words across its parts exactly once", () => {
    const declarations = declaring({
      "loom.heading": ["value"],
      "loom.button": ["label"],
      "loom.section": [],
      "loom.stack": [],
    })
    const reading = pageReadingOf(treeOf(PAGE), [], declarations)

    const fromParts = reading.parts.flatMap((part) => [...part.copy.words])

    expect(fromParts).toEqual(copyIn(PAGE, declarations).words)
  })
})

describe("the words readers reached", () => {
  it("takes the copy of the parts that came into view, in reading order", () => {
    const reading = pageReadingOf(
      treeOf(PAGE),
      [
        tally("page", "loom.stack", { views: 5, reached: 5 }),
        tally("hero", "loom.heading", { views: 5, reached: 5 }),
        tally("buy", "loom.button", { views: 1, reached: 1 }),
      ],
      declaring({ "loom.heading": ["value"], "loom.button": ["label"], "loom.section": [] })
    )

    expect(wordsReadIn(reading)).toEqual(["Winter range", "Buy"])
  })

  it("is empty for a page nobody was measured on, rather than the page's words", () => {
    const reading = pageReadingOf(
      treeOf(PAGE),
      [],
      declaring({ "loom.heading": ["value"], "loom.button": ["label"] })
    )

    expect(wordsReadIn(reading)).toEqual([])
  })
})

describe("the role rows", () => {
  it("carries a row for every role in the vocabulary and one for the parts with none", () => {
    const reading = pageReadingOf(treeOf(PAGE), [], declaring({}, { heading: ["loom.heading"] }))

    expect(reading.roles.map((row) => row.role)).toEqual(["heading", null])
    expect(roleRow(reading, "heading")?.parts).toBe(1)
    expect(roleRow(reading, null)?.parts).toBe(4)
  })

  it("counts how many of a role's parts were read and how many were skipped", () => {
    const page = element("page", "loom.stack", {}, [
      element("hero", "loom.heading", { value: "One" }),
      element("deep", "loom.heading", { value: "Two" }),
    ])
    const reading = pageReadingOf(
      treeOf(page),
      [
        tally("page", "loom.stack", { views: 10, reached: 10 }),
        tally("hero", "loom.heading", { views: 10, reached: 10, dwellMs: 8_000 }),
      ],
      declaring({}, { heading: ["loom.heading"] })
    )

    expect(roleRow(reading, "heading")).toMatchObject({
      parts: 2,
      standings: { read: 1, skipped: 1, unknown: 0 },
      dwellMs: 8_000,
    })
  })

  /**
   * The double-count case this module can actually have. One press inside a
   * band is one `activations` on the button and one `engaged` on the band, by
   * design (0167) — so a role row that added both would report two things a
   * reader did and the row would look right.
   */
  it("adds occurrences and never the view counts that would count one press twice", () => {
    const reading = pageReadingOf(
      treeOf(PAGE),
      [
        tally("page", "loom.stack", { views: 3, reached: 3, engaged: 3 }),
        tally("pricing", "loom.section", { views: 3, reached: 3, engaged: 3 }),
        tally("buy", "loom.button", { views: 3, reached: 3, activations: 3 }),
      ],
      NOTHING_DECLARED
    )

    expect(roleRow(reading, null)?.activations).toBe(3)
    expect(Object.keys(roleRow(reading, null) ?? {})).not.toContain("engaged")
    expect(Object.keys(roleRow(reading, null) ?? {})).not.toContain("reached")
    expect(Object.keys(roleRow(reading, null) ?? {})).not.toContain("views")
  })

  it("sums the occurrence counters a deployment opens the portal for", () => {
    const reading = pageReadingOf(
      treeOf(PAGE),
      [
        tally("page", "loom.stack", { views: 4, reached: 4 }),
        tally("pricing", "loom.section", { views: 4, reached: 4, dwellMs: 12_000, opens: 2, closes: 1 }),
        tally("buy", "loom.button", { views: 2, reached: 2, activations: 5, completions: 3 }),
      ],
      NOTHING_DECLARED
    )

    expect(roleRow(reading, null)).toMatchObject({
      dwellMs: 12_000,
      opens: 2,
      closes: 1,
      activations: 5,
      completions: 3,
    })
  })
})

describe("counters that do not belong to the tree they were handed with", () => {
  it("ignores another tree's rows and says how many it dropped", () => {
    const reading = pageReadingOf(
      treeOf(PAGE),
      [
        tally("hero", "loom.heading", { views: 2, reached: 2 }),
        { ...tally("pricing", "loom.section", { views: 9, reached: 9 }), treeId: OTHER_TREE },
      ],
      NOTHING_DECLARED
    )

    expect(reading.foreign).toBe(1)
    expect(partFor(reading, "pricing")?.standing).toBe("skipped")
  })

  it("ignores another revision's rows, which is what keeps before and after apart", () => {
    const reading = pageReadingOf(
      treeOf(PAGE, 2),
      [
        tally("hero", "loom.heading", { views: 7, reached: 7 }),
        { ...tally("pricing", "loom.section", { views: 7, reached: 7 }), revision: 2 },
      ],
      NOTHING_DECLARED
    )

    expect(reading.foreign).toBe(1)
    expect(reading.revision).toBe(2)
    expect(partFor(reading, "hero")?.counters).toBeUndefined()
    expect(partFor(reading, "pricing")?.standing).toBe("read")
  })

  it("names a row whose node this revision does not contain, because the pair is then wrong", () => {
    const reading = pageReadingOf(
      treeOf(PAGE),
      [
        tally("page", "loom.stack", { views: 5, reached: 5 }),
        tally("gone", "loom.section", { views: 5, reached: 5 }),
      ],
      NOTHING_DECLARED
    )

    expect(reading.orphaned).toEqual([nodeId("gone")])
  })

  it("keeps the first of two rows for one node and reports the rest rather than halving a number", () => {
    const reading = pageReadingOf(
      treeOf(PAGE),
      [
        tally("hero", "loom.heading", { views: 3, reached: 3, dwellMs: 1_000 }),
        tally("hero", "loom.heading", { views: 2, reached: 2, dwellMs: 500 }),
      ],
      NOTHING_DECLARED
    )

    expect(reading.duplicated).toEqual([nodeId("hero")])
    expect(partFor(reading, "hero")?.counters?.dwellMs).toBe(1_000)
    expect(reading.views).toBe(3)
  })
})
