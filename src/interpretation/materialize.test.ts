import { describe, expect, it } from "vitest"

import { deltaIdSchema, nodeIdSchema, sequentialIdFactory, treeIdSchema, type IdFactory } from "../ids.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import { collectNodeIds } from "../tree/navigation.js"

import type { DraftOperation } from "./draft.js"
import { decodeProps, materializeDelta } from "./materialize.js"

const nodeId = (value: string) => nodeIdSchema.parse(value)
const noteType = primitiveTypeSchema.parse("loom.note")

const context = (idFactory: IdFactory = sequentialIdFactory("m")) => ({
  treeId: treeIdSchema.parse("t_1"),
  baseRevision: 3,
  deltaId: deltaIdSchema.parse("d_1"),
  idFactory,
})

const insertOf = (props = "{}"): DraftOperation => ({
  op: "insert",
  parentId: nodeId("n_6"),
  index: 0,
  node: { kind: "element", type: noteType, props, children: [] },
})

describe("decodeProps", () => {
  it("decodes a JSON-encoded object into a prop bag", () => {
    const decoded = decodeProps('{"a":"x","b":2,"c":true,"d":null,"e":{"nested":[1,2]}}')

    expect(decoded).toEqual({
      ok: true,
      value: { a: "x", b: 2, c: true, d: null, e: { nested: [1, 2] } },
    })
  })

  it("decodes an empty object to an empty bag", () => {
    expect(decodeProps("{}")).toEqual({ ok: true, value: {} })
  })

  /** The cost 0014 accepted: the grammar can no longer make this unsayable. */
  it("rejects a bag that is not parseable JSON", () => {
    const decoded = decodeProps("{x: 2}")

    expect(decoded.ok).toBe(false)
    expect(decoded.ok ? "" : decoded.error).toContain("not parseable JSON")
  })

  it("truncates the offending text rather than quoting a whole reply back", () => {
    const decoded = decodeProps(`{"a":"${"x".repeat(500)}`)

    expect(decoded.ok).toBe(false)
    expect((decoded.ok ? "" : decoded.error).length).toBeLessThan(160)
  })

  it("rejects parseable JSON that is not an object", () => {
    for (const encoded of ['["filled"]', '"filled"', "2", "null", "true"]) {
      const decoded = decodeProps(encoded)

      expect(decoded.ok).toBe(false)
      expect(decoded.ok ? "" : decoded.error).toContain("must be a JSON object")
    }
  })

  it("rejects a value outside the JSON value space", () => {
    expect(decodeProps('{"n":1e999}').ok).toBe(false)
  })
})

describe("materializeDelta", () => {
  it("mints an id for every inserted node, including nested ones", () => {
    const operation: DraftOperation = {
      op: "insert",
      parentId: nodeId("n_6"),
      index: 0,
      node: {
        kind: "element",
        type: noteType,
        props: "{}",
        children: [
          { kind: "text", value: "Thanks" },
          {
            kind: "element",
            type: noteType,
            props: '{"tone":"quiet"}',
            children: [{ kind: "text", value: "fallback" }],
          },
        ],
      },
    }

    const delta = materializeDelta([operation], context())

    expect(delta.ok).toBe(true)
    if (!delta.ok) return

    const [first] = delta.value.operations
    expect(first?.op).toBe("insert")
    if (first?.op !== "insert") return

    const ids = collectNodeIds(first.node)
    expect(ids).toHaveLength(4)
    expect(new Set(ids).size).toBe(4)
    expect(ids.every((id) => id.startsWith("n_m"))).toBe(true)
  })

  it("stamps the delta with the identity and revision it was given", () => {
    const delta = materializeDelta([insertOf()], context())

    expect(delta.ok && delta.value.deltaId).toBe("d_1")
    expect(delta.ok && delta.value.treeId).toBe("t_1")
    expect(delta.ok && delta.value.baseRevision).toBe(3)
  })

  it("carries remove, move, and configure through unchanged apart from decoded props", () => {
    const operations: readonly DraftOperation[] = [
      { op: "remove", nodeId: nodeId("n_1") },
      { op: "move", nodeId: nodeId("n_2"), parentId: nodeId("n_5"), index: 1 },
      {
        op: "configure",
        nodeId: nodeId("n_4"),
        set: '{"elevation":0}',
        unset: ["variant"],
      },
    ]

    const delta = materializeDelta(operations, context())

    expect(delta.ok && delta.value.operations).toEqual([
      { op: "remove", nodeId: "n_1" },
      { op: "move", nodeId: "n_2", parentId: "n_5", index: 1 },
      { op: "configure", nodeId: "n_4", set: { elevation: 0 }, unset: ["variant"] },
    ])
  })

  it("refuses a change that carries no operations", () => {
    const delta = materializeDelta([], context())

    expect(delta.ok).toBe(false)
    expect(delta.ok ? "" : delta.error).toContain("no operations")
  })

  it("fails the whole delta when one operation carries a bad prop", () => {
    const bad = insertOf("nope")
    const delta = materializeDelta([insertOf(), bad], context())

    expect(delta.ok).toBe(false)
  })
})
