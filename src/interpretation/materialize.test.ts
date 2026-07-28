import { describe, expect, it } from "vitest"

import { deltaIdSchema, nodeIdSchema, sequentialIdFactory, treeIdSchema, type IdFactory } from "../ids.js"
import { primitiveTypeSchema, slotNameSchema } from "../primitive-type.js"
import { collectNodeIds } from "../tree/navigation.js"

import type { DraftOperation, DraftProp } from "./draft.js"
import { decodeProps, materializeDelta } from "./materialize.js"

const nodeId = (value: string) => nodeIdSchema.parse(value)
const noteType = primitiveTypeSchema.parse("loom.note")

const context = (idFactory: IdFactory = sequentialIdFactory("m")) => ({
  treeId: treeIdSchema.parse("t_1"),
  baseRevision: 3,
  deltaId: deltaIdSchema.parse("d_1"),
  idFactory,
})

const insertOf = (props: readonly DraftProp[] = []): DraftOperation => ({
  op: "insert",
  parentId: nodeId("n_6"),
  index: 0,
  node: { kind: "element", type: noteType, props, children: [] },
})

describe("decodeProps", () => {
  it("decodes each tagged value into its JSON counterpart", () => {
    const decoded = decodeProps([
      { key: "a", value: { kind: "string", string: "x" } },
      { key: "b", value: { kind: "number", number: 2 } },
      { key: "c", value: { kind: "boolean", boolean: true } },
      { key: "d", value: { kind: "null" } },
      { key: "e", value: { kind: "json", json: '{"nested":[1,2]}' } },
    ])

    expect(decoded).toEqual({
      ok: true,
      value: { a: "x", b: 2, c: true, d: null, e: { nested: [1, 2] } },
    })
  })

  it("rejects an unparseable json value and names the prop", () => {
    const decoded = decodeProps([{ key: "padding", value: { kind: "json", json: "{x: 2}" } }])

    expect(decoded.ok).toBe(false)
    expect(decoded.ok ? "" : decoded.error).toContain('prop "padding"')
  })

  it("rejects a json value that decodes outside the JSON value space", () => {
    const decoded = decodeProps([{ key: "n", value: { kind: "json", json: "1e999" } }])

    expect(decoded.ok).toBe(false)
  })

  it("rejects the same prop set twice rather than guessing which was meant", () => {
    const decoded = decodeProps([
      { key: "variant", value: { kind: "string", string: "filled" } },
      { key: "variant", value: { kind: "string", string: "outlined" } },
    ])

    expect(decoded.ok).toBe(false)
    expect(decoded.ok ? "" : decoded.error).toContain("set twice")
  })

  it("decodes an empty prop list to an empty object", () => {
    expect(decodeProps([])).toEqual({ ok: true, value: {} })
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
        props: [],
        children: [
          { kind: "text", value: "Thanks" },
          {
            kind: "slot",
            name: slotNameSchema.parse("aside"),
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
        set: [{ key: "elevation", value: { kind: "number", number: 0 } }],
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
    const bad = insertOf([{ key: "p", value: { kind: "json", json: "nope" } }])
    const delta = materializeDelta([insertOf(), bad], context())

    expect(delta.ok).toBe(false)
  })
})
