import { describe, expect, it } from "vitest"

import { bindingNameSchema } from "../data/source.js"
import { sequentialIdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import { primitiveTypeSchema, slotNameSchema } from "../primitive-type.js"
import type { BindingDeclaration, BindingReader } from "../render/reads.js"
import type { SlotPlacer } from "../render/slots.js"
import * as reservedProps from "../reserved-props.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"

import {
  describeInvalidProps,
  describeUnknownPrimitive,
  describeUnplacedSlot,
  describeUnreadBinding,
  EVERY_TYPE_REGISTERED,
  EVERY_TYPE_UNDECLARED,
  invalidPropsIn,
  NOTHING_DECLARED,
  NOTHING_PLACED,
  primitiveVocabularyFor,
  unknownPrimitivesIn,
  unplacedSlotsIn,
  unreadBindingsIn,
  type PropsVocabulary,
} from "./vocabulary.js"

const ids = sequentialIdFactory("voc")
const typed = (type: string) => primitiveTypeSchema.parse(type)
const named = (name: string) => bindingNameSchema.parse(name)

/** A reader over a plain table, which is what an SDK registry answers from. */
const readerOf = (table: Readonly<Record<string, readonly BindingDeclaration[]>>): BindingReader => ({
  bindingsReadBy: (type) => table[type],
})

const readsEntries = readerOf({ "loom.feed": ["entries"] })
const readsWhicheverPropSays = readerOf({
  "loom.feed": [{ fromProp: "binding", default: "entries" }],
})

const feedAsking = (...names: readonly string[]) =>
  buildElement(ids, {
    type: "loom.feed",
    props: {
      "loom:data": Object.fromEntries(
        names.map((name) => [name, { source: "catalogue.services" }])
      ),
    },
  })

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

describe("NOTHING_DECLARED", () => {
  /**
   * The default has to be silent, and silent for the right reason: nobody has
   * said what any primitive reads, which is not a primitive claiming it reads
   * none. A reader answering `[]` here would refuse every bound node on every
   * deployment that has not opted in.
   */
  it("answers undefined for every type, so nothing is reported", () => {
    expect(NOTHING_DECLARED.bindingsReadBy(typed("loom.feed"))).toBeUndefined()
    expect(unreadBindingsIn(feedAsking("rows"), NOTHING_DECLARED)).toEqual([])
  })
})

describe("unreadBindingsIn", () => {
  it("reports a name the primitive says it does not read", () => {
    const node = feedAsking("rows")

    expect(unreadBindingsIn(node, readsEntries)).toEqual([
      { nodeId: node.id, type: typed("loom.feed"), name: named("rows") },
    ])
  })

  it("says nothing about a name the primitive reads", () => {
    expect(unreadBindingsIn(feedAsking("entries"), readsEntries)).toEqual([])
  })

  /**
   * The bargain `reads` makes, on this side of the seam: absence and emptiness
   * are different answers (0181), and a type this reader does not hold is the
   * absent one.
   */
  it("says nothing about a type the reader has no declaration for", () => {
    const node = buildElement(ids, {
      type: "loom.banner",
      props: { "loom:data": { rows: { source: "catalogue.services" } } },
    })

    expect(unreadBindingsIn(node, readsEntries)).toEqual([])
  })

  /**
   * A primitive that has declared `[]` has said it reads nothing, which is a
   * claim and not a silence — so every name on it is unread.
   */
  it("reports every name on a primitive that declared it reads none", () => {
    const node = feedAsking("entries")

    expect(unreadBindingsIn(node, readerOf({ "loom.feed": [] }))).toEqual([
      { nodeId: node.id, type: typed("loom.feed"), name: named("entries") },
    ])
  })

  /** 0184: a declaration may name the prop that names the binding. */
  it("resolves a prop-named declaration against the node's own props", () => {
    const renamed = buildElement(ids, {
      type: "loom.feed",
      props: {
        binding: "services",
        "loom:data": { services: { source: "catalogue.services" } },
      },
    })

    expect(unreadBindingsIn(renamed, readsWhicheverPropSays)).toEqual([])
  })

  it("reports the default name on a node whose naming prop is absent", () => {
    const node = feedAsking("services")

    expect(unreadBindingsIn(node, readsWhicheverPropSays).map((unread) => unread.name)).toEqual([
      named("services"),
    ])
  })

  it("reaches below the root of an inserted subtree", () => {
    const buried = feedAsking("rows")
    const banner = buildElement(ids, {
      type: "loom.banner",
      children: [buildSlot(ids, "body", [buried])],
    })

    expect(unreadBindingsIn(banner, readsEntries).map((unread) => unread.nodeId)).toEqual([
      buried.id,
    ])
  })

  it("reports nothing for a subtree of text and slots", () => {
    expect(
      unreadBindingsIn(buildSlot(ids, "body", [buildText(ids, "Welcome")]), readsEntries)
    ).toEqual([])
  })

  it("reports a node's own names sorted, and its nodes in document order", () => {
    const first = feedAsking("rows", "items")
    const second = feedAsking("cards")
    const banner = buildElement(ids, { type: "loom.banner", children: [first, second] })

    expect(unreadBindingsIn(banner, readsEntries).map((unread) => [unread.nodeId, unread.name])).toEqual(
      [
        [first.id, named("items")],
        [first.id, named("rows")],
        [second.id, named("cards")],
      ]
    )
  })

  it("says nothing about a node with no loom:data at all", () => {
    expect(unreadBindingsIn(buildElement(ids, { type: "loom.feed" }), readsEntries)).toEqual([])
  })

  /**
   * A malformed declaration is the renderer's to report and there is nothing
   * here to say about it: `parseBindings` refuses the whole map together, so
   * there are no names in it to be read.
   */
  it("says nothing about a loom:data that does not parse", () => {
    const node = buildElement(ids, {
      type: "loom.feed",
      props: { "loom:data": { rows: { source: "Not A Source Id" } } },
    })

    expect(unreadBindingsIn(node, readsEntries)).toEqual([])
  })

  it("names the node, the name it asked under, and the type that does not read it", () => {
    const node = feedAsking("rows")

    expect(
      describeUnreadBinding({ nodeId: node.id, type: typed("loom.feed"), name: named("rows") })
    ).toBe(`${node.id} asks under "rows", which loom.feed does not read`)
  })
})

/** A placer over a plain table, which is what an SDK registry answers from. */
const placerOf = (table: Readonly<Record<string, readonly string[]>>): SlotPlacer => ({
  slotsPlacedBy: (type) => table[type]?.map((name) => slotNameSchema.parse(name)),
})

const placesHeader = placerOf({ "loom.dialog": ["header"], "loom.plate": [] })

/** A dialog filling the regions named, each with something in it to lose. */
const dialogFilling = (...names: readonly string[]) =>
  buildElement(ids, {
    type: "loom.dialog",
    children: names.map((name) => buildSlot(ids, name, [buildText(ids, name)])),
  })

describe("NOTHING_PLACED", () => {
  /**
   * The default has to be silent, and for the same reason `NOTHING_DECLARED`
   * is: a resolver with no registry behind it cannot say what any primitive
   * places, which is not every primitive claiming it places nothing. A
   * sentinel answering `[]` would refuse every slot child on every deployment
   * that has not opted in.
   */
  it("answers undefined for every type, so nothing is reported", () => {
    expect(NOTHING_PLACED.slotsPlacedBy(typed("loom.dialog"))).toBeUndefined()
    expect(unplacedSlotsIn(dialogFilling("body"), NOTHING_PLACED)).toEqual([])
  })
})

describe("unplacedSlotsIn", () => {
  it("reports a region the primitive places nowhere", () => {
    const node = dialogFilling("body")

    expect(unplacedSlotsIn(node, placesHeader)).toEqual([
      { nodeId: node.id, type: typed("loom.dialog"), name: "body" },
    ])
  })

  it("says nothing about a region the primitive places", () => {
    expect(unplacedSlotsIn(dialogFilling("header"), placesHeader)).toEqual([])
  })

  /**
   * Where this parts company with `unreadBindingsIn`, and the asymmetry is
   * 0249's decision rather than an oversight: `slots` is the one declaration
   * where leaving it out and declaring it empty are the same claim, so a
   * primitive the registry holds and that declared no regions places none.
   */
  it("reports a region filled on a primitive that declares none", () => {
    const node = buildElement(ids, {
      type: "loom.plate",
      children: [buildSlot(ids, "body", [buildText(ids, "Book a call")])],
    })

    expect(unplacedSlotsIn(node, placesHeader)).toEqual([
      { nodeId: node.id, type: typed("loom.plate"), name: "body" },
    ])
  })

  /** A type no registry holds is *this resolver cannot say*, which reports nothing. */
  it("says nothing about a type the placer has no declaration for", () => {
    const node = buildElement(ids, {
      type: "loom.popover",
      children: [buildSlot(ids, "body", [buildText(ids, "Elsewhere")])],
    })

    expect(unplacedSlotsIn(node, placesHeader)).toEqual([])
  })

  it("names one region however many children filled it, name-sorted", () => {
    const node = buildElement(ids, {
      type: "loom.dialog",
      children: [
        buildSlot(ids, "footer", [buildText(ids, "Close")]),
        buildSlot(ids, "body", [buildText(ids, "First")]),
        buildSlot(ids, "body", [buildText(ids, "Second")]),
      ],
    })

    expect(unplacedSlotsIn(node, placesHeader).map((unplaced) => unplaced.name)).toEqual([
      "body",
      "footer",
    ])
  })

  /** The whole subtree, for `unknownPrimitivesIn`'s reason. */
  it("reaches a node below the root", () => {
    const buried = dialogFilling("body")
    const banner = buildElement(ids, { type: "loom.banner", children: [buried] })

    expect(unplacedSlotsIn(banner, placesHeader).map((unplaced) => unplaced.nodeId)).toEqual([
      buried.id,
    ])
  })

  /**
   * Only direct slot children are routed (0051), so a slot inside another
   * slot's fallback renders where it sits and is nobody's region to place.
   * `walkTree` reaches it; reading children rather than positions is what keeps
   * this walk from reporting it.
   */
  it("says nothing about a slot nested inside another slot's fallback", () => {
    const node = buildElement(ids, {
      type: "loom.dialog",
      children: [buildSlot(ids, "header", [buildSlot(ids, "body", [buildText(ids, "Inside")])])],
    })

    expect(unplacedSlotsIn(node, placesHeader)).toEqual([])
  })

  it("names the node, the region it filled, and the type that places nowhere", () => {
    const node = dialogFilling("body")

    expect(
      describeUnplacedSlot({ nodeId: node.id, type: typed("loom.dialog"), name: "body" })
    ).toBe(`${node.id} fills "body", which loom.dialog places nowhere`)
  })
})
