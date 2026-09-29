import { createElement } from "react"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import { sequentialIdFactory } from "../ids.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import * as reservedProps from "../reserved-props.js"
import type { LoomPrimitiveProps } from "../render/primitive.js"
import { analyzeDelta } from "../runtime/analysis.js"
import { gatePolicySchema } from "../runtime/policy.js"
import { primitiveVocabularyFor } from "../runtime/vocabulary.js"
import { buildElement } from "../tree/builders.js"
import type { TreeDelta } from "../tree/delta.js"
import { createTree } from "../tree/tree.js"

import { definePrimitive } from "./definition.js"
import { createPrimitiveRegistry } from "./registry.js"
import { propsVocabularyFor, registeredTypesFor } from "./vocabulary.js"

const ids = sequentialIdFactory("sv")

const box = ({ children }: LoomPrimitiveProps<Record<string, never>>) =>
  createElement("div", null, children)

const titled = ({ props, children }: LoomPrimitiveProps<{ readonly title: string }>) =>
  createElement("div", { title: props.title }, children)

const definitionOf = (type: string) =>
  definePrimitive({
    type,
    description: `the ${type}`,
    props: z.object({}),
    component: box,
  })

const registry = (() => {
  const built = createPrimitiveRegistry([definitionOf("loom.page"), definitionOf("loom.card")])
  if (!built.ok) throw new Error(built.error.code)

  return built.value
})()

describe("registeredTypesFor", () => {
  it("reads every type the registry holds", () => {
    expect([...registeredTypesFor(registry)].sort()).toEqual(
      [primitiveTypeSchema.parse("loom.card"), primitiveTypeSchema.parse("loom.page")].sort()
    )
  })

  it("produces a vocabulary a policy accepts", () => {
    const policy = gatePolicySchema.parse({ registeredPrimitiveTypes: registeredTypesFor(registry) })

    expect(policy.registeredPrimitiveTypes).toEqual(registeredTypesFor(registry))
  })

  /**
   * The point of deriving it: what the Gate believes the deployment can draw is
   * what the renderer resolves against, so a primitive added to one is in the
   * other in the same edit.
   */
  it("drives the fact the analysis reports", () => {
    const page = buildElement(ids, { type: "loom.page" })
    const tree = createTree(page, ids)
    const invented = buildElement(ids, { type: "app.nonesuch" })
    const policy = gatePolicySchema.parse({ registeredPrimitiveTypes: registeredTypesFor(registry) })

    const analysis = analyzeDelta(
      tree,
      {
        deltaId: ids.deltaId(),
        treeId: tree.treeId,
        baseRevision: tree.revision,
        operations: [{ op: "insert", parentId: page.id, index: 0, node: invented }],
      },
      undefined,
      primitiveVocabularyFor(policy.registeredPrimitiveTypes)
    )
    if (!analysis.ok) throw new Error(analysis.error.code)

    expect(analysis.value.unknownPrimitives).toEqual([
      { nodeId: invented.id, type: primitiveTypeSchema.parse("app.nonesuch") },
    ])
  })
})

/**
 * A registry whose primitives declare real Zod schemas, which is the only way
 * to check that the adapter carries a schema's own message through rather than
 * a message this repository wrote.
 */
const schemaRegistry = (() => {
  const built = createPrimitiveRegistry([
    definePrimitive({
      type: "loom.page",
      description: "the page",
      props: z.object({ title: z.string().max(8) }),
      component: titled,
    }),
    definitionOf("loom.card"),
  ])
  if (!built.ok) throw new Error(built.error.code)

  return built.value
})()

describe("propsVocabularyFor", () => {
  const checkProps = propsVocabularyFor(schemaRegistry)

  it("accepts props the declaring schema accepts", () => {
    expect(checkProps(primitiveTypeSchema.parse("loom.page"), { title: "Home" })).toEqual({
      outcome: "valid",
    })
  })

  it("refuses props the declaring schema refuses, carrying the schema's own issues", () => {
    const verdict = checkProps(primitiveTypeSchema.parse("loom.page"), {
      title: "A title well past the maximum",
    })
    if (verdict.outcome !== "invalid") throw new Error(`unexpected ${verdict.outcome}`)

    expect(verdict.issues[0]?.path).toBe("title")
    expect(verdict.issues[0]?.message).toBeTruthy()
  })

  it("declines to answer for a type the registry does not hold", () => {
    expect(checkProps(primitiveTypeSchema.parse("app.nonesuch"), {})).toEqual({
      outcome: "undeclared",
    })
  })

  /**
   * The reason it is derived rather than hand-written. A deployment whose Gate
   * and whose renderer disagree about which props are acceptable has a hole
   * neither seam's own tests can find, so the two are asserted against each
   * other on the same node.
   */
  it("gives the renderer's verdict, node for node", () => {
    const overlong = { title: "A title well past the maximum" }

    expect(checkProps(primitiveTypeSchema.parse("loom.page"), overlong)).toEqual(
      schemaRegistry.validateProps(primitiveTypeSchema.parse("loom.page"), overlong)
    )
  })

  it("drives the fact the analysis reports", () => {
    const page = buildElement(ids, { type: "loom.page", props: { title: "Home" } })
    const tree = createTree(page, ids)
    const added = buildElement(ids, {
      type: "loom.page",
      props: { title: "A title well past the maximum" },
    })

    const analysis = analyzeDelta(
      tree,
      {
        deltaId: ids.deltaId(),
        treeId: tree.treeId,
        baseRevision: tree.revision,
        operations: [{ op: "insert", parentId: page.id, index: 0, node: added }],
      },
      undefined,
      undefined,
      checkProps
    )

    expect(analysis.ok && analysis.value.invalidProps.map((invalid) => invalid.nodeId)).toEqual([
      added.id,
    ])
  })
})

/**
 * The library ships `.strict()` schemas, and strictness is the whole reason the
 * asymmetry below was reachable: a schema that merely stripped an unknown key
 * would have shrugged at the runtime's own.
 */
const strictRegistry = (() => {
  const built = createPrimitiveRegistry([
    definePrimitive({
      type: "loom.page",
      description: "the page",
      props: z.object({ title: z.string() }).strict(),
      component: titled,
    }),
    definePrimitive({
      type: "loom.feed",
      description: "the feed",
      props: z.object({}).strict(),
      component: box,
    }),
  ])
  if (!built.ok) throw new Error(built.error.code)

  return built.value
})()

const RESERVED_KEYS = Object.entries(reservedProps).flatMap(([name, value]) =>
  name.endsWith("_PROP_KEY") && typeof value === "string" ? [value] : []
)

/**
 * The floor, wired the way a deployment wires it, against the JSON the prompt
 * teaches a model to write.
 *
 * Both deployments in this repository that wire 0179's props floor — the
 * portal's `portalPropsVocabulary` and marketing's `SITE_PROPS_VOCABULARY` —
 * are `propsVocabularyFor(registry)` over a strict library, so this is not a
 * hypothetical arrangement. `Loom lessons` reproduced it three ways on 28
 * September while executing an exercise: an insert carrying `loom:data` came
 * back `invalid-props`, **critical**, and the Gate rejected a node with nothing
 * wrong with it.
 */
describe("propsVocabularyFor, on the runtime's own keys", () => {
  const checkProps = propsVocabularyFor(strictRegistry)
  const page = buildElement(ids, { type: "loom.page", props: { title: "Home" } })
  const tree = createTree(page, ids)

  const analyse = (operations: TreeDelta["operations"]) => {
    const analysis = analyzeDelta(
      tree,
      { deltaId: ids.deltaId(), treeId: tree.treeId, baseRevision: tree.revision, operations },
      undefined,
      undefined,
      checkProps
    )
    if (!analysis.ok) throw new Error(analysis.error.code)

    return analysis.value
  }

  it.each(RESERVED_KEYS)("accepts an insert of a node carrying %s", (key) => {
    const added = buildElement(ids, {
      type: "loom.feed",
      props: { [key]: { entries: { source: "s_posts" } } },
    })

    expect(analyse([{ op: "insert", parentId: page.id, index: 0, node: added }])).toMatchObject({
      invalidProps: [],
    })
  })

  it.each(RESERVED_KEYS)("accepts configuring %s onto a node that had none", (key) => {
    const bare = buildElement(ids, { type: "loom.feed" })

    expect(
      analyse([
        { op: "insert", parentId: page.id, index: 0, node: bare },
        { op: "configure", nodeId: bare.id, set: { [key]: { entries: {} } }, unset: [] },
      ])
    ).toMatchObject({ invalidProps: [] })
  })

  /**
   * The half that must not move. Stripping the runtime's keys is not a licence
   * to stop reading the primitive's own, and the node below carries one of each.
   */
  it("still refuses a prop the primitive itself does not accept", () => {
    const added = buildElement(ids, {
      type: "loom.feed",
      props: { [reservedProps.DATA_PROP_KEY]: { entries: {} }, invented: true },
    })

    expect(
      analyse([{ op: "insert", parentId: page.id, index: 0, node: added }]).invalidProps.map(
        (invalid) => invalid.nodeId
      )
    ).toEqual([added.id])
  })

  /**
   * The seams asserted against each other rather than against a second copy of
   * the rule, which is the property `propsVocabularyFor` exists to give: what
   * the renderer would decline to draw is what the write path declines to
   * write. The renderer is handed the partitioned props; so, now, is this.
   */
  it("gives the renderer's verdict on a node carrying a reserved key", () => {
    const props = { [reservedProps.DATA_PROP_KEY]: { entries: { source: "s_posts" } } }

    expect(checkProps(primitiveTypeSchema.parse("loom.feed"), reservedProps.partitionReservedProps(props).props)).toEqual(
      { outcome: "valid" }
    )
  })
})
