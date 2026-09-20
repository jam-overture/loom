import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type TreeId } from "../ids.js"
import type { JsonObject } from "../json.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import { DATA_PROP_KEY, SUBMIT_PROP_KEY } from "../reserved-props.js"
import {
  boundTree,
  formTree,
  sampleTree,
  type BoundTree,
  type FormTree,
  type SampleTree,
} from "../testing/fixtures.js"
import { buildElement, buildText } from "../tree/builders.js"
import type { TreeDelta, TreeOperation } from "../tree/delta.js"
import { createTree } from "../tree/tree.js"

import { analyzeDelta } from "./analysis.js"
import { interactivePredicateFor, nestedTargetsIn } from "./nesting.js"
import { primitiveVocabularyFor, type PrimitiveVocabulary } from "./vocabulary.js"

const spare = sequentialIdFactory("an")

const deltaOf = (treeId: TreeId, operations: TreeOperation[]): TreeDelta => ({
  deltaId: spare.deltaId(),
  treeId,
  baseRevision: 0,
  operations,
})

/** Builds the operations from the fixture's ids, then analyses them. */
const analyze = (build: (ids: SampleTree["ids"]) => TreeOperation[]) => {
  const { tree, ids } = sampleTree()
  const result = analyzeDelta(tree, deltaOf(tree.treeId, build(ids)))
  if (!result.ok) throw new Error(result.error.code)

  return { analysis: result.value, ids }
}

describe("analyzeDelta counts", () => {
  it("counts every node in an inserted subtree, not just its root", () => {
    const banner = buildElement(spare, {
      type: "loom.banner",
      children: [buildText(spare, "Sale"), buildText(spare, "Ends Friday")],
    })

    const { analysis } = analyze((ids) => [
      { op: "insert", parentId: ids.page, index: 0, node: banner },
    ])

    expect(analysis.insertedNodeCount).toBe(3)
    expect(analysis.operationCount).toBe(1)
  })

  it("counts every node destroyed by a removal", () => {
    const { analysis, ids } = analyze((fixture) => [{ op: "remove", nodeId: fixture.main }])

    expect(analysis.removedNodeCount).toBe(3)
    expect(analysis.affectedNodeIds).toContain(ids.body)
  })

  it("counts a move as one node, not the subtree riding along", () => {
    const { analysis, ids } = analyze((fixture) => [
      { op: "move", nodeId: fixture.card, parentId: fixture.header, index: 0 },
    ])

    expect(analysis.movedNodeCount).toBe(1)
    expect(analysis.affectedNodeIds).toEqual([ids.card])
  })

  it("counts every node a move carried, the one it named included", () => {
    const { analysis } = analyze((ids) => [
      { op: "move", nodeId: ids.main, parentId: ids.header, index: 0 },
    ])

    expect(analysis.movedNodeCount).toBe(1)
    expect(analysis.relocatedNodeCount).toBe(3)
  })

  it("relocates nothing when the delta moves nothing", () => {
    const { analysis } = analyze((ids) => [{ op: "remove", nodeId: ids.main }])

    expect(analysis.relocatedNodeCount).toBe(0)
    expect(analysis.relocatedPrimitiveTypes).toEqual([])
  })

  it("records the prop keys a configure touches, set and unset alike", () => {
    const { analysis } = analyze((ids) => [
      { op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: ["elevation"] },
    ])

    expect(analysis.configuredNodeCount).toBe(1)
    expect([...analysis.configuredPropKeys].sort()).toEqual(["elevation", "variant"])
  })
})

describe("analyzeDelta primitive types", () => {
  it("collects element types from a removed subtree", () => {
    const { analysis } = analyze((ids) => [{ op: "remove", nodeId: ids.main }])

    expect(analysis.touchedPrimitiveTypes).toContain("loom.card")
  })

  it("separates types destroyed from types merely touched", () => {
    const { analysis } = analyze((ids) => [
      { op: "remove", nodeId: ids.card },
      { op: "configure", nodeId: ids.footer, set: { sticky: true }, unset: [] },
    ])

    expect(analysis.removedPrimitiveTypes).toEqual(["loom.card"])
    expect([...analysis.touchedPrimitiveTypes].sort()).toEqual(["loom.card", "loom.footer"])
  })

  it("answers the same however a relocation is phrased", () => {
    const bySlot = analyze((ids) => [
      { op: "move", nodeId: ids.main, parentId: ids.header, index: 0 },
    ]).analysis
    const byCard = analyze((ids) => [
      { op: "move", nodeId: ids.card, parentId: ids.header, index: 0 },
    ]).analysis

    expect(bySlot.relocatedPrimitiveTypes).toEqual(["loom.card"])
    expect(byCard.relocatedPrimitiveTypes).toEqual(["loom.card"])
  })

  it("keeps a moved type out of the touched types, whichever node the move named", () => {
    const bySlot = analyze((ids) => [
      { op: "move", nodeId: ids.main, parentId: ids.header, index: 0 },
    ]).analysis
    const byCard = analyze((ids) => [
      { op: "move", nodeId: ids.card, parentId: ids.header, index: 0 },
    ]).analysis

    expect(bySlot.touchedPrimitiveTypes).toEqual([])
    expect(byCard.touchedPrimitiveTypes).toEqual([])
  })

  it("separates a type relocated from one reconfigured in the same delta", () => {
    const { analysis } = analyze((ids) => [
      { op: "move", nodeId: ids.card, parentId: ids.header, index: 0 },
      { op: "configure", nodeId: ids.footer, set: { sticky: true }, unset: [] },
    ])

    expect(analysis.relocatedPrimitiveTypes).toEqual(["loom.card"])
    expect(analysis.touchedPrimitiveTypes).toEqual(["loom.footer"])
  })

  it("ignores text and slot nodes, which have no primitive type", () => {
    const { analysis } = analyze((ids) => [
      { op: "configure", nodeId: ids.headline, set: { value: "Hi" }, unset: [] },
    ])

    expect(analysis.touchedPrimitiveTypes).toEqual([])
  })
})

describe("analyzeDelta depth", () => {
  it("reports the root as depth zero", () => {
    const { analysis } = analyze((ids) => [
      { op: "configure", nodeId: ids.page, set: { title: "Home" }, unset: [] },
    ])

    expect(analysis.shallowestAffectedDepth).toBe(0)
  })

  it("measures an insert at the depth of the new child", () => {
    const banner = buildElement(spare, { type: "loom.banner" })
    const { analysis } = analyze((ids) => [
      { op: "insert", parentId: ids.main, index: 0, node: banner },
    ])

    expect(analysis.shallowestAffectedDepth).toBe(2)
  })

  it("takes the shallowest position across all operations", () => {
    const { analysis } = analyze((ids) => [
      { op: "configure", nodeId: ids.body, set: { value: "Deep" }, unset: [] },
      { op: "remove", nodeId: ids.footer },
    ])

    expect(analysis.shallowestAffectedDepth).toBe(1)
  })

  it("takes the shallower of a move's origin and destination", () => {
    const { analysis } = analyze((ids) => [
      { op: "move", nodeId: ids.body, parentId: ids.page, index: 0 },
    ])

    expect(analysis.shallowestAffectedDepth).toBe(1)
  })
})

describe("analyzeDelta sequencing", () => {
  it("measures an operation against the tree earlier operations produced", () => {
    const banner = buildElement(spare, { type: "loom.banner" })
    const { analysis } = analyze((ids) => [
      { op: "insert", parentId: ids.main, index: 0, node: banner },
      { op: "configure", nodeId: banner.id, set: { tone: "loud" }, unset: [] },
    ])

    expect(analysis.configuredNodeCount).toBe(1)
    expect(analysis.touchedPrimitiveTypes).toContain("loom.banner")
  })

  it("fails when the delta does not apply", () => {
    const { tree } = sampleTree()
    const result = analyzeDelta(
      tree,
      deltaOf(tree.treeId, [{ op: "remove", nodeId: spare.nodeId() }])
    )

    expect(!result.ok && result.error.code).toBe("node-not-found")
  })
})

/**
 * The sample tree's `loom.card` carries no `href`, so it is a plain surface
 * until a delta gives it one — which is the point: two of these four cases put
 * an action inside a card and only two of them break anything.
 */
const isTarget = interactivePredicateFor({
  "loom.card": { whenProps: ["href"] },
  "loom.action": "always",
})


const analyzeWithTargets = (build: (ids: SampleTree["ids"]) => TreeOperation[]) => {
  const { tree, ids } = sampleTree()
  const result = analyzeDelta(tree, deltaOf(tree.treeId, build(ids)), isTarget)
  if (!result.ok) throw new Error(result.error.code)

  return { analysis: result.value, ids }
}

describe("analyzeDelta nested targets", () => {
  it("reports none when the host declares no interactive vocabulary", () => {
    const action = buildElement(spare, { type: "loom.action" })
    const { analysis } = analyze((ids) => [
      { op: "configure", nodeId: ids.card, set: { href: "/pricing" }, unset: [] },
      { op: "insert", parentId: ids.card, index: 0, node: action },
    ])

    expect(analysis.nestedTargets).toEqual([])
  })

  it("accepts an action inside a card that is not a link", () => {
    const action = buildElement(spare, { type: "loom.action" })
    const { analysis } = analyzeWithTargets((ids) => [
      { op: "insert", parentId: ids.card, index: 0, node: action },
    ])

    expect(analysis.nestedTargets).toEqual([])
  })

  it("catches an action inserted into a card the same delta linked", () => {
    const action = buildElement(spare, { type: "loom.action" })
    const { analysis, ids } = analyzeWithTargets((fixture) => [
      { op: "configure", nodeId: fixture.card, set: { href: "/pricing" }, unset: [] },
      { op: "insert", parentId: fixture.card, index: 0, node: action },
    ])

    expect(analysis.nestedTargets).toEqual([
      {
        nodeId: action.id,
        type: "loom.action",
        ancestorId: ids.card,
        ancestorType: "loom.card",
      },
    ])
  })

  it("catches a configure that links a card over actions already inside it", () => {
    const action = buildElement(spare, { type: "loom.action" })
    const { analysis } = analyzeWithTargets((ids) => [
      { op: "insert", parentId: ids.card, index: 0, node: action },
      { op: "configure", nodeId: ids.card, set: { href: "/pricing" }, unset: [] },
    ])

    expect(analysis.nestedTargets.map((nested) => nested.nodeId)).toEqual([action.id])
  })

  it("catches a move that carries an action into a linked card", () => {
    const action = buildElement(spare, { type: "loom.action" })
    const { analysis } = analyzeWithTargets((ids) => [
      { op: "insert", parentId: ids.footer, index: 0, node: action },
      { op: "configure", nodeId: ids.card, set: { href: "/pricing" }, unset: [] },
      { op: "move", nodeId: action.id, parentId: ids.card, index: 0 },
    ])

    expect(analysis.nestedTargets.map((nested) => nested.nodeId)).toEqual([action.id])
  })

  it("blames a change for what it introduces and not for what it inherited", () => {
    const action = buildElement(spare, { type: "loom.action" })
    const card = buildElement(spare, {
      type: "loom.card",
      props: { href: "/pricing" },
      children: [action],
    })
    const page = buildElement(spare, { type: "loom.page", children: [card] })
    const alreadyBroken = createTree(page, spare)

    const result = analyzeDelta(
      alreadyBroken,
      deltaOf(alreadyBroken.treeId, [
        { op: "configure", nodeId: page.id, set: { title: "Pricing" }, unset: [] },
      ]),
      isTarget
    )
    if (!result.ok) throw new Error(result.error.code)

    expect(nestedTargetsIn(page, isTarget)).toHaveLength(1)
    expect(result.value.nestedTargets).toEqual([])
  })

  it("reports the change that removes the nesting as introducing none", () => {
    const action = buildElement(spare, { type: "loom.action" })
    const { analysis } = analyzeWithTargets((ids) => [
      { op: "configure", nodeId: ids.card, set: { href: "/pricing" }, unset: [] },
      { op: "insert", parentId: ids.card, index: 0, node: action },
      { op: "configure", nodeId: ids.card, set: {}, unset: ["href"] },
    ])

    expect(analysis.nestedTargets).toEqual([])
  })
})

describe("analyzeDelta on a change of destination", () => {
  const analyzeForm = (build: (ids: FormTree["ids"]) => TreeOperation[]) => {
    const { tree, ids } = formTree()
    const result = analyzeDelta(tree, deltaOf(tree.treeId, build(ids)))
    if (!result.ok) throw new Error(result.error.code)

    return { analysis: result.value, ids }
  }

  it("reports a configure that moves a form's destination", () => {
    const { analysis, ids } = analyzeForm((ids) => [
      {
        op: "configure",
        nodeId: ids.form,
        set: { [SUBMIT_PROP_KEY]: { to: "contact.enquiry" } },
        unset: [],
      },
    ])

    expect(analysis.redirectedSubmissions).toEqual([
      { nodeId: ids.form, from: "newsletter.subscribe", to: "contact.enquiry" },
    ])
  })

  /**
   * The whole point of the factor: without it this delta is indistinguishable
   * from any other prop tweak on an unprotected node.
   */
  it("is the only thing that separates it from an ordinary prop change", () => {
    const { analysis } = analyzeForm((ids) => [
      {
        op: "configure",
        nodeId: ids.form,
        set: { [SUBMIT_PROP_KEY]: { to: "contact.enquiry" } },
        unset: [],
      },
    ])

    expect(analysis.configuredNodeCount).toBe(1)
    expect(analysis.configuredPropKeys).toEqual([SUBMIT_PROP_KEY])
    expect(analysis.removedNodeCount).toBe(0)
    expect(analysis.insertedNodeCount).toBe(0)
  })

  it("reports nothing for a form that gains a destination it never had", () => {
    const { analysis } = analyzeForm((ids) => [
      {
        op: "configure",
        nodeId: ids.aside,
        set: { [SUBMIT_PROP_KEY]: { to: "contact.enquiry" } },
        unset: [],
      },
    ])

    expect(analysis.redirectedSubmissions).toEqual([])
  })

  it("reports nothing for an inserted form, however it points", () => {
    const arrival = buildElement(spare, {
      type: "loom.form",
      props: { [SUBMIT_PROP_KEY]: { to: "contact.enquiry" } },
    })
    const { analysis } = analyzeForm((ids) => [
      { op: "insert", parentId: ids.page, index: 0, node: arrival },
    ])

    expect(analysis.redirectedSubmissions).toEqual([])
  })

  it("reports nothing for a form that is removed rather than moved", () => {
    const { analysis } = analyzeForm((ids) => [{ op: "remove", nodeId: ids.form }])

    expect(analysis.redirectedSubmissions).toEqual([])
  })

  it("reports nothing for a relocated form that keeps posting where it did", () => {
    const { analysis } = analyzeForm((ids) => [
      { op: "move", nodeId: ids.form, parentId: ids.page, index: 1 },
    ])

    expect(analysis.redirectedSubmissions).toEqual([])
  })

  /** Measured on the resulting tree, so a delta that comes back is not a change. */
  it("reports nothing when a delta moves the destination and moves it back", () => {
    const { analysis } = analyzeForm((ids) => [
      {
        op: "configure",
        nodeId: ids.form,
        set: { [SUBMIT_PROP_KEY]: { to: "contact.enquiry" } },
        unset: [],
      },
      {
        op: "configure",
        nodeId: ids.form,
        set: { [SUBMIT_PROP_KEY]: { to: "newsletter.subscribe" } },
        unset: [],
      },
    ])

    expect(analysis.redirectedSubmissions).toEqual([])
  })

  it("needs no interactive vocabulary, unlike the nesting it sits beside", () => {
    const { tree, ids } = formTree()
    const result = analyzeDelta(
      tree,
      deltaOf(tree.treeId, [
        {
          op: "configure",
          nodeId: ids.form,
          set: { [SUBMIT_PROP_KEY]: { to: "contact.enquiry" } },
          unset: [],
        },
      ])
    )
    if (!result.ok) throw new Error(result.error.code)

    expect(result.value.nestedTargets).toEqual([])
    expect(result.value.redirectedSubmissions).toHaveLength(1)
  })
})

describe("analyzeDelta on a change of what is asked for", () => {
  const analyzeBound = (build: (ids: BoundTree["ids"]) => TreeOperation[]) => {
    const { tree, ids } = boundTree()
    const result = analyzeDelta(tree, deltaOf(tree.treeId, build(ids)))
    if (!result.ok) throw new Error(result.error.code)

    return { analysis: result.value, ids }
  }

  const reads = (source: string, params: JsonObject = {}) => ({
    [DATA_PROP_KEY]: { items: { source, params } },
  })

  it("reports a configure that moves what a region reads", () => {
    const { analysis, ids } = analyzeBound((ids) => [
      { op: "configure", nodeId: ids.bound, set: reads("orders.mine"), unset: [] },
    ])

    expect(analysis.repointedBindings).toEqual([
      {
        nodeId: ids.bound,
        name: "items",
        kind: "source",
        from: "catalogue.services",
        to: "orders.mine",
      },
    ])
  })

  /**
   * The whole point of the factor: without it this delta is indistinguishable
   * from any other prop tweak on an unprotected node.
   */
  it("is the only thing that separates it from an ordinary prop change", () => {
    const { analysis } = analyzeBound((ids) => [
      { op: "configure", nodeId: ids.bound, set: reads("orders.mine"), unset: [] },
    ])

    expect(analysis.configuredPropKeys).toEqual([DATA_PROP_KEY])
    expect(analysis.removedNodeCount).toBe(0)
    expect(analysis.insertedNodeCount).toBe(0)
    expect(analysis.repointedBindings).toHaveLength(1)
  })

  it("reports a params move on one source", () => {
    const { analysis, ids } = analyzeBound((ids) => [
      {
        op: "configure",
        nodeId: ids.bound,
        set: reads("catalogue.services", { limit: 6 }),
        unset: [],
      },
    ])

    expect(analysis.repointedBindings).toEqual([
      {
        nodeId: ids.bound,
        name: "items",
        kind: "params",
        from: "catalogue.services",
        to: "catalogue.services",
      },
    ])
  })

  it("reports nothing for a region that gains a binding", () => {
    const { analysis } = analyzeBound((ids) => [
      { op: "configure", nodeId: ids.aside, set: reads("orders.mine"), unset: [] },
    ])

    expect(analysis.repointedBindings).toEqual([])
  })

  it("reports nothing for an inserted node, however it binds", () => {
    const arrival = buildElement(spare, {
      type: "loom.card",
      props: reads("orders.mine"),
    })
    const { analysis } = analyzeBound((ids) => [
      { op: "insert", parentId: ids.page, index: 0, node: arrival },
    ])

    expect(analysis.repointedBindings).toEqual([])
  })

  it("reports nothing for a region that loses its binding", () => {
    const { analysis } = analyzeBound((ids) => [
      { op: "configure", nodeId: ids.bound, set: {}, unset: [DATA_PROP_KEY] },
    ])

    expect(analysis.repointedBindings).toEqual([])
  })

  it("reports nothing when the binding is left alone", () => {
    const { analysis } = analyzeBound((ids) => [
      { op: "configure", nodeId: ids.bound, set: { title: "Our services" }, unset: [] },
    ])

    expect(analysis.repointedBindings).toEqual([])
  })
})

const drawable: PrimitiveVocabulary = primitiveVocabularyFor(
  ["loom.page", "loom.header", "loom.card", "loom.footer", "loom.banner"].map((type) =>
    primitiveTypeSchema.parse(type)
  )
)

const analyzeAgainstLibrary = (build: (ids: SampleTree["ids"]) => TreeOperation[]) => {
  const { tree, ids } = sampleTree()
  const result = analyzeDelta(tree, deltaOf(tree.treeId, build(ids)), undefined, drawable)
  if (!result.ok) throw new Error(result.error.code)

  return { analysis: result.value, ids }
}

describe("analyzeDelta unknown primitives", () => {
  it("reports none when the host declares no vocabulary", () => {
    const { analysis } = analyze((ids) => [
      {
        op: "insert",
        parentId: ids.page,
        index: 0,
        node: buildElement(spare, { type: "app.nonesuch" }),
      },
    ])

    expect(analysis.unknownPrimitives).toEqual([])
  })

  it("names a node whose type the declared library does not hold", () => {
    const invented = buildElement(spare, { type: "app.nonesuch" })

    const { analysis } = analyzeAgainstLibrary((ids) => [
      { op: "insert", parentId: ids.page, index: 0, node: invented },
    ])

    expect(analysis.unknownPrimitives).toEqual([
      { nodeId: invented.id, type: primitiveTypeSchema.parse("app.nonesuch") },
    ])
  })

  it("says nothing about an insert the library can draw", () => {
    const { analysis } = analyzeAgainstLibrary((ids) => [
      {
        op: "insert",
        parentId: ids.page,
        index: 0,
        node: buildElement(spare, {
          type: "loom.banner",
          children: [buildText(spare, "Sale")],
        }),
      },
    ])

    expect(analysis.unknownPrimitives).toEqual([])
  })

  /**
   * The measurement that keeps the check from punishing a change for the tree it
   * found. A page may already hold a primitive a later deployment withdrew — that
   * is exactly why the renderer reports instead of throwing — and moving,
   * reconfiguring or removing such a node introduces no hole that was not there.
   */
  it("does not answer for a node the tree already held", () => {
    const { tree, ids } = sampleTree()

    const moved = analyzeDelta(
      tree,
      deltaOf(tree.treeId, [
        { op: "move", nodeId: ids.card, parentId: ids.page, index: 0 },
        { op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: [] },
        { op: "remove", nodeId: ids.footer },
      ]),
      undefined,
      primitiveVocabularyFor([primitiveTypeSchema.parse("loom.nothing-here")])
    )
    if (!moved.ok) throw new Error(moved.error.code)

    expect(moved.value.unknownPrimitives).toEqual([])
  })

  it("reaches a node buried inside an inserted subtree", () => {
    const buried = buildElement(spare, { type: "app.buried" })
    const banner = buildElement(spare, { type: "loom.banner", children: [buried] })

    const { analysis } = analyzeAgainstLibrary((ids) => [
      { op: "insert", parentId: ids.page, index: 0, node: banner },
    ])

    expect(analysis.unknownPrimitives.map((unknown) => unknown.nodeId)).toEqual([buried.id])
  })

  it("collects across every insert in a delta", () => {
    const first = buildElement(spare, { type: "app.one" })
    const second = buildElement(spare, { type: "app.two" })

    const { analysis } = analyzeAgainstLibrary((ids) => [
      { op: "insert", parentId: ids.page, index: 0, node: first },
      { op: "insert", parentId: ids.page, index: 1, node: second },
    ])

    expect(analysis.unknownPrimitives.map((unknown) => unknown.type)).toEqual([
      primitiveTypeSchema.parse("app.one"),
      primitiveTypeSchema.parse("app.two"),
    ])
  })
})
