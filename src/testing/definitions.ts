import { createElement } from "react"
import { z } from "zod"

import type { JsonObjectView } from "../json.js"
import type { LoomPrimitiveProps } from "../render/primitive.js"
import { definePrimitive, type PrimitiveEntry } from "../sdk/definition.js"
import { createPrimitiveRegistry, describeRegistryError, type PrimitiveRegistry } from "../sdk/registry.js"

/**
 * The primitives of `sampleTree`, declared through the §4 contract, so registry
 * and renderer tests run against real declarations rather than a stand-in for
 * them. `testPrimitives` in `primitives.ts` is the same component set without
 * declarations, which is what §3's tests need.
 *
 * `loom.card` declares its props strictly and `loom.page` does not, because both
 * are legitimate choices a primitive author makes and the render seam has to
 * behave correctly for each.
 */

const declared = <TProps extends JsonObjectView>(
  type: string,
  description: string,
  props: z.ZodType<TProps, z.ZodTypeDef, unknown>,
  tag: string,
  slots?: readonly string[]
): PrimitiveEntry => {
  const Primitive = ({ loom, props: bag, children }: LoomPrimitiveProps<TProps>) =>
    createElement(tag, { ...loom.editable, "data-props": JSON.stringify(bag) }, children)

  Primitive.displayName = `declared(${type})`

  return definePrimitive({
    type,
    description,
    props,
    component: Primitive,
    ...(slots ? { slots } : {}),
  })
}

export const pageDefinition = declared(
  "loom.page",
  "The page shell; everything else lives inside it",
  z.object({ title: z.string(), subtitle: z.string().optional() }),
  "main",
  ["main"]
)

export const cardDefinition = declared(
  "loom.card",
  "A bounded block of related content",
  z.object({ variant: z.enum(["outlined", "filled"]), elevation: z.number().optional() }).strict(),
  "article"
)

export const headerDefinition = declared(
  "loom.header",
  "The banner at the top of a page",
  z.object({}),
  "header"
)

export const footerDefinition = declared(
  "loom.footer",
  "The closing band at the bottom of a page",
  z.object({}),
  "footer"
)

export const testDefinitions: readonly PrimitiveEntry[] = [
  pageDefinition,
  headerDefinition,
  cardDefinition,
  footerDefinition,
]

/**
 * Registration is fallible, and a test that wanted a registry has nothing to say
 * about a failure to build one, so this unwraps loudly rather than making every
 * caller narrow a Result it does not care about.
 */
export const registryOf = (entries: readonly PrimitiveEntry[]): PrimitiveRegistry => {
  const built = createPrimitiveRegistry(entries)
  if (!built.ok) throw new Error(`expected a registry, got ${describeRegistryError(built.error)}`)

  return built.value
}

export const testRegistry = (): PrimitiveRegistry => registryOf(testDefinitions)
