import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import { sequentialIdFactory } from "../ids.js"
import { definePrimitive, type PrimitiveEntry } from "../sdk/definition.js"
import { textDictionarySchema, textResolverFor } from "../sdk/text.js"
import { registryOf } from "../testing/definitions.js"
import { buildElement } from "../tree/builders.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { staticPrimitiveResolver, type LoomPrimitiveProps } from "./primitive.js"
import { renderLoomTree } from "./render.js"
import { renderRequest, type TreeSource } from "./request.js"
import { NO_TEXT, type TextResolver } from "./text.js"

/**
 * The primitive the seam exists for: a marker whose glyph carries a name no
 * label in the tree says. `loom.perk` in the starter library is this shape, and
 * the finding that asked for the seam is about exactly these two strings.
 */
const markerDefinition: PrimitiveEntry = definePrimitive({
  type: "loom.marker",
  description: "A state marker beside an item",
  props: z.object({ state: z.enum(["included", "excluded"]) }),
  text: { included: "Included", excluded: "Not included" },
  component: ({ loom, props }) =>
    createElement(
      "span",
      { "aria-label": props.state === "included" ? loom.text.included : loom.text.excluded },
      props.state === "included" ? "✓" : "✕"
    ),
})

/** Declares nothing, and is here to prove it is handed nothing. */
const pageDefinition: PrimitiveEntry = definePrimitive({
  type: "loom.page",
  description: "The page shell",
  props: z.object({}),
  component: ({ loom, children }: LoomPrimitiveProps) =>
    createElement("main", { "data-text-keys": Object.keys(loom.text).join(",") }, children),
})

const registry = registryOf([pageDefinition, markerDefinition])

const treeWith = (state: string): LoomTree => {
  const idFactory = sequentialIdFactory()

  const marker = buildElement(idFactory, { type: "loom.marker", props: { state } })

  return createTree(
    buildElement(idFactory, { type: "loom.page", children: [marker] }),
    idFactory
  )
}

const german = textDictionarySchema.parse({
  locale: "de-DE",
  messages: { "loom.marker.excluded": "Nicht enthalten" },
})

const markupOf = (state: string, text?: TextResolver): string =>
  renderToStaticMarkup(
    renderLoomTree(treeWith(state), {
      resolver: registry,
      validator: registry,
      ...(text ? { text } : {}),
    }).element
  )

describe("the text seam", () => {
  it("hands a primitive the strings it declared", () => {
    expect(markupOf("excluded", registry)).toContain('aria-label="Not included"')
  })

  it("replaces a declared string with the dictionary's", () => {
    expect(markupOf("excluded", textResolverFor(registry, german))).toContain(
      'aria-label="Nicht enthalten"'
    )
  })

  it("keeps the declared string for a key the dictionary does not carry", () => {
    expect(markupOf("included", textResolverFor(registry, german))).toContain(
      'aria-label="Included"'
    )
  })

  it("hands nothing to a primitive that declared nothing", () => {
    expect(markupOf("included", registry)).toContain('data-text-keys=""')
  })

  it("hands a primitive its declared strings when no dictionary was wired", () => {
    /**
     * The wiring a deployment serving the library's own language writes, which
     * is `resolver` and nothing else. Before 0063 this rendered a nameless
     * marker: the declared string was present in the registry, reachable, and
     * dropped because the composition root did not repeat itself.
     */
    expect(markupOf("excluded")).toContain('aria-label="Not included"')
  })

  it("hands nothing when the resolver carries no declarations", () => {
    const components = staticPrimitiveResolver({
      "loom.page": pageDefinition.component,
      "loom.marker": markerDefinition.component,
    })

    const markup = renderToStaticMarkup(
      renderLoomTree(treeWith("excluded"), { resolver: components }).element
    )

    expect(markup).toContain("<span>")
    expect(markup).toContain('data-text-keys=""')
  })

  it("keeps a declared string the wired resolver does not answer for", () => {
    /**
     * A host resolver built over a different library — a rename, a second
     * registry, a hand-written one covering the primitives it knew about. The
     * declared strings underneath it are what stops that being an accessible
     * name that silently disappears.
     */
    const partial: TextResolver = { textFor: () => NO_TEXT }

    expect(markupOf("excluded", partial)).toContain('aria-label="Not included"')
  })

  it("lets a dictionary win over the declaration for the key it answers", () => {
    const partial: TextResolver = {
      textFor: () => Object.freeze({ excluded: "Nicht enthalten" }),
    }

    expect(markupOf("excluded", partial)).toContain('aria-label="Nicht enthalten"')
    expect(markupOf("included", partial)).toContain('aria-label="Included"')
  })

  it("never puts declared text into the props the tree carries", () => {
    /**
     * The strings belong to the component, and props belong to the tree. A
     * primitive receiving them in one bag could not tell what a proposal wrote
     * from what its own author did.
     */
    const propsSeen: unknown[] = []

    const spyRegistry = registryOf([
      pageDefinition,
      definePrimitive({
        type: "loom.marker",
        description: "A state marker beside an item",
        props: z.object({ state: z.string() }),
        text: { excluded: "Not included" },
        component: ({ props }) => {
          propsSeen.push(props)
          return createElement("span")
        },
      }),
    ])

    renderToStaticMarkup(
      renderLoomTree(treeWith("excluded"), { resolver: spyRegistry, text: spyRegistry }).element
    )

    expect(propsSeen).toEqual([{ state: "excluded" }])
  })

  it("answers a key named after something on Object.prototype", () => {
    const registryWithHazard = registryOf([
      definePrimitive({
        type: "loom.page",
        description: "The page shell",
        props: z.object({}),
        text: { constructor: "A constructor, as a string" },
        component: ({ loom }) => createElement("main", null, loom.text.constructor),
      }),
    ])

    const idFactory = sequentialIdFactory()
    const tree = createTree(buildElement(idFactory, { type: "loom.page" }), idFactory)

    expect(
      renderToStaticMarkup(
        renderLoomTree(tree, { resolver: registryWithHazard, text: registryWithHazard }).element
      )
    ).toBe("<main>A constructor, as a string</main>")
  })

  it("reaches a primitive through renderRequest", async () => {
    const tree = treeWith("excluded")
    const source: TreeSource = { load: async () => ({ ok: true, value: tree }) }

    const rendered = await renderRequest(
      { treeId: tree.treeId, editMode: false },
      { source, resolver: registry, validator: registry, text: textResolverFor(registry, german) }
    )

    if (!rendered.ok) throw new Error("expected the request to render")

    expect(renderToStaticMarkup(rendered.value.element)).toContain('aria-label="Nicht enthalten"')
  })

  it("resolves the same strings for every node of one type", () => {
    const idFactory = sequentialIdFactory()
    const markers = ["excluded", "included", "excluded"].map((state) =>
      buildElement(idFactory, { type: "loom.marker", props: { state } })
    )
    const tree = createTree(
      buildElement(idFactory, { type: "loom.page", children: markers }),
      idFactory
    )

    const markup = renderToStaticMarkup(
      renderLoomTree(tree, {
        resolver: registry,
        text: textResolverFor(registry, german),
      }).element
    )

    expect(markup.match(/Nicht enthalten/g)).toHaveLength(2)
    expect(markup.match(/Included/g)).toHaveLength(1)
  })

  it("merges a dictionary over the declarations once per type, not once per node", () => {
    const idFactory = sequentialIdFactory()
    const markers = ["excluded", "included", "excluded"].map((state) =>
      buildElement(idFactory, { type: "loom.marker", props: { state } })
    )
    const tree = createTree(
      buildElement(idFactory, { type: "loom.page", children: markers }),
      idFactory
    )

    const asked: string[] = []
    const counting: TextResolver = {
      textFor: (type) => {
        asked.push(type)
        return NO_TEXT
      },
    }

    renderToStaticMarkup(renderLoomTree(tree, { resolver: registry, text: counting }).element)

    expect(asked).toEqual(["loom.page", "loom.marker"])
  })

  it("says nothing in diagnostics about an untranslated string", () => {
    /**
     * A missing translation is a property of the library and the dictionary, not
     * of a node. Reporting it per node would put one diagnostic beside every
     * marker on every request; `textCoverage` answers it once instead.
     */
    const output = renderLoomTree(treeWith("included"), {
      resolver: registry,
      validator: registry,
      text: textResolverFor(registry, german),
    })

    expect(output.diagnostics).toEqual([])
  })
})
