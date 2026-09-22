import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"

import {
  describeInvalidProps,
  describeUnknownPrimitive,
  EVERY_TYPE_REGISTERED,
  EVERY_TYPE_UNDECLARED,
  invalidPropsIn,
  primitiveVocabularyFor,
  unknownPrimitivesIn,
  type PropsVocabulary,
} from "./vocabulary.js"

const ids = sequentialIdFactory("voc")
const typed = (type: string) => primitiveTypeSchema.parse(type)

describe("primitiveVocabularyFor", () => {
  it("holds the types it was given and nothing else", () => {
    const known = primitiveVocabularyFor([typed("loom.card"), typed("loom.page")])

    expect(known(typed("loom.card"))).toBe(true)
    expect(known(typed("app.nonesuch"))).toBe(false)
  })

  /**
   * The asymmetry with `NOTHING_INTERACTIVE` is the whole reason this is safe to
   * ship: an empty policy field is a host that has not spoken, and a host that
   * has not spoken must get exactly the runtime's prior behaviour.
   */
  it("treats an empty list as undeclared rather than as an empty library", () => {
    expect(primitiveVocabularyFor([])).toBe(EVERY_TYPE_REGISTERED)
    expect(primitiveVocabularyFor([])(typed("app.nonesuch"))).toBe(true)
  })

  /**
   * `constructor` is a legal primitive type — one lowercase segment is a whole
   * namespaced id — and `{}["constructor"]` is truthy, so an object index would
   * report it registered on every deployment that never registered it.
   */
  it("does not answer for a name inherited from Object.prototype", () => {
    expect(primitiveVocabularyFor([typed("loom.card")])(typed("constructor"))).toBe(false)
  })
})

describe("unknownPrimitivesIn", () => {
  const known = primitiveVocabularyFor([typed("loom.banner"), typed("loom.card")])

  it("reports an element the vocabulary does not hold", () => {
    const node = buildElement(ids, { type: "app.nonesuch" })

    expect(unknownPrimitivesIn(node, known)).toEqual([
      { nodeId: node.id, type: typed("app.nonesuch") },
    ])
  })

  it("reaches below the root of an inserted subtree", () => {
    const buried = buildElement(ids, { type: "app.buried" })
    const banner = buildElement(ids, {
      type: "loom.banner",
      children: [buildSlot(ids, "body", [buried])],
    })

    expect(unknownPrimitivesIn(banner, known)).toEqual([
      { nodeId: buried.id, type: typed("app.buried") },
    ])
  })

  /** Text and slot nodes have no type to register, so neither can be unknown. */
  it("reports nothing for a subtree of text and slots", () => {
    const node = buildSlot(ids, "body", [buildText(ids, "Welcome")])

    expect(unknownPrimitivesIn(node, known)).toEqual([])
  })

  it("reports every unknown element in document order", () => {
    const first = buildElement(ids, { type: "app.one" })
    const second = buildElement(ids, { type: "app.two" })
    const banner = buildElement(ids, { type: "loom.banner", children: [first, second] })

    expect(unknownPrimitivesIn(banner, known).map((unknown) => unknown.type)).toEqual([
      typed("app.one"),
      typed("app.two"),
    ])
  })

  it("names the type and the node it is at", () => {
    const node = buildElement(ids, { type: "app.nonesuch" })

    expect(describeUnknownPrimitive({ nodeId: node.id, type: typed("app.nonesuch") })).toBe(
      `app.nonesuch at ${node.id}`
    )
  })
})

/**
 * A stand-in for a declared schema: `loom.card` accepts two variants, and
 * nothing else in the library has said anything at all. Hand-written rather
 * than Zod-backed on purpose — this suite is about the seam, and
 * `propsVocabularyFor` in the SDK is where a real registry meets it.
 */
const accepts: PropsVocabulary = (type, props) => {
  if (type !== typed("loom.card")) return { outcome: "undeclared" }

  return props.variant === "outlined" || props.variant === "filled"
    ? { outcome: "valid" }
    : {
        outcome: "invalid",
        issues: [{ path: "variant", message: `expected outlined or filled, received ${String(props.variant)}` }],
      }
}

describe("EVERY_TYPE_UNDECLARED", () => {
  /**
   * `undeclared` rather than `valid`: the render seam tells the two apart, and
   * a runtime that answered the second would be making a claim on behalf of a
   * schema that does not exist.
   */
  it("declines to answer for every type", () => {
    expect(EVERY_TYPE_UNDECLARED(typed("loom.card"), { variant: "invented" })).toEqual({
      outcome: "undeclared",
    })
  })

  it("finds nothing wrong with anything, which is the prior behaviour", () => {
    const node = buildElement(ids, { type: "loom.card", props: { variant: "invented" } })

    expect(invalidPropsIn(node, EVERY_TYPE_UNDECLARED)).toEqual([])
  })
})

describe("invalidPropsIn", () => {
  it("reports an element whose props its own schema refuses, with the issues", () => {
    const node = buildElement(ids, { type: "loom.card", props: { variant: "invented" } })

    expect(invalidPropsIn(node, accepts)).toEqual([
      {
        nodeId: node.id,
        type: typed("loom.card"),
        issues: [{ path: "variant", message: "expected outlined or filled, received invented" }],
      },
    ])
  })

  it("says nothing about a node whose props satisfy the schema", () => {
    const node = buildElement(ids, { type: "loom.card", props: { variant: "filled" } })

    expect(invalidPropsIn(node, accepts)).toEqual([])
  })

  /**
   * The third verdict is the one a deployment mid-rollout lives in: a registry
   * that resolves a type and declares no schema for it. Undeclared props are
   * unchecked props, and unchecked is not refused.
   */
  it("says nothing about a type no schema was declared for", () => {
    const node = buildElement(ids, { type: "loom.banner", props: { anything: 1 } })

    expect(invalidPropsIn(node, accepts)).toEqual([])
  })

  it("reaches below the root of an inserted subtree", () => {
    const buried = buildElement(ids, { type: "loom.card", props: { variant: "invented" } })
    const banner = buildElement(ids, {
      type: "loom.banner",
      children: [buildSlot(ids, "body", [buried])],
    })

    expect(invalidPropsIn(banner, accepts).map((invalid) => invalid.nodeId)).toEqual([buried.id])
  })

  it("reports nothing for a subtree of text and slots", () => {
    const node = buildSlot(ids, "body", [buildText(ids, "Welcome")])

    expect(invalidPropsIn(node, accepts)).toEqual([])
  })

  it("reports every failing element in document order", () => {
    const first = buildElement(ids, { type: "loom.card", props: { variant: "one" } })
    const second = buildElement(ids, { type: "loom.card", props: { variant: "two" } })
    const banner = buildElement(ids, { type: "loom.banner", children: [first, second] })

    expect(invalidPropsIn(banner, accepts).map((invalid) => invalid.nodeId)).toEqual([
      first.id,
      second.id,
    ])
  })

  it("names the type, the node it is at, and what the schema said", () => {
    const node = buildElement(ids, { type: "loom.card", props: { variant: "invented" } })

    expect(
      describeInvalidProps({
        nodeId: node.id,
        type: typed("loom.card"),
        issues: [
          { path: "variant", message: "expected outlined or filled" },
          { path: "elevation", message: "expected number" },
        ],
      })
    ).toBe(
      `loom.card at ${node.id} (variant: expected outlined or filled; elevation: expected number)`
    )
  })
})
