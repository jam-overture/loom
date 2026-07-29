import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { sampleTree } from "../testing/fixtures.js"
import { testPrimitiveResolver, undecoratedPrimitive } from "../testing/primitives.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"

import {
  editableAttributes,
  LOOM_NODE_ATTRIBUTE,
  LOOM_REVISION_ATTRIBUTE,
  LOOM_TREE_ATTRIBUTE,
  LOOM_TYPE_ATTRIBUTE,
} from "./editable.js"
import { staticPrimitiveResolver } from "./primitive.js"
import { renderLoomTree } from "./render.js"

const markupOf = (editMode: boolean): string => {
  const { tree } = sampleTree()

  return renderToStaticMarkup(
    renderLoomTree(tree, { resolver: testPrimitiveResolver, editMode }).element
  )
}

describe("editableAttributes", () => {
  it("names the node and its primitive type", () => {
    const idFactory = sequentialIdFactory()
    const node = buildElement(idFactory, { type: "loom.card" })

    expect(editableAttributes(node)).toEqual({
      [LOOM_NODE_ATTRIBUTE]: node.id,
      [LOOM_TYPE_ATTRIBUTE]: "loom.card",
    })
  })

  it("adds the tree and the revision an intent would be authored against", () => {
    const idFactory = sequentialIdFactory()
    const node = buildElement(idFactory, { type: "loom.page" })
    const tree = { ...createTree(node, idFactory), revision: 7 }

    expect(editableAttributes(node, tree)).toEqual({
      [LOOM_NODE_ATTRIBUTE]: node.id,
      [LOOM_TYPE_ATTRIBUTE]: "loom.page",
      [LOOM_TREE_ATTRIBUTE]: tree.treeId,
      [LOOM_REVISION_ATTRIBUTE]: "7",
    })
  })
})

describe("edit mode off", () => {
  it("costs nothing — no attribute reaches the markup", () => {
    const markup = markupOf(false)

    expect(markup).not.toContain("data-loom")
  })

  it("is the default", () => {
    const { tree } = sampleTree()

    const markup = renderToStaticMarkup(
      renderLoomTree(tree, { resolver: testPrimitiveResolver }).element
    )

    expect(markup).not.toContain("data-loom")
  })

  it("leaves the render context without an editable handle at all", () => {
    const { tree } = sampleTree()
    let seen: unknown = "unset"

    renderToStaticMarkup(
      renderLoomTree(tree, {
        resolver: staticPrimitiveResolver({
          "loom.page": ({ loom }) => {
            seen = loom
            return null
          },
        }),
      }).element
    )

    expect(seen).not.toHaveProperty("editable")
  })
})

describe("edit mode on", () => {
  it("decorates every element with its node id and type", () => {
    const { tree, ids } = sampleTree()

    const markup = renderToStaticMarkup(
      renderLoomTree(tree, { resolver: testPrimitiveResolver, editMode: true }).element
    )

    expect(markup).toContain(`${LOOM_NODE_ATTRIBUTE}="${ids.page}"`)
    expect(markup).toContain(`${LOOM_NODE_ATTRIBUTE}="${ids.header}"`)
    expect(markup).toContain(`${LOOM_NODE_ATTRIBUTE}="${ids.card}"`)
    expect(markup).toContain(`${LOOM_TYPE_ATTRIBUTE}="loom.card"`)
  })

  it("puts the tree and revision on the root and nowhere else", () => {
    const { tree } = sampleTree()

    const markup = renderToStaticMarkup(
      renderLoomTree(tree, { resolver: testPrimitiveResolver, editMode: true }).element
    )

    expect(markup.match(new RegExp(LOOM_TREE_ATTRIBUTE, "g"))).toHaveLength(1)
    expect(markup).toContain(`${LOOM_TREE_ATTRIBUTE}="${tree.treeId}"`)
    expect(markup).toContain(`${LOOM_REVISION_ATTRIBUTE}="0"`)
    expect(markup.indexOf(LOOM_TREE_ATTRIBUTE)).toBeLessThan(markup.indexOf("<header"))
  })

  it("invents no element to carry the decoration", () => {
    const tagCount = (markup: string): number => (markup.match(/<[a-z]/g) ?? []).length

    expect(tagCount(markupOf(true))).toBe(tagCount(markupOf(false)))
  })

  it("leaves a primitive that drops the handle undecorated but still rendered", () => {
    const idFactory = sequentialIdFactory()
    const root = buildElement(idFactory, { type: "loom.page" })

    const markup = renderToStaticMarkup(
      renderLoomTree(createTree(root, idFactory), {
        resolver: staticPrimitiveResolver({ "loom.page": undecoratedPrimitive }),
        editMode: true,
      }).element
    )

    expect(markup).toBe("<div></div>")
  })
})
