import { Component, createElement, isValidElement, type ReactElement, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import type { JsonObject } from "../json.js"
import { themeVariables } from "../theme/apply.js"
import { createThemeRegistry } from "../theme/registry.js"
import type { ThemeSelection } from "../theme/theme.js"
import { buildElement, buildText } from "../tree/builders.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { inlineThemeVariables, substituteVariables } from "./inline-variables.js"
import {
  staticPrimitiveResolver,
  type LoomPrimitive,
  type LoomPrimitiveProps,
} from "./primitive.js"
import { renderLoomTree } from "./render.js"
import { THEME_PROP_KEY } from "./theme.js"

/**
 * The substitution a browser does, done before the page leaves the renderer.
 *
 * The load-bearing assertion is the last one in this file: a themed tree
 * rendered with `themeValues: "literals"` reaches markup with no `var(` left in
 * any style, and re-themed reaches the same markup wearing different values.
 * That is the property a medium with no cascade needs, and it is the one an
 * image renderer silently fails without.
 */

const VARIABLES = {
  "--loom-bg-surface": "#ffffff",
  "--loom-text-primary": "#111111",
  "--loom-accent": "#4a5b78",
  "--loom-spacing-3": "16px",
} as const

describe("substituting one CSS value", () => {
  it("replaces a reference with what the theme declares", () => {
    expect(substituteVariables("var(--loom-accent)", VARIABLES)).toEqual({
      value: "#4a5b78",
      unresolved: [],
    })
  })

  it("replaces every reference in a compound declaration", () => {
    expect(substituteVariables("1px solid var(--loom-accent)", VARIABLES).value).toBe(
      "1px solid #4a5b78"
    )
    expect(substituteVariables("var(--loom-spacing-3) var(--loom-spacing-3)", VARIABLES).value).toBe(
      "16px 16px"
    )
  })

  it("prefers the declared value over the fallback beside it", () => {
    expect(substituteVariables("var(--loom-accent, red)", VARIABLES).value).toBe("#4a5b78")
  })

  it("takes the fallback when the theme declares nothing, and does not report it", () => {
    expect(substituteVariables("var(--loom-mono-family, ui-monospace)", VARIABLES)).toEqual({
      value: "ui-monospace",
      unresolved: [],
    })
  })

  it("resolves a fallback that is itself a reference", () => {
    expect(substituteVariables("var(--loom-none, var(--loom-accent))", VARIABLES).value).toBe(
      "#4a5b78"
    )
  })

  it("leaves an unanswered reference exactly as written, and names it", () => {
    expect(substituteVariables("color: var(--loom-danger)", VARIABLES)).toEqual({
      value: "color: var(--loom-danger)",
      unresolved: ["--loom-danger"],
    })
  })

  it("names each unanswered property once, in a stable order", () => {
    const { unresolved } = substituteVariables(
      "var(--loom-b) var(--loom-a) var(--loom-b)",
      VARIABLES
    )

    expect(unresolved).toEqual(["--loom-a", "--loom-b"])
  })

  /**
   * A font stack is the value most likely to carry a parenthesis, and a family
   * with one in its name would otherwise close the reference early and produce
   * a declaration nobody wrote.
   */
  it("does not read a parenthesis inside a quoted string as structure", () => {
    const stack = `'Foo (Text)', var(--loom-accent)`

    expect(substituteVariables(stack, VARIABLES).value).toBe(`'Foo (Text)', #4a5b78`)
    expect(substituteVariables(`'var(--loom-accent)'`, VARIABLES).value).toBe(
      `'var(--loom-accent)'`
    )
  })

  it("copies an unclosed reference through rather than guessing where it ends", () => {
    expect(substituteVariables("var(--loom-accent", VARIABLES)).toEqual({
      value: "var(--loom-accent",
      unresolved: [],
    })
  })

  it("leaves a reference that does not name a custom property alone", () => {
    expect(substituteVariables("var(loom-accent)", VARIABLES)).toEqual({
      value: "var(loom-accent)",
      unresolved: [],
    })
  })

  /**
   * Every value a theme mounts is a literal, so a declared value is written
   * through and not walked again — which is also what stops a theme that
   * somehow referred to itself from being a hang rather than a value.
   */
  it("does not walk a declared value looking for more references", () => {
    const circular = { "--loom-accent": "var(--loom-accent)" }

    expect(substituteVariables("var(--loom-accent)", circular).value).toBe("var(--loom-accent)")
  })

  it("returns a value with no references untouched", () => {
    expect(substituteVariables("16px", VARIABLES).value).toBe("16px")
  })
})

const styleOf = (node: ReactNode): Record<string, unknown> => {
  if (!isValidElement(node)) throw new Error("expected an element")

  return (node as ReactElement<{ style?: Record<string, unknown> }>).props.style ?? {}
}

const childrenOf = (node: ReactNode): ReactNode => {
  if (!isValidElement(node)) throw new Error("expected an element")

  return (node as ReactElement<{ children?: ReactNode }>).props.children
}

describe("substituting a projection", () => {
  it("resolves the styles of nested elements", () => {
    const tree = createElement(
      "div",
      { style: { background: "var(--loom-bg-surface)" } },
      createElement("p", { style: { color: "var(--loom-text-primary)" } }, "Body")
    )

    const { element } = inlineThemeVariables(tree, VARIABLES)

    expect(styleOf(element)).toEqual({ background: "#ffffff" })
    expect(styleOf(childrenOf(element))).toEqual({ color: "#111111" })
  })

  it("resolves every child of a list and keeps their keys", () => {
    const tree = createElement("ul", null, [
      createElement("li", { key: "a", style: { color: "var(--loom-accent)" } }, "One"),
      createElement("li", { key: "b", style: { color: "16px" } }, "Two"),
    ])

    const { element } = inlineThemeVariables(tree, VARIABLES)
    const items = childrenOf(element) as readonly ReactElement[]

    expect(items.map((item) => item.key)).toEqual(["a", "b"])
    expect(styleOf(items[0])).toEqual({ color: "#4a5b78" })
  })

  /**
   * Ids are React keys (§1), so an element that lost its key on the way through
   * would reconcile as a delete and an insert rather than as a move.
   */
  it("keeps the key of an element it rewrites", () => {
    const tree = createElement("div", { key: "n1", style: { color: "var(--loom-accent)" } })
    const { element } = inlineThemeVariables(tree, VARIABLES)

    expect(isValidElement(element) && element.key).toBe("n1")
  })

  it("hands back the identical element when there is nothing to substitute", () => {
    const tree = createElement("div", { style: { color: "#000" } }, "Plain")
    const { element } = inlineThemeVariables(tree, VARIABLES)

    expect(element).toBe(tree)
  })

  it("leaves a style value that is not a string alone", () => {
    const tree = createElement("div", { style: { opacity: 1, zIndex: 0 } })
    const { element } = inlineThemeVariables(tree, VARIABLES)

    expect(styleOf(element)).toEqual({ opacity: 1, zIndex: 0 })
  })

  it("carries the other props of an element it rewrites", () => {
    const tree = createElement("div", {
      id: "card",
      "data-loom-node": "n4",
      style: { color: "var(--loom-accent)" },
    })

    const { element } = inlineThemeVariables(tree, VARIABLES)
    const props = (element as ReactElement<Record<string, unknown>>).props

    expect(props["id"]).toBe("card")
    expect(props["data-loom-node"]).toBe("n4")
  })

  /**
   * A control renders on the client, so its subtree does not exist here. Its own
   * style prop and the children it was handed are reachable; what it returns is
   * not, and this is the assertion that says so out loud.
   */
  it("substitutes a component element's own props and cannot reach inside it", () => {
    const Control = ({
      children,
    }: {
      readonly children?: ReactNode
      readonly style?: Record<string, string>
    }) => createElement("button", { style: { color: "var(--loom-accent)" } }, children)

    const tree = createElement(
      Control,
      { style: { padding: "var(--loom-spacing-3)" } },
      createElement("span", { style: { color: "var(--loom-text-primary)" } }, "Copy")
    )

    const { element } = inlineThemeVariables(tree, VARIABLES)

    expect(styleOf(element)).toEqual({ padding: "16px" })
    expect(styleOf(childrenOf(element))).toEqual({ color: "#111111" })
    expect(renderToStaticMarkup(element)).toContain("color:var(--loom-accent)")
  })

  it("names what the theme did not answer, once, across the whole projection", () => {
    const tree = createElement("div", { style: { color: "var(--loom-danger)" } }, [
      createElement("p", { key: "a", style: { background: "var(--loom-danger)" } }),
      createElement("p", { key: "b", style: { background: "var(--loom-warning)" } }),
    ])

    expect(inlineThemeVariables(tree, VARIABLES).unresolved).toEqual([
      "--loom-danger",
      "--loom-warning",
    ])
  })

  it("passes text, numbers and nothing through untouched", () => {
    expect(inlineThemeVariables("Body copy", VARIABLES).element).toBe("Body copy")
    expect(inlineThemeVariables(null, VARIABLES).element).toBeNull()
    expect(inlineThemeVariables(7, VARIABLES).element).toBe(7)
  })
})

const editorial: ThemeSelection = {
  palette: "editorial",
  fontPack: "editorial-serif",
  stylePreset: "comfortable",
} as ThemeSelection

const bold: ThemeSelection = {
  palette: "bold",
  fontPack: "bold-sans",
  stylePreset: "airy-modern",
} as ThemeSelection

/** A primitive that paints the way the library does: every value off a slot. */
const painted: LoomPrimitive = ({ loom, children }: LoomPrimitiveProps) =>
  createElement(
    "section",
    {
      ...loom.editable,
      style: {
        ...loom.theme,
        background: "var(--loom-bg-surface)",
        color: "var(--loom-fg-default)",
        padding: "var(--loom-spacing-3)",
        border: `1px solid var(--loom-border-subtle)`,
        fontFamily: "var(--loom-body-family)",
      },
    },
    children
  )

const resolver = staticPrimitiveResolver({ "loom.page": painted, "loom.card": painted })
const themes = createThemeRegistry()

const pageWearing = (rootProps: JsonObject): LoomTree => {
  const idFactory = sequentialIdFactory()

  const card = buildElement(idFactory, {
    type: "loom.card",
    props: {},
    children: [buildText(idFactory, "Body copy")],
  })
  const page = buildElement(idFactory, { type: "loom.page", props: rootProps, children: [card] })

  return createTree(page, idFactory)
}

const markupWearing = (selection: ThemeSelection): string =>
  renderToStaticMarkup(
    renderLoomTree(pageWearing({ [THEME_PROP_KEY]: selection }), {
      resolver,
      themes,
      themeValues: "literals",
    }).element
  )

describe("a render asked for values rather than references", () => {
  it("leaves no reference in any style, so a medium with no cascade can read it", () => {
    const rendered = renderLoomTree(pageWearing({ [THEME_PROP_KEY]: editorial }), {
      resolver,
      themes,
      themeValues: "literals",
    })
    const markup = renderToStaticMarkup(rendered.element)
    const variables = rendered.theme ? themeVariables(rendered.theme) : {}

    expect(rendered.diagnostics).toEqual([])
    expect(markup).not.toContain("var(--loom-")
    expect(markup).toContain(`background:${variables["--loom-bg-surface"]}`)
    expect(markup).toContain(`padding:${variables["--loom-spacing-3"]}`)
  })

  it("still wears the palette the tree named, so a re-theme is still one configure", () => {
    expect(markupWearing(editorial)).not.toBe(markupWearing(bold))
  })

  it("references, not values, by default", () => {
    const rendered = renderLoomTree(pageWearing({ [THEME_PROP_KEY]: editorial }), {
      resolver,
      themes,
    })

    expect(renderToStaticMarkup(rendered.element)).toContain("background:var(--loom-bg-surface)")
  })

  it("says so on the root when there is no theme to take values from", () => {
    const tree = pageWearing({})
    const unthemed = renderLoomTree(tree, { resolver, themeValues: "literals" })

    expect(unthemed.diagnostics).toEqual([
      { code: "theme-values-unmounted", nodeId: tree.root.id },
    ])
    expect(renderToStaticMarkup(unthemed.element)).toContain("background:var(--loom-bg-surface)")
  })

  /**
   * A reference the theme does not answer is left as the primitive wrote it,
   * which is what a browser does with it too. Nothing here invents a value.
   */
  it("leaves a reference the mounted theme does not answer as written", () => {
    const unanswered: LoomPrimitive = ({ loom, children }: LoomPrimitiveProps) =>
      createElement("section", { ...loom.editable, style: { color: "var(--loom-danger)" } }, children)

    const rendered = renderLoomTree(pageWearing({ [THEME_PROP_KEY]: bold }), {
      resolver: staticPrimitiveResolver({ "loom.page": unanswered, "loom.card": unanswered }),
      themes,
      themeValues: "literals",
    })

    expect(renderToStaticMarkup(rendered.element)).toContain("color:var(--loom-danger)")
  })

  /**
   * A real class component, because a class is precisely what this branch
   * exists to recognise: it cannot be called, so it is mounted as it always was
   * and keeps its references rather than throwing.
   */
  it("mounts a primitive it cannot call, and leaves that node's references alone", () => {
    class ClassPrimitive extends Component<LoomPrimitiveProps> {
      override render(): ReactNode {
        return createElement("section", { style: { color: "var(--loom-fg-default)" } })
      }
    }

    const rendered = renderLoomTree(pageWearing({ [THEME_PROP_KEY]: bold }), {
      resolver: staticPrimitiveResolver({ "loom.page": ClassPrimitive }),
      themes,
      themeValues: "literals",
    })

    expect(renderToStaticMarkup(rendered.element)).toContain("color:var(--loom-fg-default)")
  })

  it("says nothing extra when every reference on the page was answered", () => {
    const rendered = renderLoomTree(pageWearing({ [THEME_PROP_KEY]: bold }), {
      resolver,
      themes,
      themeValues: "literals",
    })

    expect(rendered.diagnostics).toEqual([])
  })
})
