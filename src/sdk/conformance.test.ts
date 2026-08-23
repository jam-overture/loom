import { Component, createElement, useState, type ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import type { LoomPrimitive, LoomPrimitiveProps } from "../render/primitive.js"
import { undecoratedPrimitive } from "../testing/primitives.js"

import { NO_TEXT } from "../render/text.js"

import {
  probeConfigurations,
  probeEditableDecoration,
  probeSlotPlacement,
  probeSubmissionPlacement,
} from "./conformance.js"
import { definePrimitive } from "./definition.js"

const decorating = ({ loom, children }: LoomPrimitiveProps) =>
  createElement("section", { ...loom.editable }, children)

const decoratingBelowTheRoot = ({ loom, children }: LoomPrimitiveProps) =>
  createElement("div", null, createElement("h1", { ...loom.editable }, children))

const delegatingContext = ({ loom, props, children }: LoomPrimitiveProps) =>
  createElement(decorating, { loom, props, children })

const delegatingAttributes = ({ loom, children }: LoomPrimitiveProps) =>
  createElement("div", { editable: loom.editable }, children)

const rebuildingAttributes = ({ loom, children }: LoomPrimitiveProps) =>
  createElement("div", { "data-loom-node": String(loom.nodeId) }, children)

const passingACopyDownwards = ({ loom, children }: LoomPrimitiveProps) =>
  createElement("div", { attributes: { ...loom.editable } }, children)

const renderingNothing = () => null

const usingAHook = ({ loom, children }: LoomPrimitiveProps) => {
  const [count] = useState(0)

  return createElement("div", { ...loom.editable, "data-count": count }, children)
}

/**
 * A real class component, because a class is precisely what this branch exists
 * to recognise: it cannot be called as a function, so the probe has to decline
 * rather than throw.
 */
class ClassPrimitive extends Component<LoomPrimitiveProps> {
  override render(): ReactNode {
    return createElement("div", { ...this.props.loom.editable })
  }
}

describe("probeEditableDecoration", () => {
  it("passes a primitive that spreads loom.editable onto its root", () => {
    expect(probeEditableDecoration(decorating)).toEqual({ outcome: "decorates" })
  })

  it("passes a primitive that decorates an element below its root", () => {
    expect(probeEditableDecoration(decoratingBelowTheRoot)).toEqual({ outcome: "decorates" })
  })

  it("passes a primitive that delegates its root to another component", () => {
    expect(probeEditableDecoration(delegatingContext)).toEqual({ outcome: "decorates" })
    expect(probeEditableDecoration(delegatingAttributes)).toEqual({ outcome: "decorates" })
  })

  it("fails a primitive that ignores the decoration it was handed", () => {
    expect(probeEditableDecoration(undecoratedPrimitive)).toEqual({ outcome: "not-decorated" })
  })

  it("fails a primitive that renders nothing at all", () => {
    expect(probeEditableDecoration(renderingNothing)).toEqual({ outcome: "not-decorated" })
  })

  it("passes a primitive that writes the attribute itself, since the markup is right", () => {
    expect(probeEditableDecoration(rebuildingAttributes)).toEqual({ outcome: "decorates" })
  })

  /**
   * The known false negative, asserted rather than hidden. Handing the runtime's
   * own object to another component is recognised by identity; handing a copy of
   * it under a name of the primitive's choosing is indistinguishable from any
   * other prop, so the probe reports what it can see.
   */
  it("fails a primitive that passes a copy of the decoration to another component", () => {
    expect(probeEditableDecoration(passingACopyDownwards)).toEqual({ outcome: "not-decorated" })
  })

  it("declines to judge a primitive it cannot call", () => {
    const hooked = probeEditableDecoration(usingAHook)
    const classed = probeEditableDecoration(ClassPrimitive)

    expect(hooked.outcome).toBe("not-probeable")
    expect(hooked.outcome === "not-probeable" && hooked.reason).toContain("threw")
    expect(classed).toEqual({
      outcome: "not-probeable",
      reason: "class components cannot be called outside a renderer",
    })
  })

  it("declines to judge something that is not a component at all", () => {
    expect(probeEditableDecoration({} as unknown as LoomPrimitive)).toEqual({
      outcome: "not-probeable",
      reason: "not a function component",
    })
  })
})

/**
 * The placement probe's subjects. Each is the smallest component that makes one
 * distinction: a region reached, a region declared and dropped, a region handed
 * onwards through a prop, children rendered, children ignored.
 */
const placingBothRegions = ({ loom, children }: LoomPrimitiveProps) =>
  createElement("div", null, loom.slots["start"], children, loom.slots["end"])

const droppingOneRegion = ({ loom, children }: LoomPrimitiveProps) =>
  createElement("div", null, loom.slots["start"], children)

const handingARegionOnwards = ({ loom }: LoomPrimitiveProps) =>
  createElement("div", { header: loom.slots["start"] })

const aLeaf = ({ props }: LoomPrimitiveProps) => createElement("span", null, String(props["value"]))

describe("probeSlotPlacement", () => {
  it("finds nothing unplaced when every declared region reaches the output", () => {
    expect(probeSlotPlacement(placingBothRegions, ["start", "end"])).toEqual({
      outcome: "probed",
      unplacedSlots: [],
      rendersChildren: true,
      probed: [{}],
      threw: [],
    })
  })

  it("names the region a primitive promised and dropped", () => {
    const verdict = probeSlotPlacement(droppingOneRegion, ["start", "end"])

    expect(verdict.outcome === "probed" && verdict.unplacedSlots).toEqual(["end"])
  })

  /** Placed is placed: a region handed to another component has not gone missing. */
  it("counts a region passed onwards through a prop as placed", () => {
    const verdict = probeSlotPlacement(handingARegionOnwards, ["start"])

    expect(verdict.outcome === "probed" && verdict.unplacedSlots).toEqual([])
  })

  it("tells a leaf from a container by whether children reached the output", () => {
    const leaf = probeSlotPlacement(aLeaf, [])
    const container = probeSlotPlacement(placingBothRegions, [])

    expect(leaf.outcome === "probed" && leaf.rendersChildren).toBe(false)
    expect(container.outcome === "probed" && container.rendersChildren).toBe(true)
  })

  it("has nothing to report about a primitive that declares no regions", () => {
    expect(probeSlotPlacement(decorating, [])).toEqual({
      outcome: "probed",
      unplacedSlots: [],
      rendersChildren: true,
      probed: [{}],
      threw: [],
    })
  })

  it("declines to judge a primitive it cannot call, rather than calling it a drop", () => {
    const hooked = probeSlotPlacement(usingAHook, ["start"])
    const classed = probeSlotPlacement(ClassPrimitive, ["start"])

    expect(hooked.outcome).toBe("not-probeable")
    expect(classed.outcome).toBe("not-probeable")
  })

  it("does not read a region off Object.prototype", () => {
    const readingAnInheritedName = ({ loom }: LoomPrimitiveProps) =>
      createElement("div", null, loom.slots["constructor"] as ReactNode)

    const verdict = probeSlotPlacement(readingAnInheritedName, ["constructor"])

    expect(verdict.outcome === "probed" && verdict.unplacedSlots).toEqual([])
  })
})

/**
 * Both probes call a component outside a renderer, so whatever they hand it is
 * the whole world that component gets. A primitive that reads a string it
 * declared and does something with it — upper-cases it, measures it — throws on
 * `undefined` and reads as `not-probeable`: a failure invented by the probe, for
 * a primitive that is correct.
 */
describe("a probe of a primitive that reads its own declared text", () => {
  const entry = definePrimitive({
    type: "loom.marker",
    description: "a state marker",
    props: z.object({}),
    text: { aside: "Aside" },
    component: ({ loom, children }) =>
      createElement(
        "div",
        { ...loom.editable, "aria-label": loom.text.aside.toUpperCase() },
        children
      ),
  })

  it("hands it the declared strings rather than an empty map", () => {
    expect(probeEditableDecoration(entry.component, entry.text)).toEqual({ outcome: "decorates" })
  })

  it("does the same for the placement probe", () => {
    expect(probeSlotPlacement(entry.component, [], entry.text)).toEqual({
      outcome: "probed",
      unplacedSlots: [],
      rendersChildren: true,
      probed: [{}],
      threw: [],
    })
  })

  it("would have called it unprobeable without them", () => {
    expect(probeEditableDecoration(entry.component).outcome).toBe("not-probeable")
  })
})

/**
 * The finding that produced 0075: `loom.field` places children only when its
 * `type` is `select`, because only a select has choices, and a probe that calls
 * a component once with no props reported it as a primitive with nowhere to put
 * a child node. The shape is reproduced here rather than imported, so the test
 * keeps meaning something if the library's field is rewritten.
 */
describe("a primitive whose children depend on a prop", () => {
  const entry = definePrimitive({
    type: "loom.choice",
    description: "a control whose options are children, and only when it has options",
    props: z.object({
      kind: z.enum(["text", "select"]).optional(),
      framed: z.boolean().optional(),
    }),
    slots: ["hint"],
    component: ({ loom, props, children }) =>
      createElement(
        "div",
        { ...loom.editable },
        props.kind === "select" ? children : null,
        props.framed === true ? loom.slots["hint"] : null
      ),
  })

  const configurations = probeConfigurations(entry.choices)

  it("enumerates the sum of the closed choices and not their product", () => {
    expect(configurations).toEqual([
      {},
      { framed: false },
      { framed: true },
      { kind: "text" },
      { kind: "select" },
    ])
  })

  it("called it a leaf when it was probed at its default alone", () => {
    const verdict = probeSlotPlacement(entry.component, entry.slots, entry.text)

    expect(verdict.outcome === "probed" && verdict.rendersChildren).toBe(false)
  })

  it("finds the children under the one configuration that places them", () => {
    const verdict = probeSlotPlacement(entry.component, entry.slots, entry.text, configurations)

    expect(verdict.outcome === "probed" && verdict.rendersChildren).toBe(true)
    expect(verdict.outcome === "probed" && verdict.probed).toHaveLength(configurations.length)
  })

  it("counts a region placed under any configuration as placed", () => {
    const verdict = probeSlotPlacement(entry.component, entry.slots, entry.text, configurations)

    expect(verdict.outcome === "probed" && verdict.unplacedSlots).toEqual([])
  })
})

describe("a primitive that does not hold its promises under every shape", () => {
  const sometimesDecorating = definePrimitive({
    type: "loom.sometimes",
    description: "decorates, except in the one mode nobody probed",
    props: z.object({ mode: z.enum(["plain", "bare"]).optional() }),
    component: ({ loom, props, children }) =>
      props.mode === "bare"
        ? createElement("div", null, children)
        : createElement("div", { ...loom.editable }, children),
  })

  const throwingOnOneValue = definePrimitive({
    type: "loom.brittle",
    description: "throws on a value its own schema accepts",
    props: z.object({ tone: z.enum(["calm", "loud"]).optional() }),
    component: ({ loom, props, children }) => {
      if (props.tone === "loud") throw new Error("no rendering for tone loud")

      return createElement("div", { ...loom.editable }, children)
    },
  })

  it("calls a primitive not-decorated when any configuration fails to decorate", () => {
    const entry = sometimesDecorating

    expect(probeEditableDecoration(entry.component, entry.text)).toEqual({ outcome: "decorates" })
    expect(
      probeEditableDecoration(entry.component, entry.text, probeConfigurations(entry.choices))
    ).toEqual({ outcome: "not-decorated" })
  })

  it("still answers from the configurations that rendered, and names the one that threw", () => {
    const entry = throwingOnOneValue
    const verdict = probeSlotPlacement(
      entry.component,
      entry.slots,
      entry.text,
      probeConfigurations(entry.choices)
    )

    expect(verdict.outcome === "probed" && verdict.rendersChildren).toBe(true)
    expect(verdict.outcome === "probed" && verdict.threw).toEqual([
      { props: { tone: "loud" }, reason: "no rendering for tone loud" },
    ])
    expect(verdict.outcome === "probed" && verdict.probed).toEqual([{}, { tone: "calm" }])
  })

  it("declines to judge only when no configuration answers at all", () => {
    const alwaysThrows = ({ children }: LoomPrimitiveProps) => {
      throw new Error(`never renders ${String(children)}`)
    }

    expect(probeSlotPlacement(alwaysThrows, [], undefined, [{}, { tone: "calm" }]).outcome).toBe(
      "not-probeable"
    )
    expect(probeEditableDecoration(alwaysThrows, undefined, [{}, { tone: "calm" }]).outcome).toBe(
      "not-probeable"
    )
  })
})

/**
 * What a form does: puts the address it was handed on the element that posts.
 * The `undefined` branch is the one the seam exists for — a target is absent far
 * more often than it is present, and a component that throws on absence would be
 * unprobeable rather than compliant.
 */
const posting = ({ loom, children }: LoomPrimitiveProps) =>
  createElement(
    "form",
    { ...loom.editable, ...(loom.submit?.status === "ready" ? { action: loom.submit.target.action } : {}) },
    children
  )

/** Reads the outcome, decides a sentence, and connects nothing. */
const merelyNoticing = ({ loom, children }: LoomPrimitiveProps) =>
  createElement(
    "form",
    { ...loom.editable },
    loom.submit === undefined ? "not connected yet" : "ready",
    children
  )

const ignoringTheTarget = ({ loom, children }: LoomPrimitiveProps) =>
  createElement("form", { ...loom.editable }, children)

/** Posts under one configuration and summarises under the other. */
const postingConditionally = ({ loom, props, children }: LoomPrimitiveProps) =>
  props["mode"] === "summary"
    ? createElement("div", { ...loom.editable }, children)
    : createElement(
        "form",
        { ...loom.editable, ...(loom.submit?.status === "ready" ? { action: loom.submit.target.action } : {}) },
        children
      )

describe("probeSubmissionPlacement", () => {
  it("sees a primitive put the address it was handed on its form", () => {
    expect(probeSubmissionPlacement(posting)).toEqual({ outcome: "places" })
  })

  it("does not count reading the outcome as connecting anything", () => {
    expect(probeSubmissionPlacement(merelyNoticing)).toEqual({ outcome: "not-placed" })
  })

  it("catches the form that would post to whatever page it sits on", () => {
    expect(probeSubmissionPlacement(ignoringTheTarget)).toEqual({ outcome: "not-placed" })
  })

  /** `some`, not `every`: a primitive that posts under one shape posts. */
  it("counts a primitive that posts under one configuration of its schema", () => {
    expect(
      probeSubmissionPlacement(postingConditionally, NO_TEXT, [{ mode: "summary" }, { mode: "form" }])
    ).toEqual({ outcome: "places" })
  })

  it("declines rather than answering no when it cannot call the component", () => {
    const verdict = probeSubmissionPlacement(usingAHook)

    expect(verdict.outcome).toBe("not-probeable")
  })

  /**
   * The address must reach the markup, not merely be looked at — which is what
   * makes a `not-placed` verdict worth acting on rather than a stylistic note.
   */
  it("does not find an address the component only kept to itself", () => {
    const hoarding = ({ loom, children }: LoomPrimitiveProps) => {
      const action = loom.submit?.status === "ready" ? loom.submit.target.action : ""

      return createElement("form", { ...loom.editable, "data-length": action.length }, children)
    }

    expect(probeSubmissionPlacement(hoarding)).toEqual({ outcome: "not-placed" })
  })
})
