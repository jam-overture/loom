import { createElement } from "react"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import type { LoomPrimitiveProps } from "../render/primitive.js"
import { interactivePredicateFor } from "../runtime/nesting.js"
import { gatePolicySchema } from "../runtime/policy.js"
import { registryOf, testDefinitions } from "../testing/definitions.js"
import { buildElement } from "../tree/builders.js"
import { sequentialIdFactory } from "../ids.js"

import { definePrimitive } from "./definition.js"
import { interactiveTypesFor } from "./interactivity.js"
import { createPrimitiveRegistry } from "./registry.js"

const ids = sequentialIdFactory("si")

type Linked = { readonly href?: string | undefined; readonly label?: string | undefined }

const anchor = ({ children }: LoomPrimitiveProps<Linked>) => createElement("a", null, children)

const cardDefinition = definePrimitive({
  type: "loom.linked-card",
  description: "a surface that is the link when it has one",
  props: z.object({ href: z.string().optional() }),
  interactive: { whenProps: ["href"] },
  component: anchor,
})

const actionDefinition = definePrimitive({
  type: "loom.action",
  description: "a thing to press",
  props: z.object({ label: z.string() }),
  interactive: "always",
  component: anchor,
})

const registry = (() => {
  const built = createPrimitiveRegistry([cardDefinition, actionDefinition])
  if (!built.ok) throw new Error(built.error.code)

  return built.value
})()

describe("interactiveTypesFor", () => {
  it("reads the declarations off the registry, in the policy's shape", () => {
    expect(interactiveTypesFor(registry)).toEqual({
      "loom.linked-card": { whenProps: ["href"] },
      "loom.action": "always",
    })
  })

  it("answers with nothing for a library that declares no targets", () => {
    expect(interactiveTypesFor(registryOf(testDefinitions))).toEqual({})
  })

  it("produces a vocabulary a policy accepts", () => {
    const policy = gatePolicySchema.parse({ interactiveTypes: interactiveTypesFor(registry) })

    expect(policy.interactiveTypes).toEqual(interactiveTypesFor(registry))
  })

  /**
   * The point of deriving it: what the Gate believes about a primitive is what
   * that primitive said, so the two cannot drift.
   */
  it("drives the predicate the analysis uses", () => {
    const policy = gatePolicySchema.parse({ interactiveTypes: interactiveTypesFor(registry) })
    const isTarget = interactivePredicateFor(policy.interactiveTypes)

    const plain = buildElement(ids, { type: "loom.linked-card" })
    const linked = buildElement(ids, { type: "loom.linked-card", props: { href: "/pricing" } })

    expect(isTarget(plain)).toBe(false)
    expect(isTarget(linked)).toBe(true)
    expect(isTarget(buildElement(ids, { type: "loom.action", props: { label: "Buy" } }))).toBe(true)
  })
})
