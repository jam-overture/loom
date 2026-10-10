import { describe, expect, it } from "vitest"

import { bindingNameSchema } from "../data/source.js"
import { sequentialIdFactory, type TreeId } from "../ids.js"
import type { JsonObject } from "../json.js"
import { primitiveTypeSchema, slotNameSchema } from "../primitive-type.js"
import type { BindingReader } from "../render/reads.js"
import type { SlotPlacer } from "../render/slots.js"
import { DATA_PROP_KEY, SUBMIT_PROP_KEY } from "../reserved-props.js"
import {
  boundTree,
  formTree,
  sampleTree,
  type BoundTree,
  type FormTree,
  type SampleTree,
} from "../testing/fixtures.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import type { TreeDelta, TreeOperation } from "../tree/delta.js"
import { createTree } from "../tree/tree.js"

import { analyzeDelta } from "./analysis.js"
import { interactivePredicateFor, nestedTargetsIn } from "./nesting.js"
import {
  primitiveVocabularyFor,
  type PrimitiveVocabulary,
  type PropsVocabulary,
  type UnplacedSlot,
  type UnreadBinding,
} from "./vocabulary.js"

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
  const result = analyzeDelta(tree, deltaOf(tree.treeId, build(ids)), { isInteractive: isTarget })
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
      { isInteractive: isTarget }
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
  const result = analyzeDelta(tree, deltaOf(tree.treeId, build(ids)), { isRegistered: drawable })
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
      { isRegistered: primitiveVocabularyFor([primitiveTypeSchema.parse("loom.nothing-here")]) }
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

/** The same stand-in schema `vocabulary.test.ts` uses: `loom.card` takes two variants. */
const acceptsVariants: PropsVocabulary = (type, props) => {
  if (type !== primitiveTypeSchema.parse("loom.card")) return { outcome: "undeclared" }

  return props.variant === "outlined" || props.variant === "filled"
    ? { outcome: "valid" }
    : {
        outcome: "invalid",
        issues: [{ path: "variant", message: `received ${String(props.variant)}` }],
      }
}

/** A page holding one card, so a test can start from one the schema already refuses. */
const cardPage = (variant: string) => {
  const factory = sequentialIdFactory("props")
  const card = buildElement(factory, { type: "loom.card", props: { variant } })
  const page = buildElement(factory, { type: "loom.page", children: [card] })

  return { tree: createTree(page, factory), card: card.id, page: page.id }
}

const analyzeProps = (
  start: ReturnType<typeof cardPage>,
  operations: TreeOperation[],
  checkProps: PropsVocabulary = acceptsVariants
) => {
  const result = analyzeDelta(
    start.tree,
    deltaOf(start.tree.treeId, operations),
    { checkProps }
  )
  if (!result.ok) throw new Error(result.error.code)

  return result.value
}

describe("analyzeDelta invalid props", () => {
  it("reports none when the host wires no props vocabulary", () => {
    const start = cardPage("outlined")
    const analysis = analyzeDelta(
      start.tree,
      deltaOf(start.tree.treeId, [
        { op: "configure", nodeId: start.card, set: { variant: "invented" }, unset: [] },
      ])
    )

    expect(analysis.ok && analysis.value.invalidProps).toEqual([])
  })

  it("names an inserted node whose props the declaring primitive refuses", () => {
    const start = cardPage("outlined")
    const added = buildElement(spare, { type: "loom.card", props: { variant: "invented" } })

    const analysis = analyzeProps(start, [
      { op: "insert", parentId: start.page, index: 1, node: added },
    ])

    expect(analysis.invalidProps).toEqual([
      {
        nodeId: added.id,
        type: primitiveTypeSchema.parse("loom.card"),
        issues: [{ path: "variant", message: "received invented" }],
      },
    ])
  })

  it("names a node a configure broke", () => {
    const start = cardPage("outlined")

    const analysis = analyzeProps(start, [
      { op: "configure", nodeId: start.card, set: { variant: "invented" }, unset: [] },
    ])

    expect(analysis.invalidProps.map((invalid) => invalid.nodeId)).toEqual([start.card])
  })

  it("says nothing about a change that leaves the props acceptable", () => {
    const start = cardPage("outlined")

    const analysis = analyzeProps(start, [
      { op: "configure", nodeId: start.card, set: { variant: "filled" }, unset: [] },
    ])

    expect(analysis.invalidProps).toEqual([])
  })

  /**
   * The inherited case. A page may already hold a node whose schema was
   * tightened past it, and an edit elsewhere is not the change that broke it.
   */
  it("does not answer for a node that was already failing and was left alone", () => {
    const start = cardPage("invented")

    const analysis = analyzeProps(start, [
      { op: "configure", nodeId: start.page, set: { title: "Home" }, unset: [] },
    ])

    expect(analysis.invalidProps).toEqual([])
  })

  /**
   * Keyed by node id, not by the issues, so a half-repair of an already-broken
   * node is not itself a refusal. Counting it would mean the only way out of
   * such a node is one change that fixes everything at once.
   */
  it("does not answer for a node that was already failing and still fails differently", () => {
    const start = cardPage("invented")

    const analysis = analyzeProps(start, [
      { op: "configure", nodeId: start.card, set: { variant: "also-invented" }, unset: [] },
    ])

    expect(analysis.invalidProps).toEqual([])
  })

  /**
   * The case an operation-by-operation measurement gets wrong: the delta puts
   * a bad node in and fixes it two operations later, and the page a reader is
   * served is fine. Only the tree at the end can say so.
   */
  it("says nothing about a node a later operation in the same delta repaired", () => {
    const start = cardPage("outlined")
    const added = buildElement(spare, { type: "loom.card", props: { variant: "invented" } })

    const analysis = analyzeProps(start, [
      { op: "insert", parentId: start.page, index: 1, node: added },
      { op: "configure", nodeId: added.id, set: { variant: "filled" }, unset: [] },
    ])

    expect(analysis.invalidProps).toEqual([])
  })

  it("says nothing when a change removes the node that was failing", () => {
    const start = cardPage("invented")

    const analysis = analyzeProps(start, [{ op: "remove", nodeId: start.card }])

    expect(analysis.invalidProps).toEqual([])
  })

  it("says nothing when a change only relocates a node that was already failing", () => {
    const start = cardPage("invented")
    const slot = buildElement(spare, { type: "loom.footer" })

    const analysis = analyzeProps(start, [
      { op: "insert", parentId: start.page, index: 1, node: slot },
      { op: "move", nodeId: start.card, parentId: slot.id, index: 0 },
    ])

    expect(analysis.invalidProps).toEqual([])
  })

  it("reaches a node buried inside an inserted subtree", () => {
    const start = cardPage("outlined")
    const buried = buildElement(spare, { type: "loom.card", props: { variant: "invented" } })
    const banner = buildElement(spare, { type: "loom.banner", children: [buried] })

    const analysis = analyzeProps(start, [
      { op: "insert", parentId: start.page, index: 1, node: banner },
    ])

    expect(analysis.invalidProps.map((invalid) => invalid.nodeId)).toEqual([buried.id])
  })
})

/** A page holding one card that asks a question, so a test can start unread. */
const askingPage = (...names: readonly string[]) => {
  const factory = sequentialIdFactory("unread")
  const card = buildElement(factory, {
    type: "loom.card",
    props: {
      [DATA_PROP_KEY]: Object.fromEntries(
        names.map((name) => [name, { source: "catalogue.services" }])
      ),
    },
  })
  const page = buildElement(factory, { type: "loom.page", children: [card] })

  return { tree: createTree(page, factory), card: card.id, page: page.id }
}

const readsItems: BindingReader = {
  bindingsReadBy: (type) => (type === primitiveTypeSchema.parse("loom.card") ? ["items"] : undefined),
}

const analyzeReads = (
  start: ReturnType<typeof askingPage>,
  operations: TreeOperation[],
  reads: BindingReader = readsItems
) => {
  const result = analyzeDelta(
    start.tree,
    deltaOf(start.tree.treeId, operations),
    { reads }
  )
  if (!result.ok) throw new Error(result.error.code)

  return result.value
}

const asked = (analysis: { readonly unreadBindings: readonly UnreadBinding[] }) =>
  analysis.unreadBindings.map((unread) => `${unread.nodeId} ${unread.name}`)

describe("analyzeDelta unread bindings", () => {
  it("reports none when the host hands no reader", () => {
    const start = askingPage("rows")
    const analysis = analyzeDelta(
      start.tree,
      deltaOf(start.tree.treeId, [
        { op: "configure", nodeId: start.card, set: { title: "Services" }, unset: [] },
      ])
    )

    expect(analysis.ok && analysis.value.unreadBindings).toEqual([])
  })

  it("names an inserted node asking under a name its primitive does not read", () => {
    const start = askingPage("items")
    const added = buildElement(spare, {
      type: "loom.card",
      props: { [DATA_PROP_KEY]: { rows: { source: "catalogue.services" } } },
    })

    const analysis = analyzeReads(start, [
      { op: "insert", parentId: start.page, index: 1, node: added },
    ])

    expect(analysis.unreadBindings).toEqual([
      {
        nodeId: added.id,
        type: primitiveTypeSchema.parse("loom.card"),
        name: bindingNameSchema.parse("rows"),
      },
    ])
  })

  /**
   * The case a walk over the operations alone would miss, and the reason this
   * fact is measured on the two trees: a `configure` puts a question on a node
   * that had none, and no `insert` was involved.
   */
  it("names a node a configure gave a question nothing reads", () => {
    const start = askingPage("items")

    const analysis = analyzeReads(start, [
      {
        op: "configure",
        nodeId: start.card,
        set: { [DATA_PROP_KEY]: { items: { source: "catalogue.services" }, rows: { source: "catalogue.services" } } },
        unset: [],
      },
    ])

    expect(asked(analysis)).toEqual([`${start.card} rows`])
  })

  /**
   * 0184's half, at the write path: a `configure` that changes the *prop* naming
   * the binding orphans a question without touching `loom:data` at all.
   */
  it("names a node a configure orphaned by renaming the prop that names the binding", () => {
    const start = askingPage("items")
    const byProp: BindingReader = {
      bindingsReadBy: () => [{ fromProp: "binding", default: "items" }],
    }

    const analysis = analyzeReads(
      start,
      [{ op: "configure", nodeId: start.card, set: { binding: "elsewhere" }, unset: [] }],
      byProp
    )

    expect(asked(analysis)).toEqual([`${start.card} items`])
  })

  it("says nothing about a change that leaves every question read", () => {
    const start = askingPage("items")

    const analysis = analyzeReads(start, [
      { op: "configure", nodeId: start.card, set: { title: "Services" }, unset: [] },
    ])

    expect(analysis.unreadBindings).toEqual([])
  })

  /**
   * The inherited case. A page may already be asking a question nobody reads —
   * a primitive that was rewritten, or a declaration that landed after the tree
   * did — and an edit elsewhere is not the change that started the round trip.
   */
  it("does not answer for a question that was already unread and was left alone", () => {
    const start = askingPage("rows")

    const analysis = analyzeReads(start, [
      { op: "configure", nodeId: start.page, set: { title: "Services" }, unset: [] },
    ])

    expect(analysis.unreadBindings).toEqual([])
  })

  /**
   * Where this parts company with `invalidProps`, which keys by node alone. Two
   * unread names on one node are two round trips, so the change that adds the
   * second is answerable for the second and inherits the first.
   */
  it("answers for a second unread name on a node that already had one", () => {
    const start = askingPage("rows")

    const analysis = analyzeReads(start, [
      {
        op: "configure",
        nodeId: start.card,
        set: { [DATA_PROP_KEY]: { rows: { source: "catalogue.services" }, cards: { source: "catalogue.services" } } },
        unset: [],
      },
    ])

    expect(asked(analysis)).toEqual([`${start.card} cards`])
  })

  /** Broken and then fixed inside one delta is not broken, as with props. */
  it("says nothing about a delta that asks wrongly and then corrects itself", () => {
    const start = askingPage("items")

    const analysis = analyzeReads(start, [
      {
        op: "configure",
        nodeId: start.card,
        set: { [DATA_PROP_KEY]: { rows: { source: "catalogue.services" } } },
        unset: [],
      },
      {
        op: "configure",
        nodeId: start.card,
        set: { [DATA_PROP_KEY]: { items: { source: "catalogue.services" } } },
        unset: [],
      },
    ])

    expect(analysis.unreadBindings).toEqual([])
  })

  it("says nothing about a question a remove took off the page", () => {
    const start = askingPage("rows")

    const analysis = analyzeReads(start, [{ op: "remove", nodeId: start.card }])

    expect(analysis.unreadBindings).toEqual([])
  })
})

/** A page holding one dialog whose content is in named regions. */
const fillingPage = (...names: readonly string[]) => {
  const factory = sequentialIdFactory("unplaced")
  const dialog = buildElement(factory, {
    type: "loom.dialog",
    children: names.map((name) => buildSlot(factory, name, [buildText(factory, name)])),
  })
  const page = buildElement(factory, { type: "loom.page", children: [dialog] })

  return { tree: createTree(page, factory), dialog: dialog.id, page: page.id }
}

/**
 * One primitive that places `header`, one that declares no regions at all, and
 * `undefined` for everything else — the three answers this seam has (0249).
 */
const placesHeader: SlotPlacer = {
  slotsPlacedBy: (type) => {
    if (type === primitiveTypeSchema.parse("loom.dialog")) return [slotNameSchema.parse("header")]

    return type === primitiveTypeSchema.parse("loom.plate") ? [] : undefined
  },
}

const analyzePlaces = (
  start: ReturnType<typeof fillingPage>,
  operations: TreeOperation[],
  places: SlotPlacer = placesHeader
) => {
  const result = analyzeDelta(start.tree, deltaOf(start.tree.treeId, operations), { places })
  if (!result.ok) throw new Error(result.error.code)

  return result.value
}

const dropped = (analysis: { readonly unplacedSlots: readonly UnplacedSlot[] }) =>
  analysis.unplacedSlots.map((unplaced) => `${unplaced.nodeId} ${unplaced.name}`)

describe("analyzeDelta unplaced slots", () => {
  it("reports none when the host hands no placer", () => {
    const start = fillingPage("body")
    const added = buildElement(spare, {
      type: "loom.dialog",
      children: [buildSlot(spare, "footer", [buildText(spare, "Close")])],
    })

    const analysis = analyzeDelta(
      start.tree,
      deltaOf(start.tree.treeId, [{ op: "insert", parentId: start.page, index: 1, node: added }])
    )

    expect(analysis.ok && analysis.value.unplacedSlots).toEqual([])
  })

  it("names an inserted node filling a region its primitive places nowhere", () => {
    const start = fillingPage("header")
    const added = buildElement(spare, {
      type: "loom.dialog",
      children: [buildSlot(spare, "body", [buildText(spare, "Book a call")])],
    })

    const analysis = analyzePlaces(start, [
      { op: "insert", parentId: start.page, index: 1, node: added },
    ])

    expect(analysis.unplacedSlots).toEqual([
      {
        nodeId: added.id,
        type: primitiveTypeSchema.parse("loom.dialog"),
        name: "body",
      },
    ])
  })

  /**
   * The case that has no analogue in `unknownPrimitives` and is the reason this
   * fact is measured on the two trees rather than on the operations. A type is
   * fixed when a node is inserted; a region's fate is the parent's, so a `move`
   * can drop content that was being placed a moment ago without touching the
   * node that carries it.
   */
  it("names a region a move carried under a parent that does not place it", () => {
    const start = fillingPage("header")
    const other = buildElement(spare, { type: "loom.plate" })
    const region = buildSlot(spare, "header", [buildText(spare, "Book a call")])

    const analysis = analyzePlaces(start, [
      { op: "insert", parentId: start.page, index: 1, node: other },
      { op: "insert", parentId: start.dialog, index: 1, node: region },
      { op: "move", nodeId: region.id, parentId: other.id, index: 0 },
    ])

    expect(dropped(analysis)).toEqual([`${other.id} header`])
  })

  it("says nothing about a change that leaves every region placed", () => {
    const start = fillingPage("header")

    const analysis = analyzePlaces(start, [
      { op: "configure", nodeId: start.page, set: { title: "Pricing" }, unset: [] },
    ])

    expect(analysis.unplacedSlots).toEqual([])
  })

  /**
   * The inherited case. A page may already be dropping a region — a primitive
   * that was rewritten, or a tree authored before the declaration — and an edit
   * elsewhere is not the change that lost the paragraph.
   */
  it("does not answer for a region that was already unplaced and was left alone", () => {
    const start = fillingPage("body")

    const analysis = analyzePlaces(start, [
      { op: "configure", nodeId: start.page, set: { title: "Pricing" }, unset: [] },
    ])

    expect(analysis.unplacedSlots).toEqual([])
  })

  /**
   * Where this parts company with `invalidProps`, which keys by node alone. Two
   * unplaced regions on one node are two pieces of content on the floor, so the
   * change that adds the second answers for the second and inherits the first.
   */
  it("answers for a second unplaced region on a node that already had one", () => {
    const start = fillingPage("body")
    const added = buildSlot(spare, "aside", [buildText(spare, "Nearby")])

    const analysis = analyzePlaces(start, [
      { op: "insert", parentId: start.dialog, index: 1, node: added },
    ])

    expect(dropped(analysis)).toEqual([`${start.dialog} aside`])
  })

  /** Broken and then fixed inside one delta is not broken, as with props. */
  it("says nothing about a delta that fills wrongly and then takes it back", () => {
    const start = fillingPage("header")
    const added = buildSlot(spare, "body", [buildText(spare, "Book a call")])

    const analysis = analyzePlaces(start, [
      { op: "insert", parentId: start.dialog, index: 1, node: added },
      { op: "remove", nodeId: added.id },
    ])

    expect(analysis.unplacedSlots).toEqual([])
  })

  it("says nothing about a region a remove took off the page", () => {
    const start = fillingPage("body")

    const analysis = analyzePlaces(start, [{ op: "remove", nodeId: start.dialog }])

    expect(analysis.unplacedSlots).toEqual([])
  })

  /**
   * Deduplicated, because two slot children sharing a name are both placed
   * (0051) and so both lost by one mistake — a count that rose with how many
   * times the tree spelled the name would be a count of the spelling.
   */
  it("reports one region however many children filled it", () => {
    const start = fillingPage("header")
    const added = buildElement(spare, {
      type: "loom.dialog",
      children: [
        buildSlot(spare, "body", [buildText(spare, "First")]),
        buildSlot(spare, "body", [buildText(spare, "Second")]),
      ],
    })

    const analysis = analyzePlaces(start, [
      { op: "insert", parentId: start.page, index: 1, node: added },
    ])

    expect(dropped(analysis)).toEqual([`${added.id} body`])
  })

  it("reaches a node buried inside an inserted subtree", () => {
    const start = fillingPage("header")
    const buried = buildElement(spare, {
      type: "loom.dialog",
      children: [buildSlot(spare, "body", [buildText(spare, "Buried")])],
    })
    const banner = buildElement(spare, { type: "loom.banner", children: [buried] })

    const analysis = analyzePlaces(start, [
      { op: "insert", parentId: start.page, index: 1, node: banner },
    ])

    expect(dropped(analysis)).toEqual([`${buried.id} body`])
  })

  /**
   * Only direct slot children are routed to a primitive (0051), so a slot
   * inside another slot's fallback renders where it sits and is nobody's region
   * to place. The walk reaches it and must stay silent about it.
   */
  it("says nothing about a slot nested inside another slot's fallback", () => {
    const start = fillingPage("header")
    const added = buildElement(spare, {
      type: "loom.dialog",
      children: [
        buildSlot(spare, "header", [buildSlot(spare, "body", [buildText(spare, "Inside")])]),
      ],
    })

    const analysis = analyzePlaces(start, [
      { op: "insert", parentId: start.page, index: 1, node: added },
    ])

    expect(analysis.unplacedSlots).toEqual([])
  })

  /**
   * A type the resolver cannot speak for is not a primitive claiming it places
   * nothing, which is `undefined`'s whole meaning at this seam.
   */
  it("says nothing about a type the placer does not hold", () => {
    const start = fillingPage("header")
    const added = buildElement(spare, {
      type: "loom.popover",
      children: [buildSlot(spare, "body", [buildText(spare, "Elsewhere")])],
    })

    const analysis = analyzePlaces(start, [
      { op: "insert", parentId: start.page, index: 1, node: added },
    ])

    expect(analysis.unplacedSlots).toEqual([])
  })

  /**
   * 0249's judgement, at the write path. A primitive that declared no regions
   * has said it places none — the one declaration where leaving it out and
   * declaring it empty are the same claim — so every region a tree fills on it
   * is content on the floor. This is the case the diagnostic exists for, since
   * the primitives that lose content this way are exactly the ones declaring
   * nothing.
   */
  it("names a region filled on a primitive that declares none", () => {
    const start = fillingPage("header")
    const added = buildElement(spare, {
      type: "loom.plate",
      children: [buildSlot(spare, "body", [buildText(spare, "Book a call")])],
    })

    const analysis = analyzePlaces(start, [
      { op: "insert", parentId: start.page, index: 1, node: added },
    ])

    expect(dropped(analysis)).toEqual([`${added.id} body`])
  })
})
