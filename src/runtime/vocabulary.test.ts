import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"

import {
  describeUnknownPrimitive,
  EVERY_TYPE_REGISTERED,
  primitiveVocabularyFor,
  unknownPrimitivesIn,
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
