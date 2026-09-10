import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { sequentialIdFactory, type NodeId } from "../ids.js"
import type { JsonObject } from "../json.js"
import { testPrimitiveResolver } from "../testing/primitives.js"
import { createThemeRegistry } from "../theme/registry.js"
import type { ThemeSelection } from "../theme/theme.js"
import { buildElement, buildText } from "../tree/builders.js"
import type { ElementNode } from "../tree/node.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { renderLoomExcerpt, renderLoomTree } from "./render.js"
import { THEME_PROP_KEY } from "./theme.js"

/**
 * Rendering part of a page.
 *
 * The load-bearing assertion is the first one: a subtree rendered on its own
 * carries the tree's custom properties. Before this seam it did not, and nothing
 * said so — the excerpt came out with every `var(--loom-…)` falling back and no
 * diagnostic, because a node that names no theme is legitimately unthemed.
 */

const editorial: ThemeSelection = {
  palette: "editorial",
  fontPack: "editorial-serif",
  stylePreset: "comfortable",
} as ThemeSelection

const themes = createThemeRegistry()

type Excerptable = {
  readonly tree: LoomTree
  readonly card: ElementNode
  readonly textId: NodeId
}

const pageWith = (rootProps: JsonObject = {}): Excerptable => {
  const idFactory = sequentialIdFactory()

  const body = buildText(idFactory, "Body copy")
  const card = buildElement(idFactory, { type: "loom.card", props: {}, children: [body] })
  const other = buildElement(idFactory, {
    type: "loom.card",
    props: {},
    children: [buildText(idFactory, "The rest of the page")],
  })
  const page = buildElement(idFactory, {
    type: "loom.page",
    props: { title: "Home", ...rootProps },
    children: [card, other],
  })

  return { tree: createTree(page, idFactory), card, textId: body.id }
}

const excerpt = (tree: LoomTree, nodeId: NodeId) =>
  renderLoomExcerpt(tree, nodeId, { resolver: testPrimitiveResolver, themes })

describe("rendering part of a tree", () => {
  it("carries the tree's theme, on a node that names none and is not the root", () => {
    const { tree, card } = pageWith({ [THEME_PROP_KEY]: editorial })
    const rendered = excerpt(tree, card.id)
    const markup = renderToStaticMarkup(rendered.element)

    expect(rendered.found).toBe(true)
    expect(rendered.diagnostics).toEqual([])
    expect(markup).toContain("--loom-accent:#4a5b78")
    expect(markup).toContain("--loom-bg-canvas:#fafaf7")
  })

  it("renders the part asked for and nothing beside it", () => {
    const { tree, card } = pageWith({ [THEME_PROP_KEY]: editorial })
    const markup = renderToStaticMarkup(excerpt(tree, card.id).element)

    expect(markup).toContain("Body copy")
    expect(markup).not.toContain("The rest of the page")
  })

  it("names what it mounted, the way a page render does", () => {
    const { tree, card } = pageWith({ [THEME_PROP_KEY]: editorial })

    expect(excerpt(tree, card.id).theme?.palette.id).toBe("editorial")
  })

  /**
   * The gap this seam closes, stated as the thing that used to happen: the same
   * node, walked by the page renderer, resolves no variables of its own.
   */
  it("mounts what a bare render of the same node does not", () => {
    const { tree, card } = pageWith({ [THEME_PROP_KEY]: editorial })

    const bare = renderToStaticMarkup(
      renderLoomTree({ ...tree, root: card }, { resolver: testPrimitiveResolver, themes }).element
    )

    expect(bare).not.toContain("--loom-accent")
    expect(renderToStaticMarkup(excerpt(tree, card.id).element)).toContain("--loom-accent")
  })

  it("wraps an unthemed tree's excerpt too, so the shape does not turn on the theme", () => {
    const { tree, card } = pageWith()
    const rendered = excerpt(tree, card.id)
    const markup = renderToStaticMarkup(rendered.element)

    expect(rendered.theme).toBeUndefined()
    expect(rendered.diagnostics).toEqual([])
    expect(markup.startsWith("<div>")).toBe(true)
    expect(markup).not.toContain("--loom-")
  })

  it("excerpts a text node, which is a part of a page like any other", () => {
    const { tree, textId } = pageWith({ [THEME_PROP_KEY]: editorial })
    const rendered = excerpt(tree, textId)

    expect(rendered.found).toBe(true)
    expect(renderToStaticMarkup(rendered.element)).toContain("Body copy")
  })

  it("excerpts the root, mounting the same values the root primitive mounts", () => {
    const { tree } = pageWith({ [THEME_PROP_KEY]: editorial })
    const rendered = excerpt(tree, tree.root.id)
    const markup = renderToStaticMarkup(rendered.element)

    expect(rendered.diagnostics).toEqual([])
    expect(markup.match(/--loom-accent:#4a5b78/g)).toHaveLength(2)
  })

  it("says so, and renders nothing, for a node this tree does not hold", () => {
    const { tree } = pageWith({ [THEME_PROP_KEY]: editorial })
    const rendered = excerpt(tree, "n_gone" as NodeId)

    expect(rendered.found).toBe(false)
    expect(rendered.element).toBeNull()
    expect(rendered.theme).toBeUndefined()
    expect(rendered.diagnostics).toEqual([{ code: "excerpt-absent", nodeId: "n_gone" }])
  })

  it("reports the tree's own theme failures, because the theme is still the tree's", () => {
    const { tree, card } = pageWith({ [THEME_PROP_KEY]: editorial })
    const rendered = renderLoomExcerpt(tree, card.id, { resolver: testPrimitiveResolver })

    expect(rendered.diagnostics).toEqual([
      { code: "theme-unregistered", nodeId: tree.root.id },
    ])
    expect(renderToStaticMarkup(rendered.element)).not.toContain("--loom-")
  })

  it("stays a pure function of its inputs", () => {
    const { tree, card } = pageWith({ [THEME_PROP_KEY]: editorial })

    expect(renderToStaticMarkup(excerpt(tree, card.id).element)).toBe(
      renderToStaticMarkup(excerpt(tree, card.id).element)
    )
  })
})
