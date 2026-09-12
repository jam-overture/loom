import { describe, expect, it } from "vitest"

import {
  nodeIdSchema,
  primitiveTypeSchema,
  slotNameSchema,
  treeIdSchema,
  type ElementNode,
  type LoomNode,
  type LoomTree,
  type SlotNode,
  type TreeDelta,
} from "@loom/runtime"

import {
  firstNamed,
  namesInOperations,
  namesInTree,
  nounOf,
  partNameOf,
  partReading,
  placeNameOf,
  saidBy,
  subjectFor,
} from "./part-name"

const nodeId = (id: string) => nodeIdSchema.parse(id)
const type = (value: string) => primitiveTypeSchema.parse(value)

const text = (id: string, value: string): LoomNode => ({ kind: "text", id: nodeId(id), value })

const element = (
  id: string,
  primitive: string,
  children: readonly LoomNode[] = []
): ElementNode => ({
  kind: "element",
  id: nodeId(id),
  type: type(primitive),
  props: {},
  children,
})

const slot = (id: string, name: string): SlotNode => ({
  kind: "slot",
  id: nodeId(id),
  name: slotNameSchema.parse(name),
  children: [],
})

const treeOf = (root: ElementNode): LoomTree => ({
  schemaVersion: 1,
  treeId: treeIdSchema.parse("t_1"),
  revision: 1,
  root,
})

describe("nounOf", () => {
  /**
   * The registry's own word, with the namespace dropped. Not a table: the four
   * primitives this deployment registers would be easy to list and every other
   * deployment's would not.
   */
  it("takes the local name out of a registered type", () => {
    expect(nounOf("loom.card")).toBe("card")
    expect(nounOf("loom.heading")).toBe("heading")
  })

  it("says a hyphenated name the way a person says it", () => {
    expect(nounOf("acme.buy-button")).toBe("buy button")
  })

  /** A host may namespace more deeply than Loom does; the last segment is the noun. */
  it("takes the last segment of a deeper namespace", () => {
    expect(nounOf("acme.commerce.price-tag")).toBe("price tag")
  })

  /** A type with no namespace at all is its own noun. */
  it("leaves an unnamespaced type alone", () => {
    expect(nounOf("banner")).toBe("banner")
  })
})

describe("saidBy", () => {
  it("reads the words a leaf says", () => {
    expect(saidBy(text("n_t", "Autumn arrivals"))).toBe("Autumn arrivals")
  })

  /**
   * The defect this function exists for. The runtime's `textOf` concatenates,
   * which is correct for the exact characters under a node and wrong for a
   * name: a card holding a heading and a paragraph has no whitespace between
   * them in the tree, because the gap between them is a box in the layout
   * rather than a character in the content.
   */
  it("joins two runs with a space rather than running them together", () => {
    const card = element("n_card", "loom.card", [
      element("n_h", "loom.heading", [text("n_t1", "Autumn arrivals")]),
      element("n_p", "loom.prose", [text("n_t2", "Free returns on everything.")]),
    ])

    expect(saidBy(card)).toBe("Autumn arrivals Free returns on everything.")
    expect(saidBy(card)).not.toContain("arrivalsFree")
  })

  it("collapses the whitespace a run happens to carry", () => {
    expect(saidBy(text("n_t", "  Autumn\n  arrivals  "))).toBe("Autumn arrivals")
  })

  it("says nothing for a part that says nothing", () => {
    expect(saidBy(element("n_card", "loom.card"))).toBe("")
  })
})

describe("partNameOf", () => {
  it("names a part by what it is and what it says", () => {
    expect(partNameOf(element("n_h", "loom.heading", [text("n_t", "Autumn arrivals")]))).toEqual({
      name: "the heading “Autumn arrivals”",
      nodeId: "n_h",
    })
  })

  /** A part that says nothing is still a part, and still has a category. */
  it("names a silent part by what it is alone", () => {
    expect(partNameOf(element("n_card", "loom.card"))).toEqual({
      name: "the card",
      nodeId: "n_card",
    })
  })

  it("keeps a slot's own name, which is the one kind of node that has one", () => {
    expect(partNameOf(slot("n_s", "body"))).toEqual({ name: "the body space", nodeId: "n_s" })
  })

  it("calls text the words it says", () => {
    expect(partNameOf(text("n_t", "Welcome"))).toEqual({
      name: "the words “Welcome”",
      nodeId: "n_t",
    })
  })

  /** A long headline is trimmed to sit inside a sentence; the id never is. */
  it("shortens a long quotation and marks that it did", () => {
    const long = "Everything you have ever wanted, and several things you have not"
    const named = partNameOf(element("n_h", "loom.heading", [text("n_t", long)]))

    expect(named.name.length).toBeLessThan(long.length)
    expect(named.name).toContain("…")
    expect(named.nodeId).toBe("n_h")
  })

  /**
   * The rule the whole module is written under, asserted rather than assumed:
   * the name is added to the id and never put in its place.
   */
  it("never returns a name that is the id", () => {
    for (const node of [
      element("n_card", "loom.card"),
      element("n_h", "loom.heading", [text("n_t", "Hi")]),
      text("n_t", "Hi"),
      slot("n_s", "body"),
    ]) {
      const named = partNameOf(node)

      expect(named.name).not.toContain(named.nodeId)
      expect(named.nodeId).toBe(node.id)
    }
  })
})

describe("placeNameOf", () => {
  it("names a place by what it is", () => {
    expect(placeNameOf(element("n_band", "loom.band"))).toBe("the band")
  })

  /**
   * The defect this function exists for, pinned with the two readings side by
   * side.
   *
   * `saidBy` walks the subtree, which is what lets a card be named by the
   * heading inside it — and what makes *the page “Autumn arrivals Free
   * returns”* the reading of the page a change lands in. A container's words
   * are its contents' words, so quoting a place names the contents and claims
   * to name the place. The noun alone is the part of that reading which is true
   * at every depth.
   */
  it("does not quote a container by the words of everything inside it", () => {
    const page = element("n_page", "loom.page", [
      element("n_h", "loom.heading", [text("n_t1", "Autumn arrivals")]),
      element("n_p", "loom.prose", [text("n_t2", "Free returns")]),
    ])

    expect(partNameOf(page).name).toBe("the page “Autumn arrivals Free returns”")
    expect(placeNameOf(page)).toBe("the page")
  })

  it("keeps a slot's own name, exactly as a subject does", () => {
    expect(placeNameOf(slot("n_s", "body"))).toBe("the body space")
  })

  it("calls text the words without quoting them", () => {
    expect(placeNameOf(text("n_t", "Welcome"))).toBe("the words")
  })

  /**
   * A place carries no identifier, and that is the other half of the rule. The
   * id that matters on a row belongs to the part being changed; one on every
   * noun in the sentence is three identifiers where the reader needed one.
   */
  it("never carries an id", () => {
    for (const node of [
      element("n_card", "loom.card", [text("n_t", "Hi")]),
      text("n_t", "Hi"),
      slot("n_s", "body"),
    ]) {
      expect(placeNameOf(node)).not.toContain(node.id)
    }
  })
})

describe("partReading", () => {
  /**
   * The component renders the two halves as two elements and this is the same
   * pair as text. Asserted whole, because a missing space between them is the
   * join that has produced four defects in this lane.
   */
  it("reads as the words then the id, with one space between them", () => {
    expect(partReading({ name: "the card “Hi”", nodeId: "n_card" })).toBe("the card “Hi” n_card")
  })
})

describe("namesInTree", () => {
  it("names every part of a tree, by id", () => {
    const names = namesInTree(
      treeOf(
        element("n_root", "loom.page", [
          element("n_h", "loom.heading", [text("n_t", "Autumn arrivals")]),
        ])
      )
    )

    expect(names.get("n_root")?.name).toBe("the page “Autumn arrivals”")
    expect(names.get("n_h")?.name).toBe("the heading “Autumn arrivals”")
    expect(names.get("n_t")?.name).toBe("the words “Autumn arrivals”")
  })
})

describe("namesInOperations", () => {
  const card: LoomNode = element("n_card", "loom.card", [
    element("n_h", "loom.heading", [text("n_t", "Autumn arrivals")]),
  ])

  /**
   * The case nothing else in Loom can answer. An `insert` is the only operation
   * that carries a node, which is why this is worth reading on the *inverse* of
   * a removal: the forward delta holds the id of what went and the inverse
   * holds the thing itself.
   */
  it("names every part inside an insert, not only the node it places", () => {
    const names = namesInOperations([
      { op: "insert", parentId: nodeId("n_root"), index: 0, node: card },
    ])

    expect(names.get("n_card")?.name).toBe("the card “Autumn arrivals”")
    expect(names.get("n_h")?.name).toBe("the heading “Autumn arrivals”")
    expect(names.get("n_t")?.name).toBe("the words “Autumn arrivals”")
  })

  it("finds nothing in the operations that carry no node", () => {
    const operations: TreeDelta["operations"] = [
      { op: "remove", nodeId: nodeId("n_card") },
      { op: "move", nodeId: nodeId("n_h"), parentId: nodeId("n_root"), index: 1 },
      { op: "configure", nodeId: nodeId("n_h"), set: { level: 2 }, unset: [] },
    ]

    expect(namesInOperations(operations).size).toBe(0)
  })
})

describe("firstNamed", () => {
  const now = new Map([["n_h", { name: "the heading “Autumn arrivals”", nodeId: "n_h" }]])
  const then = new Map([
    ["n_h", { name: "the heading “Summer sale”", nodeId: "n_h" }],
    ["n_gone", { name: "the card “Free returns”", nodeId: "n_gone" }],
  ])

  /**
   * A part that still exists is named as it is *today*, so a reader comparing a
   * row against the page in front of them sees the same words. A part that does
   * not is named as the inverse remembers it, because that is the only account
   * of it left.
   */
  it("keeps the earlier map's name and takes what only the later one has", () => {
    const merged = firstNamed(now, then)

    expect(merged.get("n_h")?.name).toBe("the heading “Autumn arrivals”")
    expect(merged.get("n_gone")?.name).toBe("the card “Free returns”")
  })

  it("survives being given nothing", () => {
    expect(firstNamed().size).toBe(0)
  })
})

describe("subjectFor", () => {
  const names = new Map([["n_card", { name: "the card “Hi”", nodeId: "n_card" }]])

  it("hands back the named part when there is one", () => {
    expect(subjectFor(names, "n_card")).toEqual({ name: "the card “Hi”", nodeId: "n_card" })
  })

  /**
   * The fallback is the id itself and not a phrase standing in for it, which is
   * what makes this change unable to read worse anywhere: a sentence that
   * cannot name its subject is exactly the sentence the portal has always
   * shown.
   */
  it("hands back the bare id when there is not, rather than a stand-in phrase", () => {
    expect(subjectFor(names, "n_gone")).toBe("n_gone")
  })
})
