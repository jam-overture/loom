import { describe, expect, it } from "vitest"

import { nodeIdSchema, primitiveTypeSchema, type TreeDelta } from "@loom/runtime"

import { describeOperation, summariseOperations } from "./delta-summary"

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
