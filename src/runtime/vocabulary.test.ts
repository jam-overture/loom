import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import * as reservedProps from "../reserved-props.js"
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

/**
 * The four `loom:` keys, read off the module that owns them rather than listed
 * here. A fifth one lands as a constant in `reserved-props.ts` and the rows
 * below grow with it, which is the only version of this test that stays true —
 * the asymmetry it guards against was invisible for as long as it was because
 * nothing compared the two seams over the whole namespace.
 */
const RESERVED_KEYS = Object.entries(reservedProps).flatMap(([name, value]) =>
  name.endsWith("_PROP_KEY") && typeof value === "string" ? [value] : []
)

/**
 * `.strict()` is what every primitive in the starter library declares, so a
 * stand-in that tolerated an unknown key would be testing a library nobody
 * ships. `loom.card` takes one prop and refuses everything else.
 */
const strictlyAccepts: PropsVocabulary = (type, props) => {
  if (type !== typed("loom.card")) return { outcome: "undeclared" }

  const unknown = Object.keys(props).filter((key) => key !== "variant")

  return unknown.length === 0
    ? { outcome: "valid" }
    : {
        outcome: "invalid",
        issues: unknown.map((key) => ({ path: key, message: `unrecognized key ${key}` })),
      }
}

describe("invalidPropsIn, on the runtime's own keys", () => {
  it("derives the namespace from the module that owns it", () => {
    expect(RESERVED_KEYS.length).toBe(4)
    expect(RESERVED_KEYS.every((key) => reservedProps.isReservedPropKey(key))).toBe(true)
  })

  /**
   * The bug this closes. `interpretation/prompt.ts` teaches a model to write
   * `loom:data` into a node's props in those words, and on a deployment with
   * 0179's floor wired the write path refused exactly that, as `invalid-props`,
   * critical — a node with nothing whatever wrong with it, rejected by the Gate
   * (`Loom lessons`, 28 September).
   */
  it.each(RESERVED_KEYS)("says nothing about a node carrying %s", (key) => {
    const node = buildElement(ids, {
      type: "loom.card",
      props: { variant: "filled", [key]: { anything: true } },
    })

    expect(invalidPropsIn(node, strictlyAccepts)).toEqual([])
  })

  /**
   * Stripping the runtime's keys must not strip the primitive's own, or the
   * floor would pass a node the renderer omits — which is the same hole facing
   * the other way.
   */
  it("still refuses a key the primitive does not know, beside a reserved one", () => {
    const node = buildElement(ids, {
      type: "loom.card",
      props: { [reservedProps.DATA_PROP_KEY]: {}, invented: 1 },
    })

    expect(invalidPropsIn(node, strictlyAccepts)).toEqual([
      {
        nodeId: node.id,
        type: typed("loom.card"),
        issues: [{ path: "invented", message: "unrecognized key invented" }],
      },
    ])
  })

  /**
   * The seam is asserted against the renderer's own split rather than against a
   * second copy of the rule, which is the point: one fact, one implementation.
   */
  it("hands the vocabulary what the render walk hands the primitive", () => {
    const props = { variant: "filled", [reservedProps.THEME_PROP_KEY]: { palette: "dusk" } }
    const node = buildElement(ids, { type: "loom.card", props })
    const seen: JsonObject[] = []

    invalidPropsIn(node, (_type, given) => {
      seen.push(given)

      return { outcome: "valid" }
    })

    expect(seen).toEqual([reservedProps.partitionReservedProps(props).props])
  })
})
