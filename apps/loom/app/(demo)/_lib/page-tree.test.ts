import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { createThemeRegistry } from "@loom/runtime"
import { renderLoomTree } from "@loom/runtime/react"

import { DEMO_ALTERNATE_THEME, DEMO_STARTING_THEME, DEMO_THEME_NODE_PROP, demoPageTree } from "./page-tree"
import { demoRegistry } from "./registry"

/**
 * The page a visitor lands on, held to the same bar as the library it is built
 * from: it renders, it renders under both starter palettes, and it names nothing
 * this deployment did not register.
 *
 * A diagnostic here is not cosmetic. Every one of them is a node the runtime
 * could not honour, which on the demo would be an argument for the runtime made
 * with a page the runtime cannot draw.
 */

const themes = createThemeRegistry()

const render = (theme: Record<string, string>) => {
  const tree = demoPageTree()
  const rethemed = {
    ...tree,
    root: { ...tree.root, props: { ...tree.root.props, [DEMO_THEME_NODE_PROP]: theme } },
  }

  const output = renderLoomTree(rethemed, {
    resolver: demoRegistry,
    validator: demoRegistry,
    themes,
  })

  return { markup: renderToStaticMarkup(output.element), diagnostics: output.diagnostics, theme: output.theme }
}

describe("the demo page", () => {
  it("renders with nothing left unhonoured", () => {
    const { markup, diagnostics } = render(DEMO_STARTING_THEME as Record<string, string>)

    expect(diagnostics).toEqual([])
    expect(markup).toContain("Your AI can change this page")
    expect(markup).toContain("<h1")
  })

  it("renders under the other palette with no diagnostics either", () => {
    const { diagnostics, theme } = render(DEMO_ALTERNATE_THEME as Record<string, string>)

    expect(diagnostics).toEqual([])
    expect(theme?.palette.id).toBe("bold")
  })

  /**
   * The demo and the marketing site are one vocabulary (§4d), so a page that
   * exercised three primitives would be proving the runtime against something
   * nobody would ship. Asserted as a floor rather than an exact list, because
   * adding a band to the page should not fail a test about breadth.
   */
  it("is built from most of the registered library, not a corner of it", () => {
    const tree = demoPageTree()
    const output = renderLoomTree(tree, {
      resolver: demoRegistry,
      validator: demoRegistry,
      themes,
      editMode: true,
    })
    const markup = renderToStaticMarkup(output.element)
    const used = new Set([...markup.matchAll(/data-loom-type="([^"]+)"/g)].map(([, type]) => type))

    for (const type of [
      "loom.hero",
      "loom.logo-cloud",
      "loom.feature-grid",
      "loom.feature",
      "loom.stat-grid",
      "loom.quote",
      "loom.faq-list",
      "loom.section",
      "loom.divider",
      "loom.action",
    ]) {
      expect(used.has(type), type).toBe(true)
    }

    expect(used.size).toBeGreaterThanOrEqual(12)
  })

  /**
   * The re-theme guarantee, on the page a visitor actually sees: everything
   * below the root's own style attribute is the same markup under both
   * palettes, and none of it names a colour. A primitive that hard-coded one
   * would fail here rather than at a glance in a screenshot.
   */
  it("changes nothing below the root across a re-theme, and names no colour there", () => {
    const afterRootTag = (markup: string): string => {
      const tree = markup.slice(markup.lastIndexOf("</style>") + "</style>".length)

      return tree.slice(tree.indexOf(">"))
    }

    const editorial = render(DEMO_STARTING_THEME as Record<string, string>).markup
    const bold = render(DEMO_ALTERNATE_THEME as Record<string, string>).markup
    const body = afterRootTag(bold)

    expect(afterRootTag(editorial)).toBe(body)
    expect(editorial).not.toBe(bold)
    expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(body).not.toMatch(/\b(rgba?|hsla?)\(/)
  })

  /** Two visitors address the same nodes by the same names, or the presets break. */
  it("builds the same tree, node for node, every time", () => {
    expect(JSON.stringify(demoPageTree())).toBe(JSON.stringify(demoPageTree()))
  })

  it("names a palette this deployment registered", () => {
    const { theme } = render(DEMO_STARTING_THEME as Record<string, string>)

    expect(theme?.palette.id).toBe("editorial")
  })
})
