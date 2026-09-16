import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { DATA_PROP_KEY } from "../reserved-props.js"
import { buildElement, buildText } from "../tree/builders.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { EMPTY_DATA_PLAN, planDataIn, planTreeData } from "./plan.js"

const treeOf = (...props: readonly Record<string, unknown>[]): LoomTree => {
  const idFactory = sequentialIdFactory()

  const children = props.slice(1).map((bound) =>
    buildElement(idFactory, { type: "loom.card", props: bound as never })
  )

  return createTree(
    buildElement(idFactory, {
      type: "loom.page",
      props: (props[0] ?? {}) as never,
      children,
    }),
    idFactory
  )
}

const binding = (source: string, params?: Record<string, unknown>) => ({
  source,
  ...(params ? { params } : {}),
})

describe("planTreeData", () => {
  it("finds a binding and names the node that asked", () => {
    const tree = treeOf({ [DATA_PROP_KEY]: { services: binding("catalogue.services") } })
    const plan = planTreeData(tree)

    expect(plan.requests).toEqual([
      { key: expect.stringContaining("catalogue.services"), source: "catalogue.services", params: {} },
    ])
    expect(plan.bindings).toEqual([
      { nodeId: tree.root.id, name: "services", key: plan.requests[0]?.key },
    ])
    expect(plan.problems).toEqual([])
  })

  it("asks one question when several bindings want the same answer", () => {
    const tree = treeOf(
      {
        [DATA_PROP_KEY]: {
          name: binding("profile"),
          bio: binding("profile"),
          avatar: binding("profile"),
        },
      },
      { [DATA_PROP_KEY]: { alsoName: binding("profile") } }
    )

    const plan = planTreeData(tree)

    expect(plan.requests).toHaveLength(1)
    expect(plan.bindings).toHaveLength(4)
    expect(new Set(plan.bindings.map((entry) => entry.key)).size).toBe(1)
  })

  it("treats params written in a different key order as the same question", () => {
    const tree = treeOf(
      { [DATA_PROP_KEY]: { a: binding("catalogue.services", { limit: 6, kind: "all" }) } },
      { [DATA_PROP_KEY]: { b: binding("catalogue.services", { kind: "all", limit: 6 }) } }
    )

    expect(planTreeData(tree).requests).toHaveLength(1)
  })

  it("treats different params as different questions", () => {
    const tree = treeOf(
      { [DATA_PROP_KEY]: { a: binding("catalogue.services", { limit: 6 }) } },
      { [DATA_PROP_KEY]: { b: binding("catalogue.services", { limit: 3 }) } }
    )

    expect(planTreeData(tree).requests).toHaveLength(2)
  })

  it("keeps array order significant, because there it means something", () => {
    const tree = treeOf(
      { [DATA_PROP_KEY]: { a: binding("catalogue.services", { ids: ["x", "y"] }) } },
      { [DATA_PROP_KEY]: { b: binding("catalogue.services", { ids: ["y", "x"] }) } }
    )

    expect(planTreeData(tree).requests).toHaveLength(2)
  })

  it("records a malformed declaration against its node and keeps planning the rest", () => {
    const tree = treeOf(
      { [DATA_PROP_KEY]: "profile" },
      { [DATA_PROP_KEY]: { services: binding("catalogue.services") } }
    )

    const plan = planTreeData(tree)

    expect(plan.problems).toHaveLength(1)
    expect(plan.problems[0]?.nodeId).toBe(tree.root.id)
    expect(plan.requests).toHaveLength(1)
  })

  it("plans nothing for a tree that binds nothing", () => {
    const plan = planTreeData(treeOf({ title: "Home" }, { variant: "outlined" }))

    expect(plan.requests).toEqual([])
    expect(plan.bindings).toEqual([])
    expect(plan.problems).toEqual([])
  })

  it("ignores text nodes, which have no props to bind with", () => {
    const idFactory = sequentialIdFactory()
    const tree = createTree(
      buildElement(idFactory, {
        type: "loom.page",
        children: [buildText(idFactory, "Body copy")],
      }),
      idFactory
    )

    expect(planTreeData(tree).requests).toEqual([])
  })

  it("is a pure function of the tree — the same tree plans identically", () => {
    const tree = treeOf({ [DATA_PROP_KEY]: { services: binding("catalogue.services") } })

    expect(planTreeData(tree)).toEqual(planTreeData(tree))
  })
})

describe("planDataIn", () => {
  /**
   * The property the runtime needs it for: a tree that exists only as the result
   * of applying a delta is a node, and nothing has minted an id for it.
   */
  it("plans a bare root exactly as the tree planner plans the tree around it", () => {
    const tree = treeOf({ [DATA_PROP_KEY]: { services: binding("catalogue.services") } })

    expect(planDataIn(tree.root)).toEqual(planTreeData(tree))
  })

  it("finds nothing in a root that asks nothing", () => {
    const tree = treeOf({})

    expect(planDataIn(tree.root)).toEqual(EMPTY_DATA_PLAN)
  })
})
