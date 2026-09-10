import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import type { PrimitiveType } from "../primitive-type.js"
import { buildElement, buildText } from "../tree/builders.js"
import type { LoomNode } from "../tree/node.js"

import { copyIn, type CopyDeclarations } from "./copy.js"

/**
 * What a node says, read from the tree.
 *
 * The case that matters is `loom.stat`: three words, all of them props, and a
 * reading that walks text children reports nothing at all. Every assertion here
 * is against a double rather than the starter library, because the starter
 * library is another lane's and declares no copy yet — the seam has to be right
 * before anything can be declared against it.
 */

const declaring = (declarations: Record<string, readonly string[]>): CopyDeclarations => ({
  copyFor: (type: PrimitiveType) => declarations[type],
})

const stat = declaring({ "loom.stat": ["value", "label", "caption"] })

const idFactory = sequentialIdFactory()

const statNode = (props: JsonObject): LoomNode =>
  buildElement(idFactory, { type: "loom.stat", props, children: [] })

describe("the words a node shows", () => {
  it("reads copy that lives in props, which is where 0052 put most of it", () => {
    const node = statNode({ value: "3,400", label: "appointments", caption: "last year" })

    expect(copyIn(node, stat).words).toEqual(["3,400", "appointments", "last year"])
  })

  it("reads text children as well, in the order the tree carries them", () => {
    const node = buildElement(idFactory, {
      type: "loom.card",
      props: {},
      children: [buildText(idFactory, "First"), buildText(idFactory, "Second")],
    })

    expect(copyIn(node, declaring({ "loom.card": [] })).words).toEqual(["First", "Second"])
  })

  it("puts an element's own copy before its children's", () => {
    const node = buildElement(idFactory, {
      type: "loom.card",
      props: { title: "The heading" },
      children: [buildText(idFactory, "The body")],
    })

    expect(copyIn(node, declaring({ "loom.card": ["title"] })).words).toEqual([
      "The heading",
      "The body",
    ])
  })

  it("reads a whole subtree, so a proposal about a band can say what the band says", () => {
    const grid = buildElement(idFactory, {
      type: "loom.stat-grid",
      props: {},
      children: [
        statNode({ value: "3,400", label: "appointments" }),
        statNode({ value: "12", label: "clinicians" }),
      ],
    })

    const declarations = declaring({
      "loom.stat-grid": [],
      "loom.stat": ["value", "label", "caption"],
    })

    expect(copyIn(grid, declarations).words).toEqual(["3,400", "appointments", "12", "clinicians"])
    expect(copyIn(grid, declarations).unread).toEqual([])
  })

  it("leaves out the props the primitive did not call copy", () => {
    const node = buildElement(idFactory, {
      type: "loom.hero",
      props: { headline: "Care that fits", backdrop: "/photo.jpg", align: "start" },
      children: [],
    })

    const reading = copyIn(node, declaring({ "loom.hero": ["headline"] }))

    expect(reading.words).toEqual(["Care that fits"])
    expect(reading.unread).toEqual([])
  })

  it("believes a primitive that says it shows no words of its own", () => {
    const node = buildElement(idFactory, {
      type: "loom.section",
      props: { align: "start" },
      children: [],
    })

    expect(copyIn(node, declaring({ "loom.section": [] }))).toEqual({ words: [], unread: [] })
  })

  /**
   * The half that keeps the reading honest. `[]` and silence are different
   * answers and the reading reports the second rather than rounding it to the
   * first.
   */
  it("names what it could not classify, for a primitive that declared nothing", () => {
    const node = statNode({ value: "3,400", label: "appointments" })
    const reading = copyIn(node, declaring({}))

    expect(reading.words).toEqual([])
    expect(reading.unread).toEqual([
      { nodeId: node.id, type: "loom.stat", props: ["value", "label"] },
    ])
  })

  it("says nothing about a primitive that declared nothing and holds no strings", () => {
    const node = buildElement(idFactory, {
      type: "loom.divider",
      props: { weight: 2 },
      children: [],
    })

    expect(copyIn(node, declaring({}))).toEqual({ words: [], unread: [] })
  })

  it("reports an unregistered type the same way, because neither has said", () => {
    const node = buildElement(idFactory, {
      type: "acme.widget",
      props: { heading: "Nobody registered me" },
      children: [],
    })

    expect(copyIn(node, declaring({})).unread).toEqual([
      { nodeId: node.id, type: "acme.widget", props: ["heading"] },
    ])
  })

  it("reads the part of a subtree it can and names the part it cannot", () => {
    const grid = buildElement(idFactory, {
      type: "loom.stat-grid",
      props: { heading: "This year" },
      children: [statNode({ value: "3,400" }), buildText(idFactory, "and more")],
    })

    const reading = copyIn(grid, declaring({ "loom.stat": ["value"] }))

    expect(reading.words).toEqual(["3,400", "and more"])
    expect(reading.unread).toEqual([
      { nodeId: grid.id, type: "loom.stat-grid", props: ["heading"] },
    ])
  })

  it("skips a declared copy prop whose value is not a string, rather than coercing it", () => {
    const node = statNode({ value: 3400, label: "appointments" })

    expect(copyIn(node, stat).words).toEqual(["appointments"])
  })

  it("skips blank and whitespace-only values, which are not words", () => {
    const node = statNode({ value: "3,400", label: "", caption: "   " })

    expect(copyIn(node, stat).words).toEqual(["3,400"])
  })

  it("is a pure function of the node and the declarations", () => {
    const node = statNode({ value: "3,400", label: "appointments" })

    expect(copyIn(node, stat)).toEqual(copyIn(node, stat))
  })
})
