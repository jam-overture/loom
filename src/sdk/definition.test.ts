import { createElement } from "react"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import type { JsonObjectView } from "../json.js"
import type { LoomPrimitiveProps } from "../render/primitive.js"

import { definePrimitive } from "./definition.js"

const anyPrimitive = ({ children }: LoomPrimitiveProps) => createElement("div", null, children)

const entryFor = <TProps extends JsonObjectView>(props: z.ZodType<TProps, z.ZodTypeDef, unknown>) =>
  definePrimitive({
    type: "loom.subject",
    description: "a subject",
    props,
    component: ({ children }: LoomPrimitiveProps<TProps>) => createElement("div", null, children),
  })

describe("definePrimitive", () => {
  it("keeps what the catalogue and the registry need, and defaults slots to none", () => {
    const entry = definePrimitive({
      type: "loom.card",
      description: "a bounded block of content",
      props: z.object({}),
      component: anyPrimitive,
    })

    expect(entry.type).toBe("loom.card")
    expect(entry.description).toBe("a bounded block of content")
    expect(entry.slots).toEqual([])
  })

  it("carries declared slots through", () => {
    const entry = definePrimitive({
      type: "loom.page",
      description: "the page shell",
      props: z.object({}),
      slots: ["main", "aside"],
      component: anyPrimitive,
    })

    expect(entry.slots).toEqual(["main", "aside"])
  })
})

describe("the validator a definition produces", () => {
  it("accepts props that satisfy the declared schema", () => {
    const entry = entryFor(z.object({ title: z.string() }))

    expect(entry.validate({ title: "Home" })).toEqual({ outcome: "valid" })
  })

  it("reports the path and the reason for each failure", () => {
    const entry = entryFor(z.object({ title: z.string() }))

    const verdict = entry.validate({ title: 3 })

    expect(verdict.outcome).toBe("invalid")
    expect(verdict.outcome === "invalid" && verdict.issues).toEqual([
      { path: "title", message: expect.stringContaining("string") as unknown as string },
    ])
  })

  it("dots the path of a nested failure", () => {
    const entry = entryFor(z.object({ meta: z.object({ tag: z.string() }) }))

    const verdict = entry.validate({ meta: { tag: 1 } })

    expect(verdict.outcome === "invalid" && verdict.issues[0]?.path).toBe("meta.tag")
  })

  it("names the whole bag when the failure is not about one key", () => {
    const entry = entryFor(z.object({ title: z.string() }).strict())

    const verdict = entry.validate({ title: "Home", onClick: "alert(1)" })

    expect(verdict.outcome === "invalid" && verdict.issues[0]?.path).toBe("props")
  })

  /**
   * The property `render/props.ts` promises: a schema that would supply a value
   * is still only a predicate, so nothing downstream can receive props the tree
   * does not contain.
   */
  it("does not hand back defaulted or coerced props", () => {
    const entry = entryFor(z.object({ title: z.string().default("Untitled") }))

    expect(entry.validate({})).toEqual({ outcome: "valid" })
  })
})

describe("the declared props a definition exposes", () => {
  it("lists an object schema's keys, name-sorted, with optionality", () => {
    const entry = entryFor(z.object({ title: z.string(), subtitle: z.string().optional() }))

    expect(entry.declaredProps).toEqual([
      { name: "subtitle", required: false },
      { name: "title", required: true },
    ])
  })

  it("treats a defaulted prop as optional, because a tree may omit it", () => {
    const entry = entryFor(z.object({ variant: z.string().default("plain") }))

    expect(entry.declaredProps).toEqual([{ name: "variant", required: false }])
  })

  it("answers undefined — not an empty list — when the keys cannot be enumerated", () => {
    const entry = entryFor(
      z.union([z.object({ kind: z.literal("a") }), z.object({ kind: z.literal("b") })])
    )

    expect(entry.declaredProps).toBeUndefined()
  })

  it("distinguishes that from a schema that genuinely declares no props", () => {
    expect(entryFor(z.object({})).declaredProps).toEqual([])
  })
})

describe("the text a definition declares", () => {
  const markerFor = (text: Readonly<Record<string, string>>) =>
    definePrimitive({
      type: "loom.marker",
      description: "a state marker",
      props: z.object({}),
      text,
      component: anyPrimitive,
    })

  it("carries the declared strings onto the entry", () => {
    expect(markerFor({ excluded: "Not included" }).text).toEqual({ excluded: "Not included" })
  })

  it("defaults to none, because most primitives own no strings", () => {
    expect(
      definePrimitive({
        type: "loom.card",
        description: "a bounded block of content",
        props: z.object({}),
        component: anyPrimitive,
      }).text
    ).toEqual({})
  })

  it("copies what it was given, so a later mutation cannot change a rendered page", () => {
    const declared: Record<string, string> = { excluded: "Not included" }
    const entry = markerFor(declared)

    declared["excluded"] = "Something else entirely"

    expect(entry.text["excluded"]).toBe("Not included")
  })

  it("has no prototype, so a key named after one of Object's is an ordinary key", () => {
    expect(Object.getPrototypeOf(markerFor({ toString: "A string" }).text)).toBeNull()
  })

  /**
   * The type-level half, checked by `tsc` rather than by vitest: the keys a
   * component may read are exactly the keys it declared. An author who reads one
   * they did not declare finds out here, the same way `props.titel` does.
   */
  it("types the component's text by what was declared", () => {
    const entry = definePrimitive({
      type: "loom.marker",
      description: "a state marker",
      props: z.object({}),
      text: { excluded: "Not included" },
      component: ({ loom }) => createElement("span", null, loom.text.excluded),
    })

    definePrimitive({
      type: "loom.marker",
      description: "a state marker",
      props: z.object({}),
      text: { excluded: "Not included" },
      // @ts-expect-error — `included` was never declared, so it cannot be read
      component: ({ loom }) => createElement("span", null, loom.text.included),
    })

    expect(entry.text["excluded"]).toBe("Not included")
  })
})
