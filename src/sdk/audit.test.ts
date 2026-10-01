import { createElement, useState } from "react"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import { nodeDataOf } from "../data/resolution.js"
import type { JsonValue } from "../json.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import type { LoomPrimitiveProps } from "../render/primitive.js"
import { createStarterPrimitiveRegistry } from "../primitives/index.js"
import { registryOf, testDefinitions } from "../testing/definitions.js"

import { auditRegistry, decorationFromAudit, describeRegistryAudit, type RegistryAudit } from "./audit.js"
import type { ProbeAnswers } from "./conformance.js"
import { definePrimitive } from "./definition.js"
import { describeRegistryError } from "./registry.js"

const silent = definePrimitive({
  type: "loom.silent",
  description: "renders, but never says which node it is",
  props: z.object({}),
  component: ({ children }: LoomPrimitiveProps) => createElement("div", null, children),
})

const hooked = definePrimitive({
  type: "loom.hooked",
  description: "decorates, but cannot be called outside a renderer",
  props: z.object({}),
  component: ({ loom, children }: LoomPrimitiveProps) => {
    const [open] = useState(false)

    return createElement("div", { ...loom.editable, "data-open": open }, children)
  },
})

const forgetful = definePrimitive({
  type: "loom.forgetful",
  description: "declares a region and never places it",
  props: z.object({}),
  slots: ["aside"],
  component: ({ loom, children }: LoomPrimitiveProps) => createElement("div", { ...loom.editable }, children),
})

const leaf = definePrimitive({
  type: "loom.leaf",
  description: "holds its copy in props, so a child node has nowhere to go",
  props: z.object({}),
  component: ({ loom }: LoomPrimitiveProps) => createElement("span", { ...loom.editable }, "fixed"),
})

/**
 * The shape 0075 exists for: a primitive that is a container under one prop
 * value and a leaf under another, which the probe used to classify by whichever
 * shape it happened to take with no props at all.
 */
const conditional = definePrimitive({
  type: "loom.conditional",
  description: "places its children only when asked to",
  props: z.object({ kind: z.enum(["plain", "listing"]).optional() }),
  component: ({ loom, props, children }) =>
    createElement("div", { ...loom.editable }, props.kind === "listing" ? children : null),
})

const brittle = definePrimitive({
  type: "loom.brittle",
  description: "throws on a value its own schema accepts",
  props: z.object({ tone: z.enum(["calm", "loud"]).optional() }),
  component: ({ loom, props, children }) => {
    if (props.tone === "loud") throw new Error("no rendering for tone loud")

    return createElement("div", { ...loom.editable }, children)
  },
})

/**
 * `brittle` taken to its limit, and the reproduction the lessons routine filed
 * on 24 August: every value the schema accepts throws, so no configuration
 * answers and the placement probe declines. It used to appear only under
 * `notProbeable` — the one list a host cannot assert empty, because a
 * hook-using primitive lives there legitimately.
 */
const exploding = definePrimitive({
  type: "loom.exploding",
  description: "throws under every configuration its schema accepts",
  props: z.object({}),
  component: () => {
    throw new Error("boom")
  },
})


/** A form that does what a form does: posts where it was told to post. */
const posting = definePrimitive({
  type: "loom.posting",
  description: "sends what it collected to the address the deployment resolved",
  props: z.object({}),
  submits: true,
  component: ({ loom, children }: LoomPrimitiveProps) =>
    createElement(
      "form",
      { ...loom.editable, ...(loom.submit?.status === "ready" ? { action: loom.submit.target.action } : {}) },
      children
    ),
})

/**
 * The failure 0065 named: a submit control that renders, looks finished, and
 * posts to whatever page the form happens to be sitting on.
 */
const claimingToPost = definePrimitive({
  type: "loom.claiming-to-post",
  description: "says it posts and never reads the target it is handed",
  props: z.object({}),
  submits: true,
  component: ({ loom, children }: LoomPrimitiveProps) =>
    createElement("form", { ...loom.editable }, children),
})

/** Posts, and never said so — which is the starter library's state today. */
const quietlyPosting = definePrimitive({
  type: "loom.quietly-posting",
  description: "posts without declaring that it does",
  props: z.object({}),
  component: ({ loom, children }: LoomPrimitiveProps) =>
    createElement(
      "form",
      { ...loom.editable, ...(loom.submit?.status === "ready" ? { action: loom.submit.target.action } : {}) },
      children
    ),
})

describe("auditRegistry", () => {
  it("finds nothing to report for primitives that all decorate", () => {
    const audit = auditRegistry(registryOf(testDefinitions))

    expect(audit.audits).toHaveLength(testDefinitions.length)
    expect(audit.notDecorated).toEqual([])
    expect(audit.notProbeable).toEqual([])
  })

  it("names the primitive that will be invisible to the portal", () => {
    const audit = auditRegistry(registryOf([...testDefinitions, silent]))

    expect(audit.notDecorated).toEqual(["loom.silent"])
  })

  it("separates a primitive it could not judge from one that failed", () => {
    const audit = auditRegistry(registryOf([silent, hooked]))

    expect(audit.notDecorated).toEqual(["loom.silent"])
    expect(audit.notProbeable).toEqual(["loom.hooked"])
  })

  it("reports in registration order, one entry per primitive", () => {
    const audit = auditRegistry(registryOf([hooked, silent]))

    expect(audit.audits.map((entry) => entry.type)).toEqual(["loom.hooked", "loom.silent"])
  })

  it("names the primitive that declared a region and dropped it", () => {
    const audit = auditRegistry(registryOf([forgetful]))

    expect(audit.unplacedSlots).toEqual([{ type: "loom.forgetful", slots: ["aside"] }])
  })

  it("finds no dropped regions in a library that places what it declares", () => {
    expect(auditRegistry(registryOf(testDefinitions)).unplacedSlots).toEqual([])
  })

  /** A leaf is a fact about a primitive, not a fault — reported, never counted as a failure. */
  it("separates the leaves from the containers without calling either wrong", () => {
    const audit = auditRegistry(registryOf([leaf, silent]))

    expect(audit.leaves).toEqual(["loom.leaf"])
    expect(audit.notDecorated).toEqual(["loom.silent"])
  })

  it("leaves a primitive it could not call out of both lists", () => {
    const audit = auditRegistry(registryOf([hooked]))

    expect(audit.unplacedSlots).toEqual([])
    expect(audit.leaves).toEqual([])
  })

  it("does not call a primitive a leaf because its default shape places nothing", () => {
    const audit = auditRegistry(registryOf([conditional, leaf]))

    expect(audit.leaves).toEqual(["loom.leaf"])
  })

  it("names a primitive that threw on props built from its own schema", () => {
    const audit = auditRegistry(registryOf([brittle]))

    expect(audit.throwsOnDeclaredProps).toEqual([
      {
        type: "loom.brittle",
        failures: [{ props: { tone: "loud" }, reason: "no rendering for tone loud" }],
        everyConfiguration: false,
      },
    ])
  })

  /** A throw under one shape is a fault of its own; it does not spoil the verdict. */
  it("still judges the primitive that threw, from the shapes that rendered", () => {
    const audit = auditRegistry(registryOf([brittle]))

    expect(audit.notDecorated).toEqual([])
    expect(audit.notProbeable).toEqual([])
    expect(audit.leaves).toEqual([])
  })

  it("names a primitive that threw under every configuration, not only some", () => {
    const audit = auditRegistry(registryOf([exploding]))

    expect(audit.throwsOnDeclaredProps).toEqual([
      {
        type: "loom.exploding",
        failures: [{ props: {}, reason: "boom" }],
        everyConfiguration: true,
      },
    ])
  })

  /**
   * The limit of a function-call probe, asserted rather than described.
   *
   * A hook-using primitive and a broken one are the same observation from
   * outside a renderer: a function that throws. So the throwing list holds both,
   * and `everyConfiguration` is where the honesty is — a host reads it to know
   * whether the audit is *certain* this is a fault or merely reporting what it
   * saw. What the probe can always tell apart is a component it never called,
   * which `conformance.test.ts` asserts on a class.
   */
  it("cannot tell a hook-using primitive from a broken one, and does not pretend to", () => {
    const audit = auditRegistry(registryOf([hooked, exploding]))

    expect(audit.notProbeable).toEqual(["loom.hooked", "loom.exploding"])
    expect(audit.throwsOnDeclaredProps.map((entry) => entry.type)).toEqual([
      "loom.hooked",
      "loom.exploding",
    ])
    expect(audit.throwsOnDeclaredProps.every((entry) => entry.everyConfiguration)).toBe(true)
  })

  /**
   * So the assertion a host with hook-using primitives can still make: the
   * certain half. `brittle` rendered under one shape and threw under another,
   * which no legitimate primitive does.
   */
  it("leaves the certain half of the throwing list assertable by any host", () => {
    const audit = auditRegistry(registryOf([hooked, brittle]))
    const certain = audit.throwsOnDeclaredProps.filter((entry) => !entry.everyConfiguration)

    expect(certain.map((entry) => entry.type)).toEqual(["loom.brittle"])
  })

  it("has nothing to report for a library that renders under every shape it accepts", () => {
    expect(auditRegistry(registryOf(testDefinitions)).throwsOnDeclaredProps).toEqual([])
  })

  /**
   * The same list a deployment holds its endpoint registry against, for the
   * other registry: if anything is here, `renderRequest` wants `origins`, and a
   * deployment shipping one without the other ships embeds that render a
   * refusal.
   */
  it("names the primitives a deployment must register framable origins for", () => {
    const framing = definePrimitive({
      type: "loom.framing",
      description: "puts a prop in a frame",
      props: z.object({ src: z.string() }).strict(),
      frames: ["src"],
      component: ({ loom }: LoomPrimitiveProps<{ src: string }>) => {
        const frame = loom.frames.src

        return createElement("iframe", {
          ...loom.editable,
          src: frame?.status === "allowed" ? frame.url : undefined,
          title: "",
        })
      },
    })

    const audit = auditRegistry(registryOf([...testDefinitions, framing]))

    expect(audit.frames).toEqual(["loom.framing"])
  })

  it("has no framers to report for a library where nothing frames", () => {
    expect(auditRegistry(registryOf(testDefinitions)).frames).toEqual([])
  })

  /**
   * A probe has no allowlist, so a declared frame is answered `allowed` — a
   * probe that always refused would be probing every embed's error state and
   * reporting it as the primitive.
   */
  it("probes a framing primitive under an allowed frame rather than a refused one", () => {
    const strict = definePrimitive({
      type: "loom.strictly-framing",
      description: "renders nothing at all when its frame is refused",
      props: z.object({ src: z.string() }).strict(),
      frames: ["src"],
      component: ({ loom }: LoomPrimitiveProps<{ src: string }>) =>
        loom.frames.src?.status === "allowed"
          ? createElement("iframe", { ...loom.editable, title: "" })
          : null,
    })

    const audit = auditRegistry(registryOf([...testDefinitions, strict]))

    expect(audit.notDecorated).toEqual([])
    expect(audit.frames).toEqual(["loom.strictly-framing"])
  })

  it("names the primitives a deployment must register endpoints for", () => {
    const audit = auditRegistry(registryOf([...testDefinitions, posting]))

    expect(audit.submits).toEqual(["loom.posting"])
    expect(audit.unwiredSubmitters).toEqual([])
    expect(audit.undeclaredSubmitters).toEqual([])
  })

  it("catches the form that says it posts and places no address", () => {
    const audit = auditRegistry(registryOf([posting, claimingToPost]))

    expect(audit.unwiredSubmitters).toEqual(["loom.claiming-to-post"])
    expect(audit.submits).toEqual(["loom.posting"])
  })

  it("names the primitive that posts without having declared it", () => {
    const audit = auditRegistry(registryOf([posting, quietlyPosting]))

    expect(audit.undeclaredSubmitters).toEqual(["loom.quietly-posting"])
    expect(audit.submits).toEqual(["loom.posting", "loom.quietly-posting"])
  })

  /** Every other primitive in the library, and the reason this is three lists. */
  it("says nothing about the overwhelming majority, which post nowhere", () => {
    const audit = auditRegistry(registryOf(testDefinitions))

    expect(audit.submits).toEqual([])
    expect(audit.undeclaredSubmitters).toEqual([])
    expect(audit.unwiredSubmitters).toEqual([])
  })

  /**
   * The same reading `decorationFromAudit` makes: the probe declining to answer
   * is not the probe answering no, and "this form is broken" is not a claim to
   * make on silence.
   */
  it("does not call a primitive it could not call unwired", () => {
    const declaring = definePrimitive({
      type: "loom.hooked-form",
      description: "posts, and cannot be called outside a renderer",
      props: z.object({}),
      submits: true,
      component: ({ loom, children }: LoomPrimitiveProps) => {
        const [open] = useState(false)

        return createElement("form", { ...loom.editable, "data-open": open }, children)
      },
    })

    const audit = auditRegistry(registryOf([declaring]))

    expect(audit.unwiredSubmitters).toEqual([])
    expect(audit.submits).toEqual([])
  })
})

/**
 * The audit against the library it exists to audit. `loom.form` is the one
 * primitive in Loom that posts, and these are the two facts that hold whether
 * or not its author has got round to declaring `submits` — so this asserts
 * those, and leaves `undeclaredSubmitters` to be read rather than enforced.
 * A test that demanded the declaration be missing would go red on the one-line
 * change that fixes it.
 */
describe("the starter library, submissions", () => {
  const starterAudit = (): RegistryAudit => {
    const registry = createStarterPrimitiveRegistry()
    if (!registry.ok) throw new Error(describeRegistryError(registry.error))

    return auditRegistry(registry.value)
  }

  it("finds exactly one primitive that posts", () => {
    expect(starterAudit().submits).toEqual(["loom.form"])
  })

  it("finds no primitive claiming to post that does not", () => {
    expect(starterAudit().unwiredSubmitters).toEqual([])
  })
})

describe("describeRegistryAudit", () => {
  it("says of each primitive what the probe found", () => {
    const described = describeRegistryAudit(auditRegistry(registryOf([...testDefinitions, silent, hooked])))

    expect(described).toContain("loom.card: spreads loom.editable")
    expect(described).toContain("loom.silent: does not spread loom.editable")
    expect(described).toContain("loom.hooked: could not be probed")
  })

  it("says which region went missing, and which primitives are leaves", () => {
    const described = describeRegistryAudit(auditRegistry(registryOf([forgetful, leaf])))

    expect(described).toContain("declares aside and does not place it")
    expect(described).toContain("loom.leaf: spreads loom.editable; renders no children (a leaf)")
  })

  it("says how many shapes a leaf was asked about, so the claim can be weighed", () => {
    const described = describeRegistryAudit(auditRegistry(registryOf([conditional])))

    expect(described).toContain("renders its children")
    expect(describeRegistryAudit(auditRegistry(registryOf([leaf])))).not.toContain("configurations")
  })

  it("names the props it threw on, which is the whole reproduction", () => {
    const described = describeRegistryAudit(auditRegistry(registryOf([brittle])))

    expect(described).toContain('threw on {"tone":"loud"} (no rendering for tone loud)')
  })

  it("says of a form that it posts, and of the rest of the library nothing", () => {
    const described = describeRegistryAudit(auditRegistry(registryOf([...testDefinitions, posting])))

    expect(described).toContain("loom.posting: spreads loom.editable; renders its children; posts")
    expect(described).not.toContain("loom.card: spreads loom.editable; renders its children; posts")
  })

  it("puts the two disagreements between declaration and behavior on the line", () => {
    const described = describeRegistryAudit(auditRegistry(registryOf([claimingToPost, quietlyPosting])))

    expect(described).toContain("loom.claiming-to-post: spreads loom.editable; renders its children; declares `submits` and places no address")
    expect(described).toContain("loom.quietly-posting: spreads loom.editable; renders its children; posts, and does not declare `submits`")
  })
})

describe("decorationFromAudit", () => {
  it("says yes for a primitive the probe watched decorate", () => {
    const decorates = decorationFromAudit(auditRegistry(registryOf(testDefinitions)))

    expect(decorates(primitiveTypeSchema.parse("loom.card"))).toBe(true)
  })

  it("says no for one the probe watched ignore its decoration", () => {
    const decorates = decorationFromAudit(auditRegistry(registryOf([...testDefinitions, silent])))

    expect(decorates(primitiveTypeSchema.parse("loom.silent"))).toBe(false)
  })

  /** "Could not answer" is not "answered no", and the DOM decides in the end. */
  it("gives an unprobeable primitive the benefit of the doubt", () => {
    const decorates = decorationFromAudit(auditRegistry(registryOf([hooked])))

    expect(decorates(primitiveTypeSchema.parse("loom.hooked"))).toBe(true)
  })

  /** An unregistered type renders as nothing, so its subtree is not in the DOM. */
  it("says no for a type that was never registered", () => {
    const decorates = decorationFromAudit(auditRegistry(registryOf(testDefinitions)))

    expect(decorates(primitiveTypeSchema.parse("loom.stranger"))).toBe(false)
  })
})

/**
 * A bound primitive, and the reason `auditRegistry` grew a second argument
 * (0185). It places one region for rows, another for an answer of none, and
 * draws a line of its own when the source did not answer — so with nothing
 * answered it takes the third branch every time and both regions read as
 * dropped content.
 */
const boundListing = definePrimitive({
  type: "loom.bound-listing",
  description: "draws rows, an empty region, or a line saying it could not read them",
  props: z.object({ binding: z.string().optional() }),
  slots: ["rows", "empty"],
  reads: [{ fromProp: "binding", default: "entries" }],
  component: ({ loom, props }) => {
    const answer = loom.data[props.binding ?? "entries"]

    if (!answer || answer.status !== "ready") {
      return createElement("p", { ...loom.editable }, "could not be read")
    }

    return createElement(
      "div",
      { ...loom.editable },
      Array.isArray(answer.value) && answer.value.length > 0 ? loom.slots["rows"] : loom.slots["empty"]
    )
  },
})

const answering = (value: JsonValue): ProbeAnswers => ({
  data: nodeDataOf({ entries: { status: "ready", value } }),
})

describe("auditRegistry, handed answers", () => {
  it("reports a bound primitive's regions as dropped when it is asked about props alone", () => {
    const audit = auditRegistry(registryOf([boundListing]))

    expect(audit.unplacedSlots).toEqual([{ type: "loom.bound-listing", slots: ["rows", "empty"] }])
  })

  it("finds both regions once the answers that reach them are declared", () => {
    const audit = auditRegistry(registryOf([boundListing]), {
      answers: new Map([[primitiveTypeSchema.parse("loom.bound-listing"), [answering([{ title: "one" }]), answering([])]]]),
    })

    expect(audit.unplacedSlots).toEqual([])
  })

  /**
   * The answers are keyed by type and reach that type only. A registry audited
   * with answers for one primitive must not quietly excuse another's genuinely
   * dropped region, which is the failure `unplacedSlots` exists for.
   */
  it("hands each type only the answers declared for it", () => {
    const audit = auditRegistry(registryOf([boundListing, forgetful]), {
      answers: new Map([[primitiveTypeSchema.parse("loom.bound-listing"), [answering([{ title: "one" }]), answering([])]]]),
    })

    expect(audit.unplacedSlots).toEqual([{ type: "loom.forgetful", slots: ["aside"] }])
  })

  /** Ninety-six of the ninety-eight read no binding, and none of them changes. */
  it("audits a library that reads nothing exactly as it did before answers existed", () => {
    expect(auditRegistry(registryOf(testDefinitions), { answers: new Map() })).toEqual(
      auditRegistry(registryOf(testDefinitions))
    )
  })
})
