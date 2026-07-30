import { Component, createElement, useState, type ReactNode } from "react"
import { describe, expect, it } from "vitest"

import type { LoomPrimitive, LoomPrimitiveProps } from "../render/primitive.js"
import { undecoratedPrimitive } from "../testing/primitives.js"

import { probeEditableDecoration } from "./conformance.js"

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
