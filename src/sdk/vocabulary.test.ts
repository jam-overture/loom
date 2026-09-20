import { createElement } from "react"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import { sequentialIdFactory } from "../ids.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import type { LoomPrimitiveProps } from "../render/primitive.js"
import { analyzeDelta } from "../runtime/analysis.js"
import { gatePolicySchema } from "../runtime/policy.js"
import { primitiveVocabularyFor } from "../runtime/vocabulary.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"

import { definePrimitive } from "./definition.js"
import { createPrimitiveRegistry } from "./registry.js"
import { registeredTypesFor } from "./vocabulary.js"

const ids = sequentialIdFactory("sv")

const box = ({ children }: LoomPrimitiveProps<Record<string, never>>) =>
  createElement("div", null, children)

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
