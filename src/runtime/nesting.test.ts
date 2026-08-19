import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import type { InteractiveTypes } from "../interactivity.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import type { LoomNode } from "../tree/node.js"

import {
  describeNestedTarget,
  interactivePredicateFor,
  nestedTargetsIn,
  NOTHING_INTERACTIVE,
} from "./nesting.js"

const ids = sequentialIdFactory("ne")

/** A card that is a link only when it has one, and an action that always is. */
const LIBRARY: InteractiveTypes = {
  "loom.card": { whenProps: ["href"] },
  "loom.action": "always",
}

const isTarget = interactivePredicateFor(LIBRARY)

const element = (type: string, children: readonly LoomNode[] = [], props = {}) =>
  buildElement(ids, { type, props, children })

describe("interactivePredicateFor", () => {
  it("answers for a primitive that is always a target", () => {
    expect(isTarget(element("loom.action"))).toBe(true)
  })

  it("answers no for a primitive the vocabulary does not name", () => {
    expect(isTarget(element("loom.stack"))).toBe(false)
  })

  it("answers only when a trigger prop actually arrived", () => {
    expect(isTarget(element("loom.card"))).toBe(false)
    expect(isTarget(element("loom.card", [], { href: "/pricing" }))).toBe(true)
  })

  it("treats a cleared trigger as no target, so the change that fixes one is not refused", () => {
    expect(isTarget(element("loom.card", [], { href: "" }))).toBe(false)
    expect(isTarget(element("loom.card", [], { href: null }))).toBe(false)
  })

  it("does not answer out of Object.prototype for a primitive named like one of its keys", () => {
    expect(isTarget(element("constructor"))).toBe(false)
    expect(isTarget(element("to-string"))).toBe(false)
  })

  it("finds nothing when the host declares no vocabulary", () => {
    expect(NOTHING_INTERACTIVE(element("loom.action"))).toBe(false)
  })
})

describe("nestedTargetsIn", () => {
  it("finds nothing in a page whose targets are siblings", () => {
    const page = element("loom.page", [
      element("loom.card", [element("loom.action")]),
      element("loom.action"),
    ])

    expect(nestedTargetsIn(page, isTarget)).toEqual([])
  })

  it("finds an action inside a linked card", () => {
    const action = element("loom.action")
    const card = element("loom.card", [action], { href: "/pricing" })
    const page = element("loom.page", [card])

    expect(nestedTargetsIn(page, isTarget)).toEqual([
      {
        nodeId: action.id,
        type: action.type,
        ancestorId: card.id,
        ancestorType: card.type,
      },
    ])
  })

  it("looks through anything in between, not only at the immediate parent", () => {
    const action = element("loom.action")
    const card = element("loom.card", [element("loom.stack", [element("loom.text", [action])])], {
      href: "/pricing",
    })

    expect(nestedTargetsIn(card, isTarget).map((nested) => nested.nodeId)).toEqual([action.id])
  })

  it("descends into a slot, which is inside its card exactly as a child is", () => {
    const action = element("loom.action")
    const card = element("loom.card", [buildSlot(ids, "footer", [action])], { href: "/pricing" })

    expect(nestedTargetsIn(card, isTarget).map((nested) => nested.nodeId)).toEqual([action.id])
  })

  it("names the nearest enclosing target, so three deep reads as two faults", () => {
    const inner = element("loom.action")
    const middle = element("loom.card", [inner], { href: "/b" })
    const outer = element("loom.card", [middle], { href: "/a" })

    expect(nestedTargetsIn(outer, isTarget)).toEqual([
      { nodeId: middle.id, type: middle.type, ancestorId: outer.id, ancestorType: outer.type },
      { nodeId: inner.id, type: inner.type, ancestorId: middle.id, ancestorType: middle.type },
    ])
  })

  it("ignores text and unregistered nodes between two targets", () => {
    const action = element("loom.action")
    const card = element("loom.card", [buildText(ids, "Read on"), action], { href: "/a" })

    expect(nestedTargetsIn(card, isTarget)).toHaveLength(1)
  })

  it("finds nothing at all when nothing is declared interactive", () => {
    const card = element("loom.card", [element("loom.action")], { href: "/pricing" })

    expect(nestedTargetsIn(card, NOTHING_INTERACTIVE)).toEqual([])
  })
})

describe("describeNestedTarget", () => {
  it("names both nodes, because a reviewer needs the pair and not the count", () => {
    const action = element("loom.action")
    const card = element("loom.card", [action], { href: "/pricing" })
    const [nested] = nestedTargetsIn(card, isTarget)

    expect(nested && describeNestedTarget(nested)).toBe(
      `loom.action ${action.id} inside loom.card ${card.id}`
    )
  })
})

describe("a trigger named like a prototype member", () => {
  it("does not read one off Object.prototype", () => {
    const isTrigger = interactivePredicateFor({ "loom.card": { whenProps: ["constructor"] } })

    expect(isTrigger(element("loom.card"))).toBe(false)
  })
})
