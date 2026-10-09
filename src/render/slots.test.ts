import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import { sequentialIdFactory } from "../ids.js"
import { definePrimitive } from "../sdk/definition.js"
import { createPrimitiveRegistry, type PrimitiveRegistry } from "../sdk/registry.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { describeRenderDiagnostic, type RenderDiagnostic } from "./diagnostics.js"
import { staticPrimitiveResolver, type LoomPrimitiveProps } from "./primitive.js"
import { renderLoomTree } from "./render.js"
import { isSlotPlacer, unplacedSlots } from "./slots.js"

/**
 * Three primitives, one per answer the seam can get: a page that places the
 * region a tree fills, a dialog that declares none at all — the shape the
 * finding was filed against — and a panel that declares one and is handed
 * another.
 *
 * `loom.dialog` leaves `slots` off rather than writing `[]`, because that is
 * the case the walk has to report: for slots the two are the same claim, and a
 * primitive whose author never thought about regions places none.
 */
const page = definePrimitive({
  type: "loom.page",
  description: "The page, which places a body.",
  props: z.object({}),
  slots: ["body"],
  component: ({ loom, children }: LoomPrimitiveProps) =>
    createElement("main", null, loom.slots["body"], children),
})

const dialog = definePrimitive({
  type: "loom.dialog",
  description: "A dialog that renders its children and places nothing.",
  props: z.object({}),
  component: ({ children }: LoomPrimitiveProps) => createElement("dialog", null, children),
})

const panel = definePrimitive({
  type: "loom.panel",
  description: "A panel with one region.",
  props: z.object({ label: z.string() }),
  slots: ["header"],
  component: ({ loom }: LoomPrimitiveProps) => createElement("section", null, loom.slots["header"]),
})

const registryOf = (
  ...entries: readonly Parameters<typeof createPrimitiveRegistry>[0][number][]
): PrimitiveRegistry => {
  const registry = createPrimitiveRegistry(entries)
  if (!registry.ok) throw new Error(`test registry refused: ${registry.error.code}`)

  return registry.value
}

/** A page holding one element, which holds the slot children named here. */
const treeFilling = (
  type: string,
  regions: readonly string[],
  props: object = {}
): LoomTree => {
  const ids = sequentialIdFactory()

  const filled = buildElement(ids, {
    type,
    props: props as never,
    children: regions.map((name) => buildSlot(ids, name, [buildText(ids, `in ${name}`)])),
  })

  return createTree(buildElement(ids, { type: "loom.page", children: [filled] }), ids)
}

const renderWith = (tree: LoomTree, resolver: PrimitiveRegistry) =>
  renderLoomTree(tree, { resolver, validator: resolver })

const unplacedIn = (diagnostics: readonly RenderDiagnostic[]) =>
  diagnostics.filter((diagnostic) => diagnostic.code === "slot-unplaced")

describe("a region nobody places", () => {
  it("is reported against the primitive that places none", () => {
    const rendered = renderWith(treeFilling("loom.dialog", ["body"]), registryOf(page, dialog))

    const unplaced = unplacedIn(rendered.diagnostics)

    expect(unplaced).toHaveLength(1)
    expect(unplaced[0]).toMatchObject({ type: "loom.dialog", name: "body" })
    expect(describeRenderDiagnostic(unplaced[0]!)).toContain("places no region of that name")
  })

  /**
   * The measurable half, and the reason the diagnostic is worth having: the
   * page renders, looks finished, and the words are gone.
   */
  it("names content the page does not contain", () => {
    const rendered = renderWith(treeFilling("loom.dialog", ["body"]), registryOf(page, dialog))

    expect(renderToStaticMarkup(rendered.element)).not.toContain("in body")
    expect(renderToStaticMarkup(rendered.element)).toContain("<dialog>")
  })

  it("says nothing about a region the primitive declared", () => {
    const rendered = renderWith(treeFilling("loom.panel", ["header"], { label: "Details" }), registryOf(page, panel))

    expect(unplacedIn(rendered.diagnostics)).toEqual([])
    expect(renderToStaticMarkup(rendered.element)).toContain("in header")
  })

  it("reports only the region that is not declared", () => {
    const tree = treeFilling("loom.panel", ["header", "footer"], { label: "Details" })
    const rendered = renderWith(tree, registryOf(page, panel))

    expect(unplacedIn(rendered.diagnostics).map((diagnostic) => diagnostic.name)).toEqual(["footer"])
  })

  /**
   * Two children sharing a name are both placed, so they are lost by one
   * mistake and the repair is one edit.
   */
  it("reports one diagnostic for two children sharing an unplaced name", () => {
    const tree = treeFilling("loom.dialog", ["body", "body"])
    const rendered = renderWith(tree, registryOf(page, dialog))

    expect(unplacedIn(rendered.diagnostics)).toHaveLength(1)
  })

  it("reports several unplaced names sorted, whatever order the tree wrote them", () => {
    const tree = treeFilling("loom.dialog", ["footer", "aside", "body"])
    const rendered = renderWith(tree, registryOf(page, dialog))

    expect(unplacedIn(rendered.diagnostics).map((diagnostic) => diagnostic.name)).toEqual([
      "aside",
      "body",
      "footer",
    ])
  })

  /**
   * A host's projection fills the region the tree declared, so the loss is the
   * same loss and the diagnostic is about the tree either way.
   */
  it("is reported for a region the host projected into", () => {
    const tree = treeFilling("loom.dialog", ["body"])
    const registry = registryOf(page, dialog)

    const rendered = renderLoomTree(tree, {
      resolver: registry,
      validator: registry,
      slots: { body: createElement("p", null, "projected") },
    })

    expect(unplacedIn(rendered.diagnostics)).toHaveLength(1)
    expect(renderToStaticMarkup(rendered.element)).not.toContain("projected")
  })

  /**
   * Only direct slot children are routed, so a slot inside another slot's
   * fallback renders where it sits and is nobody's region to place.
   */
  it("says nothing about a slot nested inside another slot's fallback", () => {
    const ids = sequentialIdFactory()
    const root = buildElement(ids, {
      type: "loom.page",
      children: [buildSlot(ids, "body", [buildSlot(ids, "aside", [buildText(ids, "deep")])])],
    })

    const rendered = renderWith(createTree(root, ids), registryOf(page))

    expect(unplacedIn(rendered.diagnostics)).toEqual([])
    expect(renderToStaticMarkup(rendered.element)).toContain("deep")
  })

  it("stays silent for a resolver that cannot say what a primitive places", () => {
    const ids = sequentialIdFactory()
    const root = buildElement(ids, {
      type: "loom.page",
      children: [buildSlot(ids, "aside", [buildText(ids, "in aside")])],
    })

    const rendered = renderLoomTree(createTree(root, ids), {
      resolver: staticPrimitiveResolver({
        "loom.page": ({ children }: LoomPrimitiveProps) => createElement("main", null, children),
      }),
    })

    expect(unplacedIn(rendered.diagnostics)).toEqual([])
  })

  /**
   * Both already omit the subtree and say why, so a second diagnostic about a
   * region inside it would be two sentences about one hole.
   */
  it("says nothing on a node whose type nothing registered", () => {
    const rendered = renderWith(treeFilling("loom.marquee", ["body"]), registryOf(page))

    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["unknown-primitive"])
  })

  it("says nothing on a node whose props its primitive refuses", () => {
    const rendered = renderWith(treeFilling("loom.panel", ["footer"]), registryOf(page, panel))

    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["invalid-props"])
  })

  /**
   * A decorative copy walks nodes the primary render has already walked, so its
   * diagnostics are dropped — and the ancestor asking for one re-renders the
   * element below it, which would otherwise report one dropped region twice.
   */
  it("is reported once when an ancestor asks for a decorative copy", () => {
    const copying = definePrimitive({
      type: "loom.page",
      description: "A page that renders its children and a copy of them.",
      props: z.object({}),
      slots: ["body"],
      component: ({ loom, children }: LoomPrimitiveProps) =>
        createElement("main", null, children, loom.decorative()),
    })

    const rendered = renderWith(treeFilling("loom.dialog", ["body"]), registryOf(copying, dialog))

    /**
     * Mounted rather than inspected: the copy is rendered on the first call to
     * `loom.decorative`, which happens while React renders and not while the
     * walk builds — so a second report would arrive after the walk returned.
     */
    renderToStaticMarkup(rendered.element)

    expect(unplacedIn(rendered.diagnostics)).toHaveLength(1)
  })

  /**
   * The node's own fault ahead of its subtree's, which is the order every other
   * report in the walk is collected in — and the reason the names are read off
   * the node's children rather than off the regions the walk has just built.
   */
  it("is collected before the diagnostics of the content it dropped", () => {
    const ids = sequentialIdFactory()
    const filled = buildElement(ids, {
      type: "loom.dialog",
      children: [
        buildSlot(ids, "body", [buildElement(ids, { type: "loom.marquee" })]),
      ],
    })

    const tree = createTree(buildElement(ids, { type: "loom.page", children: [filled] }), ids)
    const rendered = renderWith(tree, registryOf(page, dialog))

    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "slot-unplaced",
      "unknown-primitive",
    ])
  })
})

describe("the comparison the walk makes", () => {
  it("says nothing when the resolver cannot say", () => {
    expect(unplacedSlots(["body"], undefined)).toEqual([])
  })

  it("reports every name against a primitive that places none", () => {
    expect(unplacedSlots(["body", "aside"], [])).toEqual(["aside", "body"])
  })

  it("counts a repeated name once", () => {
    expect(unplacedSlots(["body", "body"], [])).toEqual(["body"])
  })
})

describe("the seam", () => {
  it("is satisfied by a registry and not by a plain map", () => {
    expect(isSlotPlacer(registryOf(page))).toBe(true)
    expect(isSlotPlacer(staticPrimitiveResolver({}))).toBe(false)
  })

  it("answers a registered primitive's declaration and nothing for a type it does not hold", () => {
    const registry = registryOf(page, dialog)

    expect(registry.slotsPlacedBy("loom.page" as never)).toEqual(["body"])
    expect(registry.slotsPlacedBy("loom.dialog" as never)).toEqual([])
    expect(registry.slotsPlacedBy("loom.marquee" as never)).toBeUndefined()
  })
})
