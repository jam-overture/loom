import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import type { InteractiveTypes } from "../interactivity.js"
import { buildElement, buildText } from "../tree/builders.js"
import type { LoomNode } from "../tree/node.js"

import { interactivePredicateFor, nestedTargetsIn } from "./nesting.js"

/**
 * **A fault list is worth more on a page that is hard to read by hand** (0380).
 *
 * `nestedTargetsIn` recursed per level until this existed, so it threw
 * `RangeError: Maximum call stack size exceeded` at ten thousand deep and
 * answered `RangeError` where a reviewer wanted a list. It is the §4 check for
 * a target inside another target, and the deeper a tree is the less likely
 * anyone is to have found that pair by eye.
 *
 * The figures are `src/tree/shape.test.ts`', so the repository holds one pair.
 */
const DEEP = 10_000
const WIDE = 60_000

const ids = sequentialIdFactory("sh")
const LIBRARY: InteractiveTypes = { "loom.action": "always" }
const isTarget = interactivePredicateFor(LIBRARY)

/** A chain in which every node is a target, so every pair but the root's is a fault. */
const deepChain = (depth: number): LoomNode => {
  let node: LoomNode = buildText(ids, "bottom")

  for (let level = 1; level < depth; level += 1) {
    node = buildElement(ids, { type: "loom.action", children: [node] })
  }

  return node
}

describe("nestedTargetsIn on a shape a page is allowed to have", () => {
  it(`reads a chain ${DEEP.toLocaleString("en")} deep`, () => {
    expect(nestedTargetsIn(deepChain(DEEP), isTarget)).toHaveLength(DEEP - 2)
  })

  it(`reads a page ${WIDE.toLocaleString("en")} wide`, () => {
    const page = buildElement(ids, {
      type: "loom.action",
      children: Array.from({ length: WIDE }, () => buildElement(ids, { type: "loom.action" })),
    })

    expect(nestedTargetsIn(page, isTarget)).toHaveLength(WIDE)
  })

  /** The nearest enclosing target, which is the property the stack has to carry. */
  it("names each touching pair rather than the chain's ends", () => {
    /** Its own factory, so the ids do not depend on which test ran first. */
    const own = sequentialIdFactory("pr")
    let node: LoomNode = buildText(own, "bottom")
    for (let level = 1; level < 4; level += 1) {
      node = buildElement(own, { type: "loom.action", children: [node] })
    }

    const faults = nestedTargetsIn(node, isTarget)

    expect(faults.map((fault) => `${fault.nodeId} inside ${fault.ancestorId}`)).toEqual([
      "n_pr3 inside n_pr4",
      "n_pr2 inside n_pr3",
    ])
  })
})
