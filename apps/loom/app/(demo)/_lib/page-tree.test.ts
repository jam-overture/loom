import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { createThemeRegistry } from "@jam-overture/loom"
import { renderLoomTree } from "@jam-overture/loom/react"

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

/**
 * What the page *says*, with the machinery it is drawn by taken out.
 *
 * The tree's own words are the subject of the two assertions below, and raw
 * markup is not them: the theme's stylesheet is hoisted into it under
 * `data-precedence="loom"`, every primitive carries `data-loom-type`, and the
 * class names are the design system's. All of that is Loom saying Loom about
 * itself, correctly, in a place no visitor reads.
 */
const spokenWordsOf = (markup: string): string =>
  markup
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")

describe("the demo page", () => {
  it("renders with nothing left unhonoured", () => {
    const { markup, diagnostics } = render(DEMO_STARTING_THEME as Record<string, string>)

    expect(diagnostics).toEqual([])
    expect(markup).toContain("Back to the things you had stopped doing")
    expect(markup).toContain("<h1")
  })

  /**
   * The property this specimen exists for, and the one that will rot silently.
   *
   * Every band on this page used to be about Loom — *4 delta operations*, *A
   * model emits a delta against the tree it was shown*, a pull quote citing a
   * decision record by number — so the first screen a stranger met was the
   * technical record printed at sixty pixels, which is the opposite of the
   * direction this surface is built to (plain language by default, the record
   * one click away). The page is now a clinic's, and the only thing keeping it
   * one is that nobody writes Loom's vocabulary back into it a copy-edit at a
   * time.
   *
   * The rail is exempt and must be: it is Loom's voice and it is *supposed* to
   * say Loom. What is asserted here is the tree only.
   */
  it("says nothing about Loom, in any of Loom's words", () => {
    const { markup } = render(DEMO_STARTING_THEME as Record<string, string>)
    const spoken = spokenWordsOf(markup).toLowerCase()

    for (const word of ["loom", "delta", "the gate", "primitive", "runtime", "proposal", "telemetry", "revision"]) {
      expect(spoken, word).not.toContain(word)
    }
  })

  /**
   * A specimen page must be plausible enough to stand as a real page and must
   * never reach a real person.
   *
   * The clinic's calls to action are a `mailto:` and a `tel:`, because that is
   * what a small business puts on its front page and because the alternative —
   * the previous pair, pointing at Loom's GitHub — was Loom's own buttons on
   * somebody else's page, and the largest clickable targets on the screen led
   * away from the demonstration. Where they go is the point of them: the
   * `.example` TLD is unroutable by RFC 2606 and `020 7946 0xxx` is Ofcom's
   * drama range, so a visitor who presses one reaches nobody, by construction
   * rather than by nobody having tried.
   */
  it("cannot reach a real inbox or a real telephone", () => {
    const { markup } = render(DEMO_STARTING_THEME as Record<string, string>)
    /* Anchors only. The hoisted stylesheet carries an `href` of its own. */
    const hrefs = [...markup.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(([, href]) => href ?? "")

    expect(hrefs.length).toBe(3)

    for (const href of hrefs) {
      /** RFC 2606's reserved TLD, or Ofcom's drama range. Nothing else. */
      const reserved = href.startsWith("mailto:")
        ? href.endsWith(".example")
        : href.startsWith("tel:+442079460")

      expect(reserved, href).toBe(true)
    }
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

  /**
   * The precondition the mark on the page rests on, asserted where it can fail.
   *
   * `spotlight.ts` keys its rules on `data-loom-node`, which only exists because
   * the demo renders in edit mode and every primitive spreads `loom.editable`.
   * A primitive that stopped spreading it would be invisible to the mark and
   * would say so in a diagnostic — which is the same banner that would appear in
   * the rail, so it is worth failing here rather than on the surface.
   */
  it("gives every band on the page an addressable root, with nothing left unhonoured", () => {
    const tree = demoPageTree()
    const output = renderLoomTree(tree, {
      resolver: demoRegistry,
      validator: demoRegistry,
      themes,
      editMode: true,
    })
    const markup = renderToStaticMarkup(output.element)
    const addressed = new Set([...markup.matchAll(/data-loom-node="([^"]+)"/g)].map(([, id]) => id))

    expect(output.diagnostics).toEqual([])

    for (const band of tree.root.children) {
      if (band.kind !== "element") continue
      expect(addressed.has(band.id), band.type).toBe(true)
    }
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
