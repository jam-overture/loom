import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import { sequentialIdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import { primitiveTypeSchema, type PrimitiveType } from "../primitive-type.js"
import { ok } from "../result.js"
import { definePrimitive } from "../sdk/definition.js"
import { registryOf, testDefinitions, testRegistry } from "../testing/definitions.js"
import { sampleTree } from "../testing/fixtures.js"
import { buildElement, buildText } from "../tree/builders.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import type { LoomPrimitiveProps } from "./primitive.js"
import type { PropsValidator, PropsVerdict } from "./props.js"
import { renderLoomTree } from "./render.js"
import { renderRequest } from "./request.js"

/**
 * The obligation 0009 left to §4, exercised end to end: a registry's declared
 * schemas, enforced by the renderer, on a tree whose props are the kind of thing
 * a model actually produces.
 */

const treeWithCard = (props: JsonObject): LoomTree => {
  const idFactory = sequentialIdFactory()

  const card = buildElement(idFactory, {
    type: "loom.card",
    props,
    children: [buildText(idFactory, "Body copy")],
  })
  const page = buildElement(idFactory, {
    type: "loom.page",
    props: { title: "Home" },
    children: [card],
  })

  return createTree(page, idFactory)
}

const renderWithRegistry = (tree: LoomTree) => {
  const registry = testRegistry()

  return renderLoomTree(tree, { resolver: registry, validator: registry })
}

describe("props validation at the render seam", () => {
  it("renders a tree whose props satisfy every declared schema", () => {
    const rendered = renderWithRegistry(treeWithCard({ variant: "outlined", elevation: 2 }))

    expect(rendered.diagnostics).toEqual([])
    expect(renderToStaticMarkup(rendered.element)).toContain("<article")
  })

  it("omits a node whose props the primitive did not declare, and says which prop", () => {
    const tree = treeWithCard({ variant: "glowing" })

    const rendered = renderWithRegistry(tree)
    const markup = renderToStaticMarkup(rendered.element)

    expect(markup).toContain("<main")
    expect(markup).not.toContain("<article")
    expect(markup).not.toContain("Body copy")
    expect(rendered.diagnostics).toHaveLength(1)
    expect(rendered.diagnostics[0]?.code).toBe("invalid-props")
    expect(rendered.diagnostics[0]?.code === "invalid-props" && rendered.diagnostics[0].issues[0]?.path).toBe(
      "variant"
    )
  })

  /**
   * The attack 0009 was written about, now caught a step earlier: a strict schema
   * refuses the node outright instead of the prop merely being inert in the bag.
   */
  it("refuses a node carrying a prop a strict primitive never declared", () => {
    const rendered = renderWithRegistry(
      treeWithCard({ variant: "outlined", dangerouslySetInnerHTML: { __html: "<script>x</script>" } })
    )

    expect(renderToStaticMarkup(rendered.element)).not.toContain("<article")
    expect(rendered.diagnostics[0]?.code).toBe("invalid-props")
  })

  it("still hands the primitive the tree's props, never a schema's defaults", () => {
    const defaulted = definePrimitive({
      type: "loom.defaulted",
      description: "declares a default nobody should see rendered",
      props: z.object({ variant: z.string().default("plain") }),
      component: ({ props }: LoomPrimitiveProps<{ variant?: string }>) =>
        createElement("div", { "data-props": JSON.stringify(props) }),
    })

    const registry = registryOf([defaulted])
    const idFactory = sequentialIdFactory()
    const tree = createTree(buildElement(idFactory, { type: "loom.defaulted" }), idFactory)

    const markup = renderToStaticMarkup(
      renderLoomTree(tree, { resolver: registry, validator: registry }).element
    )

    expect(markup).toContain(`data-props="{}"`)
  })

  it("validates nothing when the host wired no validator", () => {
    const registry = testRegistry()
    const rendered = renderLoomTree(treeWithCard({ variant: "glowing" }), { resolver: registry })

    expect(rendered.diagnostics).toEqual([])
    expect(renderToStaticMarkup(rendered.element)).toContain("<article")
  })

  /**
   * A resolver and a validator that disagree about which types exist is a
   * composition-root fault. The node renders — the resolver did know it — and the
   * fact that its props went unchecked is reported rather than assumed benign.
   */
  it("reports a type the validator does not know but the resolver does", () => {
    const partial: PropsValidator = {
      validateProps: (type: PrimitiveType): PropsVerdict =>
        type === primitiveTypeSchema.parse("loom.card") ? { outcome: "undeclared" } : { outcome: "valid" },
    }

    const rendered = renderLoomTree(treeWithCard({ variant: "outlined" }), {
      resolver: testRegistry(),
      validator: partial,
    })

    expect(renderToStaticMarkup(rendered.element)).toContain("<article")
    expect(rendered.diagnostics).toEqual([
      { code: "props-undeclared", nodeId: expect.any(String), type: "loom.card" },
    ])
  })

  it("validates every element in the tree, not only the root", () => {
    const { tree } = sampleTree()
    const withoutTheCard = registryOf(testDefinitions.filter((entry) => entry.type !== "loom.card"))

    const rendered = renderLoomTree(tree, { resolver: withoutTheCard, validator: withoutTheCard })

    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["unknown-primitive"])
  })

  it("reaches a node through renderRequest, so a host gets it without wiring it twice", async () => {
    const tree = treeWithCard({ variant: "glowing" })
    const registry = testRegistry()

    const rendered = await renderRequest(
      { treeId: tree.treeId, editMode: false },
      {
        source: { load: () => Promise.resolve(ok(tree)) },
        resolver: registry,
        validator: registry,
      }
    )

    expect(rendered.ok).toBe(true)
    expect(rendered.ok && rendered.value.diagnostics[0]?.code).toBe("invalid-props")
  })
})
