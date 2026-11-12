import { describe, expect, it } from "vitest"

import { deltaIdSchema, nodeIdSchema, sequentialIdFactory, treeIdSchema } from "../ids.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import { collectNodeIds } from "../tree/navigation.js"

import type { DraftNode, DraftOperation } from "./draft.js"
import { materializeDelta } from "./materialize.js"

/**
 * **A reply's shape is the model's choice, not this repository's** (0380).
 *
 * Until these existed, `materializeNode` recursed per level and grew each
 * sibling list one copy per sibling, so a draft threw
 * `RangeError: Maximum call stack size exceeded` at two thousand deep — the
 * shallowest bound left in the framework after 0372 and 0373 — and cost the
 * square of its width. The width figures are the ones a model could plausibly
 * reach, and they are sized so that the implementation this replaced takes
 * seconds rather than milliseconds: 32,000 children cost 4,704 ms.
 *
 * The depth and width figures are `src/tree/shape.test.ts`', so the repository
 * holds one pair rather than a pair per module.
 */
const DEEP = 10_000
const WIDE = 60_000

const pageType = primitiveTypeSchema.parse("loom.page")

const context = () => ({
  treeId: treeIdSchema.parse("t_1"),
  baseRevision: 1,
  deltaId: deltaIdSchema.parse("d_1"),
  idFactory: sequentialIdFactory("sh"),
})

const element = (children: readonly DraftNode[]): DraftNode => ({
  kind: "element",
  type: pageType,
  props: "{}",
  children,
})

/** A chain: one child per node, a text leaf at the bottom. */
const deepDraft = (depth: number): DraftNode => {
  let node: DraftNode = { kind: "text", value: "bottom" }
  for (let level = 1; level < depth; level += 1) node = element([node])

  return node
}

/** One parent, `width` text children. */
const wideDraft = (width: number): DraftNode =>
  element(Array.from({ length: width }, (_, index) => ({ kind: "text", value: `t${index}` })))

const insert = (node: DraftNode): DraftOperation => ({
  op: "insert",
  parentId: nodeIdSchema.parse("n_1"),
  index: 0,
  node,
})

const inserted = (node: DraftNode) => {
  const delta = materializeDelta([insert(node)], context())
  expect(delta.ok).toBe(true)
  if (!delta.ok) throw new Error("unreachable")

  const [operation] = delta.value.operations
  if (operation?.op !== "insert") throw new Error("unreachable")

  return operation.node
}

describe("materializeDelta on a shape a model may propose", () => {
  it(`materializes a draft ${DEEP.toLocaleString("en")} deep`, () => {
    expect(collectNodeIds(inserted(deepDraft(DEEP)))).toHaveLength(DEEP)
  })

  it(`materializes a draft ${WIDE.toLocaleString("en")} wide`, () => {
    const node = inserted(wideDraft(WIDE))

    expect(node.kind === "element" && node.children).toHaveLength(WIDE)
  })

  it(`materializes ${WIDE.toLocaleString("en")} operations in one reply`, () => {
    const operations = Array.from({ length: WIDE }, (_, index): DraftOperation => ({
      op: "remove",
      nodeId: nodeIdSchema.parse(`n_${index + 2}`),
    }))
    const delta = materializeDelta(operations, context())

    expect(delta.ok && delta.value.operations).toHaveLength(WIDE)
  })

  /**
   * Ids are minted on the way up — every child before its parent — because that
   * is the order the recursion minted them in and a node's id is in the delta
   * the proposer gets back. A chain is the shape that would expose a flip.
   */
  it("mints a deep chain's ids from the bottom up", () => {
    const node = inserted(deepDraft(DEEP))
    const ids = collectNodeIds(node)

    expect(ids[0]).toBe(`n_sh${DEEP}`)
    expect(ids[ids.length - 1]).toBe("n_sh1")
  })

  /**
   * Props are decoded on the way down, so the element nearest the root is the
   * one refused — not whichever one a post-order pass reached first.
   */
  it("refuses the outermost unreadable prop bag in a deep draft", () => {
    const broken = element([
      { kind: "element", type: pageType, props: "{", children: [deepDraft(DEEP)] },
    ])
    const delta = materializeDelta([insert(broken)], context())

    expect(delta).toEqual({ ok: false, error: "props are not parseable JSON: {" })
  })
})
