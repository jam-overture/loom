import { describe, expect, it } from "vitest"

import type { JsonObject } from "../json.js"
import type { PrimitiveRole } from "../role.js"
import {
  nodeId,
  OTHER_TREE,
  primitiveType,
  RIDERS,
  SKIERS,
  TREE,
} from "../testing/reader-signal-contract.js"
import type { ElementNode, LoomNode, SlotNode, TextNode } from "../tree/node.js"
import { TREE_SCHEMA_VERSION, type LoomTree } from "../tree/tree.js"

import {
  actedMostIn,
  beneathOf,
  insideReadingOf,
  insideShareIn,
  type ActedKind,
  type InsidePart,
  type InsideReading,
  type PartDeclarations,
  type StoredActed,
  type StoredActedHour,
} from "./index.js"

/**
 * The join is a pure function of a tree, one read of the hourly counter and
 * what the registry declared, so those three are the whole of the fixtures.
 * Nothing here touches a store, a clock or a browser.
 */

const HOUR = 60 * 60 * 1000

/** Midnight on 2026-11-08 UTC, and the range is that day. */
const DAY = Date.UTC(2026, 10, 8)
const RANGE = { from: DAY, to: DAY + 24 * HOUR }

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

const NOTHING_DECLARED: PartDeclarations = {
  copyFor: () => undefined,
  typesWithRole: () => [],
}

const declaring = (
  copy: Readonly<Record<string, readonly string[]>>,
  roles: Readonly<Partial<Record<PrimitiveRole, readonly string[]>>> = {}
): PartDeclarations => ({
  copyFor: (type) => copy[type],
  typesWithRole: (role) => (roles[role] ?? []).map((type) => primitiveType(type)),
})

const hour = (
  name: string,
  type: string,
  at: number,
  counts: Partial<Omit<StoredActedHour, "treeId" | "revision" | "nodeId" | "type" | "hour">> = {}
): StoredActedHour => ({
  treeId: TREE,
  revision: 1,
  nodeId: nodeId(name),
  type: primitiveType(type),
  hour: at,
  audienceId: SKIERS,
  updatedAt: "2026-11-08T00:00:00.000Z",
  activations: 0,
  opens: 0,
  closes: 0,
  completions: 0,
  ...counts,
})

const stored = (hours: readonly StoredActedHour[], begins?: number): StoredActed => ({
  hours,
  ...(begins === undefined ? {} : { begins }),
})

const partFor = (reading: InsideReading, name: string): InsidePart | undefined =>
  reading.parts.find((part) => part.nodeId === nodeId(name))

/** The part, or a failure naming it — a test that reads `undefined.own` says nothing useful. */
const part = (reading: InsideReading, name: string): InsidePart => {
  const found = partFor(reading, name)

  if (found === undefined) throw new Error(`no part ${name} in the reading`)

  return found
}

/**
 * A second spelling of the kind-to-counter rule, on purpose: `actedCountOf` is
 * the module under test's own, so an invariant checked with it would hold even
 * if that rule were wrong.
 */
const countOf = (counts: InsidePart["own"], kind: ActedKind): number => {
  switch (kind) {
    case "activated":
      return counts.activations
    case "disclosed":
      return counts.opens
    case "completed":
      return counts.completions
  }
}

/**
 * A page whose pricing band holds a row that holds a button, so a press lands
 * three parts deep, and a sign-up band holding a form. The slot between the
 * band and the row is deliberate: a slot is a node with children and is never a
 * part.
 */
const PAGE = element("page", "loom.stack", {}, [
  element("title", "loom.heading", { text: "Plans" }, [text("titletext", "Plans")]),
  element("pricing", "loom.band", {}, [
    slot("pricingslot", [
      element("row", "loom.row", {}, [
        element("buy", "loom.button", { label: "Buy now" }, []),
        element("compare", "loom.link", { label: "Compare" }, []),
      ]),
    ]),
  ]),
  element("signup", "loom.band", {}, [
    element("form", "loom.form", {}, []),
    element("faq", "loom.disclosure", {}, []),
  ]),
])

const LABELS = declaring(
  {
    "loom.heading": ["text"],
    "loom.button": ["label"],
    "loom.link": ["label"],
  },
  { heading: ["loom.heading"] }
)

const readingOf = (
  hours: readonly StoredActedHour[],
  declarations: PartDeclarations = LABELS,
  tree: LoomTree = treeOf(PAGE)
): InsideReading => insideReadingOf(tree, stored(hours), declarations, RANGE)

describe("what readers did inside a part", () => {
  it("credits a press to the part it was on and to every part around it, once each", () => {
    const reading = readingOf([hour("buy", "loom.button", DAY + HOUR, { activations: 3 })])

    expect(partFor(reading, "buy")?.own.activations).toBe(3)
    expect(partFor(reading, "buy")?.inside.activations).toBe(3)
    expect(partFor(reading, "row")?.inside.activations).toBe(3)
    expect(partFor(reading, "pricing")?.inside.activations).toBe(3)
    expect(partFor(reading, "page")?.inside.activations).toBe(3)
    expect(reading.total.activations).toBe(3)
  })

  it("leaves a part's own count alone when the acting happened inside it", () => {
    const reading = readingOf([hour("buy", "loom.button", DAY + HOUR, { activations: 3 })])

    expect(partFor(reading, "pricing")?.own.activations).toBe(0)
    expect(partFor(reading, "row")?.own.activations).toBe(0)
    expect(beneathOf(part(reading, "pricing"), "activated")).toBe(3)
    expect(beneathOf(part(reading, "buy"), "activated")).toBe(0)
  })

  it("does not credit a part the acting happened beside", () => {
    const reading = readingOf([hour("buy", "loom.button", DAY + HOUR, { activations: 3 })])

    expect(partFor(reading, "signup")?.inside.activations).toBe(0)
    expect(partFor(reading, "title")?.inside.activations).toBe(0)
  })

  /**
   * The invariant the whole reading rests on, asserted over every part rather
   * than at the one node a case happens to be about: an action is in exactly
   * one `own` and in the `inside` of each of that part's ancestors, so a part's
   * total is its own plus the totals of the parts immediately inside it.
   */
  it("holds a part's total to its own count plus the totals immediately inside it", () => {
    const reading = readingOf([
      hour("buy", "loom.button", DAY + HOUR, { activations: 4, completions: 1 }),
      hour("compare", "loom.link", DAY + 2 * HOUR, { activations: 2 }),
      hour("pricing", "loom.band", DAY + 2 * HOUR, { activations: 1 }),
      hour("form", "loom.form", DAY + 3 * HOUR, { completions: 5 }),
      hour("faq", "loom.disclosure", DAY + 3 * HOUR, { opens: 9, closes: 8 }),
    ])

    for (const part of reading.parts) {
      const immediate = reading.parts.filter((other) => other.withinId === part.nodeId)
      const kinds: readonly ActedKind[] = ["activated", "disclosed", "completed"]

      for (const kind of kinds) {
        const summed = immediate.reduce(
          (total, other) => total + countOf(other.inside, kind),
          countOf(part.own, kind)
        )

        expect(countOf(part.inside, kind)).toBe(summed)
      }
    }
  })

  it("adds every part's own count up to the page's total, and no more", () => {
    const reading = readingOf([
      hour("buy", "loom.button", DAY + HOUR, { activations: 4, completions: 1 }),
      hour("compare", "loom.link", DAY + 2 * HOUR, { activations: 2 }),
      hour("pricing", "loom.band", DAY + 2 * HOUR, { activations: 1 }),
      hour("faq", "loom.disclosure", DAY + 3 * HOUR, { opens: 9, closes: 8 }),
    ])

    expect(reading.total).toEqual({ activations: 7, opens: 9, closes: 8, completions: 1 })
    expect(partFor(reading, "page")?.inside).toEqual(reading.total)
    expect(reading.parts.reduce((sum, part) => sum + part.own.activations, 0)).toBe(7)
  })

  it("adds a part's hours together rather than taking the last of them", () => {
    const reading = readingOf([
      hour("buy", "loom.button", DAY + HOUR, { activations: 2 }),
      hour("buy", "loom.button", DAY + 5 * HOUR, { activations: 3 }),
      hour("buy", "loom.button", DAY + 9 * HOUR, { activations: 1 }),
    ])

    expect(partFor(reading, "buy")?.own.activations).toBe(6)
    expect(partFor(reading, "pricing")?.inside.activations).toBe(6)
    expect(reading.counted).toBe(3)
  })

  it("counts a press inside a slot as inside the part the slot is in", () => {
    const reading = readingOf([hour("buy", "loom.button", DAY + HOUR, { activations: 1 })])

    expect(partFor(reading, "row")?.withinId).toBe(nodeId("pricing"))
    expect(reading.parts.map((part) => part.nodeId)).not.toContain(nodeId("pricingslot"))
  })

  it("names the nearest addressed ancestor and not the tree parent", () => {
    const reading = readingOf([])

    expect(partFor(reading, "page")?.withinId).toBeNull()
    expect(partFor(reading, "pricing")?.withinId).toBe(nodeId("page"))
    expect(partFor(reading, "buy")?.withinId).toBe(nodeId("row"))
    expect(partFor(reading, "faq")?.withinId).toBe(nodeId("signup"))
  })

  it("counts the parts in each part's subtree, itself included", () => {
    const reading = readingOf([])

    expect(partFor(reading, "buy")?.parts).toBe(1)
    expect(partFor(reading, "row")?.parts).toBe(3)
    expect(partFor(reading, "pricing")?.parts).toBe(4)
    expect(partFor(reading, "signup")?.parts).toBe(3)
    expect(partFor(reading, "page")?.parts).toBe(9)
  })

  it("lists every part in reading order, so a part is preceded by what it is inside", () => {
    const reading = readingOf([])
    const order = reading.parts.map((part) => part.nodeId)

    expect(order).toEqual(
      ["page", "title", "pricing", "row", "buy", "compare", "signup", "form", "faq"].map(nodeId)
    )

    for (const part of reading.parts) {
      if (part.withinId === null) continue

      expect(order.indexOf(part.withinId)).toBeLessThan(order.indexOf(part.nodeId))
    }
  })

  it("says what each part plays and what it says itself", () => {
    const reading = readingOf([])

    expect(partFor(reading, "title")?.role).toBe("heading")
    expect(partFor(reading, "buy")?.role).toBeNull()
    expect([...(partFor(reading, "buy")?.copy.words ?? [])]).toEqual(["Buy now"])
    expect([...(partFor(reading, "pricing")?.copy.words ?? [])]).toEqual([])
  })

  it("reads no words where nothing declared any, and says so rather than guessing", () => {
    const reading = readingOf(
      [hour("buy", "loom.button", DAY + HOUR, { activations: 1 })],
      NOTHING_DECLARED
    )

    expect([...(partFor(reading, "buy")?.copy.words ?? [])]).toEqual([])
    expect([...(partFor(reading, "buy")?.copy.unread ?? [])]).toEqual([
      { nodeId: nodeId("buy"), type: primitiveType("loom.button"), props: ["label"] },
    ])
  })
})

describe("the rows a reading will not credit", () => {
  it("drops a row of another tree and counts it", () => {
    const reading = readingOf([
      { ...hour("buy", "loom.button", DAY + HOUR, { activations: 3 }), treeId: OTHER_TREE },
      hour("buy", "loom.button", DAY + HOUR, { activations: 1 }),
    ])

    expect(reading.foreign).toBe(1)
    expect(reading.counted).toBe(1)
    expect(reading.total.activations).toBe(1)
  })

  /**
   * The case that matters most, because the numbers stay plausible: a node's
   * ancestry is a fact about one revision, so a row from another one would be
   * credited to whatever contains that node now.
   */
  it("drops a row of another revision, however well its node fits this tree", () => {
    const reading = readingOf([
      { ...hour("buy", "loom.button", DAY + HOUR, { activations: 9 }), revision: 2 },
    ])

    expect(reading.foreign).toBe(1)
    expect(reading.total.activations).toBe(0)
    expect(partFor(reading, "pricing")?.inside.activations).toBe(0)
  })

  it("ignores an hour outside the range and counts it apart from a foreign row", () => {
    const reading = readingOf([
      hour("buy", "loom.button", DAY - HOUR, { activations: 5 }),
      hour("buy", "loom.button", DAY + 24 * HOUR, { activations: 7 }),
      hour("buy", "loom.button", DAY + HOUR, { activations: 2 }),
    ])

    expect(reading.outside).toBe(2)
    expect(reading.foreign).toBe(0)
    expect(reading.total.activations).toBe(2)
  })

  it("keeps the hour the range begins on and drops the hour it ends on", () => {
    const reading = readingOf([
      hour("buy", "loom.button", DAY, { activations: 1 }),
      hour("buy", "loom.button", DAY + 23 * HOUR, { activations: 1 }),
      hour("buy", "loom.button", DAY + 24 * HOUR, { activations: 1 }),
    ])

    expect(reading.total.activations).toBe(2)
    expect(reading.outside).toBe(1)
  })

  it("names a node this revision does not have rather than crediting it to nothing", () => {
    const reading = readingOf([
      hour("ghost", "loom.button", DAY + HOUR, { activations: 4 }),
      hour("buy", "loom.button", DAY + HOUR, { activations: 1 }),
    ])

    expect(reading.orphaned).toEqual([nodeId("ghost")])
    expect(reading.total.activations).toBe(1)
    expect(partFor(reading, "page")?.inside.activations).toBe(1)
  })

  it("sums two forms of a page and says which they were", () => {
    const reading = readingOf([
      hour("buy", "loom.button", DAY + HOUR, { activations: 2 }),
      { ...hour("buy", "loom.button", DAY + HOUR, { activations: 3 }), audienceId: RIDERS },
    ])

    expect([...reading.audiences].sort()).toEqual([RIDERS, SKIERS])
    expect(partFor(reading, "buy")?.own.activations).toBe(5)
  })

  it("carries the hour counting began through, and says nothing where nothing has been", () => {
    const begun = insideReadingOf(treeOf(PAGE), stored([], DAY - 48 * HOUR), LABELS, RANGE)

    expect(begun.begins).toBe(DAY - 48 * HOUR)
    expect(insideReadingOf(treeOf(PAGE), stored([]), LABELS, RANGE).begins).toBeUndefined()
  })

  it("reads a page nobody acted on as noughts rather than as nothing", () => {
    const reading = readingOf([])

    expect(reading.parts).toHaveLength(9)
    expect(reading.total).toEqual({ activations: 0, opens: 0, closes: 0, completions: 0 })
    expect(reading.counted).toBe(0)
    expect(reading.orphaned).toEqual([])
  })
})

describe("the questions a caller asks of it", () => {
  const BUSY = [
    hour("buy", "loom.button", DAY + HOUR, { activations: 9 }),
    hour("compare", "loom.link", DAY + HOUR, { activations: 4 }),
    hour("pricing", "loom.band", DAY + 2 * HOUR, { activations: 4 }),
    hour("form", "loom.form", DAY + 3 * HOUR, { completions: 6 }),
    hour("faq", "loom.disclosure", DAY + 4 * HOUR, { opens: 7, closes: 6 }),
  ]

  it("names the parts readers acted on most, by what they did to the part itself", () => {
    const pressed = actedMostIn(readingOf(BUSY), "activated")

    expect(pressed.map((part) => part.nodeId)).toEqual(
      ["buy", "pricing", "compare"].map(nodeId)
    )
  })

  it("does not let a band outrank the button inside it", () => {
    const pressed = actedMostIn(
      readingOf([hour("buy", "loom.button", DAY + HOUR, { activations: 2 })]),
      "activated"
    )

    expect(pressed.map((part) => part.nodeId)).toEqual([nodeId("buy")])
  })

  it("keeps reading order where two parts were acted on equally", () => {
    const pressed = actedMostIn(
      readingOf([
        hour("compare", "loom.link", DAY + HOUR, { activations: 2 }),
        hour("pricing", "loom.band", DAY + HOUR, { activations: 2 }),
      ]),
      "activated"
    )

    expect(pressed.map((part) => part.nodeId)).toEqual(["pricing", "compare"].map(nodeId))
  })

  it("leaves out a part nobody acted on in that kind, and takes a limit", () => {
    const reading = readingOf(BUSY)

    expect(actedMostIn(reading, "completed").map((part) => part.nodeId)).toEqual([nodeId("form")])
    expect(actedMostIn(reading, "disclosed").map((part) => part.nodeId)).toEqual([nodeId("faq")])
    expect(actedMostIn(reading, "activated", 2).map((part) => part.nodeId)).toEqual(
      ["buy", "pricing"].map(nodeId)
    )
  })

  it("reads a disclosure's openings and never its shuttings, as a goal does", () => {
    const reading = readingOf(BUSY)

    expect(partFor(reading, "faq")?.own.closes).toBe(6)
    expect(actedMostIn(reading, "disclosed")[0]?.own.opens).toBe(7)
    expect(insideShareIn(reading, part(reading, "signup"), "disclosed")).toBe(1)
  })

  it("says what share of the page's acting happened inside a part", () => {
    const reading = readingOf(BUSY)

    expect(insideShareIn(reading, part(reading, "pricing"), "activated")).toBe(1)
    expect(insideShareIn(reading, part(reading, "buy"), "activated")).toBeCloseTo(
      9 / 17
    )
    expect(insideShareIn(reading, part(reading, "signup"), "activated")).toBe(0)
  })

  /**
   * A nought would read as *this part gets none of them*, which is a claim
   * about the part; what is true is that there are none to share out.
   */
  it("withholds the share where readers did nothing of that kind on the page", () => {
    const reading = readingOf([hour("buy", "loom.button", DAY + HOUR, { activations: 1 })])

    expect(insideShareIn(reading, part(reading, "buy"), "completed")).toBeNull()
    expect(insideShareIn(reading, part(reading, "page"), "activated")).toBe(1)
  })
})

describe("the shapes of page that could break the sum", () => {
  it("reads a page whose root is the only part", () => {
    const only = treeOf(element("page", "loom.stack", {}, [text("words", "Alone")]))
    const reading = insideReadingOf(
      only,
      stored([hour("page", "loom.stack", DAY + HOUR, { activations: 2 })]),
      NOTHING_DECLARED,
      RANGE
    )

    expect(reading.parts).toHaveLength(1)
    expect(reading.total.activations).toBe(2)
    expect(partFor(reading, "page")?.inside.activations).toBe(2)
    expect(beneathOf(part(reading, "page"), "activated")).toBe(0)
  })

  it("reads a part nested as deep as a page is long, crediting each level once", () => {
    const depth = 400
    let node = element("leaf", "loom.button", {}, [])

    for (let level = depth - 1; level >= 0; level -= 1) {
      node = element(`level${level.toString()}`, "loom.band", {}, [node])
    }

    const reading = insideReadingOf(
      treeOf(node),
      stored([hour("leaf", "loom.button", DAY + HOUR, { activations: 1 })]),
      NOTHING_DECLARED,
      RANGE
    )

    expect(reading.parts).toHaveLength(depth + 1)
    expect(reading.total.activations).toBe(1)
    expect(partFor(reading, "level0")?.inside.activations).toBe(1)
    expect(partFor(reading, "level0")?.parts).toBe(depth + 1)
    expect(reading.parts.filter((part) => part.inside.activations === 1)).toHaveLength(depth + 1)
  })

  it("reads a wide page without counting a sibling's acting as another's", () => {
    const width = 2_000
    const children = Array.from({ length: width }, (_unused, index) =>
      element(`child${index.toString()}`, "loom.button", {}, [])
    )
    const reading = insideReadingOf(
      treeOf(element("page", "loom.stack", {}, children)),
      stored(
        children.map((child, index) => ({
          ...hour(`child${index.toString()}`, "loom.button", DAY + HOUR, { activations: 1 }),
          nodeId: child.id,
        }))
      ),
      NOTHING_DECLARED,
      RANGE
    )

    expect(reading.total.activations).toBe(width)
    expect(partFor(reading, "page")?.inside.activations).toBe(width)
    expect(partFor(reading, "child7")?.inside.activations).toBe(1)
    expect(actedMostIn(reading, "activated", 3)).toHaveLength(3)
  })
})
