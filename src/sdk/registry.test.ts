import { createElement } from "react"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import type { InteractiveWhen } from "../interactivity.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import type { LoomPrimitiveProps } from "../render/primitive.js"
import { cardDefinition, registryOf, testDefinitions } from "../testing/definitions.js"

import { definePrimitive, type PrimitiveEntry } from "./definition.js"
import { createPrimitiveRegistry, describeRegistryError, type RegistryError } from "./registry.js"

const type = (value: string) => primitiveTypeSchema.parse(value)

const entry = (overrides: Partial<PrimitiveEntry> & { readonly type: string }): PrimitiveEntry => ({
  ...definePrimitive({
    type: overrides.type,
    description: "a subject",
    props: z.object({}),
    component: ({ children }: LoomPrimitiveProps) => createElement("div", null, children),
  }),
  ...overrides,
})

const errorOf = (entries: readonly PrimitiveEntry[]): RegistryError => {
  const built = createPrimitiveRegistry(entries)
  if (built.ok) throw new Error("expected the registry to be refused")

  return built.error
}

describe("createPrimitiveRegistry", () => {
  it("keeps registration order", () => {
    expect(registryOf(testDefinitions).primitives.map((primitive) => primitive.type)).toEqual([
      "loom.page",
      "loom.header",
      "loom.card",
      "loom.footer",
    ])
  })

  it("resolves a registered type to its component", () => {
    expect(registryOf(testDefinitions).resolve(type("loom.card"))).toBe(cardDefinition.component)
  })

  it("resolves nothing for a type nobody registered", () => {
    expect(registryOf(testDefinitions).resolve(type("commerce.buy-button"))).toBeUndefined()
  })

  it("validates props with the schema the type declared", () => {
    const registry = registryOf(testDefinitions)

    expect(registry.validateProps(type("loom.card"), { variant: "outlined" })).toEqual({ outcome: "valid" })
    expect(registry.validateProps(type("loom.card"), { variant: "glowing" }).outcome).toBe("invalid")
  })

  it("answers undeclared rather than valid for a type it does not know", () => {
    expect(registryOf(testDefinitions).validateProps(type("commerce.buy-button"), {})).toEqual({
      outcome: "undeclared",
    })
  })

  /**
   * A primitive type is a lowercase identifier, so `constructor` and `toString`
   * are valid ones. Lookup is a Map, so they are ordinary keys.
   */
  it("does not confuse a primitive type with an inherited object property", () => {
    const registry = registryOf([entry({ type: "constructor" })])

    expect(registry.resolve(type("constructor"))).toBeDefined()
    expect(registry.resolve(type("to-string"))).toBeUndefined()
    expect(registryOf([]).resolve(type("constructor"))).toBeUndefined()
  })

  it("refuses a type that is not a valid primitive identifier", () => {
    expect(errorOf([entry({ type: "Loom.Card" })])).toEqual({
      code: "invalid-primitive-type",
      type: "Loom.Card",
    })
  })

  it("refuses a slot name that is not a valid slot identifier", () => {
    expect(errorOf([entry({ type: "loom.page", slots: ["main-content"] })])).toEqual({
      code: "invalid-slot-name",
      type: "loom.page",
      slot: "main-content",
    })
  })

  /** Last-wins would make a tree's meaning depend on module evaluation order. */
  it("refuses a duplicate type rather than letting one registration win", () => {
    expect(errorOf([entry({ type: "loom.card" }), entry({ type: "loom.card" })])).toEqual({
      code: "duplicate-primitive-type",
      type: "loom.card",
    })
  })
})

describe("describeRegistryError", () => {
  it("says what was wrong and what was expected", () => {
    expect(describeRegistryError({ code: "invalid-primitive-type", type: "Loom.Card" })).toContain("kebab-case")
    expect(describeRegistryError({ code: "invalid-slot-name", type: "loom.page", slot: "main-content" })).toContain(
      "camelCase"
    )
    expect(describeRegistryError({ code: "duplicate-primitive-type", type: "loom.card" })).toContain("twice")
  })
})

describe("createPrimitiveRegistry over interactivity", () => {
  const linked = (interactive: InteractiveWhen) =>
    definePrimitive({
      type: "loom.linked-card",
      description: "a surface that may be the link",
      props: z.object({ href: z.string().optional(), tone: z.string().optional() }),
      interactive,
      component: ({ children }: LoomPrimitiveProps<{ readonly href?: string | undefined; readonly tone?: string | undefined }>) =>
        createElement("a", null, children),
    })

  it("carries the declaration through to the registered primitive", () => {
    const built = createPrimitiveRegistry([linked({ whenProps: ["href"] })])

    expect(built.ok && built.value.primitives[0]?.interactive).toEqual({ whenProps: ["href"] })
  })

  it("leaves a primitive that declares nothing with nothing", () => {
    const built = createPrimitiveRegistry([entry({ type: "loom.quiet" })])

    expect(built.ok && built.value.primitives[0]?.interactive).toBeUndefined()
  })

  it("refuses a trigger naming a prop the schema does not declare", () => {
    const error = errorOf([linked({ whenProps: ["hrefs"] })])

    expect(error).toEqual({
      code: "undeclared-interactive-prop",
      type: "loom.linked-card",
      prop: "hrefs",
    })
    expect(describeRegistryError(error)).toContain("\"hrefs\"")
  })

  it("accepts `always`, which names no prop to check", () => {
    expect(createPrimitiveRegistry([linked("always")]).ok).toBe(true)
  })

  /**
   * "I cannot enumerate this schema" is not "this schema has no such prop", and
   * refusing on the strength of it would be refusing on a guess.
   */
  it("leaves a schema whose fields cannot be enumerated alone", () => {
    const opaque = definePrimitive({
      type: "loom.opaque",
      description: "a primitive whose props are a union",
      props: z.union([z.object({ href: z.string() }), z.object({ to: z.string() })]),
      interactive: { whenProps: ["href", "to"] },
      component: ({ children }: LoomPrimitiveProps<{ readonly href: string } | { readonly to: string }>) =>
        createElement("a", null, children),
    })

    expect(createPrimitiveRegistry([opaque]).ok).toBe(true)
  })
})
