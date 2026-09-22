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

  /**
   * `false` rather than `undefined`, unlike `interactive`. There is no third
   * state to express: a primitive either posts or it does not, and a reader
   * asking "does this need an endpoint" should not have to handle "unstated".
   */
  it("carries a submission declaration through, and defaults it to false", () => {
    const declared = createPrimitiveRegistry([
      definePrimitive({
        type: "loom.enquiry",
        description: "posts what it collected",
        props: z.object({}),
        submits: true,
        component: ({ children }: LoomPrimitiveProps) => createElement("form", null, children),
      }),
    ])

    const undeclared = createPrimitiveRegistry([entry({ type: "loom.quiet" })])

    expect(declared.ok && declared.value.primitives[0]?.submits).toBe(true)
    expect(undeclared.ok && undeclared.value.primitives[0]?.submits).toBe(false)
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

describe("roles", () => {
  const heading = (role: string, type = "loom.heading"): PrimitiveEntry => ({
    ...entry({ type }),
    role,
  })

  it("carries a declared role onto the registration", () => {
    const built = createPrimitiveRegistry([heading("heading")])

    expect(built.ok && built.value.primitives[0]?.role).toBe("heading")
  })

  it("leaves the role undefined for a primitive that declares none", () => {
    const built = createPrimitiveRegistry([entry({ type: "loom.card" })])

    expect(built.ok && built.value.primitives[0]?.role).toBeUndefined()
  })

  it("answers which types declared a role, in registration order", () => {
    const built = createPrimitiveRegistry([
      heading("heading", "acme.hero"),
      entry({ type: "loom.card" }),
      heading("heading"),
    ])

    expect(built.ok && built.value.typesWithRole("heading")).toEqual(["acme.hero", "loom.heading"])
  })

  /**
   * The whole point of the seam: a host that registered `acme.hero` gets its own
   * type back, and never has to know that `loom.heading` is the one the library
   * happens to ship.
   */
  it("does not privilege the library's own type", () => {
    const built = createPrimitiveRegistry([heading("heading", "acme.hero")])

    expect(built.ok && built.value.typesWithRole("heading")).toEqual(["acme.hero"])
  })

  it("answers empty for a role nothing declared, rather than failing", () => {
    const built = createPrimitiveRegistry([entry({ type: "loom.card" })])

    expect(built.ok && built.value.typesWithRole("heading")).toEqual([])
  })

  /**
   * A misspelling accepted here reads to every consumer as a primitive that
   * declares no role, which is the silent failure the refusal exists to prevent.
   * TypeScript stops this at the declaration; a host writing JavaScript has only
   * this check.
   */
  it("refuses a role the runtime does not know", () => {
    const error = errorOf([heading("title")])

    expect(error).toEqual({ code: "unknown-role", type: "loom.heading", role: "title" })
    expect(describeRegistryError(error)).toContain("\"title\"")
  })

  /**
   * The list is the registry's own, handed out rather than copied — a consumer
   * may ask per row of a listing. Frozen, so sharing it cannot become a way to
   * change what a deployment registered. This was wrong in the first draft.
   */
  it("hands out a list that cannot be pushed to", () => {
    const built = createPrimitiveRegistry([heading("heading")])
    if (!built.ok) throw new Error("expected a registry")

    /** Through `unknown`, because the point is what happens when a host defeats the type. */
    const types = built.value.typesWithRole("heading") as unknown as string[]

    expect(() => types.push("acme.hero")).toThrow()
    expect(built.value.typesWithRole("heading")).toEqual(["loom.heading"])
  })

  it("refuses a role that differs only in case", () => {
    expect(errorOf([heading("Heading")])).toEqual({
      code: "unknown-role",
      type: "loom.heading",
      role: "Heading",
    })
  })
})

describe("registering a primitive that says what a reader reads", () => {
  const stat = (copy: readonly string[] | undefined) =>
    definePrimitive({
      type: "loom.stat",
      description: "One figure and what it counts",
      props: z.object({ value: z.string(), label: z.string() }).strict(),
      ...(copy ? { copy } : {}),
      component: () => null,
    })

  it("refuses a declaration naming a prop the schema does not declare", () => {
    const built = createPrimitiveRegistry([stat(["value", "headline"])])

    expect(built.ok).toBe(false)
    if (built.ok) return

    expect(built.error).toEqual({
      code: "undeclared-copy-prop",
      type: "loom.stat",
      prop: "headline",
    })
    expect(describeRegistryError(built.error)).toContain("headline")
  })

  /**
   * The distinction the whole declaration exists for. A default would collapse
   * these two into one answer, and `copyIn` reports one and trusts the other.
   */
  it("keeps an empty declaration apart from no declaration at all", () => {
    const declared = createPrimitiveRegistry([stat([])])
    const silent = createPrimitiveRegistry([stat(undefined)])
    if (!declared.ok || !silent.ok) throw new Error("expected two registries")

    expect(declared.value.copyFor(type("loom.stat"))).toEqual([])
    expect(silent.value.copyFor(type("loom.stat"))).toBeUndefined()
  })

  it("carries the declaration through, and answers for a type nobody registered", () => {
    const built = createPrimitiveRegistry([stat(["value", "label"])])
    if (!built.ok) throw new Error("expected a registry")

    expect(built.value.copyFor(type("loom.stat"))).toEqual(["value", "label"])
    expect(built.value.copyFor(type("acme.widget"))).toBeUndefined()
  })

  it("hands out a list that cannot be pushed to", () => {
    const built = createPrimitiveRegistry([stat(["value"])])
    if (!built.ok) throw new Error("expected a registry")

    const copy = built.value.copyFor(type("loom.stat")) as unknown as string[]

    expect(() => copy.push("label")).toThrow()
    expect(built.value.copyFor(type("loom.stat"))).toEqual(["value"])
  })
})

describe("registering a primitive that says which bindings it reads", () => {
  const feed = (reads: readonly string[] | undefined) =>
    definePrimitive({
      type: "loom.feed",
      description: "A list of entries a source answered with",
      props: z.object({}),
      ...(reads ? { reads } : {}),
      component: () => null,
    })

  it("carries the declared names through to the registration", () => {
    const built = createPrimitiveRegistry([feed(["entries", "summary"])])

    expect(built.ok).toBe(true)
    if (!built.ok) return

    expect(built.value.primitives[0]?.reads).toEqual(["entries", "summary"])
    expect(built.value.bindingsReadBy(type("loom.feed"))).toEqual(["entries", "summary"])
  })

  /**
   * The misdeclaration that fails in the worst direction. A name no tree could
   * write matches no binding, so the primitive would report every binding it
   * was ever handed rather than none.
   */
  it("refuses a name a tree could not write", () => {
    const built = createPrimitiveRegistry([feed(["entries", "Not A Name"])])

    expect(built.ok).toBe(false)
    if (built.ok) return

    expect(built.error).toEqual({
      code: "invalid-binding-name",
      type: "loom.feed",
      name: "Not A Name",
    })
    expect(describeRegistryError(built.error)).toContain("camelCase")
  })

  /** The same bargain `copy` makes, one seam along, and the one 0181 rests on. */
  it("keeps an empty declaration apart from no declaration at all", () => {
    const declared = createPrimitiveRegistry([feed([])])
    const silent = createPrimitiveRegistry([feed(undefined)])

    expect(declared.ok && declared.value.primitives[0]?.reads).toEqual([])
    expect(silent.ok && silent.value.primitives[0]?.reads).toBeUndefined()
  })

  it("answers undefined for a type it does not hold", () => {
    const built = createPrimitiveRegistry([feed(["entries"])])

    expect(built.ok && built.value.bindingsReadBy(type("loom.nowhere"))).toBeUndefined()
  })
})
