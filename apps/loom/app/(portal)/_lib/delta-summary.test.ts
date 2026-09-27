import { describe, expect, it } from "vitest"

import { nodeIdSchema, primitiveTypeSchema, type LoomNode, type TreeDelta } from "@jam-overture/loom"

import { describeOperation, plainOperation, summariseOperations } from "./delta-summary"
import { partNameOf } from "./part-name"
import { readingOf } from "./vocabulary"

const nodeId = (id: string) => nodeIdSchema.parse(id)

const delta = (operations: TreeDelta["operations"]): TreeDelta["operations"] => operations

describe("summariseOperations", () => {
  it("uses the reviewer's verbs rather than the delta model's", () => {
    expect(
      summariseOperations(
        delta([
          { op: "remove", nodeId: nodeId("n_a") },
          { op: "move", nodeId: nodeId("n_b"), parentId: nodeId("n_c"), index: 0 },
        ])
      )
    ).toBe("delete, move")
  })

  /** A delta with no operations is a real proposal, and an empty string reads as missing data. */
  it("says a delta did nothing rather than rendering nothing", () => {
    expect(summariseOperations(delta([]))).toBe("no operations")
  })
})

/**
 * The revision log's reading of a delta. Unlike the summary, it has to name the
 * node an operation touched: the snapshot shows the result and cannot say which
 * part of it is new, so the delta is the only record of where a change landed.
 */
describe("describeOperation", () => {
  it("names what an insert added, and where it went", () => {
    expect(
      describeOperation({
        op: "insert",
        parentId: nodeId("n_parent"),
        index: 2,
        node: {
          kind: "element",
          id: nodeId("n_new"),
          type: primitiveTypeSchema.parse("loom.card"),
          props: {},
          children: [],
        },
      })
    ).toEqual({ verb: "add", subject: "n_new", detail: "loom.card into n_parent at 2" })
  })

  /** A text node has no primitive type, and "text" is what a reader needs to see. */
  it("falls back to the node kind for a node that has no primitive type", () => {
    expect(
      describeOperation({
        op: "insert",
        parentId: nodeId("n_parent"),
        index: 0,
        node: { kind: "text", id: nodeId("n_words"), value: "Welcome" },
      }).detail
    ).toBe("text into n_parent at 0")
  })

  /** A removal takes the subtree with it, which is the part a reader misjudges. */
  it("says a removal is not only the node named", () => {
    expect(describeOperation({ op: "remove", nodeId: nodeId("n_gone") })).toEqual({
      verb: "delete",
      subject: "n_gone",
      detail: "and everything under it",
    })
  })

  it("names where a move landed", () => {
    expect(
      describeOperation({
        op: "move",
        nodeId: nodeId("n_a"),
        parentId: nodeId("n_b"),
        index: 1,
      })
    ).toEqual({ verb: "move", subject: "n_a", detail: "into n_b at 1" })
  })

  it("names the props a reconfigure set and the ones it cleared", () => {
    expect(
      describeOperation({
        op: "configure",
        nodeId: nodeId("n_card"),
        set: { title: "Home", variant: "outlined" },
        unset: ["elevation"],
      }).detail
    ).toBe("title, variant, elevation (cleared)")
  })

  /**
   * A configure that touches nothing is a valid operation, and a blank detail
   * would read as a missing field rather than as an empty change.
   */
  it("says a reconfigure touched no props rather than rendering nothing", () => {
    expect(
      describeOperation({ op: "configure", nodeId: nodeId("n_card"), set: {}, unset: [] }).detail
    ).toBe("no props")
  })
})

/**
 * The plain reading, which is what `/portal/history` leads with. Every case is
 * asserted as the joined sentence rather than by its parts, because the parts
 * being right is not the property — three defects on 24 August were both halves
 * correct and the join wrong, and each of them passed a `toContain`.
 */
describe("plainOperation", () => {
  const reading = (operation: TreeDelta["operations"][number]): string =>
    readingOf(plainOperation(operation))

  it("names what an insert added, as a thing rather than as a kind", () => {
    expect(
      reading({
        op: "insert",
        parentId: nodeId("n_root"),
        index: 2,
        node: {
          kind: "element",
          id: nodeId("n_new"),
          type: primitiveTypeSchema.parse("loom.heading"),
          props: {},
          children: [],
        },
      })
    ).toBe("Added the heading n_new inside n_root.")
  })

  /**
   * An insert never needs the names map: it carries the node it places, so the
   * part is named from the operation itself and no caller can fail to pass
   * enough for this sentence to read plainly.
   */
  it("names an insert from the node it carries, with no names map given", () => {
    expect(
      reading({
        op: "insert",
        parentId: nodeId("n_root"),
        index: 0,
        node: {
          kind: "element",
          id: nodeId("n_new"),
          type: primitiveTypeSchema.parse("loom.heading"),
          props: {},
          children: [{ kind: "text", id: nodeId("n_t"), value: "Autumn arrivals" }],
        },
      })
    ).toBe("Added the heading “Autumn arrivals” n_new inside n_root.")
  })

  /** Text has no name of its own. It is its words, so that is what it is called. */
  it("calls inserted text the words it says", () => {
    expect(
      reading({
        op: "insert",
        parentId: nodeId("n_head"),
        index: 0,
        node: { kind: "text", id: nodeId("n_t"), value: "Welcome" },
      })
    ).toBe("Added the words “Welcome” n_t inside n_head.")
  })

  /**
   * The half an insert cannot do for itself. A removal carries an id and
   * nothing else, so the sentence is only as plain as what the screen could
   * find out — and where it found out nothing, it says exactly what it always
   * said rather than a phrase standing in for the id.
   */
  it("names a removal from the map, and keeps the bare id when it is not in one", () => {
    const card: LoomNode = {
      kind: "element",
      id: nodeId("n_card"),
      type: primitiveTypeSchema.parse("loom.card"),
      props: {},
      children: [{ kind: "text", id: nodeId("n_t"), value: "Free returns" }],
    }
    const names = new Map([[card.id, partNameOf(card)]])

    expect(readingOf(plainOperation({ op: "remove", nodeId: nodeId("n_card") }, names))).toBe(
      "Deleted the card “Free returns” n_card and everything inside it."
    )
    expect(readingOf(plainOperation({ op: "remove", nodeId: nodeId("n_gone") }, names))).toBe(
      "Deleted n_gone and everything inside it."
    )
  })

  it("says a deletion takes everything under it", () => {
    expect(reading({ op: "remove", nodeId: nodeId("n_gone") })).toBe(
      "Deleted n_gone and everything inside it."
    )
  })

  it("says where a move landed", () => {
    expect(
      reading({ op: "move", nodeId: nodeId("n_a"), parentId: nodeId("n_b"), index: 1 })
    ).toBe("Moved n_a inside n_b.")
  })

  /**
   * `reconfigure n_head title, width (cleared)` was the line this replaces:
   * three of the schema's own words and a parenthesis doing the work of a verb.
   */
  it("reads a reconfigure as a possessive, and spells out what was cleared", () => {
    expect(
      reading({
        op: "configure",
        nodeId: nodeId("n_head"),
        set: { title: "Welcome", level: 1 },
        unset: ["subtitle"],
      })
    ).toBe("Changed n_head's title and level, and cleared its subtitle.")
  })

  it("says a reconfigure that only clears, without pretending it set something", () => {
    expect(
      reading({ op: "configure", nodeId: nodeId("n_head"), set: {}, unset: ["subtitle", "width"] })
    ).toBe("Changed n_head, clearing its subtitle and width.")
  })

  it("says a no-op reconfigure changed nothing rather than rendering a blank", () => {
    expect(reading({ op: "configure", nodeId: nodeId("n_head"), set: {}, unset: [] })).toBe(
      "Changed n_head — it changed no settings."
    )
  })

  /**
   * The one property that holds across every operation: nothing a reader meets
   * here is one of the delta model's own verbs. Those are still on the row,
   * under the disclosure, which is where `describeOperation` above is rendered.
   */
  it("never leads with a word from the delta model", () => {
    const every: TreeDelta["operations"] = [
      {
        op: "insert",
        parentId: nodeId("n_root"),
        index: 0,
        node: { kind: "text", id: nodeId("n_t"), value: "Hi" },
      },
      { op: "remove", nodeId: nodeId("n_gone") },
      { op: "move", nodeId: nodeId("n_a"), parentId: nodeId("n_b"), index: 0 },
      { op: "configure", nodeId: nodeId("n_c"), set: { title: "x" }, unset: [] },
    ]

    for (const operation of every) {
      expect(reading(operation)).not.toMatch(/\b(insert|reconfigure|configure|op|delta|node)\b/i)
    }
  })
})
